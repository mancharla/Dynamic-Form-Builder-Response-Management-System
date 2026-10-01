from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.activity_log import ActivityLog
from app.models.form import Form
from app.models.form_field import FormField
from app.models.form_response import FormResponse
from app.models.response_detail import ResponseDetail
from app.models.user import User
from app.schemas.response import (
    FormResponseResponse,
    ResponseUpdate,
)
from app.services.activity_log import create_activity_log
from app.services.response_validation import (
    is_field_visible,
    validate_field_value,
)

router = APIRouter(
    prefix="/api/v1",
    tags=["Responses"],
)


def get_response_with_details(
    db: Session,
    response_id: int,
) -> FormResponse | None:
    statement = (
        select(FormResponse)
        .options(
            selectinload(FormResponse.details),
            selectinload(FormResponse.form)
            .selectinload(Form.fields)
            .selectinload(FormField.options),
        )
        .where(FormResponse.id == response_id)
    )

    return db.scalar(statement)


def can_manage_response(
    response: FormResponse,
    current_user: User,
) -> bool:
    if current_user.role and current_user.role.name == "Admin":
        return True

    if response.user_id is None:
        return False

    if response.user_id == current_user.id:
        return True

    if response.form and response.form.created_by == current_user.id:
        return True

    return False


@router.get(
    "/forms/{form_id}/responses",
    response_model=list[FormResponseResponse],
)
def list_form_responses(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    form = db.scalar(
        select(Form).where(Form.id == form_id)
    )

    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found",
        )

    is_admin = (
        current_user.role
        and current_user.role.name == "Admin"
    )

    if not is_admin and form.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view these responses",
        )

    statement = (
        select(FormResponse)
        .options(
            selectinload(FormResponse.details)
        )
        .where(FormResponse.form_id == form_id)
        .order_by(FormResponse.submitted_at.desc())
    )

    responses = db.scalars(statement).all()

    return responses


@router.get(
    "/responses/{response_id}",
    response_model=FormResponseResponse,
)
def get_single_response(
    response_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    response = get_response_with_details(
        db=db,
        response_id=response_id,
    )

    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Response not found",
        )

    if not can_manage_response(
        response=response,
        current_user=current_user,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this response",
        )

    return response


@router.put(
    "/responses/{response_id}",
    response_model=FormResponseResponse,
)
def update_response(
    response_id: int,
    data: ResponseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    response = get_response_with_details(
        db=db,
        response_id=response_id,
    )

    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Response not found",
        )

    if not can_manage_response(
        response=response,
        current_user=current_user,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to edit this response",
        )

    form = response.form

    fields = sorted(
        form.fields,
        key=lambda field: (field.field_order, field.id),
    )

    fields_by_id = {
        field.id: field
        for field in fields
    }

    fields_by_name = {
        field.name: field
        for field in fields
    }

    submitted_values: dict[int, object] = {}

    for answer in data.answers:
        if answer.field_id not in fields_by_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Field {answer.field_id} "
                    "does not belong to this form"
                ),
            )

        if answer.field_id in submitted_values:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Duplicate answer for field "
                    f"{answer.field_id}"
                ),
            )

        submitted_values[answer.field_id] = answer.value

    # ---------------------------------------------------------
    # Capture old values before replacing response details.
    # ---------------------------------------------------------
    old_values = {
        detail.field_id: (
            detail.structured_value
            if detail.structured_value is not None
            else detail.value
        )
        for detail in response.details
    }

    # ---------------------------------------------------------
    # Validate visible fields.
    # ---------------------------------------------------------
    for field in fields:
        visible = is_field_visible(
            field=field,
            submitted_values=submitted_values,
            fields_by_name=fields_by_name,
        )

        if not visible:
            continue

        value = submitted_values.get(field.id)

        validate_field_value(
            field=field,
            value=value,
        )

    # ---------------------------------------------------------
    # Remove existing response details.
    # ---------------------------------------------------------
    for detail in list(response.details):
        db.delete(detail)

    db.flush()

    # ---------------------------------------------------------
    # Add updated visible answers.
    # ---------------------------------------------------------
    for answer in data.answers:
        field = fields_by_id[answer.field_id]

        visible = is_field_visible(
            field=field,
            submitted_values=submitted_values,
            fields_by_name=fields_by_name,
        )

        if not visible:
            continue

        value = answer.value

        if isinstance(value, (dict, list)):
            detail = ResponseDetail(
                response_id=response.id,
                field_id=field.id,
                value=None,
                structured_value=value,
            )
        else:
            detail = ResponseDetail(
                response_id=response.id,
                field_id=field.id,
                value=(
                    str(value)
                    if value is not None
                    else None
                ),
                structured_value=None,
            )

        db.add(detail)

    # ---------------------------------------------------------
    # Build new values for audit tracking.
    # ---------------------------------------------------------
    new_values = {}

    for answer in data.answers:
        field = fields_by_id[answer.field_id]

        visible = is_field_visible(
            field=field,
            submitted_values=submitted_values,
            fields_by_name=fields_by_name,
        )

        if visible:
            new_values[answer.field_id] = answer.value

    # ---------------------------------------------------------
    # Detect changed fields.
    # ---------------------------------------------------------
    changes = {}

    for field in fields:
        old_value = old_values.get(field.id)
        new_value = new_values.get(field.id)

        if old_value != new_value:
            changes[field.name] = {
                "field_id": field.id,
                "label": field.label,
                "old_value": old_value,
                "new_value": new_value,
            }

    response.status = "submitted"

    # ---------------------------------------------------------
    # Create audit log.
    # ---------------------------------------------------------
    create_activity_log(
        db=db,
        user=current_user,
        action="RESPONSE_UPDATED",
        entity_type="response",
        entity_id=response.id,
        description=f"Response {response.id} was updated",
        metadata={
            "form_id": response.form_id,
            "response_id": response.id,
            "changes": changes,
        },
    )

    db.commit()

    updated_response = get_response_with_details(
        db=db,
        response_id=response.id,
    )

    return updated_response


@router.delete(
    "/responses/{response_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_response(
    response_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    response = get_response_with_details(
        db=db,
        response_id=response_id,
    )

    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Response not found",
        )

    if not can_manage_response(
        response=response,
        current_user=current_user,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this response",
        )

    # Create the audit log BEFORE deleting the response.
    create_activity_log(
        db=db,
        user=current_user,
        action="RESPONSE_DELETED",
        entity_type="response",
        entity_id=response.id,
        description=f"Response {response.id} was deleted",
        metadata={
            "form_id": response.form_id,
            "response_id": response.id,
        },
    )

    db.delete(response)
    db.commit()

    return None


@router.get(
    "/responses/{response_id}/history",
)
def get_response_history(
    response_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    response = db.scalar(
        select(FormResponse).where(
            FormResponse.id == response_id
        )
    )

    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Response not found",
        )

    form = db.scalar(
        select(Form).where(
            Form.id == response.form_id
        )
    )

    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found",
        )

    is_admin = (
        current_user.role
        and current_user.role.name == "Admin"
    )

    is_owner = response.user_id == current_user.id

    is_form_creator = (
        form.created_by == current_user.id
    )

    if not (
        is_admin
        or is_owner
        or is_form_creator
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this history",
        )

    statement = (
        select(ActivityLog)
        .where(
            ActivityLog.entity_type == "response",
            ActivityLog.entity_id == response_id,
        )
        .order_by(ActivityLog.created_at.desc())
    )

    logs = db.scalars(statement).all()

    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "description": log.description,
            "metadata": log.metadata_json,
            "created_at": log.created_at,
        }
        for log in logs
    ]