# IdeaHub API (Backend)

Este README descreve como configurar, executar e desenvolver o backend da IdeaHub localizado em `backend/`.

Conteúdo
- Visão geral
- Requisitos
- Variáveis de ambiente
- Instalação (virtualenv)
- Execução (desenvolvimento)
- Execução com Docker / Docker Compose
- Estrutura do projeto
- Endpoints principais (resumo)
- Testes e verificações
- Próximos passos

Visão geral

O backend é uma API REST implementada com FastAPI. Ela fornece endpoints para autenticação, gerenciamento de ideias e um sistema de chat/agent integrado com fluxos de workflow AI.

Requisitos

- Python 3.11+ (recomendado)
- pip
- virtualenv (opcional, mas recomendado)
- Docker & Docker Compose (se pretende rodar via containers)

Variáveis de ambiente

O projeto espera algumas variáveis de ambiente para funcionar corretamente. Coloque-as em um arquivo `.env` na raiz do diretório `backend/` ou exporte no ambiente.

Exemplos (substitua pelos valores reais):

- DATABASE_URL=postgresql://user:password@host:port/dbname
- JWT_SECRET=uma_chave_secreta
- OPENAI_API_KEY=sk-...
- OTHER_API_KEYS=...

Observação: Se estiver executando via Docker Compose, verifique o arquivo `docker-compose.yml` no nível do repositório — ele pode prover serviços (banco, etc.) e variáveis de ambiente.

Instalação (virtualenv)

1. Entre na pasta do backend:

```bash
cd "backend"
```

2. Crie e ative um virtualenv (macOS / Linux):

```bash
python3 -m venv .venv
source .venv/bin/activate
```

3. Instale dependências:

```bash
pip install -r requirements.txt
```

Execução (desenvolvimento)

O ponto de entrada da aplicação é o pacote `app`. Para rodar localmente com `uvicorn` (modo desenvolvimento):

```bash
# a partir da pasta backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- A documentação interativa estará disponível em `http://localhost:8000/docs` (Swagger UI) ou `http://localhost:8000/redoc`.

Execução com Docker / Docker Compose

O repositório já contém arquivos `Dockerfile` em `backend/` e `docker-compose.yml` na raiz. Para subir os serviços (backend + dependências listadas no Compose):

```bash
# da raiz do repositório
docker compose up --build
```

Se quiser apenas construir a imagem do backend:

```bash
cd backend
docker build -t ideahub-backend .
```

Estrutura do projeto (resumo)

- backend/
  - app/                -> código FastAPI
    - api/              -> rotas (auth, idea, agent/chat)
    - auth/             -> autenticação e middleware
    - database/         -> conexão ao DB e queries
    - main.py           -> inicialização do app
    - openapi.json      -> documentação OpenAPI gerada/estática
  - Dockerfile
  - requirements.txt

Endpoints principais (resumo)

- POST /auth/login — autenticação
- POST /auth/register — criar usuário
- CRUD /api/idea — criar/listar/editar/deletar ideias
- /api/agent — rotas de chat (criar chat a partir de uma ideia, enviar mensagem, listar chats, obter chat)

(Consulte `app/openapi.json` ou `/docs` ao rodar a API para a documentação completa.)

Testes e verificações

Este repositório não contém uma suíte de testes automatizados por enquanto (verifique `backend/` para atualizações). Para checar erros de lint ou tipos localmente, rode suas ferramentas preferidas (flake8, mypy, etc.) após instalar dependências.

Próximos passos / dicas

- Se quiser que as rotas do chat exijam autenticação, verifique os decorators e o uso do header `Authorization` nas funções e ajuste o `openapi.json` (se o arquivo for mantido manualmente).
- Ajuste exemplos em `app/openapi.json` para reduzir warnings de validade de schema.
- Adicionar uma suíte de testes (pytest) com alguns testes básicos para endpoints principais.

Ajuda

Se preferir, posso:
- Ajustar o `openapi.json` para remover warnings de schema
- Adicionar instruções adicionais de desenvolvimento (debug, logs)
- Subir a aplicação localmente e verificar `/docs`

Fim.

