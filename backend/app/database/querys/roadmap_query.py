import os
import json
from typing import Optional, Dict

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

class Roadmap(BaseModel):
    idea_id: str
    exported_to: str

class RoadmapSteps(BaseModel):
    roadmap_id: str
    step_order: int
    title: str
    description: str

class RoadmapTasks(BaseModel):
    step_id: str
    task_order: int
    description: str
    suggested_tools: list[str]

def create_roadmap(roadmap: Roadmap) -> Optional[str]:
    """
    Generate a roadmap for a specific idea.

    This function creates a roadmap by taking the unique identifier of the idea
    and the exported data. The roadmap will be generated based on these inputs
    to describe the progress and planning associated with the idea.

    :param roadmap: An instance of Roadmap containing the idea ID and exported data
        to be transformed into a roadmap.
    :return: A roadmap generated from the provided idea and exported data.
    """

    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao criar roadmap: {e}")
        return None

    try:
        cur.execute("INSERT INTO roadmaps (idea_id, exported_to) VALUES (%s, %s) RETURNING id", (roadmap.idea_id, roadmap.exported_to))
        conn.commit()
        roadmap_id = cur.fetchone()[0]
        return str(roadmap_id)
    except Exception as e:
        print(f"Erro ao criar roadmap: {e}")
        conn.rollback()
        return None
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

def create_roadmap_steps(step: RoadmapSteps) -> Optional[str]:
    """
    Creates the steps required for a roadmap.

    This function takes an instance of `RoadmapSteps` as input and generates
    or processes the necessary roadmap steps associated with it. It ensures
    that the provided step structure aligns with the expected data handling
    and processing of roadmap information.

    :param step: An instance of the RoadmapSteps class representing the step
                 structure for the roadmap.
    :type step: RoadmapSteps
    :return: None
    """

    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao criar roadmap steps: {e}")
        return None


    try:
        cur.execute("INSERT INTO roadmap_steps (roadmap_id, step_order, title, description) VALUES (%s, %s, %s, %s) RETURNING id", (step.roadmap_id, step.step_order, step.title, step.description))
        conn.commit()
        step_id = cur.fetchone()[0]
        return str(step_id)
    except Exception as e:
        print(f"Erro ao criar roadmap steps: {e}")
        conn.rollback()
        return None
    finally:
        try:
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Erro de conexao ao criar roadmap steps: {e}")
            pass

def create_roadmap_tasks(task: RoadmapTasks) -> Optional[str]:
    """
    Creates roadmap tasks based on the provided task details.

    This function takes a `RoadmapTasks` object representing the task details
    for roadmap planning purposes, processes it, and performs necessary
    operations to create the tasks accordingly.

    :param task: A `RoadmapTasks` object containing the details of the tasks
        to be created for the roadmap plan.
    :return: None
    """

    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao criar roadmap tasks: {e}")
        return None

    try:
        # Convert suggested_tools list to JSON string
        suggested_tools_json = json.dumps(task.suggested_tools) if task.suggested_tools else '[]'
        cur.execute("INSERT INTO roadmap_tasks (step_id, task_order, description, suggested_tools) VALUES (%s, %s, %s, %s) RETURNING id", (task.step_id, task.task_order, task.description, suggested_tools_json))
        conn.commit()
        task_id = cur.fetchone()[0]
        return str(task_id)
    except Exception as e:
        print(f"Erro ao criar roadmap tasks: {e}")
        conn.rollback()
        return None
    finally:
        try:
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Erro de conexao ao criar roadmap tasks: {e}")
            pass

def get_roadmap_with_details(roadmap_id: str) -> Optional[Dict]:
    """
    Busca um roadmap completo com todos os steps e tasks

    Args:
        roadmap_id: UUID do roadmap

    Returns:
        Dict com estrutura:
        {
            'id': str,
            'idea_id': str,
            'exported_to': str,
            'steps': [
                {
                    'id': str,
                    'title': str,
                    'description': str,
                    'step_order': int,
                    'tasks': [
                        {
                            'id': str,
                            'description': str,
                            'task_order': int,
                            'suggested_tools': list
                        }
                    ]
                }
            ]
        }
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro ao conectar ao banco: {e}")
        return None

    try:
        # Buscar roadmap
        cur.execute("""
            SELECT id, idea_id, exported_to, generated_at
            FROM roadmaps
            WHERE id = %s
        """, (roadmap_id,))

        roadmap_row = cur.fetchone()
        if not roadmap_row:
            return None

        roadmap = {
            'id': str(roadmap_row[0]),
            'idea_id': str(roadmap_row[1]),
            'exported_to': roadmap_row[2],
            'generated_at': roadmap_row[3].isoformat() if roadmap_row[3] else None,
            'steps': []
        }

        # Buscar steps
        cur.execute("""
            SELECT id, step_order, title, description
            FROM roadmap_steps
            WHERE roadmap_id = %s
            ORDER BY step_order
        """, (roadmap_id,))

        steps_rows = cur.fetchall()

        for step_row in steps_rows:
            step_id = str(step_row[0])
            step = {
                'id': step_id,
                'step_order': step_row[1],
                'title': step_row[2],
                'description': step_row[3],
                'tasks': []
            }

            # Buscar tasks deste step
            cur.execute("""
                SELECT id, task_order, description, suggested_tools
                FROM roadmap_tasks
                WHERE step_id = %s
                ORDER BY task_order
            """, (step_id,))

            tasks_rows = cur.fetchall()

            for task_row in tasks_rows:
                # Parse suggested_tools (JSON string para lista)
                suggested_tools = []
                if task_row[3]:
                    try:
                        suggested_tools = json.loads(task_row[3])
                    except:
                        suggested_tools = []

                task = {
                    'id': str(task_row[0]),
                    'task_order': task_row[1],
                    'description': task_row[2],
                    'suggested_tools': suggested_tools
                }
                step['tasks'].append(task)

            roadmap['steps'].append(step)

        return roadmap

    except Exception as e:
        print(f"Erro ao buscar roadmap: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        try:
            cur.close()
            conn.close()
        except:
            pass

def update_roadmap_image_path(roadmap_id: str, image_path: str) -> bool:
    """
    Atualiza o caminho da imagem gerada no roadmap

    Args:
        roadmap_id: UUID do roadmap
        image_path: Caminho da imagem gerada

    Returns:
        bool: True se atualizado com sucesso
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro ao conectar ao banco: {e}")
        return False

    try:
        cur.execute("""
            UPDATE roadmaps
            SET exported_to = %s
            WHERE id = %s
        """, (image_path, roadmap_id))

        conn.commit()
        return True

    except Exception as e:
        print(f"Erro ao atualizar roadmap: {e}")
        conn.rollback()
        return False
    finally:
        try:
            cur.close()
            conn.close()
        except:
            pass