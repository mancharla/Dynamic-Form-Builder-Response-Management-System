from datetime import date
from typing import Any

from fastapi import HTTPException, status

from app.models.form_field import FormField


OPTION_FIELD_TYPES = {"dropdown", "checkbox", "radio"}


def normalize_value(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def validate_email(value: Any) -> bool:
    email = normalize_value(value)

    if not email:
        return False

    if "@" not in email:
        return False

    local, domain = email.rsplit("@", 1)

    return bool(local and domain and "." in domain)


def validate_date_value(value: Any) -> date:
    try:
        return date.fromisoformat(normalize_value(value))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid date format. Expected YYYY-MM-DD",
        )


def validate_number(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid number value",
        )


def get_allowed_options(field: FormField) -> set[str]:
    return {option.value for option in field.options}


def validate_field_value(
    field: FormField,
    value: Any,
) -> None:

    # Required validation
    if field.is_required:
        if value is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field.label} is required",
            )

        if isinstance(value, list) and not value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field.label} is required",
            )

        if isinstance(value, str) and not value.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field.label} is required",
            )

    # Optional empty value
    if value is None or value == "":
        return

    rules = field.validation_rules or {}

    # Text validation
    if field.field_type == "text":
        text = normalize_value(value)

        min_length = rules.get("min_length")
        max_length = rules.get("max_length")

        if min_length is not None and len(text) < min_length:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field.label} must contain at least {min_length} characters",
            )

        if max_length is not None and len(text) > max_length:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field.label} must contain at most {max_length} characters",
            )

    # Email validation
    elif field.field_type == "email":
        if not validate_email(value):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field.label} must be a valid email address",
            )

    # Number validation
    elif field.field_type == "number":
        number = validate_number(value)

        minimum = rules.get("min")
        maximum = rules.get("max")

        if minimum is not None and number < minimum:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field.label} must be at least {minimum}",
            )

        if maximum is not None and number > maximum:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field.label} must be at most {maximum}",
            )

    # Date validation
    elif field.field_type == "date":
        selected_date = validate_date_value(value)

        min_date = rules.get("min_date")
        max_date = rules.get("max_date")

        if min_date:
            minimum_date = date.fromisoformat(min_date)

            if selected_date < minimum_date:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"{field.label} must be on or after {min_date}",
                )

        if max_date:
            maximum_date = date.fromisoformat(max_date)

            if selected_date > maximum_date:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"{field.label} must be on or before {max_date}",
                )

    # Dropdown / Radio
    elif field.field_type in {"dropdown", "radio"}:
        allowed_options = get_allowed_options(field)

        if normalize_value(value) not in allowed_options:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid option selected for {field.label}",
            )

    # Checkbox
    elif field.field_type == "checkbox":
        if not isinstance(value, list):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field.label} must contain a list of selected options",
            )

        allowed_options = get_allowed_options(field)

        invalid_options = [
            item
            for item in value
            if normalize_value(item) not in allowed_options
        ]

        if invalid_options:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid option selected for {field.label}",
            )

    # Rating
    elif field.field_type == "rating":
        rating = validate_number(value)

        minimum = rules.get("min", 1)
        maximum = rules.get("max", 5)

        if rating < minimum or rating > maximum:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field.label} must be between {minimum} and {maximum}",
            )

    # File
    elif field.field_type == "file":
        if not isinstance(value, dict):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid file information for {field.label}",
            )
def evaluate_condition(
    condition: dict,
    submitted_values: dict[int, Any],
    fields_by_name: dict[str, FormField],
) -> bool:

    field_name = condition.get("field")
    operator = condition.get("operator")
    expected_value = condition.get("value")

    referenced_field = fields_by_name.get(field_name)

    if not referenced_field:
        return False

    actual_value = submitted_values.get(referenced_field.id)

    if operator == "equals":
        return actual_value == expected_value

    if operator == "not_equals":
        return actual_value != expected_value

    if operator == "contains":
        if isinstance(actual_value, list):
            return expected_value in actual_value

        return str(expected_value) in str(actual_value)

    if operator == "not_contains":
        if isinstance(actual_value, list):
            return expected_value not in actual_value

        return str(expected_value) not in str(actual_value)

    if operator == "greater_than":
        return float(actual_value) > float(expected_value)

    if operator == "less_than":
        return float(actual_value) < float(expected_value)

    return False


def is_field_visible(
    field: FormField,
    submitted_values: dict[int, Any],
    fields_by_name: dict[str, FormField],
) -> bool:

    if not field.conditional_logic:
        return True

    logic = field.conditional_logic.get("logic", "AND")
    conditions = field.conditional_logic.get("conditions", [])

    if not conditions:
        return True

    results = [
        evaluate_condition(
            condition,
            submitted_values,
            fields_by_name,
        )
        for condition in conditions
    ]

    if logic == "OR":
        return any(results)

    return all(results)