from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class FormField(Base):
    __tablename__ = "form_fields"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    form_id: Mapped[int] = mapped_column(
        ForeignKey("forms.id"),
        nullable=False,
    )

    label: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    field_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    placeholder: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    is_required: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    field_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    validation_rules: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    conditional_logic: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    form: Mapped["Form"] = relationship(
        "Form",
        back_populates="fields",
    )

    options: Mapped[list["FieldOption"]] = relationship(
        "FieldOption",
        back_populates="field",
        cascade="all, delete-orphan",
    )

    response_details: Mapped[list["ResponseDetail"]] = relationship(
        "ResponseDetail",
        back_populates="field",
    )