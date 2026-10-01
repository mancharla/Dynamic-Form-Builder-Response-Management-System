from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.field_option import FieldOption
from app.models.form import Form
from app.models.form_field import FormField
from app.models.user import User
from app.schemas.form_field import (
    FieldOptionCreate,
    FormFieldCreate,
    FormFieldResponse,
    FormFieldUpdate,
    ReorderFieldsRequest,
)

router = APIRouter(
    prefix="/api/v1/forms",
    tags=["Form Fields"],
)


def get_owned_form(
    form_id: int,
    current_user: User,
    db: Session,
) -> Form:
    form = db.scalar(
        select(Form).where(Form.id == form_id)
    )

    is_admin = (
        current_user.role
        and current_user.role.name == "Admin"
    )

    if not form or (
        not is_admin
        and form.created_by != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found",
        )

    return form


def get_owned_field(
    field_id: int,
    current_user: User,
    db: Session,
) -> FormField:
    statement = (
        select(FormField)
        .join(Form, Form.id == FormField.form_id)
        .where(FormField.id == field_id)
    )

    field = db.scalar(statement)

    is_admin = (
        current_user.role
        and current_user.role.name == "Admin"
    )

    if not field or (
        not is_admin
        and field.form.created_by != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found",
        )

    return field


@router.post(
    "/{form_id}/fields",
    response_model=FormFieldResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_field(
    form_id: int,
    data: FormFieldCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_owned_form(form_id, current_user, db)

    existing_field = db.scalar(
        select(FormField).where(
            FormField.form_id == form_id,
            FormField.name == data.name,
        )
    )

    if existing_field:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A field with this name already exists in this form",
        )

    field = FormField(
        form_id=form_id,
        label=data.label,
        field_type=data.field_type,
        name=data.name,
        placeholder=data.placeholder,
        description=data.description,
        is_required=data.is_required,
        field_order=data.field_order,
        validation_rules=data.validation_rules,
        conditional_logic=(
            data.conditional_logic.model_dump()
            if data.conditional_logic is not None
            else None
        ),
    )

    db.add(field)
    db.flush()

    for option_data in data.options:
        option = FieldOption(
            field_id=field.id,
            label=option_data.label,
            value=option_data.value,
            option_order=option_data.option_order,
        )
        db.add(option)

    db.commit()
    db.refresh(field)

    return field


@router.get(
    "/{form_id}/fields",
    response_model=list[FormFieldResponse],
)
def list_fields(
    form_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_owned_form(form_id, current_user, db)

    statement = (
        select(FormField)
        .where(FormField.form_id == form_id)
        .order_by(FormField.field_order.asc(), FormField.id.asc())
    )

    return db.scalars(statement).all()


@router.get(
    "/fields/{field_id}",
    response_model=FormFieldResponse,
)
def get_field(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_owned_field(field_id, current_user, db)


@router.put(
    "/fields/{field_id}",
    response_model=FormFieldResponse,
)
def update_field(
    field_id: int,
    data: FormFieldUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    field = get_owned_field(field_id, current_user, db)

    update_data = data.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"] != field.name:
        existing_field = db.scalar(
            select(FormField).where(
                FormField.form_id == field.form_id,
                FormField.name == update_data["name"],
                FormField.id != field.id,
            )
        )

        if existing_field:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A field with this name already exists in this form",
            )

    for key in [
        "label",
        "field_type",
        "name",
        "placeholder",
        "description",
        "is_required",
        "field_order",
        "validation_rules",
    ]:
        if key in update_data:
            setattr(field, key, update_data[key])

    if "conditional_logic" in update_data:
        conditional_logic = update_data["conditional_logic"]
        field.conditional_logic = (conditional_logic.model_dump()
        if conditional_logic is not None
        else None
        )
    if "options" in update_data:
        db.query(FieldOption).filter(
            FieldOption.field_id == field.id
        ).delete(synchronize_session=False)

        for option_data in update_data["options"] or []:
            db.add(
                FieldOption(
                    field_id=field.id,
                    label=option_data["label"],
                    value=option_data["value"],
                    option_order=option_data["option_order"],
                )
            )

    db.commit()
    db.refresh(field)

    return field


@router.delete(
    "/fields/{field_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_field(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    field = get_owned_field(field_id, current_user, db)

    db.delete(field)
    db.commit()


@router.patch(
    "/{form_id}/fields/reorder",
    response_model=list[FormFieldResponse],
)
def reorder_fields(
    form_id: int,
    data: ReorderFieldsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_owned_form(form_id, current_user, db)

    field_ids = [item.field_id for item in data.fields]

    fields = db.scalars(
        select(FormField).where(
            FormField.form_id == form_id,
            FormField.id.in_(field_ids),
        )
    ).all()

    field_map = {field.id: field for field in fields}

    if len(field_map) != len(field_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more fields do not belong to this form",
        )

    for item in data.fields:
        field_map[item.field_id].field_order = item.field_order

    db.commit()

    statement = (
        select(FormField)
        .where(FormField.form_id == form_id)
        .order_by(FormField.field_order.asc(), FormField.id.asc())
    )

    return db.scalars(statement).all()