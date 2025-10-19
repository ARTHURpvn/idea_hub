from starlette.middleware.base import BaseHTTPMiddleware
from starlette.concurrency import run_in_threadpool
from fastapi import Request, HTTPException
from ..database.querys.auth_query import check_token

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if request.method == "OPTIONS":
            return await call_next(request)

        if path.startswith("/api"):
            auth_header = request.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip()
            method = request.method

            print("-=-=-=-=-=-=-=-=-=-=-=-=-| Middleware |-=-=-=-=-=-=-=-=-=-=-=-=-\n")

            print(f"Rota protegida: {method} {path}")
            if not token:
                print("Nenhum token fornecido")
                raise HTTPException(status_code=401, detail="Token de autenticação ausente\n")

            try:
                await run_in_threadpool(check_token, token)
                print(f"Usuário autenticado\n")

            except Exception as e:
                print(f"Usuario nao autenticado: {e}\n")

            print("-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\n\n")

        return await call_next(request)