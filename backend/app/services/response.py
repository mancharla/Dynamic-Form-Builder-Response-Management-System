from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.form import Form
from app.models.form_field import FormField
from app.models.form_response import FormResponse
from app.models.response_detail import ResponseDetail
from app.models.user import User
from app.services.response_validation import (
    is_field_visible,
    validate_field_value,
)


def get_form_for_submission(
    db: Session,
    slug: str,
) -> Form:

    statement = (
        select(Form)
        .options(
            selectinload(Form.fields).selectinload(FormField.options)
        )
        .where(
            Form.slug == slug,
            Form.is_enabled.is_(True),
        )
    )

    form = db.scalar(statement)

    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found or disabled",
        )

    return form


def submit_form_response(
    db: Session,
    form: Form,
    answers: list[Any],
    current_user: User | None = None,
) -> FormResponse:

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

    submitted_values: dict[int, Any] = {}

    for answer in answers:

        if answer.field_id not in fields_by_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Field {answer.field_id} does not belong to this form",
            )

        if answer.field_id in submitted_values:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Duplicate answer for field {answer.field_id}",
            )

        submitted_values[answer.field_id] = answer.value

    # Validate required fields and conditional visibility
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

    # Remove answers for fields that are not visible.
    visible_answers = []

    for answer in answers:

        field = fields_by_id[answer.field_id]

        if is_field_visible(
            field=field,
            submitted_values=submitted_values,
            fields_by_name=fields_by_name,
        ):
            visible_answers.append(
                (field, answer.value)
            )

    response = FormResponse(
        form_id=form.id,
        user_id=current_user.id if current_user else None,
        status="submitted",
    )

    db.add(response)
    db.flush()

    for field, value in visible_answers:

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
                value=str(value) if value is not None else None,
                structured_value=None,
            )

        db.add(detail)

    db.commit()
    db.refresh(response)

    return response


def get_response_by_id(
    db: Session,
    response_id: int,
) -> FormResponse | None:

    statement = (
        select(FormResponse)
        .options(
            selectinload(FormResponse.details)
        )
        .where(FormResponse.id == response_id)
    )

    return db.scalar(statement)