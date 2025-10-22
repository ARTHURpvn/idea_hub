import os
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional

from ..utils.connect_db import get_db_conn


load_dotenv()

user = os.getenv("POSTGRES_USER", "postgres")
password = os.getenv("POSTGRES_PASSWORD", "postgres")
host = os.getenv("POSTGRES_HOST", "localhost")
port = os.getenv("POSTGRES_PORT", "5432")
db_name = os.getenv("POSTGRES_DB", "idea_hub_db")


class Categories(BaseModel):
    name: str
    description: str
    idea_id: str


def create_categories(categories: Categories) -> Optional[str]:
    """Create a category if it doesn't exist and link it to the idea.

    Returns the id of the created idea_categories record (as str) or None on error.
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao Criar Categoria: {e}")
        return None

    try:
        # Check if category already exists
        categories_id = get_categories_by_name(categories.name)

        if categories_id is not None:
            # Category exists, only create the link
            return create_idea_categories(categories, categories_id)

        # Create new category (parameterized query)
        cur.execute(
            "INSERT INTO categories (name, description) VALUES (%s, %s) RETURNING id",
            (categories.name, categories.description),
        )
        row = cur.fetchone()
        if not row:
            conn.rollback()
            return None
        categories_id = str(row[0])
        conn.commit()

        # Link category to idea
        return create_idea_categories(categories, categories_id)

    except Exception as e:
        print(f"Erro ao inserir Categoria: {e}")
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


def create_idea_categories(categories: Categories, categories_id: str) -> Optional[str]:
    """Insert a record in idea_categories linking the idea and category.

    Both category and idea ids are treated as strings (UUIDs).
    Returns the new idea_categories.id as str or None on error.
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao Criar Idea-Categoria: {e}")
        return None

    try:
        # Use the IDs as strings (UUID) directly
        cur.execute(
            "INSERT INTO idea_categories (category_id, idea_id) VALUES (%s, %s) RETURNING id",
            (categories_id, categories.idea_id),
        )
        row = cur.fetchone()
        if not row:
            conn.rollback()
            return None
        idea_cat_id = str(row[0])
        conn.commit()
        return idea_cat_id
    except Exception as e:
        print(f"Erro ao inserir categoria na ideia: {e}")
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


def get_categories_by_name(name: str) -> Optional[str]:
    """Return the category id (str) for the given name or None if not found."""
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao pegar Categoria: {e}")
        return None

    try:
        cur.execute("SELECT id FROM categories WHERE name = %s", (name,))
        row = cur.fetchone()
        if row:
            return str(row[0])
        return None
    except Exception as e:
        print(f"Erro ao pegar categoria: {e}")
        return None
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass