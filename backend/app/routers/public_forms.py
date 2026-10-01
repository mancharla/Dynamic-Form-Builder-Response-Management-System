from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.form_field import FormFieldResponse
from app.schemas.response import FormResponseCreate, FormResponseResponse
from app.services.response import (
    get_form_for_submission,
    get_response_by_id,
    submit_form_response,
)
from app.services.activity_log import create_activity_log

router = APIRouter(
    prefix="/api/v1/public/forms",
    tags=["Public Forms"],
)


@router.get("/{slug}")
def get_public_form(
    slug: str,
    db: Session = Depends(get_db),
):
    form = get_form_for_submission(
        db=db,
        slug=slug,
    )

    if not form.is_public:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This form is not public",
        )

    fields = sorted(
        form.fields,
        key=lambda field: (field.field_order, field.id),
    )

    return {
        "id": form.id,
        "title": form.title,
        "description": form.description,
        "slug": form.slug,
        "is_public": form.is_public,
        "is_enabled": form.is_enabled,
        "fields": [
            FormFieldResponse.model_validate(field)
            for field in fields
        ],
    }


@router.post(
    "/{slug}/responses",
    response_model=FormResponseResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_public_form(
    slug: str,
    data: FormResponseCreate,
    db: Session = Depends(get_db),
):
    form = get_form_for_submission(
        db=db,
        slug=slug,
    )

    if not form.is_public:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This form is not public",
        )

    response = submit_form_response(
    db=db,
    form=form,
    answers=data.answers,
    current_user=None,
    )

    create_activity_log(
        db=db,
        user=None,
        action="RESPONSE_SUBMITTED",
        entity_type="response",
        entity_id=response.id,
        description=f"Response {response.id} was submitted",
        metadata={
            "form_id": form.id,
            "response_id": response.id,
        },
    )

    db.commit()

    saved_response = get_response_by_id(
        db=db,
        response_id=response.id,
    )

    return saved_response