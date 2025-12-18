from openai import AsyncOpenAI
from types import SimpleNamespace
from guardrails.runtime import load_config_bundle, instantiate_guardrails, run_guardrails
from pydantic import BaseModel
from agents import RunContextWrapper, Agent, ModelSettings, Runner, RunConfig, trace
from openai.types.shared.reasoning import Reasoning
import logging
from typing import List, cast

from ..idea import get_idea_by_id

# Shared client for guardrails and file search
client = AsyncOpenAI()
ctx = SimpleNamespace(guardrail_llm=client)
# Guardrails definitions
guardrails_config = {
  "guardrails": [
  ]
}
# Instantiate guardrails once at module load to avoid repeated work
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

_guardrails_bundle = load_config_bundle(guardrails_config)
guardrails_instance = instantiate_guardrails(_guardrails_bundle)

# Guardrails utils

def guardrails_has_tripwire(results):
    return any(getattr(r, "tripwire_triggered", False) is True for r in (results or []))

def get_guardrail_checked_text(results, fallback_text):
    for r in (results or []):
        info = getattr(r, "info", None) or {}
        if isinstance(info, dict) and ("checked_text" in info):
            return info.get("checked_text") or fallback_text
    return fallback_text

def build_guardrail_fail_output(results):
    failures = []
    for r in (results or []):
        if getattr(r, "tripwire_triggered", False):
            info = getattr(r, "info", None) or {}
            failure = {
                "guardrail_name": info.get("guardrail_name"),
            }
            for key in ("flagged", "confidence", "threshold", "hallucination_type", "hallucinated_statements", "verified_statements"):
                if key in (info or {}):
                    failure[key] = info.get(key)
            failures.append(failure)
    return {"failed": len(failures) > 0, "failures": failures}
class EntenderSchema(BaseModel):
  name: str


class CriarFuncContext:
  def __init__(self, input_output_text: str):
    self.input_output_text = input_output_text
def criar_func_instructions(run_context: RunContextWrapper[CriarFuncContext], _agent: Agent[CriarFuncContext]):
  input_output_text = run_context.context.input_output_text
  return f"""Função: criar funcionalidades originais, coerentes e detalhadas com base na ideia contextualizada.

Instrução aprimorada:
Sua função é gerar uma lista completa de funcionalidades com base no contexto a seguir:
{input_output_text}

Cada funcionalidade deve:
Ser coerente com o objetivo central da ideia;
Ter valor prático para o usuário final;
Ser descrita de forma clara e sucinta (1 a 2 frases explicando sua função);
Demonstrar criatividade e inovação, sem fugir do escopo.
Se possível, categorize as funcionalidades (ex: núcleo principal, adicionais, diferenciais).
Saída esperada: Uma lista organizada e criativa de funcionalidades, bem explicadas e alinhadas à ideia proposta. Retorne apenas as funcionalidades em lista, nao retorne nada alem disso"""
criar_func = Agent(
  name="Criar Func",
  instructions=criar_func_instructions,
  model="gpt-4.1-mini",
  model_settings=ModelSettings(
    temperature=1,
    top_p=1,
    max_tokens=2048,
    store=True
  )
)


class AnalizarViabilidadeContext:
  def __init__(self, input_output_text: str):
    self.input_output_text = input_output_text
def analizar_viabilidade_instructions(run_context: RunContextWrapper[AnalizarViabilidadeContext], _agent: Agent[AnalizarViabilidadeContext]):
  input_output_text = run_context.context.input_output_text
  return f"""Função: analisar as funcionalidades sugeridas e avaliar a viabilidade técnica, complexidade e prioridade de cada uma.
Instrução aprimorada:
Sua função é avaliar tecnicamente as funcionalidades propostas, analisando viabilidade, complexidade e relevância.
Avalie cada funcionalidade quanto a:
Viabilidade técnica (quão possível é implementá-la com tecnologias comuns);
Complexidade estimada (baixa, média ou alta);
Impacto no usuário final (baixo, médio, alto);
Dependências (se exige outras funções, dados ou integrações).
Organize o resultado em formato de lista ou tabela, com observações curtas.
Saída esperada: Um diagnóstico técnico claro, objetivo e fundamentado de todas as funcionalidades geradas, pronto para a etapa de seleção.
Nao quero nada alem da lista falando das funcionalidades.

 {input_output_text}"""
analizar_viabilidade = Agent(
  name="Analizar viabilidade",
  instructions=analizar_viabilidade_instructions,
  model="gpt-4.1-mini",
  model_settings=ModelSettings(
    temperature=1,
    top_p=1,
    max_tokens=2048,
    store=True
  )
)


class EntenderContext:
  def __init__(self, workflow_input_as_text: str, idea_context: str = ""):
    self.workflow_input_as_text = workflow_input_as_text
    self.idea_context = idea_context
def entender_instructions(run_context: RunContextWrapper[EntenderContext], _agent: Agent[EntenderContext]):
  workflow_input_as_text = run_context.context.workflow_input_as_text
  # make idea_context explicitly available to the agent instructions if present
  idea_ctx = getattr(run_context.context, "idea_context", "") or ""
  context_block = f"\nContexto da ideia (anotações): {idea_ctx}\n" if idea_ctx.strip() else ""
  return f"""Voce precisa entende o que o usuario esta querendo fazer e precisa classificar entre duas coisas exatas: \"criar_ideia\"  | \"tirar_duvida\" |  \"nao_relacionado\".
 Voce vai retornar apenas uma dessas tres frases.
 Voce precisa entender o se ele quer retirar duvida sobre algo relacionado ao projeto ou apenas uma duvida qualquer, quando for uma duvida qualquer voce deve retornar: \"nao_relacionado\"
 {workflow_input_as_text}{context_block}"""
entender = Agent(
  name="Entender",
  instructions=entender_instructions,
  model="gpt-5-nano",
  output_type=EntenderSchema,
  model_settings=ModelSettings(
    store=True,
    reasoning=Reasoning(
      effort="low"
    )
  )
)


criar_contexto = Agent(
  name="Criar contexto",
  instructions="""Função: compreender profundamente a ideia e gerar um contexto estruturado e completo para servir de base aos demais agentes.
Instrução aprimorada:
Sua tarefa é analisar cuidadosamente a ideia enviada pelo usuário e construir um contexto coerente, estruturado e informativo sobre ela.
O contexto deve incluir:
Objetivo central da ideia;
Problema que ela resolve;
Público-alvo;
Tecnologias envolvidas;
Funcionalidades principais;
Limitações e desafios.
Regras:
Seja objetivo, mas completo — sem redundância.
Não invente fatos; apenas interprete coerentemente o que for implícito.
Organize as informações em formato claro e lógico, para que outro agente consiga usá-las diretamente.
Saída esperada: Um resumo estruturado e coeso, que descreva a ideia de forma clara e sirva como base de conhecimento para os próximos agentes.""",
  model="gpt-4.1-mini",
  model_settings=ModelSettings(
    temperature=1,
    top_p=1,
    max_tokens=2048,
    store=True
  )
)


class VerificarContextoContext:
  def __init__(self, input_output_text: str):
    self.input_output_text = input_output_text
def verificar_contexto_instructions(run_context: RunContextWrapper[VerificarContextoContext], _agent: Agent[VerificarContextoContext]):
  input_output_text = run_context.context.input_output_text
  return f"""Função: revisar e aprimorar o contexto, garantindo que ele seja completo, claro e tecnicamente consistente antes de prosseguir. Seu foco nao é em responder a pergunta, apenas revisar e aprimorar o contexto gerado
Instrução aprimorada:
Sua função é avaliar e validar o contexto gerado anteriormente para garantir que ele está completo, coerente e pronto para ser usado.
Analise se o contexto:
Está claro e compreensível;
Contém as informações essenciais (objetivo, funcionamento, tecnologias, público-alvo, desafios);
Não apresenta contradições ou lacunas;
Está formatado de modo organizado e útil para outro agente interpretar facilmente.
Se algo estiver faltando, corrija ou complemente com base na lógica e coerência do texto original, sem inventar elementos fora do escopo.
Saída esperada: Um contexto revisado, aprimorado e consistente, pronto para ser usado pelo Agente Solucionador.  Nao retorne em tópicos ou listas, apenas um texto redigido contextualizando a ideia do produto.

{input_output_text}"""
verificar_contexto = Agent(
  name="Verificar Contexto",
  instructions=verificar_contexto_instructions,
  model="gpt-4.1-mini",
  model_settings=ModelSettings(
    temperature=1,
    top_p=1,
    max_tokens=2048,
    store=True
  )
)


class SolucionarDuvidaContext:
  def __init__(self, input_output_text: str):
    self.input_output_text = input_output_text
def solucionar_duvida_instructions(run_context: RunContextWrapper[SolucionarDuvidaContext], _agent: Agent[SolucionarDuvidaContext]):
  input_output_text = run_context.context.input_output_text
  return f"""Função: interpretar o contexto validado e responder diretamente às dúvidas do usuário, com precisão e profundidade.
Instrução aprimorada:
Sua função é entender o contexto fornecido a seguir e responder às dúvidas do usuário com clareza, precisão e profundidade:
{input_output_text}
Regras:
Responda diretamente à dúvida, sem rodeios.
Mantenha foco total no contexto
Use uma linguagem clara, organizada e objetiva, com explicações técnicas quando necessário.
Sempre que possível, dê exemplos, analogias ou comparações visuais para reforçar o entendimento.
Seja criativo, mas disciplinado: aprofunde sem perder a linha de raciocínio.
Saída esperada: Uma resposta completa, clara e fundamentada, que resolve a dúvida do usuário e mantém alinhamento total com o contexto validado."""
solucionar_duvida = Agent(
  name="Solucionar Duvida",
  instructions=solucionar_duvida_instructions,
  model="gpt-4.1-mini",
  model_settings=ModelSettings(
    temperature=1,
    top_p=1,
    max_tokens=2048,
    store=True
  )
)


class AvaliarClarezaContext:
  def __init__(self, input_output_text: str):
    self.input_output_text = input_output_text
def avaliar_clareza_instructions(run_context: RunContextWrapper[AvaliarClarezaContext], _agent: Agent[AvaliarClarezaContext]):
  input_output_text = run_context.context.input_output_text
  return f"""Função: revisar e refinar a resposta, garantindo fluidez, clareza e adequação ao público final.
Instrução aprimorada:
Sua função é avaliar e reescrever a resposta gerada pelo Agente Solucionador, tornando-a mais fluida, envolvente e compreensível para o usuário final, sem alterar o conteúdo técnico.
Regras:
Mantenha fidelidade total à resposta original.
Melhore a clareza, tom e ritmo da escrita.
Adapte o estilo para ser natural, empático e humano, como se estivesse explicando de forma paciente e direta.
Evite jargões desnecessários e priorize a didática.
Evite usar tópicos e listas, use apenas quando for totalmente necessário.
Se a resposta for longa, estruture em tópicos ou parágrafos bem delimitados.
Saída esperada: Uma versão refinada, fluida e acessível da resposta, pronta para ser exibida ao usuário final.

# Resposta
 {input_output_text}"""
avaliar_clareza = Agent(
  name="Avaliar clareza",
  instructions=avaliar_clareza_instructions,
  model="gpt-4.1-mini",
  model_settings=ModelSettings(
    temperature=1,
    top_p=1,
    max_tokens=2048,
    store=True
  )
)


class SelecionarMelhoresContext:
  def __init__(self, input_output_text: str):
    self.input_output_text = input_output_text
def selecionar_melhores_instructions(run_context: RunContextWrapper[SelecionarMelhoresContext], _agent: Agent[SelecionarMelhoresContext]):
  input_output_text = run_context.context.input_output_text
  return f"""Função: escolher as funcionalidades mais relevantes, inovadoras e alinhadas ao propósito central da ideia.
Instrução aprimorada:
Sua função é selecionar as funcionalidades mais estratégicas com base nas análises técnicas e na visão geral da ideia.
Voce precisa verificar quantas funcionalidades o usuario pediu para retornar e tentar retornar a mesma quantidade de funcionalidades.
Critérios de seleção:
Alinhamento com o objetivo principal da ideia;
Impacto positivo no usuário;
Equilíbrio entre inovação e viabilidade técnica;
Diferenciação competitiva (funcionalidades únicas ou originais).
Descarte funcionalidades redundantes, inviáveis ou que fujam do foco.
Saída esperada: Uma lista final curada e priorizada de funcionalidades, justificando brevemente a escolha de cada uma.

 {input_output_text}"""
selecionar_melhores = Agent(
  name="Selecionar melhores",
  instructions=selecionar_melhores_instructions,
  model="gpt-4.1-mini",
  model_settings=ModelSettings(
    temperature=1,
    top_p=1,
    max_tokens=2048,
    store=True
  )
)


def avaliar_clareza_instructions1(run_context: RunContextWrapper[AvaliarClarezaContext], _agent: Agent[AvaliarClarezaContext]):
  input_output_text = run_context.context.input_output_text
  return f"""Função: revisar e refinar a resposta, garantindo fluidez, clareza e adequação ao público final.
Instrução aprimorada:
Sua função é revisar a lista final de funcionalidades selecionadas, deixando a explicação mais fluida, compreensível e atrativa para o usuário final.
Mantenha a essência e os detalhes técnicos;
Aprimore o tom de comunicação para que soe natural e inspirador;
Estruture o texto de forma organizada e envolvente (ex: tópicos, seções ou blocos temáticos).
Saída esperada: Um texto final claro, inspirador e profissional, apresentando as funcionalidades como se fosse uma visão de produto pronta para validação ou prototipagem.
Nao quero que voce retorne nada alem das funcionalidades e da ideia.
De uma leve resumida para o texto final nao ficar maçante para o usuario ler.

 {input_output_text}"""
avaliar_clareza1 = Agent(
  name="Avaliar clareza",
  instructions=avaliar_clareza_instructions1,
  model="gpt-5-nano",
  model_settings=ModelSettings(
    store=True,
    reasoning=Reasoning(
      effort="low"
    )
  )
)


class CriarContextoContext:
  def __init__(self, input_output_parsed_name: str, idea: str = "", context: str = ""):
    self.input_output_parsed_name = input_output_parsed_name
    self.idea = idea
    self.context = context
def criar_contexto_instructions(run_context: RunContextWrapper[CriarContextoContext], _agent: Agent[CriarContextoContext]):
  idea = getattr(run_context.context, "idea", "") or ""
  context = getattr(run_context.context, "context", "") or ""
  logger.debug("Funcao criar contexto com o content %s", context)
  return f"""Função: compreender profundamente a ideia: {idea}, analisando as anotacoes do usuario: {context} e gerar um contexto estruturado e completo para servir como base aos demais agentes.
Instrução aprimorada:
Sua tarefa é analisar cuidadosamente a ideia enviada pelo usuário e construir um contexto coerente, estruturado e informativo sobre ela.
O contexto deve incluir:
Objetivo central da ideia;
Problema que ela resolve;
Público-alvo;
Tecnologias envolvidas;
Funcionalidades principais;
Limitações e desafios.
Regras:
Seja objetivo, mas completo — sem redundância.
Não invente fatos; apenas interprete coerentemente o que for implícito.
Organize as informações em formato claro e lógico, para que outro agente consiga usá-las diretamente.
Saída esperada: Um resumo estruturado e coeso, que descreva a ideia de forma clara e sirva como base de conhecimento para os próximos agentes."""
criar_contexto1 = Agent(
  name="Criar contexto",
  instructions=criar_contexto_instructions,
  model="gpt-4.1-mini",
  model_settings=ModelSettings(
    temperature=1,
    top_p=1,
    max_tokens=2048,
    store=True
  )
)


class WorkflowInput(BaseModel):
  input_as_text: str


# Main code entrypoint
async def run_workflow(workflow_input: WorkflowInput, idea_id: str):
  with trace("New workflow"):
    state = {

    }

    idea_dict = None
    try:
        if idea_id:
            idea_dict = get_idea_by_id(idea_id)
    except Exception as e:
        logger.exception("Erro ao buscar idea_id %s: %s", idea_id, e)
        return {"error": str(e)}

    if idea_dict is None:
        idea_text = ""
        # ensure idea_context is always defined to avoid NameError downstream
        idea_context = ""
    else:
        if isinstance(idea_dict, dict):
            idea_text = idea_dict.get("ai_classification") or idea_dict.get("title")
            idea_context = idea_dict.get("raw_content")
            logger.debug("Chat recebeu o contexto %s", idea_context)

        else:
            idea_text = getattr(idea_dict, "ai_classification", None) or getattr(idea_dict, "title", None) or str(idea_dict)
            idea_context = getattr(idea_dict, "raw_content", None) or ""


    workflow = workflow_input.model_dump()
    # iniciar conversation_history com estrutura compatível em runtime; removi a anotação de tipo estrita para evitar warnings
    conversation_history = [
      {
        "role": "user",
        "content": [
          {
            "type": "input_text",
            "text": workflow["input_as_text"]
          }
        ]
      }
    ]
    # If there is idea_context, inject it as a system/context message so agents see it up front
    try:
        if idea_context and str(idea_context).strip():
            conversation_history.insert(0, {
                "role": "system",
                "content": [
                    {
                        "type": "input_text",
                        "text": str(idea_context)
                    }
                ]
            })
    except NameError:
        # idea_context may not be defined in some paths; ignore if missing
        logger.debug("idea_context not available to inject into conversation_history")

    # Log conversation for debugging to verify context is being passed
    try:
        logger.debug("Conversation history being sent to Runner: %s", conversation_history)
    except Exception:
        pass
    guardrails_inputtext = workflow["input_as_text"]
    # use the pre-instantiated guardrails instance
    guardrails_result = await run_guardrails(ctx, guardrails_inputtext, "text/plain", guardrails_instance, suppress_tripwire=True)
    guardrails_hastripwire = guardrails_has_tripwire(guardrails_result)
    guardrails_anonymizedtext = get_guardrail_checked_text(guardrails_result, guardrails_inputtext)
    guardrails_output = (guardrails_hastripwire and build_guardrail_fail_output(guardrails_result or [])) or (guardrails_anonymizedtext or guardrails_inputtext)
    if guardrails_hastripwire:
      return guardrails_output
    else:
      # Pass context into EntenderContext so the classification agent can use it explicitly
      entender_result_temp = await Runner.run(
        entender,
        input=[
          *conversation_history
        ],
        run_config=RunConfig(trace_metadata={
          "__trace_source__": "agent-builder",
          "workflow_id": "wf_68f27b81b4d08190923b1ee19c2c5ccb0812928a7e7e468e"
        }),
        context=EntenderContext(workflow_input_as_text=workflow["input_as_text"], idea_context=str(idea_context) if idea_context else "")
      )

      # conversation_history.extend([item.to_input_item() for item in entender_result_temp.new_items])

      entender_result = {
        "output_text": entender_result_temp.final_output.json(),
        "output_parsed": entender_result_temp.final_output.model_dump()
      }

      # --- DEBUG / normalization for classification ---
      try:
          raw_name = None
          if isinstance(entender_result.get("output_parsed"), dict):
              raw_name = entender_result["output_parsed"].get("name")
          if not raw_name:
              # fallback to output_text which might be a json string or plain text
              raw_text = entender_result.get("output_text")
              if isinstance(raw_text, str):
                  # remove surrounding quotes if any (final_output.json() may include them)
                  raw_text_stripped = raw_text.strip().strip('"')
                  raw_name = raw_text_stripped

          normalized_name = ""
          if isinstance(raw_name, str):
              normalized_name = raw_name.strip().lower().replace(" ", "_").replace("-", "_")
          else:
              normalized_name = ""

          logger.debug("DEBUG: entender raw_name=%r, normalized_name=%r", raw_name, normalized_name)
      except Exception as e:
          logger.exception("DEBUG: erro ao normalizar entender result: %s", e)
          normalized_name = ""
      # --- end debug ---

      # Use the normalized classification for branching
      if normalized_name == "tirar_duvida" or normalized_name == "tirar_duvidas":
        criar_contexto_result_temp = await Runner.run(
          criar_contexto,
          input=[
            *conversation_history
          ],
          run_config=RunConfig(trace_metadata={
            "__trace_source__": "agent-builder",
            "workflow_id": "wf_68f27b81b4d08190923b1ee19c2c5ccb0812928a7e7e468e"
          }),
          context=CriarContextoContext(input_output_parsed_name=entender_result["output_parsed"].get("name") if isinstance(entender_result.get("output_parsed"), dict) else entender_result.get("output_text"), idea=idea_text, context=idea_context)
        )
        logger.debug("DEBUG: criar_contexto final_output_as=%s", getattr(criar_contexto_result_temp, 'final_output_as', lambda t: None)(str))
        try:
            logger.debug("DEBUG: criar_contexto final_output_model_dump=%s", getattr(criar_contexto_result_temp, 'final_output', None).model_dump())
        except Exception:
            pass

        conversation_history.extend(cast(List[dict], cast(object, [item.to_input_item() for item in criar_contexto_result_temp.new_items])))

        criar_contexto_result = {
          "output_text": criar_contexto_result_temp.final_output_as(str)
        }
        verificar_contexto_result_temp = await Runner.run(
          verificar_contexto,
          input=[
            *conversation_history
          ],
          run_config=RunConfig(trace_metadata={
            "__trace_source__": "agent-builder",
            "workflow_id": "wf_68f27b81b4d08190923b1ee19c2c5ccb0812928a7e7e468e"
          }),
          context=VerificarContextoContext(input_output_text=criar_contexto_result["output_text"])
        )
        logger.debug("DEBUG: verificar_contexto final_output_as=%s", getattr(verificar_contexto_result_temp, 'final_output_as', lambda t: None)(str))
        try:
            logger.debug("DEBUG: verificar_contexto final_output_model_dump=%s", getattr(verificar_contexto_result_temp, 'final_output', None).model_dump())
        except Exception:
            pass

        conversation_history.extend(cast(List[dict], cast(object, [item.to_input_item() for item in verificar_contexto_result_temp.new_items])))

        verificar_contexto_result = {
          "output_text": verificar_contexto_result_temp.final_output_as(str)
        }
        solucionar_duvida_result_temp = await Runner.run(
          solucionar_duvida,
          input=[
            *conversation_history
          ],
          run_config=RunConfig(trace_metadata={
            "__trace_source__": "agent-builder",
            "workflow_id": "wf_68f27b81b4d08190923b1ee19c2c5ccb0812928a7e7e468e"
          }),
          context=SolucionarDuvidaContext(input_output_text=verificar_contexto_result["output_text"])
        )

        conversation_history.extend(cast(List[dict], cast(object, [item.to_input_item() for item in solucionar_duvida_result_temp.new_items])))

        solucionar_duvida_result = {
          "output_text": solucionar_duvida_result_temp.final_output_as(str)
        }
        avaliar_clareza_result_temp = await Runner.run(
          avaliar_clareza,
          input=[
            *conversation_history
          ],
          run_config=RunConfig(trace_metadata={
            "__trace_source__": "agent-builder",
            "workflow_id": "wf_68f27b81b4d08190923b1ee19c2c5ccb0812928a7e7e468e"
          }),
          context=AvaliarClarezaContext(input_output_text=solucionar_duvida_result["output_text"])
        )

        conversation_history.extend(cast(List[dict], cast(object, [item.to_input_item() for item in avaliar_clareza_result_temp.new_items])))

        avaliar_clareza_result = {
          "output_text": avaliar_clareza_result_temp.final_output_as(str)
        }
        end_result = {
          "message": avaliar_clareza_result["output_text"]
        }
        logger.debug("DEBUG: end_result (tirar_duvida) message_length=%d", len(str(end_result.get('message',''))))
        # Proteção: se a mensagem final for apenas a classificação (ex: 'criar ideia'), retorna placeholder
        try:
            final_msg = str(end_result.get("message", "")).strip()
            lower_msg = final_msg.lower()
            raw_name_cmp = (raw_name or "").strip().lower() if 'raw_name' in locals() else ""
            if raw_name_cmp and raw_name_cmp in lower_msg:
                logger.debug("DEBUG: final message equals or contains raw classification (%s), returning fallback", raw_name_cmp)
                return {"message": "Desculpe, não foi possível gerar a resposta completa agora."}
            if normalized_name and normalized_name.replace("_", " ") in lower_msg:
                logger.debug("DEBUG: final message contains normalized classification (%s), returning fallback", normalized_name)
                return {"message": "Desculpe, não foi possível gerar a resposta completa agora."}
        except Exception as e:
            logger.exception("DEBUG: error checking final message vs classification: %s", e)
        return end_result
      elif normalized_name == "criar_ideia" or normalized_name == "criar_idea" or normalized_name == "criarideia":
        criar_contexto_result_temp = await Runner.run(
          criar_contexto1,
          input=[
            *conversation_history
          ],
          run_config=RunConfig(trace_metadata={
            "__trace_source__": "agent-builder",
            "workflow_id": "wf_68f27b81b4d08190923b1ee19c2c5ccb0812928a7e7e468e"
          }),
          context=CriarContextoContext(input_output_parsed_name=entender_result["output_parsed"].get("name") if isinstance(entender_result.get("output_parsed"), dict) else entender_result.get("output_text"), idea=idea_text)
        )
        logger.debug("DEBUG: criar_contexto final_output_as=%s", getattr(criar_contexto_result_temp, 'final_output_as', lambda t: None)(str))
        try:
            logger.debug("DEBUG: criar_contexto final_output_model_dump=%s", getattr(criar_contexto_result_temp, 'final_output', None).model_dump())
        except Exception:
            pass

        conversation_history.extend(cast(List[dict], cast(object, [item.to_input_item() for item in criar_contexto_result_temp.new_items])))

        criar_contexto_result = {
          "output_text": criar_contexto_result_temp.final_output_as(str)
        }
        verificar_contexto_result_temp = await Runner.run(
          verificar_contexto,
          input=[
            *conversation_history
          ],
          run_config=RunConfig(trace_metadata={
            "__trace_source__": "agent-builder",
            "workflow_id": "wf_68f27b81b4d08190923b1ee19c2c5ccb0812928a7e7e468e"
          }),
          context=VerificarContextoContext(input_output_text=criar_contexto_result["output_text"])
        )
        logger.debug("DEBUG: verificar_contexto final_output_as=%s", getattr(verificar_contexto_result_temp, 'final_output_as', lambda t: None)(str))
        try:
            logger.debug("DEBUG: verificar_contexto final_output_model_dump=%s", getattr(verificar_contexto_result_temp, 'final_output', None).model_dump())
        except Exception:
            pass

        conversation_history.extend(cast(List[dict], cast(object, [item.to_input_item() for item in verificar_contexto_result_temp.new_items])))

        verificar_contexto_result = {
          "output_text": verificar_contexto_result_temp.final_output_as(str)
        }
        criar_func_result_temp = await Runner.run(
          criar_func,
          input=[
            *conversation_history
          ],
          run_config=RunConfig(trace_metadata={
            "__trace_source__": "agent-builder",
            "workflow_id": "wf_68f27b81b4d08190923b1ee19c2c5ccb0812928a7e7e468e"
          }),
          context=CriarFuncContext(input_output_text=verificar_contexto_result["output_text"])
        )
        logger.debug("DEBUG: criar_func final_output_as=%s", getattr(criar_func_result_temp, 'final_output_as', lambda t: None)(str))
        try:
            logger.debug("DEBUG: criar_func final_output_model_dump=%s", getattr(criar_func_result_temp, 'final_output', None).model_dump())
        except Exception:
            pass

        conversation_history.extend(cast(List[dict], cast(object, [item.to_input_item() for item in criar_func_result_temp.new_items])))

        criar_func_result = {
          "output_text": criar_func_result_temp.final_output_as(str)
        }
        analizar_viabilidade_result_temp = await Runner.run(
          analizar_viabilidade,
          input=[
            *conversation_history
          ],
          run_config=RunConfig(trace_metadata={
            "__trace_source__": "agent-builder",
            "workflow_id": "wf_68f27b81b4d08190923b1ee19c2c5ccb0812928a7e7e468e"
          }),
          context=AnalizarViabilidadeContext(input_output_text=criar_func_result["output_text"])
        )
        logger.debug("DEBUG: analizar_viabilidade final_output_as=%s", getattr(analizar_viabilidade_result_temp, 'final_output_as', lambda t: None)(str))
        try:
            logger.debug("DEBUG: analizar_viabilidade final_output_model_dump=%s", getattr(analizar_viabilidade_result_temp, 'final_output', None).model_dump())
        except Exception:
            pass

        # assign the analyzed result to a stable variable used later
        analizar_viabilidade_result = {
          "output_text": analizar_viabilidade_result_temp.final_output_as(str)
        }

        conversation_history.extend(cast(List[dict], cast(object, [item.to_input_item() for item in analizar_viabilidade_result_temp.new_items])))

        # Run selecionar_melhores agent (was missing) and append its items
        selecionar_melhores_result_temp = await Runner.run(
          selecionar_melhores,
          input=[
            *conversation_history
          ],
          run_config=RunConfig(trace_metadata={
            "__trace_source__": "agent-builder",
            "workflow_id": "wf_68f27b81b4d08190923b1ee19c2c5ccb0812928a7e7e468e"
          }),
          context=SelecionarMelhoresContext(input_output_text=analizar_viabilidade_result["output_text"])
        )
        logger.debug("DEBUG: selecionar_melhores final_output_as=%s", getattr(selecionar_melhores_result_temp, 'final_output_as', lambda t: None)(str))
        try:
            logger.debug("DEBUG: selecionar_melhores final_output_model_dump=%s", getattr(selecionar_melhores_result_temp, 'final_output', None).model_dump())
        except Exception:
            pass

        conversation_history.extend(cast(List[dict], cast(object, [item.to_input_item() for item in selecionar_melhores_result_temp.new_items])))

        selecionar_melhores_result = {
          "output_text": selecionar_melhores_result_temp.final_output_as(str)
        }
        avaliar_clareza_result_temp = await Runner.run(
          avaliar_clareza1,
          input=[
            *conversation_history
          ],
          run_config=RunConfig(trace_metadata={
            "__trace_source__": "agent-builder",
            "workflow_id": "wf_68f27b81b4d08190923b1ee19c2c5ccb0812928a7e7e468e"
          }),
          context=AvaliarClarezaContext(input_output_text=selecionar_melhores_result["output_text"])
        )
        logger.debug("DEBUG: avaliar_clareza final_output_as=%s", getattr(avaliar_clareza_result_temp, 'final_output_as', lambda t: None)(str))
        try:
            logger.debug("DEBUG: avaliar_clareza final_output_model_dump=%s", getattr(avaliar_clareza_result_temp, 'final_output', None).model_dump())
        except Exception:
            pass

        conversation_history.extend(cast(List[dict], cast(object, [item.to_input_item() for item in avaliar_clareza_result_temp.new_items])))

        avaliar_clareza_result = {
          "output_text": avaliar_clareza_result_temp.final_output_as(str)
        }
        end_result = {
          "message": avaliar_clareza_result["output_text"]
        }
        logger.debug("DEBUG: end_result (criar_ideia) message_length=%d", len(str(end_result.get('message',''))))
        # guard against returning a raw short classification (e.g. 'criar ideia') — ensure message is sufficiently descriptive
        if isinstance(end_result.get("message"), str) and len(end_result.get("message")) < 30:
            logger.debug("DEBUG: final message is suspiciously short: %r", end_result.get("message"))
            # return a more helpful placeholder indicating pipeline likely failed
            return {"message": "Desculpe, não foi possível gerar a resposta completa agora."}
        # Extra protection: if final message matches or contains the classification label, return fallback
        try:
            final_msg = str(end_result.get("message", "")).strip()
            lower_msg = final_msg.lower()
            raw_name_cmp = (raw_name or "").strip().lower() if 'raw_name' in locals() else ""
            if raw_name_cmp and raw_name_cmp in lower_msg:
                logger.debug("DEBUG: final message equals or contains raw classification (%s), returning fallback", raw_name_cmp)
                return {"message": "Desculpe, não foi possível gerar a resposta completa agora."}
            if normalized_name and normalized_name.replace("_", " ") in lower_msg:
                logger.debug("DEBUG: final message contains normalized classification (%s), returning fallback", normalized_name)
                return {"message": "Desculpe, não foi possível gerar a resposta completa agora."}
        except Exception as e:
            logger.exception("DEBUG: error checking final message vs classification: %s", e)
        return end_result
      else:
        end_result = {
          "message": "O chat nao foi feito para responder duvidas do dia a dia"
        }
        logger.debug("DEBUG: classification not matched (%s), returning default message", normalized_name)
        return end_result
