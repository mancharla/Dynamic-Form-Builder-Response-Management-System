from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.activity_log import ActivityLog
from app.models.user import User


def create_activity_log(
    db: Session,
    user: User | None,
    action: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    description: str | None = None,
    metadata: dict | None = None,
) -> ActivityLog:
    log = ActivityLog(
        user_id=user.id if user else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        metadata_json=metadata,
    )

    db.add(log)

    return log


def get_activity_logs(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    action: str | None = None,
    entity_type: str | None = None,
    user_id: int | None = None,
) -> tuple[list[ActivityLog], int]:

    statement = select(ActivityLog)

    count_statement = select(
        func.count(ActivityLog.id)
    )

    if action:
        statement = statement.where(
            ActivityLog.action == action
        )

        count_statement = count_statement.where(
            ActivityLog.action == action
        )

    if entity_type:
        statement = statement.where(
            ActivityLog.entity_type == entity_type
        )

        count_statement = count_statement.where(
            ActivityLog.entity_type == entity_type
        )

    if user_id is not None:
        statement = statement.where(
            ActivityLog.user_id == user_id
        )

        count_statement = count_statement.where(
            ActivityLog.user_id == user_id
        )

    total = db.scalar(count_statement) or 0

    offset = (page - 1) * page_size

    statement = (
        statement
        .order_by(ActivityLog.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )

    logs = db.scalars(statement).all()

    return list(logs), total