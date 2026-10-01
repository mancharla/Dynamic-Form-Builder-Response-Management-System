from pydantic import BaseModel


class TaskStatusResponse(BaseModel):
    task_id: str
    state: str
    status: str
    result: dict | None = None