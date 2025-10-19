import os
from dotenv import load_dotenv
from pydantic import BaseModel
from passlib.context import CryptContext

from ..utils.connect_db import get_db_conn

load_dotenv()

user = os.getenv("POSTGRES_USER", "postgres")
password = os.getenv("POSTGRES_PASSWORD", "postgres")
host = os.getenv("POSTGRES_HOST", "localhost")
port = os.getenv("POSTGRES_PORT", "5432")
db_name = os.getenv("POSTGRES_DB", "idea_hub_db")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class Idea(BaseModel):
    user_id: str
    title: str
    ai_classification: str

def create_idea(idea: Idea) -> None:
    """
    Creates and stores a new idea object.

    This function is responsible for taking an `Idea` object and performing the
    necessary logic to store it. Ensure the `Idea` object adheres to the expected
    structure and contains all required data before calling this function.

    :param idea: Represents the idea instance to be stored.
    :type idea: Idea
    :return: None
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexão ao tentar fazer login: {e}")
        return None

    try:
        cur.execute(f"INSERT INTO ideas (user_id, title, status, ai_classification), VALUES ({idea.user_id}, {idea.title}, DRAFT, {idea.ai_classification})")
        conn.commit()
        print(cur.lastrowid)
    except Exception as e:
        print(f"Erro ao inserir ideia: {e}")
        return None