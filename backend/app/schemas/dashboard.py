from datetime import date
from pydantic import BaseModel


class DashboardResponse(BaseModel):
    total_users: int
    total_forms: int
    active_forms: int
    disabled_forms: int
    total_responses: int


class ResponseTrendItem(BaseModel):
    date: date
    count: int


class FieldAnalyticsItem(BaseModel):
    field_id: int
    field_name: str
    field_label: str
    field_type: str
    total_answers: int
    distribution: dict[str, int]


class FormAnalyticsResponse(BaseModel):
    form_id: int
    form_title: str
    total_responses: int
    response_trend: list[ResponseTrendItem]
    field_analytics: list[FieldAnalyticsItem]