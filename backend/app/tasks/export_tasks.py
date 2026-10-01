from pathlib import Path

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.services.excel_export import export_form_responses_to_excel
from app.core.celery_app import celery_app


EXPORT_DIRECTORY = Path("exports")


@celery_app.task(
    name="app.tasks.export_tasks.generate_excel_export"
)
def generate_excel_export(form_id: int) -> dict:
    db: Session = SessionLocal()

    try:
        result = export_form_responses_to_excel(
            db=db,
            form_id=form_id,
        )

        if result is None:
            return {
                "status": "failed",
                "message": "Form not found",
                "form_id": form_id,
            }

        output, filename = result

        EXPORT_DIRECTORY.mkdir(
            parents=True,
            exist_ok=True,
        )

        file_path = EXPORT_DIRECTORY / filename

        with open(file_path, "wb") as file:
            file.write(output.read())

        return {
            "status": "success",
            "form_id": form_id,
            "filename": filename,
            "file_path": str(file_path),
        }

    except Exception as exc:
        return {
            "status": "failed",
            "form_id": form_id,
            "message": str(exc),
        }

    finally:
        db.close()