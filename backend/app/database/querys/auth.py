import os
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


def check_token(token: str):
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexão ao tentar conectar com o banco: {e}")
        return None

    try:
        user_id = decode_access_token(token)
        cur.execute(f"SELECT 1 FROM users WHERE id = {user_id}")
    except Exception as e:
        print(f"Erro ao verificar token: {e}")
        return None

def login_query(login_data: Login) -> str | None:
    """Verifica o usuário e retorna o JWT se as credenciais forem válidas.

    Retorna:
        str: O token JWT em caso de sucesso.
        None: Em caso de falha de conexão ou credenciais inválidas.
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexão ao tentar fazer login: {e}")
        return None

    try:
        cur.execute("SELECT id, email, name, password FROM users WHERE email = %s", (login_data.email,))
        user_record = cur.fetchone()

        if user_record:
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
                    return create_access_token(user_dict)
                else:
                    return None
            except Exception as e:
                print(f"Erro ao verificar senha: {e}")
                return None
        else:
            return None

    except Exception as e:
        print(f"Erro na query de login: {e}")
        return None
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
