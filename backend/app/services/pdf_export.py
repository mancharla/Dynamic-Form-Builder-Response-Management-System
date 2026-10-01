from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.form import Form
from app.models.form_field import FormField
from app.models.form_response import FormResponse


def export_form_responses_to_pdf(
    db: Session,
    form_id: int,
) -> tuple[BytesIO, str] | None:

    statement = (
        select(Form)
        .options(
            selectinload(Form.fields),
            selectinload(Form.responses).selectinload(
                FormResponse.details
            ),
        )
        .where(Form.id == form_id)
    )

    form = db.scalar(statement)

    if not form:
        return None

    fields = sorted(
        form.fields,
        key=lambda field: (field.field_order, field.id),
    )

    responses = sorted(
        form.responses,
        key=lambda response: response.submitted_at,
    )

    output = BytesIO()

    document = SimpleDocTemplate(
        output,
        pagesize=landscape(A4),
        rightMargin=10 * mm,
        leftMargin=10 * mm,
        topMargin=10 * mm,
        bottomMargin=10 * mm,
    )

    styles = getSampleStyleSheet()

    elements = []

    # ---------------------------------------
    # Title
    # ---------------------------------------

    elements.append(
        Paragraph(
            f"Form Responses - {form.title}",
            styles["Title"],
        )
    )

    elements.append(
        Spacer(1, 8)
    )

    elements.append(
        Paragraph(
            f"Total Responses: {len(responses)}",
            styles["Normal"],
        )
    )

    elements.append(
        Spacer(1, 10)
    )

    # ---------------------------------------
    # Table headers
    # ---------------------------------------

    headers = [
        "ID",
        "User ID",
        "Status",
        "Submitted At",
    ]

    headers.extend(
        field.label
        for field in fields
    )

    table_data = [headers]

    # ---------------------------------------
    # Response rows
    # ---------------------------------------

    for response in responses:

        detail_map = {
            detail.field_id: (
                detail.structured_value
                if detail.structured_value is not None
                else detail.value
            )
            for detail in response.details
        }

        row = [
            str(response.id),
            (
                str(response.user_id)
                if response.user_id is not None
                else "Anonymous"
            ),
            response.status,
            response.submitted_at.strftime(
                "%Y-%m-%d %H:%M"
            ),
        ]

        for field in fields:

            value = detail_map.get(field.id)

            if isinstance(value, list):
                value = ", ".join(
                    str(item)
                    for item in value
                )

            elif isinstance(value, dict):
                value = str(value)

            if value is None:
                value = ""

            row.append(str(value))

        table_data.append(row)

    # ---------------------------------------
    # Create table
    # ---------------------------------------

    table = Table(
        table_data,
        repeatRows=1,
    )

    table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.HexColor("#1f2937"),
                ),
                (
                    "TEXTCOLOR",
                    (0, 0),
                    (-1, 0),
                    colors.white,
                ),
                (
                    "FONTNAME",
                    (0, 0),
                    (-1, 0),
                    "Helvetica-Bold",
                ),
                (
                    "FONTSIZE",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.grey,
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "TOP",
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    4,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    4,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    4,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    4,
                ),
            ]
        )
    )

    elements.append(table)

    # ---------------------------------------
    # Build PDF
    # ---------------------------------------

    document.build(elements)

    output.seek(0)

    filename = (
        f"{form.slug}_responses.pdf"
    )

    return output, filename