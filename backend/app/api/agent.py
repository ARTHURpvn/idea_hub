from fastapi import APIRouter
from ..api.chat.chatkit import run_workflow, WorkflowInput

router = APIRouter()


@router.post("/")
async def chat(message: str):
    inp = WorkflowInput(input_as_text=message)
    result = await run_workflow(inp)
    print(result)
    return result
