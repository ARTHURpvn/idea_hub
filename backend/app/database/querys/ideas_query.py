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

class Idea(BaseModel):
    user_id: Optional[str]
    title: str
    ai_classification: str

def create_idea(idea: Idea) -> str | None:
    """
    Creates and stores a new idea object.

    This function is responsible for taking an `Idea` object and performing the
    necessary logic to store it. Ensure the `Idea` object adheres to the expected
    structure and contains all required data before calling this function.

    :param idea: Represents the idea instance to be stored.
    :type idea: Idea
    :return: The ID of the created idea or None if failed
    :rtype: str | None
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexão ao Criar Ideia: {e}")
        return None

    try:
        cur.execute(
            "INSERT INTO ideas (user_id, title, ai_classification) VALUES (%s, %s, %s) RETURNING id",
            (idea.user_id, idea.title, idea.ai_classification)
        )
        row = cur.fetchone()
        if row:
            idea_id = str(row[0])
            conn.commit()
            print(f"Ideia criada com ID: {idea_id}")
            return idea_id
        conn.rollback()
        return None
    except Exception as e:
        print(f"Erro ao inserir ideia: {e}")
        try:
            conn.rollback()
        except Exception:
            pass
        return None
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

def get_all_ideas(user_id: str) -> list[dict] | None:
    """
    Fetches a list of ideas associated with the given user.

    This function retrieves all ideas that are linked to the user identified
    by the provided user_id. It allows access to user-specific ideas for
    further processing or display.

    :param user_id: The unique identifier of the user whose ideas are to
        be retrieved.
    :return: A list of dict objects representing the ideas linked to the
        specified user.
    :rtype: list[dict] | None
    """

    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao pegar ideas: {e}")
        return None
    try:
        cur.execute("SELECT id, user_id, title, status, ai_classification FROM ideas WHERE user_id = %s", (user_id,))
        rows = cur.fetchall()

        ideas = []
        for row in rows:
            ideas.append({
                "id": str(row[0]),
                "user_id": str(row[1]),
                "title": row[2],
                "status": row[3],
                "ai_classification": row[4]
            })
        return ideas
    except Exception as e:
        print(f"Erro ao pegar ideas: {e}")
        return None
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

def get_idea_by_id(idea_id: str) -> dict | None:
    """
    Fetches an idea by its unique identifier.

    This function retrieves an idea object based on the given unique identifier.
    If no idea is found with the provided identifier, the function will return None.

    :param idea_id: Identifier for the idea to retrieve.
    :type idea_id: str
    :return: The Idea dict if found; otherwise None.
    :rtype: dict | None
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao pegar Ideia: {e}")
        return None

    try:
        cur.execute("SELECT id, user_id, title, status, ai_classification FROM ideas WHERE id = %s", (idea_id,))
        row = cur.fetchone()

        if row:
            return {
                "id": str(row[0]),
                "user_id": str(row[1]),
                "title": row[2],
                "status": row[3],
                "ai_classification": row[4]
            }
        return None
    except Exception as e:
        print(f"Erro ao pegar Ideia: {e}")
        return None
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

def edit_idea_status(idea_id: str, new_status: str) -> bool:
    """
    Edit the status of an idea in the database. This function updates the idea's
    status based on the given idea ID and new status value. It ensures a
    connection to the database and attempts the update. Errors during connection
    or update execution are handled and logged appropriately.

    :param idea_id: ID of the idea to be updated
    :type idea_id: str
    :param new_status: New status to be set for the idea
    :type new_status: str
    :return: True if successful, False otherwise
    :rtype: bool
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao editar Ideia: {e}")
        return False

    try:
        cur.execute("UPDATE ideas SET status = %s WHERE id = %s", (new_status, idea_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Erro ao editar Ideia: {e}")
        conn.rollback()
        return False
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

def edit_idea_content(idea_id: str, content: str) -> bool:
    """
    Edit the content of an existing idea. This function allows updating the text content
    associated with a specific idea, identified by its unique identifier.

    :param idea_id: The unique identifier of the idea to be edited.
    :type idea_id: str
    :param content: The new content to replace the existing idea's content.
    :type content: str
    :return: True if successful, False otherwise
    :rtype: bool
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao editar Ideia: {e}")
        return False

    try:
        cur.execute("UPDATE ideas SET raw_content = %s WHERE id = %s", (content, idea_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Erro ao editar Ideia: {e}")
        conn.rollback()
        return False
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

def update_idea(idea_id: str, idea: Idea) -> bool:
    """
    Edits an existing idea with a new one by replacing its details.

    This function updates the details of an idea identified by its unique ID. It
    requires the unique identifier for the idea along with the updated idea
    object.

    :param idea_id: Unique identifier of the idea.
    :type idea_id: str
    :param idea: The updated idea object containing modified details.
    :type idea: Idea
    :return: True if successful, False otherwise
    :rtype: bool
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao editar Ideia: {e}")
        return False

    try:
        cur.execute(
            "UPDATE ideas SET title = %s, ai_classification = %s WHERE id = %s",
            (idea.title, idea.ai_classification, idea_id)
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"Erro ao editar Ideia: {e}")
        conn.rollback()
        return False
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

def delete_idea_by_id(idea_id: str) -> bool:
    """
    Deletes an idea from the database based on the provided idea ID.

    This function establishes a connection to the database and executes a
    deletion command to remove the idea identified by the given idea_id.
    It handles any connection or execution errors that may occur during
    the process.

    :param idea_id: The unique identifier of the idea to be deleted.
    :type idea_id: str
    :return: True if successful, False otherwise
    :rtype: bool
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao deletar Ideia: {e}")
        return False

    try:
        cur.execute("DELETE FROM ideas WHERE id = %s", (idea_id,))
        conn.commit()
        return True
    except Exception as e:
        print(f"Erro ao deletar Ideia: {e}")
        conn.rollback()
        return False
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass