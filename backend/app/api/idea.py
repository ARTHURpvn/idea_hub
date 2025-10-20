from typing import Optional

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel

from .chat.gen_classification import run_classification
from ..database.querys.auth_query import check_token
from ..database.querys.ideas_query import (
    create_idea,
    Idea as IdeaModel,
    get_all_ideas,
    get_idea_by_id,
    edit_idea_status,
    edit_idea_content,
    update_idea,
    delete_idea_by_id
)

router = APIRouter()

class IdeaCreate(BaseModel):
    title: str

class IdeaResponse(BaseModel):
    id: str
    user_id: str
    title: str
    ai_classification: str
    status: str

class IdeaEdit(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    content: Optional[str] = None



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

    # Gerar classificação AI (async - não bloqueia)
    try:
        ai_classification = await run_classification(idea_data.title)
    except Exception as e:
        print(f"Erro ao classificar Idea: {e}")
        ai_classification = "Não classificado"

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


@router.get("/", status_code=status.HTTP_200_OK, response_model=list[IdeaResponse])
def get_ideas(authorization: str = Header(...)):
    """
    Obtém todas as ideias do usuário autenticado.
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

    ideas = get_all_ideas(user_id)

    if ideas is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter ideias"
        )

    return ideas


@router.get("/{idea_id}", status_code=status.HTTP_200_OK, response_model=IdeaResponse)
def get_idea(idea_id: str, authorization: str = Header(...)):
    """
    Obtém uma ideia específica por ID.
    """
    # Extrair e validar token
    try:
        token = authorization.replace("Bearer ", "").strip()
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

    idea = get_idea_by_id(idea_id)

    if not idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ideia não encontrada"
        )

    # Verificar se a ideia pertence ao usuário
    if idea["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para acessar esta ideia"
        )

    return idea


@router.patch("/{idea_id}", status_code=status.HTTP_200_OK, response_model=IdeaResponse)
async def edit_idea_endpoint(idea_id: str, idea_data: IdeaEdit, authorization: str = Header(...)):
    """
    Edita uma ideia existente. Pode atualizar título, status ou conteúdo.
    """
    # Extrair e validar token
    try:
        token = authorization.replace("Bearer ", "").strip()
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

    # Verificar se a ideia existe e pertence ao usuário
    existing_idea = get_idea_by_id(idea_id)

    if not existing_idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ideia não encontrada"
        )

    if existing_idea["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para editar esta ideia"
        )

    # Verificar se há algo para atualizar
    if not any([idea_data.title, idea_data.status, idea_data.content]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum campo para editar foi fornecido"
        )

    # Atualizar status
    if idea_data.status is not None:
        success = edit_idea_status(idea_id, idea_data.status)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao editar status da ideia"
            )

    # Atualizar conteúdo
    if idea_data.content is not None:
        success = edit_idea_content(idea_id, idea_data.content)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao editar conteúdo da ideia"
            )

    # Atualizar título (e regenerar classificação AI)
    if idea_data.title is not None:
        try:
            ai_classification = await run_classification(idea_data.title)
        except Exception as e:
            print(f"Erro ao classificar Idea: {e}")
            ai_classification = existing_idea["ai_classification"]  # Manter o antigo se falhar

        idea = IdeaModel(
            user_id=user_id,
            title=idea_data.title,
            ai_classification=ai_classification
        )

        success = update_idea(idea_id, idea)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao editar título da ideia"
            )

    # Retornar ideia atualizada
    updated_idea = get_idea_by_id(idea_id)
    if not updated_idea:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter ideia atualizada"
        )

    return updated_idea


@router.delete("/{idea_id}", status_code=status.HTTP_200_OK)
def delete_idea_endpoint(idea_id: str, authorization: str = Header(...)):
    """
    Deleta uma ideia existente.
    """
    # Extrair e validar token
    try:
        token = authorization.replace("Bearer ", "").strip()
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

    # Verificar se a ideia existe e pertence ao usuário
    existing_idea = get_idea_by_id(idea_id)

    if not existing_idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ideia não encontrada"
        )

    if existing_idea["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para deletar esta ideia"
        )

    success = delete_idea_by_id(idea_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao deletar ideia"
        )

    return {"message": "Ideia deletada com sucesso"}
