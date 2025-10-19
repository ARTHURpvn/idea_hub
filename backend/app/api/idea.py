from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel

from .chat.gen_classification import run_classification
from ..database.querys.auth_query import check_token
from ..database.querys.ideas_query import create_idea, Idea as IdeaModel

router = APIRouter()

class IdeaCreate(BaseModel):
    title: str

class IdeaResponse(BaseModel):
    id: str
    user_id: str
    title: str
    ai_classification: str
    status: str

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=IdeaResponse)
async def create(idea_data: IdeaCreate, authorization: str = Header(...)):
    """
    Cria uma nova ideia. O user_id é extraído automaticamente do token JWT.
    A classificação AI é gerada automaticamente.
    """

    # Extrair e validar token
    try:
        token = authorization.replace("Bearer ", "").strip()

        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de autenticação ausente",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = check_token(token)

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido ou expirado",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao verificar token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    print("Token validado com sucesso")

    # Gerar classificação AI
    try:
        ai_classification = await run_classification(idea_data.title)
    except Exception as e:
        print(f"Erro ao classificar Idea: {e}")
        ai_classification = "Não classificado"

    print(f"Classificação AI gerada: {ai_classification}")

    # Criar a ideia no banco
    try:
        idea = IdeaModel(
            user_id=user_id,
            title=idea_data.title,
            ai_classification=ai_classification
        )

        idea_id = create_idea(idea)

        if not idea_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao criar ideia no banco de dados"
            )

        return IdeaResponse(
            id=idea_id,
            user_id=user_id,
            title=idea_data.title,
            ai_classification=ai_classification,
            status="DRAFT"
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao criar Idea: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao criar ideia"
        )
