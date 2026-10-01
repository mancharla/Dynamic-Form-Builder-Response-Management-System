from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class FormResponse(Base):
    __tablename__ = "form_responses"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    form_id: Mapped[int] = mapped_column(
        ForeignKey("forms.id"),
        nullable=False,
    )

    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="submitted",
        nullable=False,
    )

    submitted_at: Mapped[datetime] = mapped_column(
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
        back_populates="responses",
    )

    user: Mapped["User | None"] = relationship(
        "User",
        back_populates="responses",
    )

    details: Mapped[list["ResponseDetail"]] = relationship(
        "ResponseDetail",
        back_populates="response",
        cascade="all, delete-orphan",
    )