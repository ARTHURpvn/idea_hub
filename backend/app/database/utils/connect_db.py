import os
from dotenv import load_dotenv
import psycopg2
from passlib.context import CryptContext

load_dotenv()

user = os.getenv("POSTGRES_USER", "postgres")
password = os.getenv("POSTGRES_PASSWORD", "postgres")
host = os.getenv("POSTGRES_HOST", "localhost")
port = os.getenv("POSTGRES_PORT", "5432")
db_name = os.getenv("POSTGRES_DB", "idea_hub_db")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db_conn(db: str = None):
    """Abre e retorna (conn, cur). Levanta exceção se não conseguir conectar.
    Faz a conexão por chamada (não no import) para evitar falha ao iniciar a aplicação
    quando o banco não estiver disponível.
    """
    database = db or db_name
    try:
        conn = psycopg2.connect(dbname=database, user=user, password=password, host=host, port=port)
        conn.autocommit = True
        cur = conn.cursor()
        return conn, cur
    except Exception:
        # Re-raise para o chamador lidar.
        raise