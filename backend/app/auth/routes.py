from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
import re
from ..database.querys.auth_query import login_query, register_query

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
    token_type: str = "bearer"


class RegisterSuccess(BaseModel):
    id: str
    email: EmailStr


def validate_password(password: str) -> bool:
    # regra mínima: pelo menos 8 caracteres, pelo menos uma letra e um número
    if len(password) < 8:
        return False
    if not re.search(r"[A-Za-z]", password):
        return False
    if not re.search(r"[0-9]", password):
        return False
    return True


@router.post("/login", response_model=LoginSuccess, responses={400: {"model": ValidationErrorResponse}, 401: {"model": ValidationErrorResponse}, 500: {"model": ValidationErrorResponse}})
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
            return {"access_token": result.get("token"), "token_type": "bearer"}
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


@router.post("/register", response_model=RegisterSuccess, status_code=status.HTTP_201_CREATED, responses={400: {"model": ValidationErrorResponse}})
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
