from ..api import agent, idea, roadmap_routes
from fastapi import APIRouter

router = APIRouter()

router.include_router(agent.router, prefix="/agent", tags=["Chat"])
router.include_router(idea.router, prefix="/idea", tags=["Ideas"])
router.include_router(roadmap_routes.router, prefix="/roadmap", tags=["Roadmap"])
