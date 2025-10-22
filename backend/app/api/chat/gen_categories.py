from openai import AsyncOpenAI
import os
import json
import re
from typing import List, Dict, Optional, Any

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def create_categories(inp: str, idea: str) -> Optional[List[Dict[str, str]]]:
    """
    Generate a list of tag objects ({"name": str, "description": str}) in a single model call.

    Preferred output from the model: a JSON array of objects like
    [{"name": "Delivery", "description": "Entrega rápida para universitários"}, ...]

    Fallbacks:
    - If model returns a JSON array of strings, we will generate descriptions for each tag.
    - If model returns free text, we parse it to extract tag names and then generate descriptions.

    Returns: list of objects with name & description, or None on error.
    """
    try:
        # Ask the model to return a JSON array of objects with name and description in Portuguese
        messages: Any = [
            {
                "role": "system",
                "content": (
                    "Você é um assistente que precisa gerar TAGS para uma ideia. "
                    "RETORNE SOMENTE um JSON válido: uma lista de objetos com os campos 'name' e 'description'. "
                    "Cada 'name' deve ser uma tag curta (1-3 palavras) e 'description' deve ser uma frase curta em Português. "
                    "Exemplo: [{\"name\": \"Delivery Saudável\", \"description\": \"Entrega de refeições saudáveis para universitários\"}]"
                )
            },
            {
                "role": "user",
                "content": f"Idea: {idea}\nContext/Input: {inp}\nRetorne SOMENTE um JSON array de objetos {{name, description}} em Português."
            }
        ]

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.2,
            max_tokens=400,
            top_p=1
        )

        text = response.choices[0].message.content.strip()
        # Log raw model response to help debugging when parsing fails
        print(f"RAW_TAGS_RESPONSE: {text}")

        # If the model returned text with extra commentary plus a JSON blob,
        # try to extract the first JSON array found between the first '[' and the last ']'.
        if '[' in text and ']' in text:
            try:
                first = text.index('[')
                last = text.rindex(']')
                possible_json = text[first:last+1]
                parsed = json.loads(possible_json)
                # if parsed successfully, overwrite text variable so the normal JSON branch handles it
                text = possible_json
            except Exception:
                # ignore and proceed to normal parsing/fallbacks
                pass

        # 1) Try parse as JSON
        try:
            parsed = json.loads(text)
            # If it's a list of objects with name/description, normalize and return
            if isinstance(parsed, list) and parsed:
                normalized: List[Dict[str, str]] = []
                seen = set()
                for item in parsed:
                    if isinstance(item, dict):
                        name = (item.get("name") or "").strip()
                        desc = (item.get("description") or "").strip()
                        if not name:
                            continue
                        # clean name
                        name = re.sub(r"^[#\s]+|[\s#]+$", "", name)
                        name = re.sub(r"\s+", " ", name)
                        key = name.lower()
                        if key in seen:
                            continue
                        seen.add(key)
                        # if no description, generate one
                        if not desc:
                            desc = await create_categories_description(inp, idea, name)
                        normalized.append({"name": name, "description": desc})
                if normalized:
                    return normalized
            # If parsed is list of strings, generate descriptions
            if isinstance(parsed, list) and all(isinstance(x, (str,)) for x in parsed):
                tags = [str(x).strip().lstrip('#') for x in parsed if str(x).strip()]
                tags = list(dict.fromkeys(tags))
                result = []
                for tag in tags:
                    desc = await create_categories_description(inp, idea, tag)
                    result.append({"name": tag, "description": desc})
                if result:
                    return result
        except Exception:
            # fallthrough to free-text parsing
            pass

        # If initial parse failed, try one retry with a stricter instruction and lower temperature
        try:
            retry_messages: Any = [
                {
                    "role": "system",
                    "content": (
                        "Você é um assistente estritamente formatado. RETORNE APENAS UM JSON VÁLIDO: uma lista de objetos com 'name' e 'description' em Português. "
                        "Não inclua texto extra, explicações, bullets ou números. Exemplo: [{\"name\":\"Delivery Saudável\",\"description\":\"Entrega de refeições saudáveis para universitários\"}]"
                    )
                },
                {
                    "role": "user",
                    "content": f"Idea: {idea}\nContext/Input: {inp}\nRetorne apenas o JSON pedido, nada mais."
                }
            ]

            retry_resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=retry_messages,
                temperature=0.2,
                max_tokens=400,
                top_p=1
            )
            text_retry = retry_resp.choices[0].message.content.strip()
            print(f"RAW_TAGS_RESPONSE_RETRY: {text_retry}")

            # try to extract JSON between brackets if present
            if '[' in text_retry and ']' in text_retry:
                try:
                    f = text_retry.index('[')
                    l = text_retry.rindex(']')
                    possible_json2 = text_retry[f:l+1]
                    parsed2 = json.loads(possible_json2)
                    if isinstance(parsed2, list) and parsed2:
                        # handle objects list
                        normalized2: List[Dict[str, str]] = []
                        seen2 = set()
                        for item in parsed2:
                            if isinstance(item, dict):
                                name = (item.get("name") or "").strip()
                                desc = (item.get("description") or "").strip()
                                if not name:
                                    continue
                                name = re.sub(r"^[#\s]+|[\s#]+$", "", name)
                                name = re.sub(r"\s+", " ", name)
                                key = name.lower()
                                if key in seen2:
                                    continue
                                seen2.add(key)
                                if not desc:
                                    desc = await create_categories_description(inp, idea, name)
                                normalized2.append({"name": name, "description": desc})
                        if normalized2:
                            return normalized2
                    # if list of strings
                    if isinstance(parsed2, list) and all(isinstance(x, str) for x in parsed2):
                        tags2 = [s.strip().lstrip('#') for s in parsed2 if s.strip()]
                        tags2 = list(dict.fromkeys(tags2))
                        res2 = []
                        for tag in tags2:
                            desc = await create_categories_description(inp, idea, tag)
                            res2.append({"name": tag, "description": desc})
                        if res2:
                            return res2
                except Exception:
                    pass
        except Exception as e:
            print(f"Retry request failed: {e}")
            # proceed to free-text fallback

        # Enforce a maximum number of tags (avoid runaway lists) and validate tag length
        def validate_and_limit(items: List[Dict[str, str]]) -> List[Dict[str, str]]:
            valid: List[Dict[str, str]] = []
            seen_local = set()
            for it in items:
                name = it.get('name','').strip()
                desc = it.get('description','').strip()
                # limit words to 1-3 (reasonable tag length)
                if not name:
                    continue
                if len(name.split()) > 3:
                    # shorten by taking first three words
                    name = ' '.join(name.split()[:3])
                key = name.lower()
                if key in seen_local:
                    continue
                seen_local.add(key)
                valid.append({'name': name, 'description': desc})
                if len(valid) >= 8:
                    break
            return valid

        # 2) Fallback: free text parsing to extract probable tags
        # Remove common lead phrases and bullets
        cleaned = re.sub(r"(?i)aqui estão[^\n]*|aqui vai|sugestões de tags para a ideia[^\n]*:|sugestões de tags|sugestões", "", text)
        cleaned = re.sub(r"[\n\r]+", ",", cleaned)
        cleaned = re.sub(r"[#\-•·]", "", cleaned)
        parts = [p.strip() for p in re.split(r"[,;|\n]+", cleaned) if p.strip()]
        parts = [re.sub(r"^\d+\.?\s*", "", p) for p in parts]

        # Normalize and dedupe
        normalized_names: List[str] = []
        seen = set()
        for p in parts:
            name = p.strip().strip('"\'')
            name = re.sub(r"\s+", " ", name)
            if not name:
                continue
            key = name.lower()
            if key in seen:
                continue
            seen.add(key)
            normalized_names.append(name)

        if not normalized_names:
            return None

        # Generate descriptions for each tag
        result: List[Dict[str, str]] = []
        for tag in normalized_names:
            desc = await create_categories_description(inp, idea, tag)
            if desc is None:
                desc = ""
            result.append({"name": tag, "description": desc})

        return validate_and_limit(result)

    except Exception as e:
        print(f"Erro ao classificar (create_categories combined): {e}")
        return None


async def create_categories_description(inp: str, idea: str, tag: str) -> str:
    """
    Generate a short (1-2 sentence) description for the given tag. Return plain text only in Portuguese.
    """
    try:
        messages: Any = [
            {
                "role": "system",
                "content": (
                    "Você é um assistente que deve gerar UMA breve descrição (1-2 frases) para uma TAG relacionada à ideia. "
                    "Retorne SOMENTE o texto da descrição em Português. Não adicione numeração ou o nome da tag."
                )
            },
            {
                "role": "user",
                "content": f"Idea: {idea}\nContext/Input: {inp}\nTag: {tag}\nRetorne 1-2 frases em Português descrevendo esta tag."
            }
        ]

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=80,
            top_p=1
        )

        text = response.choices[0].message.content.strip()
        # Cleanup numeric bullets or leading punctuation
        text = re.sub(r"^\s*\d+\.?\s*", "", text)
        text = re.sub(r"^[#\-•·]\s*", "", text)
        return text
    except Exception as e:
        print(f"Erro ao gerar descricao da tag: {e}")
        return ""
