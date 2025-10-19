from openai import AsyncOpenAI
from types import SimpleNamespace
from guardrails.runtime import load_config_bundle, instantiate_guardrails, run_guardrails
from pydantic import BaseModel
from agents import RunContextWrapper, Agent, ModelSettings, TResponseInputItem, Runner, RunConfig, trace
from openai.types.shared.reasoning import Reasoning

# Shared client for guardrails and file search
client = AsyncOpenAI()
ctx = SimpleNamespace(guardrail_llm=client)
# Guardrails definitions
guardrails_config = {
  "guardrails": [

  ]
}
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
class AgentSchema(BaseModel):
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


class ContextualizarAIdeiaContext:
  def __init__(self, input_output_text: str):
    self.input_output_text = input_output_text
def contextualizar_a_ideia_instructions(run_context: RunContextWrapper[ContextualizarAIdeiaContext], _agent: Agent[ContextualizarAIdeiaContext]):
  input_output_text = run_context.context.input_output_text
  return f"""Sua tarefa é analisar cuidadosamente a ideia enviada pelo usuário e construir um contexto coerente, estruturado e informativo sobre ela.O contexto deve incluir objetivo, público-alvo, tecnologias, principais desafios e propósito geral da ideia.

# Ideia
 {input_output_text}"""
contextualizar_a_ideia = Agent(
  name="Contextualizar a Ideia",
  instructions=contextualizar_a_ideia_instructions,
  model="gpt-4.1-mini",
  model_settings=ModelSettings(
    temperature=1,
    top_p=1,
    max_tokens=2048,
    store=True
  )
)


class AgentContext:
  def __init__(self, workflow_input_as_text: str):
    self.workflow_input_as_text = workflow_input_as_text
def agent_instructions(run_context: RunContextWrapper[AgentContext], _agent: Agent[AgentContext]):
  workflow_input_as_text = run_context.context.workflow_input_as_text
  return f"""Voce precisa entende o que o usuario esta querendo fazer e precisa classificar entre duas coisas exatas: \"criar_ideia\"  | \"tirar_duvida\" |  \"nao_relacionado\".
Voce vai retornar apenas uma dessas tres frases.
Voce precisa entender o se ele quer retirar duvida sobre algo relacionado ao projeto ou apenas uma duvida qualquer, quando for uma duvida qualquer voce deve retornar: \"nao_relacionado\"
 {workflow_input_as_text} """
agent = Agent(
  name="Agent",
  instructions=agent_instructions,
  model="gpt-5-nano",
  output_type=AgentSchema,
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


class AvaliarClarezaContext1:
  def __init__(self, input_output_text: str):
    self.input_output_text = input_output_text
def avaliar_clareza_instructions1(run_context: RunContextWrapper[AvaliarClarezaContext1], _agent: Agent[AvaliarClarezaContext1]):
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


class CriarIdeiaContext:
  def __init__(self, workflow_input_as_text: str):
    self.workflow_input_as_text = workflow_input_as_text
def criar_ideia_instructions(run_context: RunContextWrapper[CriarIdeiaContext], _agent: Agent[CriarIdeiaContext]):
  workflow_input_as_text = run_context.context.workflow_input_as_text
  return f"""Extraia, em poucas palavras, a ideia principal expressa pelo usuário em seu input. Não adicione explicações, contexto ou descrições: apenas retorne a essência da ideia do usuário de forma breve e objetiva.

# User Input
{workflow_input_as_text}

# Output Format

Retorne a resposta em 2 a 8 palavras, sem frases completas. """
criar_ideia = Agent(
  name="Criar Ideia",
  instructions=criar_ideia_instructions,
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
async def run_workflow(workflow_input: WorkflowInput):
  with trace("New workflow"):
    state = {

    }
    workflow = workflow_input.model_dump()
    conversation_history: list[TResponseInputItem] = [
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
    guardrails_inputtext = workflow["input_as_text"]
    guardrails_result = await run_guardrails(ctx, guardrails_inputtext, "text/plain", instantiate_guardrails(load_config_bundle(guardrails_config)), suppress_tripwire=True)
    guardrails_hastripwire = guardrails_has_tripwire(guardrails_result)
    guardrails_anonymizedtext = get_guardrail_checked_text(guardrails_result, guardrails_inputtext)
    guardrails_output = (guardrails_hastripwire and build_guardrail_fail_output(guardrails_result or [])) or (guardrails_anonymizedtext or guardrails_inputtext)
    if guardrails_hastripwire:
      return guardrails_output
    else:
      agent_result_temp = await Runner.run(
        agent,
        input=[
          *conversation_history
        ],
        run_config=RunConfig(trace_metadata={
          "__trace_source__": "agent-builder",
          "workflow_id": "wf_68f27b81b4d08190923b1ee19c2c5ccb0812928a7e7e468e"
        }),
        context=AgentContext(workflow_input_as_text=workflow["input_as_text"])
      )

      conversation_history.extend([item.to_input_item() for item in agent_result_temp.new_items])

      agent_result = {
        "output_text": agent_result_temp.final_output.json(),
        "output_parsed": agent_result_temp.final_output.model_dump()
      }
      if agent_result["output_parsed"]["name"] == "tirar_duvida":
        criar_contexto_result_temp = await Runner.run(
          criar_contexto,
          input=[
            *conversation_history
          ],
          run_config=RunConfig(trace_metadata={
            "__trace_source__": "agent-builder",
            "workflow_id": "wf_68f27b81b4d08190923b1ee19c2c5ccb0812928a7e7e468e"
          })
        )

        conversation_history.extend([item.to_input_item() for item in criar_contexto_result_temp.new_items])

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

        conversation_history.extend([item.to_input_item() for item in verificar_contexto_result_temp.new_items])

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

        conversation_history.extend([item.to_input_item() for item in solucionar_duvida_result_temp.new_items])

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

        conversation_history.extend([item.to_input_item() for item in avaliar_clareza_result_temp.new_items])

        avaliar_clareza_result = {
          "output_text": avaliar_clareza_result_temp.final_output_as(str)
        }
        end_result = {
          "message": avaliar_clareza_result["output_text"]
        }
        return end_result
      elif agent_result["output_parsed"]["name"] == "criar_ideia":
        criar_ideia_result_temp = await Runner.run(
          criar_ideia,
          input=[
            *conversation_history
          ],
          run_config=RunConfig(trace_metadata={
            "__trace_source__": "agent-builder",
            "workflow_id": "wf_68f27b81b4d08190923b1ee19c2c5ccb0812928a7e7e468e"
          }),
          context=CriarIdeiaContext(workflow_input_as_text=workflow["input_as_text"])
        )

        conversation_history.extend([item.to_input_item() for item in criar_ideia_result_temp.new_items])

        criar_ideia_result = {
          "output_text": criar_ideia_result_temp.final_output_as(str)
        }
        contextualizar_a_ideia_result_temp = await Runner.run(
          contextualizar_a_ideia,
          input=[
            *conversation_history
          ],
          run_config=RunConfig(trace_metadata={
            "__trace_source__": "agent-builder",
            "workflow_id": "wf_68f27b81b4d08190923b1ee19c2c5ccb0812928a7e7e468e"
          }),
          context=ContextualizarAIdeiaContext(input_output_text=criar_ideia_result["output_text"])
        )

        conversation_history.extend([item.to_input_item() for item in contextualizar_a_ideia_result_temp.new_items])

        contextualizar_a_ideia_result = {
          "output_text": contextualizar_a_ideia_result_temp.final_output_as(str)
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
          context=CriarFuncContext(input_output_text=contextualizar_a_ideia_result["output_text"])
        )

        conversation_history.extend([item.to_input_item() for item in criar_func_result_temp.new_items])

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

        conversation_history.extend([item.to_input_item() for item in analizar_viabilidade_result_temp.new_items])

        analizar_viabilidade_result = {
          "output_text": analizar_viabilidade_result_temp.final_output_as(str)
        }
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

        conversation_history.extend([item.to_input_item() for item in selecionar_melhores_result_temp.new_items])

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
          context=AvaliarClarezaContext1(input_output_text=selecionar_melhores_result["output_text"])
        )

        conversation_history.extend([item.to_input_item() for item in avaliar_clareza_result_temp.new_items])

        avaliar_clareza_result = {
          "output_text": avaliar_clareza_result_temp.final_output_as(str)
        }
        end_result = {
          "message": avaliar_clareza_result["output_text"]
        }
        return end_result
      else:
        end_result = {
          "message": "O chat nao foi feito para responder duvidas do dia a dia"
        }
        return end_result
