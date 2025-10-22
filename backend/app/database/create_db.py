# python
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2 import sql

load_dotenv()

user = os.getenv("POSTGRES_USER", "postgres")
password = os.getenv("POSTGRES_PASSWORD", "postgres")
host = os.getenv("POSTGRES_HOST", "localhost")
port = os.getenv("POSTGRES_PORT", "5432")
db_name = os.getenv("POSTGRES_DB", "idea_forge")


def ensure_database_and_tables():
    print(f"[create_db] using connection: user={user} host={host} port={port} db_name={db_name}")
    # Conecta no banco system (postgres) para criar o database se necessário
    try:
        conn = psycopg2.connect(dbname="postgres", user=user, password=password, host=host, port=port)
        conn.autocommit = True
        cur = conn.cursor()
    except Exception as e:
        print(f"[create_db] erro ao conectar ao postgres (dbname=postgres): {e}")
        raise

    try:
        print(f"[create_db] verificando se o banco {db_name} existe...")
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
        db_exists = cur.fetchone() is not None

        if not db_exists:
            try:
                print(f"[create_db] criando banco {db_name}...")
                cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db_name)))
                print(f"[create_db] Banco {db_name} criado com sucesso!")
            except Exception as e:
                print(f"[create_db] Erro ao criar banco {db_name}: {e}")
                # continuar para tentar conectar caso já exista por concorrência
        else:
            print(f"[create_db] Banco {db_name} já existe.")
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

    # Conecta ao banco recém-criado (ou já existente) para criar extensão e tabelas
    try:
        print(f"[create_db] conectando ao banco {db_name}...")
        conn_db = psycopg2.connect(dbname=db_name, user=user, password=password, host=host, port=port)
        conn_db.autocommit = True
        cur_db = conn_db.cursor()
    except Exception as e:
        print(f"[create_db] erro ao conectar ao banco {db_name}: {e}")
        raise

    try:
        print("[create_db] criando extensão pgcrypto (se não existir)...")
        cur_db.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

        tables = [
            # users
            (
                "users",
                """
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
                """,
            ),
            # categories
            (
                "categories",
                """
                CREATE TABLE IF NOT EXISTS categories (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL,
                    description TEXT
                )
                """,
            ),
            # tags
            (
                "tags",
                """
                CREATE TABLE IF NOT EXISTS tags (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL
                )
                """,
            ),
            # ideas
            (
                "ideas",
                """
                CREATE TABLE IF NOT EXISTS ideas (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    status VARCHAR(255) NOT NULL DEFAULT 'DRAFT',
                    raw_content TEXT NOT NULL DEFAULT '',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    finalized_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
                    ai_classification VARCHAR(255) NOT NULL DEFAULT 'unclassified'
                )
                """,
            ),
            # idea_version
            (
                "idea_version",
                """
                CREATE TABLE IF NOT EXISTS idea_version (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
                """,
            ),
            # idea_categories
            (
                "idea_categories",
                """
                CREATE TABLE IF NOT EXISTS idea_categories (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
                    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE
                )
                """,
            ),
            # idea_tags
            (
                "idea_tags",
                """
                CREATE TABLE IF NOT EXISTS idea_tags (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
                    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE
                )
                """,
            ),
            # ai_chats
            (
                "ai_chats",
                """
                CREATE TABLE IF NOT EXISTS ai_chats (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
                    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    ended_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
                )
                """,
            ),
            # ai_messages
            (
                "ai_messages",
                """
                CREATE TABLE IF NOT EXISTS ai_messages (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    chat_id UUID NOT NULL REFERENCES ai_chats(id) ON DELETE CASCADE,
                    sender VARCHAR(100) NOT NULL,
                    message TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
                """,
            ),
            # roadmaps
            (
                "roadmaps",
                """
                CREATE TABLE IF NOT EXISTS roadmaps (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    exported_to VARCHAR(50),
                    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE
                )
                """,
            ),
            # roadmap_steps
            (
                "roadmap_steps",
                """
                CREATE TABLE IF NOT EXISTS roadmap_steps (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
                    step_order INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
                """,
            ),
            # roadmap_tasks
            (
                "roadmap_tasks",
                """
                CREATE TABLE IF NOT EXISTS roadmap_tasks (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    step_id UUID NOT NULL REFERENCES roadmap_steps(id) ON DELETE CASCADE,
                    task_order INTEGER NOT NULL,
                    description TEXT NOT NULL,
                    suggested_tools TEXT
                )
                """,
            ),
        ]

        for name, stmt in tables:
            try:
                print(f"[create_db] criando/verificando tabela: {name} ...")
                cur_db.execute(stmt)
                print(f"[create_db] tabela {name} OK")
            except Exception as e:
                print(f"[create_db] erro ao criar tabela {name}: {e}")

        print("[create_db] Tabelas criadas/confirmadas com sucesso.")
    except Exception as e:
        print(f"[create_db] Erro ao criar tabelas: {e}")
        raise
    finally:
        try:
            cur_db.close()
            conn_db.close()
        except Exception:
            pass


if __name__ == '__main__':
    ensure_database_and_tables()
