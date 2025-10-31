import os
from typing import Optional

from dotenv import load_dotenv
from pydantic import BaseModel
from passlib.context import CryptContext

from .categories_tags import Categories, create_categories as create_db_categories
from .tag_query import create_tag, Tag
from ..utils.connect_db import get_db_conn

load_dotenv()

user = os.getenv("POSTGRES_USER", "postgres")
password = os.getenv("POSTGRES_PASSWORD", "postgres")
host = os.getenv("POSTGRES_HOST", "localhost")
port = os.getenv("POSTGRES_PORT", "5432")
db_name = os.getenv("POSTGRES_DB", "idea_hub_db")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class Idea(BaseModel):
    user_id: Optional[str] = None
    title: str
    ai_classification: str
    status: Optional[str] = None
    raw_content: Optional[str] = None
    categories: Optional[list[dict[str, str]]] = None
    tags: Optional[list[str]] = None



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

            if idea.categories:
                for cat in idea.categories:
                    if not isinstance(cat, dict):
                        continue

                    name = cat.get("name")
                    desc = cat.get("description", "")

                    if not name:
                        continue

                    categories = Categories(
                        idea_id=idea_id,
                        name=name,
                        description=desc
                    )

                    try:
                        create_db_categories(categories)
                    except Exception as e:
                        print(f"Erro ao criar categoria no DB: {e}")
            if idea.tags:
                for tag in idea.tags:
                    tags = Tag(
                        idea_id=idea_id,
                        name=tag,
                    )
                    try:
                        create_tag(tags)
                    except Exception as e:
                        print(f"Erro ao criar tag no DB: {e}")


            if idea.raw_content:
                create_idea_version(
                    str(idea_id),
                    idea.raw_content
                )

            return str(idea_id)
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
    Fetches a list of ideas associated with the given user, including tag names.

    Uses a single SQL query with LEFT JOIN and array_agg to collect tag names
    for each idea to avoid N+1 queries.
    """

    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao pegar ideas: {e}")
        return None

    try:
        cur.execute(
            """
            SELECT
                i.id,
                i.user_id,
                i.title,
                i.status,
                i.ai_classification,
                i.created_at,
                i.raw_content,
                COALESCE(array_agg(t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::text[]) AS tags
            FROM ideas i
            LEFT JOIN idea_tags it ON it.idea_id = i.id
            LEFT JOIN tags t ON t.id = it.tag_id
            WHERE i.user_id = %s
            GROUP BY i.id, i.user_id, i.title, i.status, i.ai_classification, i.created_at, i.raw_content
            ORDER BY i.created_at DESC
            """,
            (user_id,)
        )
        rows = cur.fetchall()

        ideas: list[dict] = []
        for row in rows:
            created_at = row[5]
            created_at_str = created_at.isoformat() if getattr(created_at, 'isoformat', None) else None
            tags_list = row[7] if row[7] is not None else []

            ideas.append({
                "id": str(row[0]),
                "user_id": str(row[1]),
                "title": row[2],
                "status": row[3],
                "ai_classification": row[4],
                "created_at": created_at_str,
                "raw_content": row[6],
                "tags": tags_list,
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
    Fetches an idea by its unique identifier, including tag names.

    Returns created_at as ISO string and tags as a list of strings.
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao pegar Ideia: {e}")
        return None

    try:
        cur.execute(
            """
            SELECT
                i.id,
                i.user_id,
                i.title,
                i.status,
                i.ai_classification,
                i.created_at,
                i.raw_content,
                COALESCE(array_agg(t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::text[]) AS tags
            FROM ideas i
            LEFT JOIN idea_tags it ON it.idea_id = i.id
            LEFT JOIN tags t ON t.id = it.tag_id
            WHERE i.id = %s
            GROUP BY i.id, i.user_id, i.title, i.status, i.ai_classification, i.created_at, i.raw_content
            """,
            (idea_id,)
        )
        row = cur.fetchone()

        if row:
            created_at = row[5]
            created_at_str = created_at.isoformat() if getattr(created_at, 'isoformat', None) else None
            tags_list = row[7] if row[7] is not None else []
            return {
                "id": str(row[0]),
                "user_id": str(row[1]),
                "title": row[2],
                "status": row[3],
                "ai_classification": row[4],
                "created_at": created_at_str,
                "raw_content": row[6],
                "tags": tags_list,
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
        cur.execute("UPDATE ideas SET status = %s, updated_at = NOW() WHERE id = %s", (new_status, idea_id))
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
        # update raw_content and set updated_at to current timestamp
        cur.execute("UPDATE ideas SET raw_content = %s, updated_at = NOW() WHERE id = %s", (content, idea_id))
        conn.commit()
        create_idea_version(idea_id, content)
        return True
    except Exception as e:
        print(f"Erro ao editar Ideia: {e}")
        conn.rollback()
        return False
    finally:
        try:
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Erro ao fechar conexao: {e}")
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
        # update multiple fields and touch updated_at
        cur.execute(
            "UPDATE ideas SET title = %s, ai_classification = %s, updated_at = NOW() WHERE id = %s",
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

def create_idea_version(idea_id: str, content: str):
    """
    Create a new version of an idea by associating it with given content.

    This function takes an identifier for an idea, along with the new content
    to be associated with it, and creates a new version for that idea. It
    ensures that the appropriate data is linked to the specified idea.

    :param idea_id: The identifier of the idea to update.
    :param content: The content that will become the new version of the idea.
    :return: A representation of the newly created idea version.
    :rtype: Any
    """

    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao Criar Ideia: {e}")
        return None

    try:
        cur.execute(
            "INSERT INTO idea_version (idea_id, content) VALUES (%s, %s) RETURNING id",
            (idea_id, content)
        )
        row = cur.fetchone()
        if row:
            idea_version_id = str(row[0])
            conn.commit()
            print(f"Ideia criada com ID: {idea_version_id}")
            return idea_version_id
        conn.rollback()
        return None
    except Exception as e:
        print(f"Erro ao inserir ideia: {e}")
        try:
            conn.rollback()
        except Exception as e:
            print(f"Erro ao rollback: {e}")
            pass
        return None
    finally:
        try:
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Erro ao fechar conexao: {e}")
            pass
