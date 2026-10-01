from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.form import Form
from app.models.user import User
from app.schemas.form import FormCreate, FormResponse, FormUpdate
from app.services.activity_log import create_activity_log

router = APIRouter(
    prefix="/api/v1/forms",
    tags=["Forms"],
)


def get_manageable_form(
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


@router.post(
    "",
    response_model=FormResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_form(
    data: FormCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check whether slug already exists
    existing_form = db.scalar(
        select(Form).where(Form.slug == data.slug)
    )

    if existing_form:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A form with this slug already exists",
        )

    new_form = Form(
        created_by=current_user.id,
        title=data.title,
        description=data.description,
        slug=data.slug,
        is_public=data.is_public,
        is_enabled=True,
    )

    db.add(new_form)
    db.flush()

    create_activity_log(
        db=db,
        user=current_user,
        action="FORM_CREATED",
        entity_type="form",
        entity_id=new_form.id,
        description=f"Form '{new_form.title}' was created",
        metadata={
            "form_id": new_form.id,
            "title": new_form.title,
            "slug": new_form.slug,
        },
    )

    db.commit()
    db.refresh(new_form)

    return new_form


@router.get(
    "",
    response_model=list[FormResponse],
)
def list_forms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    statement = select(Form)

    is_admin = (
        current_user.role
        and current_user.role.name == "Admin"
    )

    if not is_admin:
        statement = statement.where(
            Form.created_by == current_user.id
        )

    statement = statement.order_by(Form.created_at.desc())

    return db.scalars(statement).all()


@router.get(
    "/{form_id}",
    response_model=FormResponse,
)
def get_form(
    form_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_manageable_form(form_id, current_user, db)


@router.put(
    "/{form_id}",
    response_model=FormResponse,
)
def update_form(
    form_id: int,
    data: FormUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    form = get_manageable_form(form_id, current_user, db)

    # Check slug uniqueness if slug is being changed
    if data.slug is not None and data.slug != form.slug:
        existing_form = db.scalar(
            select(Form).where(
                Form.slug == data.slug,
                Form.id != form_id,
            )
        )

        if existing_form:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A form with this slug already exists",
            )

    # Capture old values before updating
    old_values = {
        "title": form.title,
        "description": form.description,
        "slug": form.slug,
        "is_public": form.is_public,
        "is_enabled": form.is_enabled,
    }

    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(form, field, value)

    # Capture new values after updating
    new_values = {
        "title": form.title,
        "description": form.description,
        "slug": form.slug,
        "is_public": form.is_public,
        "is_enabled": form.is_enabled,
    }

    # Detect changed values
    changes = {}

    for field_name in old_values:
        if old_values[field_name] != new_values[field_name]:
            changes[field_name] = {
                "old_value": old_values[field_name],
                "new_value": new_values[field_name],
            }

    create_activity_log(
        db=db,
        user=current_user,
        action="FORM_UPDATED",
        entity_type="form",
        entity_id=form.id,
        description=f"Form '{form.title}' was updated",
        metadata={
            "form_id": form.id,
            "changes": changes,
        },
    )

    db.commit()
    db.refresh(form)

    return form


@router.delete(
    "/{form_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_form(
    form_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    form = get_manageable_form(form_id, current_user, db)

    # Create audit log before deleting the form
    create_activity_log(
        db=db,
        user=current_user,
        action="FORM_DELETED",
        entity_type="form",
        entity_id=form.id,
        description=f"Form '{form.title}' was deleted",
        metadata={
            "form_id": form.id,
            "title": form.title,
            "slug": form.slug,
        },
    )

    db.delete(form)
    db.commit()

    return None


@router.patch(
    "/{form_id}/enable",
    response_model=FormResponse,
)
def enable_form(
    form_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    form = get_manageable_form(form_id, current_user, db)

    form.is_enabled = True

    create_activity_log(
        db=db,
        user=current_user,
        action="FORM_ENABLED",
        entity_type="form",
        entity_id=form.id,
        description=f"Form '{form.title}' was enabled",
        metadata={
            "form_id": form.id,
            "is_enabled": True,
        },
    )

    db.commit()
    db.refresh(form)

    return form


@router.patch(
    "/{form_id}/disable",
    response_model=FormResponse,
)
def disable_form(
    form_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    form = get_manageable_form(form_id, current_user, db)

    form.is_enabled = False

    create_activity_log(
        db=db,
        user=current_user,
        action="FORM_DISABLED",
        entity_type="form",
        entity_id=form.id,
        description=f"Form '{form.title}' was disabled",
        metadata={
            "form_id": form.id,
            "is_enabled": False,
        },
    )

    db.commit()
    db.refresh(form)

    return form