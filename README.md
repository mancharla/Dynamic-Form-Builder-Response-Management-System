# Dynamic Form Builder & Response Management System

A full-stack application for creating dynamic forms, collecting public responses, managing submissions, and reviewing form activity and analytics.

## Features

- JWT authentication with `Admin` and `User` roles
- Form creation, editing, enable/disable controls, and deletion
- Dynamic field builder with:
	- Text
	- Number
	- Email
	- Date
	- Dropdown
	- Checkbox
	- Radio
	- File metadata
	- Rating
- Required-field and field-specific validation
- Conditional field visibility
- Configurable options for dropdown, checkbox, and radio fields
- Public form links that do not require login: `/f/<form-slug>`
- Public response submission and confirmation references
- Response review, editing, deletion, and history
- Dashboard statistics and response summaries
- Per-form analytics with response trends and answer distributions
- Excel and PDF response exports
- Activity logs with filters, pagination, and event metadata
- Admin access to all forms, fields, responses, analytics, and activity logs
- User profile name editing from the account menu

## Project Structure

```text
backend/     FastAPI API, SQLAlchemy models, Alembic migrations, Celery tasks
frontend/    React + TypeScript + Vite application
exports/     Generated asynchronous export files
```

## Technology Stack

### Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic Settings
- Alembic
- JWT authentication
- Celery and Redis for asynchronous exports

### Frontend

- React 19
- TypeScript
- Vite
- Material UI
- React Router
- Axios
- Chart.js and `react-chartjs-2`
- React Hook Form

## Requirements

- Python 3.10 or newer
- Node.js 20 or newer
- A configured database supported by the project settings
- Redis if asynchronous Excel exports are used

## Configuration

Create a `.env` file in `backend/` with values similar to:

```env
DATABASE_URL=sqlite:///./app.db
JWT_SECRET_KEY=replace-with-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REDIS_URL=redis://localhost:6379/0
DEBUG=true
```

Use the database URL format required by your SQLAlchemy driver for PostgreSQL or another database.

## Backend Setup

From the repository root:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r Requirements.txt
alembic upgrade head
python -m app.services.seed
uvicorn app.main:app --reload
```

The API runs at `http://127.0.0.1:8000`.

API documentation is available at:

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/redoc`

## Frontend Setup

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at `http://127.0.0.1:5173`.

For a production build:

```powershell
npm run build
```

## Main Routes

### Authenticated routes

- `/login`
- `/register`
- `/dashboard`
- `/forms`
- `/forms/:formId/builder`
- `/responses`
- `/analytics`
- `/activity-logs`

### Public form route

```text
/f/<form-slug>
```

Public forms can be opened without authentication. A public form must be enabled and marked public.

## API Areas

The backend exposes API routes under `/api/v1`:

- `/auth` - registration, login, current profile, and profile name updates
- `/forms` - form management and form listing
- `/forms/{form_id}/fields` - field creation and listing
- `/forms/fields/{field_id}` - field detail, update, and deletion
- `/forms/{form_id}/responses` - response listing
- `/responses/{response_id}` - response detail, update, deletion, and history
- `/public/forms/{slug}` - public form retrieval
- `/public/forms/{slug}/responses` - public response submission
- `/forms/{form_id}/analytics` - form analytics
- `/forms/{form_id}/export/excel` - Excel export
- `/forms/{form_id}/export/pdf` - PDF export
- `/activity-logs` - filtered and paginated activity logs
- `/tasks/{task_id}` - asynchronous export task status

## Role-Based Access

### User

- Can manage their own forms and fields
- Can view and manage responses for their own forms
- Can view analytics and exports for their own forms
- Sees activity related to their own user actions

### Admin

- Can view all forms and responses
- Can edit forms and fields across the workspace
- Can view analytics and exports for all forms
- Can view all activity logs
- Can manage responses across the workspace

## Public Response Payload

Public submissions use this shape:

```json
{
	"answers": [
		{ "field_id": 12, "value": "example" },
		{ "field_id": 13, "value": ["option_a", "option_b"] }
	]
}
```

## Notes

- Backend timestamps are stored as UTC and displayed in the browser's local timezone.
- File fields currently submit file metadata only. Binary file storage is not configured.
- Generated export files are written to the backend `exports/` directory.
