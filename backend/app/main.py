from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

from app.routers.auth import router as auth_router
from app.routers.forms import router as forms_router
from app.routers.form_fields import router as form_fields_router
from app.routers.public_forms import router as public_forms_router
from app.routers.responses import router as responses_router
from app.routers.dashboard import router as dashboard_router
from app.routers.form_analytics import router as form_analytics_router
from app.routers.activity_logs import router as activity_logs_router
from app.routers.tasks import router as tasks_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Dynamic Form Builder & Response Management System API"
    ),
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(forms_router)
app.include_router(form_fields_router)
app.include_router(public_forms_router)
app.include_router(responses_router)
app.include_router(dashboard_router)
app.include_router(form_analytics_router)
app.include_router(activity_logs_router)
app.include_router(tasks_router)

@app.get("/")
def root():
    return {
        "message": "Dynamic Form Builder API is running",
        "version": settings.APP_VERSION,
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "dynamic-form-builder-backend",
    }