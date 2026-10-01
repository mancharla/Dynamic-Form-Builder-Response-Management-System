from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.form import Form
from app.models.user import User
from app.schemas.dashboard import FormAnalyticsResponse
from app.services.excel_export import export_form_responses_to_excel
from app.services.form_analytics import get_form_analytics
from app.services.pdf_export import export_form_responses_to_pdf
from app.tasks.export_tasks import generate_excel_export

router = APIRouter(
    prefix="/api/v1/forms",
    tags=["Form Analytics"],
)


@router.get(
    "/{form_id}/analytics",
    response_model=FormAnalyticsResponse,
)
def get_analytics(
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
            detail="You do not have permission to view analytics for this form",
        )

    analytics = get_form_analytics(
        db=db,
        form_id=form_id,
    )

    if analytics is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found",
        )

    return analytics


@router.get(
    "/{form_id}/export/excel",
)
def export_excel(
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
            detail="You do not have permission to export this form",
        )

    result = export_form_responses_to_excel(
        db=db,
        form_id=form_id,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found",
        )

    output, filename = result

    return StreamingResponse(
        output,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"'
            )
        },
    )
@router.get(
    "/{form_id}/export/pdf",
)
def export_pdf(
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
            detail="You do not have permission to export this form",
        )

    result = export_form_responses_to_pdf(
        db=db,
        form_id=form_id,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found",
        )

    output, filename = result

    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"'
            )
        },
    )
@router.post(
    "/{form_id}/export/excel/async",
)
def start_excel_export(
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
            detail="You do not have permission to export this form",
        )

    task = generate_excel_export.delay(form_id)

    return {
        "message": "Excel export started",
        "task_id": task.id,
        "form_id": form_id,
        "status": "queued",
    }