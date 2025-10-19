from openai import AsyncOpenAI
import os

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def run_classification(inp: str) -> str:
    """
    Extrai a ideia principal do input do usuário em poucas palavras.

    Args:
        inp: O texto do usuário para classificar

    Returns:
        A ideia principal em 2-8 palavras
    """
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Extraia, em poucas palavras, a ideia principal expressa pelo usuário em seu input. Não adicione explicações, contexto ou descrições: apenas retorne a essência da ideia do usuário de forma breve e objetiva.\n\n# Output Format\n\nRetorne a resposta em 2 a 8 palavras, sem frases completas."
                },
                {
                    "role": "user",
                    "content": inp
                }
            ],
            temperature=1,
            max_tokens=50,
            top_p=1
        )

        # Extrair e retornar o conteúdo da resposta
        classification = response.choices[0].message.content.strip()
        return classification

    except Exception as e:
        print(f"Erro ao classificar: {e}")
        return "Erro na classificação"
