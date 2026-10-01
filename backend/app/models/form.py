from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Form(Base):
    __tablename__ = "forms"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    slug: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    is_public: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    is_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
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

    creator: Mapped["User"] = relationship(
        "User",
        back_populates="forms",
    )

    fields: Mapped[list["FormField"]] = relationship(
        "FormField",
        back_populates="form",
        cascade="all, delete-orphan",
    )

    responses: Mapped[list["FormResponse"]] = relationship(
        "FormResponse",
        back_populates="form",
        cascade="all, delete-orphan",
    )