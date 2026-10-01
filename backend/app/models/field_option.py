from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class FieldOption(Base):
    __tablename__ = "field_options"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    field_id: Mapped[int] = mapped_column(
        ForeignKey("form_fields.id"),
        nullable=False,
    )

    label: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    value: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    option_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    field: Mapped["FormField"] = relationship(
        "FormField",
        back_populates="options",
    )