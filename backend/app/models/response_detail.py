from sqlalchemy import ForeignKey, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ResponseDetail(Base):
    __tablename__ = "response_details"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    response_id: Mapped[int] = mapped_column(
        ForeignKey("form_responses.id"),
        nullable=False,
    )

    field_id: Mapped[int] = mapped_column(
        ForeignKey("form_fields.id"),
        nullable=False,
    )

    value: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    structured_value: Mapped[dict | list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    response: Mapped["FormResponse"] = relationship(
        "FormResponse",
        back_populates="details",
    )

    field: Mapped["FormField"] = relationship(
        "FormField",
        back_populates="response_details",
    )