from ..api import agent, idea
from fastapi import APIRouter

router = APIRouter()

router.include_router(agent.router, prefix="/agent", tags=["Chat"])
router.include_router(idea.router, prefix="/idea", tags=["Ideas"])
