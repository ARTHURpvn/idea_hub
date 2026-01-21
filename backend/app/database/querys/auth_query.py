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


def _has_first_login_column(cur) -> bool:
    cur.execute("SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='first_login'")
    return cur.fetchone() is not None


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
        # Detecta se a coluna 'first_login' existe (bancos antigos podem não ter)
        has_first_login = _has_first_login_column(cur)

        if has_first_login:
            # seleciona both first_login and last_login so we can fallback
            cur.execute("SELECT id, email, name, password, first_login, last_login FROM users WHERE email = %s", (login_data.email,))
            user_record = cur.fetchone()
            if not user_record:
                return {"status": "no_user"}
            user_id, email, name, stored_password, first_login_val, last_login = user_record
            # Determine is_first_login: prefer explicit column if True; if column is NULL/False, fallback to last_login
            if first_login_val is True:
                is_first_login = True
            elif first_login_val is False:
                is_first_login = False
            else:
                # first_login_val is None -> fallback to last_login
                is_first_login = last_login is None
        else:
            cur.execute("SELECT id, email, name, password, last_login FROM users WHERE email = %s", (login_data.email,))
            user_record = cur.fetchone()
            if not user_record:
                return {"status": "no_user"}
            user_id, email, name, stored_password, last_login = user_record
            is_first_login = last_login is None

        # verifica hash
        try:
            if pwd_context.verify(login_data.password, stored_password):
                # Log para debug: informar se será tratado como primeiro login
                print(f"[login_query] user_id={user_id} is_first_login={is_first_login} has_first_login_col={has_first_login}")

                # NÃO atualizamos aqui: a atualização será executada em background pela rota
                from ..utils.JWT import create_access_token
                user_dict = {
                    "sub": str(user_id),
                    "email": email,
                    "name": name,
                }
                token = create_access_token(user_dict)
                return {"status": "success", "token": token, "first_login": is_first_login, "user_id": str(user_id)}
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

        # Detecta se existe a coluna first_login para inserir TRUE no registro inicial
        has_first_login = _has_first_login_column(cur)

        if has_first_login:
            cur.execute(
                "INSERT INTO users (email, name, password, first_login) VALUES (%s, %s, %s, TRUE) RETURNING id",
                (register_data.email, register_data.name, hashed),
            )
        else:
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
        # Checa se existe a coluna first_login
        has_first_login = _has_first_login_column(cur)

        if has_first_login:
            cur.execute("SELECT email, name, first_login, last_login FROM users WHERE id = %s", (user_id,))
            user_record = cur.fetchone()
            if not user_record:
                return None
            email, name, first_login_val, last_login = user_record
            if first_login_val is True:
                first_login = True
            elif first_login_val is False:
                first_login = False
            else:
                first_login = last_login is None
        else:
            cur.execute("SELECT email, name, last_login FROM users WHERE id = %s", (user_id,))
            user_record = cur.fetchone()
            if not user_record:
                return None
            if len(user_record) == 3:
                email, name, last_login = user_record
            else:
                email, name = user_record[:2]
                last_login = None
            first_login = True if last_login is None else False

        # Log para debug
        print(f"[get_user_query] user_id={user_id} last_login={last_login} first_login={first_login} has_first_login_col={has_first_login}")

        return {"email": email, "name": name, "first_login": first_login}
    except Exception as e:
        print(f"Erro na query de login: {e}")
        return None
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass


def mark_user_logged_in(user_id: str) -> None:
    """Marca o usuário como já tendo feito o primeiro login:
    - Atualiza last_login = NOW()
    - Se existir a coluna first_login, seta first_login = FALSE
    Esta função é pensada para ser executada como BackgroundTask.
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"[mark_user_logged_in] erro ao conectar no banco: {e}")
        return

    try:
        has_first_login = _has_first_login_column(cur)
        if has_first_login:
            cur.execute("UPDATE users SET last_login = NOW(), first_login = FALSE WHERE id = %s", (user_id,))
        else:
            cur.execute("UPDATE users SET last_login = NOW() WHERE id = %s", (user_id,))
        conn.commit()
        print(f"[mark_user_logged_in] updated user {user_id} (has_first_login={has_first_login})")
    except Exception as e:
        print(f"[mark_user_logged_in] erro ao atualizar usuario: {e}")
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass
