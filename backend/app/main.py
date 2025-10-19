from .auth.middleware import AuthMiddleware
from .auth.routes import router as auth_router
from fastapi import FastAPI
from .api.routes import router as api_router
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware import Middleware
import json
import os

middleware = [
    Middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    ),
    Middleware(AuthMiddleware),
]

app = FastAPI(middleware=middleware)

app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(api_router, prefix="/api", tags=["API"])

# Sobrescrever o schema OpenAPI com o arquivo customizado
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_path = os.path.join(os.path.dirname(__file__), "openapi.json")
    with open(openapi_path, "r", encoding="utf-8") as f:
        openapi_schema = json.load(f)

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
