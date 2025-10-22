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

class Chat(BaseModel):
    user_id: str
    idea_id: str

def create_chat(chat: Chat) -> str | None:
    """
    Creates a new chat or performs operations related to an existing chat. The function
    can either successfully handle the operation and return the relevant identifier
    or return nothing in specific cases. This can include validation, database operations,
    or other transactional logic as part of processing.

    :param chat: A Chat instance representing the chat to be created or handled.
    :type chat: Chat
    :return: A string representing an identifier for the created/processed chat,
        or None if the operation does not produce any result.
    :rtype: str | None
    """

    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao criar chat: {e}")
        return None

    try:
        cur.execute("INSERT INTO ai_chats (user_id, idea_id) VALUES (%s, %s) RETURNING id", (chat.user_id, chat.idea_id))
        row = cur.fetchone()
        if row:
            chat_id = str(row[0])
            conn.commit()
            return chat_id
        conn.rollback()
        return None
    except Exception as e:
        print(f"Erro ao criar chat: {e}")
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

def create_message(chat_id: str, message: str, sender: str) -> bool:
    """
    Generate and send a message to a specific chat.

    This function is responsible for creating and sending a message to a given chat
    identified by its unique `chat_id`. It ensures message delivery and provides a
    boolean response indicating the success or failure of the operation.

    :param chat_id: A unique identifier for the chat where the message will be sent.
    :type chat_id: str
    :param message: The content of the message to be sent to the specified chat.
    :type message: str
    :return: A boolean indicating the success (`True`) or failure (`False`) of the
             message creation and sending process.
    :rtype: bool
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao enviar mensagem: {e}")
        return False

    try:
        cur.execute("INSERT INTO ai_messages (chat_id, message, sender) VALUES (%s, %s, %s)", (chat_id, message, sender))
        conn.commit()
        return True
    except Exception as e:
        print(f"Erro ao enviar mensagem: {e}")
        try:
            conn.rollback()
        except Exception:
            pass
        return False
    finally:
        try:
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Erro ao fechar conexao: {e}")

def get_idea_by_chat_id(chat_id: str):
    """
    Retrieves an idea associated with a specific chat ID.

    This function takes a chat ID as input and returns the corresponding
    idea stored for that chat ID if it exists. It assumes that there is a
    predefined mapping of chat IDs to their respective ideas, providing a
    way to retrieve data relevant to a particular chat context.

    :param chat_id: The identifier of the chat for which the idea is to
        be retrieved.
    :type chat_id: str
    :return: The idea associated with the specified chat ID if it exists,
        or None if no idea is found.
    :rtype: Any
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao pegar idea: {e}")
        return None

    try:
        cur.execute("SELECT idea_id FROM ai_chats WHERE id = %s", (chat_id,))
        idea = cur.fetchone()
        if idea:
            return str(idea[0])
        return None
    except Exception as e:
        print(f"Erro ao pegar idea: {e}")
        return None
    finally:
        try:
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Erro ao fechar conexao: {e}")

def get_all_chats(user_id: str):
    """
    Retrieve all chats associated with a specific user.

    This function fetches and returns all chat conversations
    for a given user identified by their unique user ID.

    :param user_id: The unique identifier for the user
    :type user_id: str
    :return: A list of chats associated with the user
    :rtype: list
    """

    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao pegar chats: {e}")
        return None

    try:
        # Seleciona colunas explicitamente e usa parâmetro para evitar SQL injection
        cur.execute(
            "SELECT ai_chats.id, ai_chats.user_id, ai_chats.idea_id, ai_messages.message, ai_messages.sender "
            "FROM ai_chats "
            "INNER JOIN ai_messages ON ai_chats.id = ai_messages.chat_id "
            "WHERE ai_chats.user_id = %s "
            "ORDER BY ai_messages.id DESC",
            (user_id,)
        )
        rows = cur.fetchall()
        chats = []
        for row in rows:
            chats.append({
                "chat_id": str(row[0]),
                "user_id": str(row[1]),
                "idea_id": str(row[2]) if row[2] is not None else None,
                "message": row[3],
                "sender": row[4]
            })
        return chats

    except Exception as e:
        print(f"Erro ao pegar chats: {e}")
        return None
    finally:
        try:
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Erro ao fechar conexao: {e}")

def get_chat(chat_id: str):
    """
    Fetches chat messages and related information for a specified chat ID from the database.

    The function establishes a database connection, retrieves chat and associated messages
    data using a safe SQL query to avoid injection, and returns the data as a list of dictionaries.
    Each dictionary contains information about the chat id, user id, idea id, message, and sender.

    :param chat_id: The unique identifier of the chat to retrieve data for.
    :type chat_id: str
    :return: A list of dictionaries where each dictionary represents a message within the
             specified chat, including details about the chat id, user id, idea id, message content,
             and sender. Returns None if there's an error during execution or if no data is found.
    :rtype: list[dict] | None
    """

    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao pegar chats: {e}")
        return None

    try:
        # Seleciona colunas explicitamente e usa parâmetro para evitar SQL injection
        cur.execute(
            "SELECT ai_chats.id, ai_chats.user_id, ai_chats.idea_id, ai_messages.message, ai_messages.sender "
            "FROM ai_chats "
            "INNER JOIN ai_messages ON ai_chats.id = ai_messages.chat_id "
            "WHERE ai_chats.id = %s "
            "ORDER BY ai_messages.id DESC",
            (chat_id,)
        )
        rows = cur.fetchall()
        chats = []
        for row in rows:
            chats.append({
                "chat_id": str(row[0]),
                "user_id": str(row[1]),
                "idea_id": str(row[2]) if row[2] is not None else None,
                "message": row[3],
                "sender": row[4]
            })
        return chats

    except Exception as e:
        print(f"Erro ao pegar chats: {e}")
        return None
    finally:
        try:
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Erro ao fechar conexao: {e}")

def get_last_ai_message(chat_id: str) -> str | None:
    """
    Retorna a última mensagem enviada pelo AI para um chat específico.

    :param chat_id: ID do chat
    :return: mensagem (str) ou None se não houver
    """
    try:
        conn, cur = get_db_conn(db_name)
    except Exception as e:
        print(f"Erro de conexao ao pegar ultima mensagem AI: {e}")
        return None

    try:
        cur.execute(
            "SELECT message FROM ai_messages WHERE chat_id = %s AND sender = %s ORDER BY id DESC LIMIT 1",
            (chat_id, 'AI')
        )
        row = cur.fetchone()
        if row:
            return row[0]
        return None
    except Exception as e:
        print(f"Erro ao pegar ultima mensagem AI: {e}")
        return None
    finally:
        try:
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Erro ao fechar conexao: {e}")
