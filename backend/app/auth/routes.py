from fastapi import APIRouter, HTTPException, status
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


def validate_password(password: str) -> bool:
    # regra mínima: pelo menos 8 caracteres, pelo menos uma letra e um número
    if len(password) < 8:
        return False
    if not re.search(r"[A-Za-z]", password):
        return False
    if not re.search(r"[0-9]", password):
        return False
    return True


@router.post("/login")
def login(request: Login):
    try:
        access_token = login_query(request)

        if access_token:
            return {"access_token": access_token, "token_type": "bearer"}
        else:
            raise HTTPException(
                status_code=401,
                detail="Email ou senha incorretos",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception as e:
        print(f"Erro no login: {e}")
        raise HTTPException(
            status_code=401,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(request: Register):
    # EmailStr já valida o formato do email
    if not validate_password(request.password):
        raise HTTPException(
            status_code=400,
            detail="Senha inválida: deve ter ao menos 8 caracteres, conter letras e números.",
        )

    try:
        user_id = register_query(request)
        if user_id:
            return {"id": user_id, "email": request.email}
        else:
            # Se a query retornou None, o mais provável é email duplicado ou erro no DB
            raise HTTPException(status_code=400, detail="O email já está em uso ou ocorreu um erro no registro.")
    except Exception as e:
        print(f"Erro no registro: {e}")
        raise HTTPException(status_code=400, detail="O email já está em uso ou ocorreu um erro no registro.")