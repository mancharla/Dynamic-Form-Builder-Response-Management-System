from collections import Counter
from datetime import date
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.form import Form
from app.models.form_field import FormField
from app.models.form_response import FormResponse
from app.models.response_detail import ResponseDetail


def get_form_analytics(
    db: Session,
    form_id: int,
) -> dict | None:
    statement = (
        select(Form)
        .options(
            selectinload(Form.fields).selectinload(FormField.options),
            selectinload(Form.responses).selectinload(FormResponse.details),
        )
        .where(Form.id == form_id)
    )

    form = db.scalar(statement)

    if not form:
        return None

    responses = list(form.responses)

    # ---------------------------------------
    # Response trend
    # ---------------------------------------

    trend_counter = Counter(
        response.submitted_at.date()
        for response in responses
    )

    response_trend = [
        {
            "date": response_date,
            "count": count,
        }
        for response_date, count in sorted(trend_counter.items())
    ]

    # ---------------------------------------
    # Field analytics
    # ---------------------------------------

    field_analytics = []

    for field in sorted(
        form.fields,
        key=lambda item: (item.field_order, item.id),
    ):
        values = []

        for response in responses:
            for detail in response.details:
                if detail.field_id != field.id:
                    continue

                if detail.structured_value is not None:
                    value = detail.structured_value
                else:
                    value = detail.value

                if value is None:
                    continue

                if isinstance(value, list):
                    values.extend(value)
                else:
                    values.append(value)

        distribution_counter = Counter(
            str(value)
            for value in values
        )

        distribution = dict(
            sorted(
                distribution_counter.items(),
                key=lambda item: (-item[1], item[0]),
            )
        )

        field_analytics.append(
            {
                "field_id": field.id,
                "field_name": field.name,
                "field_label": field.label,
                "field_type": field.field_type,
                "total_answers": len(values),
                "distribution": distribution,
            }
        )

    return {
        "form_id": form.id,
        "form_title": form.title,
        "total_responses": len(responses),
        "response_trend": response_trend,
        "field_analytics": field_analytics,
    }