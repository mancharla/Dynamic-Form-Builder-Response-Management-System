from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.activity_log import ActivityLogPageResponse
from app.services.activity_log import get_activity_logs


router = APIRouter(
    prefix="/api/v1/activity-logs",
    tags=["Activity Logs"],
)


@router.get(
    "",
    response_model=ActivityLogPageResponse,
)
def list_activity_logs(
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    action: str | None = Query(
        default=None,
    ),
    entity_type: str | None = Query(
        default=None,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_admin = (
        current_user.role
        and current_user.role.name == "Admin"
    )

    logs, total = get_activity_logs(
        db=db,
        page=page,
        page_size=page_size,
        action=action,
        entity_type=entity_type,
        user_id=None if is_admin else current_user.id,
    )

    return {
        "items": logs,
        "total": total,
        "page": page,
        "page_size": page_size,
    }