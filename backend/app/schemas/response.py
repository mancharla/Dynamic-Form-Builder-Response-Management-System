from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ResponseAnswer(BaseModel):
    field_id: int
    value: Any = None


class FormResponseCreate(BaseModel):
    answers: list[ResponseAnswer] = Field(
        default_factory=list,
        min_length=1,
    )


class ResponseDetailResponse(BaseModel):
    id: int
    response_id: int
    field_id: int
    value: str | None
    structured_value: dict | list | None

    model_config = {"from_attributes": True}


class FormResponseResponse(BaseModel):
    id: int
    form_id: int
    user_id: int | None
    status: str
    submitted_at: datetime
    updated_at: datetime
    details: list[ResponseDetailResponse] = []

    model_config = {"from_attributes": True}
    
class ResponseListItem(BaseModel):
    id: int
    form_id: int
    user_id: int | None
    status: str
    submitted_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResponseUpdate(BaseModel):
    answers: list[ResponseAnswer] = Field(
        ...,
        min_length=1,
    )