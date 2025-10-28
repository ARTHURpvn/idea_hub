import os
from typing import Optional

from dotenv import load_dotenv
from pydantic import BaseModel
from passlib.context import CryptContext

from ..utils.JWT import decode_access_token
from ..utils.connect_db import get_db_conn


load_dotenv()

user = os.getenv("POSTGRES_USER", "postgres")
password = os.getenv("POSTGRES_PASSWORD", "postgres")
host = os.getenv("POSTGRES_HOST", "localhost")
port = os.getenv("POSTGRES_PORT", "5432")
db_name = os.getenv("POSTGRES_DB", "idea_hub_db")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class Login(BaseModel):
    email: str
    password: str

class Register(BaseModel):
    email: str
    name: str
    password: str


def check_token(token: str) -> str | None:
    """
    Verifies the given token by decoding and validating against the database.

    If the token is valid and corresponds to a user ID present in the database,
    the function ensures the user exists. If not valid, or if any errors occur during
    the execution, the function will return None.

    :param token: A string representing the token to be verified.
    :type token: str
    :return: A string representing the user ID if the token is valid and exists in
        the database, or None if the token is invalid or a failure occurs.
    :rtype: str | None
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexão ao tentar conectar com o banco: {e}")
        return None

    try:
        user_id = decode_access_token(token)
        cur.execute("SELECT 1 FROM users WHERE id = %s", (user_id,))
        result = cur.fetchone()

        if result:
            return user_id
        else:
            return None
    except Exception as e:
        print(f"Erro ao verificar token: {e}")
        return None
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

def login_query(login_data: Login) -> dict | None:
    """Verifica o usuário e retorna um dicionário com status e token (quando sucesso).

    Retornos possíveis:
        {"status": "success", "token": <jwt>} - credenciais válidas
        {"status": "no_user"} - email não encontrado
        {"status": "wrong_password"} - email existe, senha incorreta
        {"status": "error", "message": "..."} - erro interno
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexão ao tentar fazer login: {e}")
        return {"status": "error", "message": "db_connection_error"}

    try:
        cur.execute("SELECT id, email, name, password FROM users WHERE email = %s", (login_data.email,))
        user_record = cur.fetchone()

        if not user_record:
            return {"status": "no_user"}

        user_id, email, name, stored_password = user_record
        # verifica hash
        try:
            if pwd_context.verify(login_data.password, stored_password):
                from ..utils.JWT import create_access_token
                user_dict = {
                    "sub": str(user_id),
                    "email": email,
                    "name": name,
                }
                token = create_access_token(user_dict)
                return {"status": "success", "token": token}
            else:
                return {"status": "wrong_password"}
        except Exception as e:
            print(f"Erro ao verificar senha: {e}")
            return {"status": "error", "message": "password_verify_error"}

    except Exception as e:
        print(f"Erro na query de login: {e}")
        return {"status": "error", "message": "query_error"}
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

def register_query(register_data: Register) -> str | None:
    """Insere um novo usuário. Retorna o id (UUID) do usuário criado ou None em caso de erro.
    A senha será hasheada antes de salvar. Não retorna JWT.
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexão ao tentar registrar: {e}")
        return None

    try:
        # Verifica se email já existe
        cur.execute("SELECT 1 FROM users WHERE email = %s", (register_data.email,))
        if cur.fetchone():
            print("register_query: email já existe")
            return None

        hashed = pwd_context.hash(register_data.password)
        # Inserir e retornar o id gerado
        cur.execute(
            "INSERT INTO users (email, name, password) VALUES (%s, %s, %s) RETURNING id",
            (register_data.email, register_data.name, hashed),
        )
        row = cur.fetchone()
        if row:
            return str(row[0])
        return None
    except Exception as e:
        print(f"Erro na query de registro: {e}")
        return None
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

def get_user_query(user_id: str) -> Optional[dict]:
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexão ao tentar fazer login: {e}")
        return {"status": "error", "message": "db_connection_error"}


    try:
        cur.execute("SELECT email, name FROM users WHERE id = %s", (user_id,))
        user_record = cur.fetchone()
        if not user_record:
            return None
        email, name = user_record
        return {"email": email, "name": name}
    except Exception as e:
        print(f"Erro na query de login: {e}")
        return None
