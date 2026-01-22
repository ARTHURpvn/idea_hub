from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

class FeedbackRequest(BaseModel):
    name: str
    email: EmailStr
    type: str  # "bug", "feedback", "sponsor"
    message: str

def send_email(to_email: str, subject: str, body: str):
    """Envia email usando SMTP do Gmail"""

    # Configurações do Gmail
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    sender_email = os.getenv("GMAIL_USER")
    sender_password = os.getenv("GMAIL_APP_PASSWORD")

    if not sender_email or not sender_password:
        raise ValueError("Credenciais do Gmail não configuradas")

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

    # Enviar email
    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, message.as_string())
    except Exception as e:
        raise Exception(f"Erro ao enviar email: {str(e)}")

@router.post("/feedback")
async def submit_feedback(feedback: FeedbackRequest, request: Request):
    """Recebe feedback/bug report e envia por email"""

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

        # Enviar email
        send_email(
            to_email=recipient_email,
            subject=f"[IdeaHub] {type_label} - {feedback.name}",
            body=email_body
        )

        return {
            "success": True,
            "message": "Feedback enviado com sucesso! Obrigado pelo contato."
        }

    except Exception as e:
        print(f"Erro ao processar feedback: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao enviar feedback: {str(e)}"
        )
