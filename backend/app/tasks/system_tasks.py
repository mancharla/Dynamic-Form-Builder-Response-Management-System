from app.core.celery_app import celery_app


@celery_app.task(
    name="app.tasks.system_tasks.health_check_task"
)
def health_check_task() -> dict:
    return {
        "status": "success",
        "message": "Celery worker is running",
    }