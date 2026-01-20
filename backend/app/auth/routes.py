from typing import Optional
from fastapi import APIRouter, status, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
import re
from ..database.querys.auth_query import login_query, register_query, check_token, get_user_query

router = APIRouter()

class Login(BaseModel):
    email: EmailStr
    password: str


class Register(BaseModel):
    email: EmailStr
    name: str
    password: str


class ErrorDetail(BaseModel):
    field: str
    message: str


class ValidationErrorResponse(BaseModel):
    errors: list[ErrorDetail]


class LoginSuccess(BaseModel):
    access_token: str
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    first_login: Optional[bool] = None


class RegisterSuccess(BaseModel):
    id: str
    email: EmailStr


class TokenResponse(BaseModel):
    validated: bool


class MeResponse(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    first_login: Optional[bool] = None


def validate_password(password: str) -> bool:
    # regra mínima: pelo menos 8 caracteres, pelo menos uma letra e um número
    if len(password) < 8:
        return False
    if not re.search(r"[A-Za-z]", password):
        return False
    if not re.search(r"[0-9]", password):
        return False
    return True


def _extract_user_info(user_record) -> tuple:
    """Normalize user_record returned by get_user_query.
    Accepts dict with keys 'email', 'name', and optional 'first_login',
    or tuple/list (email, name) or (name,email).
    Returns (name, email, first_login) or (None, None, None) on failure.
    """
    # Robust extraction: always ensure `email` is either a valid-looking email (contains '@') or None
    if not user_record:
        return None, None, None

    def _is_email(val):
        return isinstance(val, str) and "@" in val

    # dict case
    if isinstance(user_record, dict):
        raw_email = user_record.get("email")
        email = raw_email if _is_email(raw_email) else None
        name = user_record.get("name")
        first_login = user_record.get("first_login")
        return name, email, first_login

    # tuple/list case: try to find which element looks like an email
    if isinstance(user_record, (list, tuple)):
        # find first element that looks like an email
        email = None
        name = None
        for elem in user_record:
            if _is_email(elem):
                email = elem
                break
        # name: prefer a string element that's not the email, fallback to first string
        for elem in user_record:
            if isinstance(elem, str) and elem != email:
                name = elem
                break

        # No reliable place for first_login in tuple/list
        return name, email, None

    # unknown format
    return None, None, None


@router.post(
    "/login",
    response_model=LoginSuccess,
    responses={
        400: {"model": ValidationErrorResponse},
        401: {"model": ValidationErrorResponse},
        500: {"model": ValidationErrorResponse},
    },
    summary="Login do usuário",
    description="Autentica usuário com email e senha. Retorna token e dados básicos do usuário em caso de sucesso ou erros estruturados."
)
def login(request: Login):
    try:
        result = login_query(request)

        if not result:
            # Caso improvável: query retornou None por erro não tipificado
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"errors": [{"field": "non_field", "message": "Erro interno no login"}]},
            )

        status_res = result.get("status")

        if status_res == "success":
            token = result.get("token")
            # retornar token + dados do usuário
            try:
                user_id = check_token(token)
                user_info = get_user_query(user_id)
                username, email, first_login = _extract_user_info(user_info)
            except Exception:
                # mesmo que não consigamos buscar o usuário, retornamos o token
                username, email, first_login = None, None, None
            return {"access_token": token, "name": username, "email": email, "first_login": first_login}

        elif status_res == "no_user":
            # Email não encontrado -> validação no campo email
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"errors": [{"field": "email", "message": "Email não cadastrado"}]},
            )
        elif status_res == "wrong_password":
            # Senha incorreta -> credencial inválida
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"errors": [{"field": "password", "message": "Senha incorreta"}]},
            )
        else:
            # erros internos com mensagens específicas
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"errors": [{"field": "non_field", "message": result.get("message", "Erro interno")}]},
            )

    except Exception as e:
        print(f"Erro no login: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"errors": [{"field": "non_field", "message": "Erro interno no login"}]},
        )


@router.post(
    "/register",
    response_model=RegisterSuccess,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ValidationErrorResponse}},
    summary="Registro de usuário",
    description="Registra novo usuário. Retorna erros estruturados para validação de senha ou email duplicado."
)
def register(request: Register):
    # EmailStr já valida o formato do email
    if not validate_password(request.password):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"errors": [{"field": "password", "message": "Senha inválida: deve ter ao menos 8 caracteres, conter letras e números."}]},
        )

    try:
        user_id = register_query(request)
        if user_id:
            return {"id": user_id, "email": request.email}
        else:
            # Se a query retornou None, o mais provável é email duplicado ou erro no DB
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"errors": [{"field": "email", "message": "O email já está em uso ou ocorreu um erro no registro."}]},
            )
    except Exception as e:
        print(f"Erro no registro: {e}")
        # Retornamos uma resposta estruturada para o frontend
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"errors": [{"field": "email", "message": "O email já está em uso ou ocorreu um erro no registro."}]},
        )


@router.post(
    "/token",
    response_model=TokenResponse,
    responses={401: {"model": ValidationErrorResponse}, 500: {"model": ValidationErrorResponse}},
    summary="Valida token Bearer",
    description="Valida o token enviado no cabeçalho Authorization. Retorna `validated: true` se válido, ou erro estruturado se inválido."
)
def token(authorization: str = Header(...)):
    access_token = authorization.replace("Bearer ", "").strip()
    try:
        check_token(access_token)
        return {"validated": True}
    except Exception as e:
        print(f"Erro ao validar token: {e}")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"errors": [{"field": "token", "message": "Token inválido ou expirado"}]},
        )


@router.post(
    "/me",
    response_model=MeResponse,
    responses={401: {"model": ValidationErrorResponse}, 404: {"model": ValidationErrorResponse}, 500: {"model": ValidationErrorResponse}},
    summary="Obter dados do usuário autenticado",
    description="Retorna nome e email do usuário ligado ao token Bearer. Retorna erro estruturado se token inválido ou usuário não encontrado."
)
def me(authorization: str = Header(...)):
    access_token = authorization.replace("Bearer ", "").strip()
    try:
        user_id = check_token(access_token)
        if not user_id:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"errors": [{"field": "token", "message": "Token inválido ou expirado"}]},
            )

        user = get_user_query(user_id)
        if not user:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"errors": [{"field": "email", "message": "Usuário não encontrado"}]},
            )

        username, email, first_login = _extract_user_info(user)
        return {"name": username, "email": email, "first_login": first_login}
    except Exception as e:
        print(f"Erro ao obter username: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"errors": [{"field": "non_field", "message": "Erro ao obter dados do usuário"}]},
        )
