from datetime import datetime

from pydantic import BaseModel, Field, model_validator
from typing import Any

SUPPORTED_FIELD_TYPES = {
    "text",
    "number",
    "email",
    "date",
    "dropdown",
    "checkbox",
    "radio",
    "file",
    "rating",
}


class FieldOptionCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=255)
    value: str = Field(..., min_length=1, max_length=255)
    option_order: int = Field(default=0, ge=0)


class FieldOptionResponse(BaseModel):
    id: int
    field_id: int
    label: str
    value: str
    option_order: int

    model_config = {"from_attributes": True}

class ConditionalLogic(BaseModel):
    field: str = Field(..., min_length=1, max_length=100)
    operator: str = Field(..., min_length=1, max_length=50)
    value: Any = None


class ConditionalLogicGroup(BaseModel):
    logic: str = Field(default="AND", pattern="^(AND|OR)$")
    conditions: list[ConditionalLogic] = Field(default_factory=list)


class FormFieldCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=255)
    field_type: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    placeholder: str | None = Field(default=None, max_length=255)
    description: str | None = None
    is_required: bool = False
    field_order: int = Field(default=0, ge=0)
    validation_rules: dict | None = None
    conditional_logic: ConditionalLogicGroup | None = None
    options: list[FieldOptionCreate] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_field(self):
        if self.field_type not in SUPPORTED_FIELD_TYPES:
            raise ValueError(
                f"Unsupported field type. Supported types: "
                f"{', '.join(sorted(SUPPORTED_FIELD_TYPES))}"
            )

        option_types = {"dropdown", "checkbox", "radio"}

        if self.field_type in option_types and not self.options:
            raise ValueError(
                f"{self.field_type} fields require at least one option"
            )

        if self.field_type not in option_types and self.options:
            raise ValueError(
                f"{self.field_type} fields cannot contain options"
            )

        return self


class FormFieldUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=255)
    field_type: str | None = Field(default=None, min_length=1, max_length=50)
    name: str | None = Field(default=None, min_length=1, max_length=100)
    placeholder: str | None = Field(default=None, max_length=255)
    description: str | None = None
    is_required: bool | None = None
    field_order: int | None = Field(default=None, ge=0)
    validation_rules: dict | None = None
    conditional_logic: ConditionalLogicGroup | None = None
    options: list[FieldOptionCreate] | None = None

    @model_validator(mode="after")
    def validate_field_update(self):
        if (
            self.field_type is not None
            and self.field_type not in SUPPORTED_FIELD_TYPES
        ):
            raise ValueError(
                f"Unsupported field type. Supported types: "
                f"{', '.join(sorted(SUPPORTED_FIELD_TYPES))}"
            )

        if self.field_type in {"dropdown", "checkbox", "radio"}:
            if self.options is not None and not self.options:
                raise ValueError(
                    f"{self.field_type} fields require at least one option"
                )

        if (
            self.field_type is not None
            and self.field_type not in {"dropdown", "checkbox", "radio"}
            and self.options
        ):
            raise ValueError(
                f"{self.field_type} fields cannot contain options"
            )

        return self

class FormFieldResponse(BaseModel):
    id: int
    form_id: int
    label: str
    field_type: str
    name: str
    placeholder: str | None
    description: str | None
    is_required: bool
    field_order: int
    validation_rules: dict | None
    conditional_logic: dict | None
    created_at: datetime
    updated_at: datetime
    options: list[FieldOptionResponse] = []

    model_config = {"from_attributes": True}


class ReorderFieldItem(BaseModel):
    field_id: int
    field_order: int = Field(..., ge=0)


class ReorderFieldsRequest(BaseModel):
    fields: list[ReorderFieldItem] = Field(..., min_length=1)