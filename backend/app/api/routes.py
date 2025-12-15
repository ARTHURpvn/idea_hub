from ..api import agent, idea, roadmap_routes
from fastapi import APIRouter
from ..database.create_db import ensure_database_and_tables

router = APIRouter()

router.include_router(agent.router, prefix="/agent", tags=["Chat"])
router.include_router(idea.router, prefix="/idea", tags=["Ideas"])
router.include_router(roadmap_routes.router, prefix="/roadmap", tags=["Roadmap"])

@router.get("/", status_code=200)
def root():
    ensure_database_and_tables()
    return {"message": "API rodando! e banco verificado."}