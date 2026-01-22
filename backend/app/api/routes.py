from ..api import agent, idea, roadmap_routes, feedback
from fastapi import APIRouter

router = APIRouter()

router.include_router(agent.router, prefix="/agent", tags=["Chat"])
router.include_router(idea.router, prefix="/idea", tags=["Ideas"])
router.include_router(roadmap_routes.router, prefix="/roadmap", tags=["Roadmap"])
router.include_router(feedback.router, tags=["Feedback"])

@router.get("/", status_code=200)
def root():
    return {"message": "API /api rodando!"}
