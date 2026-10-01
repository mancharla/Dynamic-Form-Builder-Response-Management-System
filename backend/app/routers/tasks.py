from fastapi import APIRouter, Depends
from celery.result import AsyncResult

from app.core.celery_app import celery_app
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.task import TaskStatusResponse


router = APIRouter(
    prefix="/api/v1/tasks",
    tags=["Tasks"],
)


@router.get("/{task_id}", response_model=TaskStatusResponse)
def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    task = AsyncResult(task_id, app=celery_app)

    state = task.state
    result = task.result if isinstance(task.result, dict) else None

    if state == "PENDING":
        status = "queued"

    elif state == "STARTED":
        status = "started"

    elif state == "SUCCESS":
        if result and result.get("status") == "failed":
            status = "failed"
        else:
            status = "success"

    elif state == "FAILURE":
        status = "failed"

    elif state == "RETRY":
        status = "retrying"

    else:
        status = state.lower()

    return {
        "task_id": task_id,
        "state": state,
        "status": status,
        "result": result,
    }