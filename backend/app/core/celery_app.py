from celery import Celery

from app.core.config import settings


celery_app = Celery(
    "dynamic_form_builder",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=False,
    task_track_started=True,
    task_time_limit=300,
    task_soft_time_limit=240,
)

celery_app.autodiscover_tasks(
    [
        "app.tasks",
    ]
)