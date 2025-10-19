from ..api import agent
from fastapi import APIRouter

router = APIRouter()

router.include_router(agent.router, prefix="/agent", tags=["Chat"])
