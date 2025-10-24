import os
from typing import Optional

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

class Tag(BaseModel):
    idea_id: str
    tag_id: Optional[str] = None
    name: str

def create_tag(tag: Tag):
    """
    Creates a new tag in the system.

    This function accepts a `Tag` object and processes it
    to create or store the tag in the system.

    :param tag: A `Tag` object representing the tag to be created.
    :type tag: Tag
    :return: None
    """

    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao criar tag: {e}")
        return None

    try:
        tag_id = get_tag_by_name(tag.name)
        if tag_id:
            tag.tag_id = tag_id
            create_tags_idea(tag)
            try:
                cur.close()
                conn.close()
            except Exception:
                pass
            return None
    except Exception as e:
        print(f"Erro ao pegar tag: {e}")
        # garantir fechamento da conexão aberta no início
        try:
            cur.close()
            conn.close()
        except Exception:
            pass
        return None

    try:
        # Corrigido: inserir somente o nome na tabela tags e retornar id
        cur.execute("INSERT INTO tags (name) VALUES (%s) RETURNING id", (tag.name,))
        tag_id = cur.fetchone()[0]
        conn.commit()

        try:
            tag.tag_id = str(tag_id)
            create_tags_idea(tag)
        except Exception as e:
            print(f"Erro ao criar tag: {e}")
            conn.rollback()
            return None

    except Exception as e:
        print(f"Erro ao criar tag: {e}")
        try:
            conn.rollback()
        except Exception:
            pass
        return None
    finally:
        try:
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Erro ao fechar conexao: {e}")

def create_tags_idea(tag: Tag):
    """
    Creates a new tag with the specified properties or characteristics.

    This function is designed to accept a tag object and process it based on the
    provided input. The input object is operated on to achieve a particular
    desired state or functionality relating to the tag. The specific handling
    and logic of the tag creation process depends on the implementation and context
    in which this function is used.

    :param tag: The tag object to be processed for creation. It must meet any
        requirements or constraints defined by the broader application logic.
    :type tag: Tag

    :return: Indicates the result of the tag creation process. The output may
        vary based on the implementation and requirements (e.g., success
        status, modified tag, etc.).
    :rtype: Varied return type depending on implementation.
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao criar tag: {e}")
        return None

    try:
        cur.execute("INSERT INTO idea_tags (idea_id, tag_id) VALUES (%s, %s)", (tag.idea_id, tag.tag_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Erro ao criar tag: {e}")
        conn.rollback()
        return False
    finally:
        try:
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Erro ao fechar conexao: {e}")


def get_tag_by_name(name: str):
    """
    Retrieve a tag object by its name.

    This function searches for a tag that matches the provided name and returns
    the corresponding tag object. It is used to identify or access specific tags
    based on their unique names.

    :param name: The name of the tag to search for.
    :type name: str
    :return: The tag object that matches the provided name.
    :rtype: Any
    """

    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao pegar tag: {e}")
        return None

    try:
        cur.execute("SELECT id FROM tags WHERE name = %s", (name,))
        row = cur.fetchone()
        if row:
            return str(row[0])
        return None
    except Exception as e:
        print(f"Erro ao pegar tag: {e}")
        return None
    finally:
        try:
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Erro ao fechar conexao: {e}")