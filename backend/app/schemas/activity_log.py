from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ActivityLogResponse(BaseModel):
    id: int
    user_id: int | None
    action: str
    entity_type: str | None
    entity_id: int | None
    description: str | None
    metadata: dict[str, Any] | None = Field(
        validation_alias="metadata_json",
    )
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityLogPageResponse(BaseModel):
    items: list[ActivityLogResponse]
    total: int
    page: int
    page_size: int