from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional

from ..api.chat.chatkit import run_workflow, WorkflowInput
from ..database.querys.auth_query import check_token
from ..database.querys.chat_query import create_chat, create_message, get_idea_by_chat_id, get_all_chats, get_last_ai_message


router = APIRouter()

class Chat(BaseModel):
    user_id: str
    idea_id: str

class ChatCreateResponse(BaseModel):
    chat_id: str

class MessageResponse(BaseModel):
    message_id: Optional[str] = None
    message: str
    sender: Optional[str] = None


class MessageItem(BaseModel):
    message_id: str
    message: str
    sender: str

class ChatResponseItem(BaseModel):
    chat_id: str
    idea_id: Optional[str] = None
    messages: List[MessageItem] = []


@router.post("/idea/{idea_id}", status_code=200, response_model=ChatCreateResponse, tags=["Chat"])
def idea(idea_id: str, authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "").strip()
    user_id = check_token(token)

    chat = Chat(user_id=user_id, idea_id=idea_id)

    try:
        chat_id = create_chat(chat)
        return {"chat_id": chat_id}
    except Exception as e:
        print(f"Erro ao criar chat: {e}")
        raise


# Accept optional `sender` query param. If sender == 'AI', persist the message as AI and return it
@router.post("/{chat_id}", status_code=200, response_model=MessageResponse, tags=["Chat"])
async def chat_message(chat_id: str, message: str, sender: Optional[str] = None):
    # If caller explicitly sends sender=AI, save the message directly as coming from the AI and skip workflow
    try:
        if sender and str(sender).upper() == "AI":
            try:
                create_message(chat_id, message, "AI")
            except Exception as e:
                print(f"Erro ao criar mensagem AI via sender param: {e}")
            return {"message": message}
    except Exception:
        # proceed to normal flow if any unexpected error
        pass

    try:
        create_message(chat_id, message, "USER")
    except Exception as e:
        print(f"Erro ao criar mensagem: {e}")

    try:
        idea_id = get_idea_by_chat_id(chat_id)
    except Exception as e:
        print(f"Erro ao obter ideia pelo chat_id: {e}")
        idea_id = None

    try:
        inp = WorkflowInput(input_as_text=message)
        result = await run_workflow(inp, idea_id=idea_id)

    except Exception as e:
        print(f"Erro ao executar workflow: {e}")
        result = "Desculpe, ocorreu um erro ao processar sua mensagem."

    # Normalizar o resultado para sempre retornar um objeto com chave 'message'
    if isinstance(result, str):
        response_obj = {"message": result}
    elif isinstance(result, dict):
        # se já tiver 'message', use; se tiver 'error', converta; caso contrário, stringify
        if "message" in result and isinstance(result["message"], str):
            response_obj = {"message": result["message"]}
        elif "error" in result:
            response_obj = {"message": str(result.get("error"))}
        else:
            # fallback: converte o dict inteiro para string
            response_obj = {"message": str(result)}
    else:
        response_obj = {"message": str(result)}

    # Se a resposta do workflow parecer ser apenas uma classificação ou for muito curta,
    # tenta retornar a última mensagem AI salva no banco (fallback mais útil para o usuário).
    final_message = response_obj.get("message", "")
    lower_msg = final_message.lower().strip()
    is_classification_like = False
    try:
        if len(final_message) < 30:
            is_classification_like = True
        if "criar" in lower_msg and "ideia" in lower_msg:
            is_classification_like = True
        if lower_msg.startswith("desculpe"):
            is_classification_like = True
        if "nao foi feito" in lower_msg or "nao foi poss" in lower_msg:
            is_classification_like = True
    except Exception:
        is_classification_like = False

    try:
        if is_classification_like:
            fallback = get_last_ai_message(chat_id)
            if fallback:
                # salva o fallback (última mensagem AI) novamente como AI e retorna
                try:
                    create_message(chat_id, fallback, "AI")
                except Exception as e:
                    print(f"Erro ao salvar fallback AI message: {e}")
                return {"message": fallback}

        # Caso normal (não classificação), salva a mensagem retornada pelo workflow
        try:
            create_message(chat_id, final_message, "AI")
        except Exception as e:
            print(f"Erro ao criar mensagem: {e}")

        return {"message": final_message}

    except Exception as e:
        print(f"Erro ao processar/fallback da mensagem: {e}")
        # último recurso: tenta retornar o resultado original
        return response_obj


@router.get("/", status_code=200, response_model=List[ChatResponseItem], tags=["Chat"])
def list_chats(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "").strip()
    user_id = check_token(token)

    try:
        chats = get_all_chats(user_id)
        if chats is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao obter chats")
        return chats
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao pegar chats: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao obter chats")


@router.get("/{chat_id}", status_code=200, tags=["Chat"])
def get_chat_by_id(chat_id: str):
    from ..database.querys.chat_query import get_chat as get_chat_from_db

    try:
        chat_data = get_chat_from_db(chat_id)
        if chat_data is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat não encontrado")
        return chat_data
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao pegar chat: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao obter chat")


@router.delete("/{chat_id}", status_code=200, tags=["Chat"])
def delete_chat(chat_id: str, authorization: str = Header(...)):
    from ..database.querys.chat_query import delete_chat as delete_chat_from_db

    token = authorization.replace("Bearer ", "").strip()
    user_id = check_token(token)

    try:
        success = delete_chat_from_db(chat_id, user_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat não encontrado ou não autorizado")
        return {"success": True, "message": "Chat deletado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao deletar chat: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao deletar chat")
