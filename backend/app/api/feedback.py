from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, EmailStr
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
import socket
import time
import traceback
import logging

load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)

class FeedbackRequest(BaseModel):
    name: str
    email: EmailStr
    type: str  # "bug", "feedback", "sponsor"
    message: str

def send_email(to_email: str, subject: str, body: str, *, raise_on_failure: bool = True):
    """Envia email usando SMTP do Gmail com checagem de conectividade e retries.

    Parâmetros:
    - to_email, subject, body: como antes
    - raise_on_failure: se True, propaga exceção; se False, apenas loga a falha (útil para BackgroundTasks)
    """

    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    sender_email = os.getenv("GMAIL_USER")
    sender_password = os.getenv("GMAIL_APP_PASSWORD")

    if not sender_email or not sender_password:
        err = ValueError("Credenciais do Gmail não configuradas")
        logger.error("send_email: credenciais não configuradas")
        if raise_on_failure:
            raise err
        return

    # Teste rápido de conectividade TCP antes de tentar SMTP
    try:
        logger.debug("send_email: testando conectividade TCP %s:%s", smtp_server, smtp_port)
        conn = socket.create_connection((smtp_server, smtp_port), timeout=10)
        conn.close()
    except Exception as e:
        msg = f"Connectivity check failed to {smtp_server}:{smtp_port} - {e}"
        logger.error(msg)
        if raise_on_failure:
            raise
        return

    # Criar mensagem
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = sender_email
    message["To"] = to_email

    # Criar conteúdo HTML
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            {body}
        </body>
    </html>
    """

    part = MIMEText(html_body, "html")
    message.attach(part)

    # Enviar email com retries (exponential backoff)
    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        try:
            logger.info("send_email: tentando enviar, tentativa %d/%d", attempt, max_attempts)
            with smtplib.SMTP(smtp_server, smtp_port, timeout=20) as server:
                server.starttls()
                server.login(sender_email, sender_password)
                server.sendmail(sender_email, to_email, message.as_string())
            logger.info("send_email: email enviado para %s", to_email)
            return
        except (socket.error, smtplib.SMTPException) as e:
            logger.warning("send_email: tentativa %d falhou: %s", attempt, e)
            if attempt == max_attempts:
                tb = traceback.format_exc()
                logger.error("send_email: falha ao enviar após %d tentativas. traceback: %s", attempt, tb)
                if raise_on_failure:
                    raise
                return
            else:
                # backoff
                sleep_for = 2 ** (attempt - 1)
                logger.debug("send_email: aguardando %s segundos antes de nova tentativa", sleep_for)
                time.sleep(sleep_for)
        except Exception:
            tb = traceback.format_exc()
            logger.exception("send_email: erro inesperado ao enviar email: %s", tb)
            if raise_on_failure:
                raise
            return


@router.post("/feedback")
async def submit_feedback(feedback: FeedbackRequest, request: Request, background_tasks: BackgroundTasks):
    """Recebe feedback/bug report e agenda envio por email em background (não bloqueante)."""

    try:
        # Mapear tipo de feedback
        type_labels = {
            "bug": "🐛 Bug Report",
            "feedback": "💡 Feedback",
            "sponsor": "💰 Patrocínio"
        }

        type_label = type_labels.get(feedback.type, feedback.type)

        # Criar corpo do email
        email_body = f"""
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
            <h2 style="color: #6366f1; margin-bottom: 20px;">{type_label}</h2>

            <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                <h3 style="margin-top: 0; color: #374151;">Informações do Usuário</h3>
                <p><strong>Nome:</strong> {feedback.name}</p>
                <p><strong>Email:</strong> {feedback.email}</p>
                <p><strong>Tipo:</strong> {type_label}</p>
            </div>

            <div style="background-color: white; padding: 20px; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #374151;">Mensagem</h3>
                <p style="white-space: pre-wrap;">{feedback.message}</p>
            </div>

            <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
                Este email foi enviado através do formulário de feedback do IdeaHub.
            </p>
        </div>
        """

        # Email do destinatário (seu email)
        recipient_email = os.getenv("FEEDBACK_EMAIL", os.getenv("GMAIL_USER"))

        # Agendar envio em background; não propagar falhas para o usuário
        background_tasks.add_task(
            send_email,
            recipient_email,
            f"[IdeaHub] {type_label} - {feedback.name}",
            email_body,
            raise_on_failure=False,
        )

        return {
            "success": True,
            "message": "Feedback agendado para envio. Obrigado pelo contato."
        }

    except Exception as e:
        logger.exception("Erro ao processar feedback: %s", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao enviar feedback: {str(e)}"
        )
