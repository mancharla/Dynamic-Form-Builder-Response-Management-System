from datetime import datetime

from pydantic import BaseModel, Field


class FormCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: str | None = None
    slug: str = Field(..., min_length=2, max_length=255)
    is_public: bool = False


class FormUpdate(BaseModel):
    title: str | None = Field(None, min_length=2, max_length=255)
    description: str | None = None
    slug: str | None = Field(None, min_length=2, max_length=255)
    is_public: bool | None = None
    is_enabled: bool | None = None


class FormResponse(BaseModel):
    id: int
    created_by: int
    title: str
    description: str | None
    slug: str
    is_public: bool
    is_enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }