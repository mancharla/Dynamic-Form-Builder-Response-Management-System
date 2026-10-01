from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.form import Form
from app.models.form_response import FormResponse
from app.models.user import User


def get_dashboard_statistics(db: Session) -> dict:
    total_users = db.scalar(
        select(func.count(User.id))
    ) or 0

    total_forms = db.scalar(
        select(func.count(Form.id))
    ) or 0

    active_forms = db.scalar(
        select(func.count(Form.id)).where(
            Form.is_enabled.is_(True)
        )
    ) or 0

    disabled_forms = db.scalar(
        select(func.count(Form.id)).where(
            Form.is_enabled.is_(False)
        )
    ) or 0

    total_responses = db.scalar(
        select(func.count(FormResponse.id))
    ) or 0

    return {
        "total_users": total_users,
        "total_forms": total_forms,
        "active_forms": active_forms,
        "disabled_forms": disabled_forms,
        "total_responses": total_responses,
    }