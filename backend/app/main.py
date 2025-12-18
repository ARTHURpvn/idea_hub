from .auth.middleware import AuthMiddleware
from .auth.routes import router as auth_router
from fastapi import FastAPI
from .api.routes import router as api_router
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware import Middleware
import json
import os
import asyncio
from .database.create_db import ensure_database_and_tables
from contextlib import asynccontextmanager

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


@asynccontextmanager
async def lifespan(app):
    """Lifespan handler que garante o banco na inicialização.

    Executa a função síncrona em uma thread para não bloquear o loop async.
    """
    try:
        await asyncio.to_thread(ensure_database_and_tables)
    except Exception as e:
        print(f"[lifespan] aviso: falha ao garantir DB na startup: {e}")
    yield


app = FastAPI(middleware=middleware, lifespan=lifespan)

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


# Rota raiz para facilitar testes e health-checks (evita 404 em "/")
@app.get("/", status_code=200)
async def root():
    """Rota de sanity check que garante o DB e responde uma mensagem simples.
    Usa ensure_database_and_tables em uma thread para não bloquear o loop async.
    """
    try:
        await asyncio.to_thread(ensure_database_and_tables)
    except Exception as e:
        print(f"[root] aviso: falha ao garantir DB no root: {e}")
    return {"message": "API rodando! e banco verificado."}

