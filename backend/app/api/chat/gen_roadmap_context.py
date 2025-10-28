import json

from pydantic import BaseModel
from agents import Agent, ModelSettings, RunContextWrapper, TResponseInputItem, Runner, RunConfig, trace
from openai.types.shared.reasoning import Reasoning

from app.database.querys.roadmap_query import create_roadmap_steps, RoadmapTasks, create_roadmap_tasks, \
    RoadmapSteps


class CriandoTaksDoRoadmapSchema__TarefasItem(BaseModel):
  description: str
  task_order: float
  suggested_tools: list[str]
  step_id: str


class CriandoTaksDoRoadmapSchema(BaseModel):
  tarefas: list[CriandoTaksDoRoadmapSchema__TarefasItem]


class CriandoPassosDoRoadmapSchema__StepsItem(BaseModel):
  title: str
  description: str
  step_order: float


class CriandoPassosDoRoadmapSchema(BaseModel):
  steps: list[CriandoPassosDoRoadmapSchema__StepsItem]


criando_contexto = Agent(
  name="Criando Contexto",
  instructions="""Generate a specific, detailed context based on the user’s stated idea and any notes they provide. Analyze both the idea and the notes to identify key points, underlying assumptions, and their relationship before presenting the synthesized context.

# Steps
1. Carefully read and understand the user's idea and any provided notes.
2. Analyze the main points of both the idea and the notes, considering their implications and interconnections.
3. Synthesize these insights to generate a clear, relevant, and concise context that reflects both the user’s intent and the details found in the notes.
4. Present this context in structured, natural language.

# Output Format

- Response should be a single, well-structured paragraph or two, in natural language, summarizing the specific context.
- DO NOT include generic assistant language or meta-commentary.
- Focus solely on the synthesis of idea and notes into context.

# Example

Example Input:
User Idea: Quero criar um aplicativo para ajudar pessoas a lembrar de tomar seus medicamentos.
User Notes: O aplicativo deve enviar notificações em horários personalizados, registrar o histórico de uso do medicamento e permitir adicionar múltiplos usuários para acompanhamento familiar.

Example Output:
O contexto para este projeto é o desenvolvimento de um aplicativo voltado ao auxílio da administração de medicamentos. O objetivo principal é facilitar que os usuários lembrem de tomar seus remédios por meio de notificações em horários personalizados. Além disso, o aplicativo deve possibilitar o registro do histórico de uso de medicamentos e permitir que múltiplos usuários sejam cadastrados, permitindo a familiares acompanhar o tratamento de seus entes queridos.

# Notes

- The context must always reflect the integration of both the idea and the notes, not just a repetition of either.
- If the user provides only an idea or only notes, base the context on the input available, ensuring clarity.
- Prioritize clarity, relevance, and alignment with the user's intent in every generated context.

*Remember: Your objective is to generate a specific context that helps clarify and define the user’s idea by integrating related annotations and details they provide.*""",
  model="gpt-5-nano",
  model_settings=ModelSettings(
    store=True,
    reasoning=Reasoning(
      effort="low"
    )
  )
)


class MelhorandoContextoContext:
  def __init__(self, input_output_text: str):
    self.input_output_text = input_output_text
def melhorando_contexto_instructions(run_context: RunContextWrapper[MelhorandoContextoContext], _agent: Agent[MelhorandoContextoContext]):
  input_output_text = run_context.context.input_output_text
  return f"""Melhore descrições de contexto fornecidas pelo usuário, incluindo explicitamente: a ferramenta, tecnologia ou método que o usuário pretende utilizar, o contexto geral do objetivo do projeto e o contexto específico da ideia do cliente. O objetivo é tornar o contexto inicial mais claro, completo e prático, servindo como base para a futura criação de um roadmap.

- Analise cuidadosamente o texto enviado, identificando:
    - a) Se ficou claro qual ferramenta, tecnologia ou método o usuário pretende usar (caso não esteja evidente, sinalize e peça para detalhar futuramente);
    - b) Qual é o contexto geral do objetivo do projeto;
    - c) O contexto específico da ideia proposta pelo cliente;
    - d) Quais ambiguidades, lacunas, redundâncias ou falta de clareza existem.
- Use raciocínio passo a passo para destacar onde faltam ou precisam ser aprimoradas essas informações.
- Só após o processo analítico, reescreva o contexto incluindo e organizando (quando possível) as informações sobre: ferramenta pretendida, contexto geral do objetivo e contexto específico da ideia do cliente, mantendo toda a intenção e dados do texto original.
- Não adicione informações inventadas; apenas reestruture, esclareça e torne explícito o que já está implícito sempre que possível.
- Sempre mantenha a ordem: (1) análise crítica detalhando pontos para melhora e (2) apresentação do contexto revisado.
- Se faltar alguma dessas informações (ferramenta, contexto geral, contexto específico), indique isso na análise e, na reescrita, destaque claramente que a informação está ausente e precisaria ser completada.
- Produza a saída em duas seções CLARAS: 
    1) Uma análise crítica das melhorias e das informações faltantes (curto parágrafo ou tópicos)
    2) O texto revisado do contexto, já aprimorado (parágrafo ou lista clara, conforme original)

# Passos

1. Leia o contexto fornecido.
2. Identifique e destaque onde aparece (ou falta) a ferramenta/metodologia desejada, o contexto geral e o contexto específico.
3. Explique brevemente (máx. 5 linhas) o diagnóstico: quais pontos precisam de melhoria ou estão ausentes e como serão ajustados.
4. Reescreva o contexto, tornando essas informações mais claras e agregando ordem e clareza ao texto, sem adicionar nada externo.

# Formato de Saída

- 1. Análise crítica das melhorias e informações faltantes (máximo 5 linhas)
- 2. Texto de contexto melhorado (parágrafo único ou lista clara, conforme original)

# Exemplo

Exemplo de entrada:
"Quero criar um roadmap para um novo serviço de consultoria de marketing digital. Pretendo usar inteligência artificial, mas ainda não tenho detalhes definidos. O diferencial será o atendimento especializado para pequenas empresas."

Exemplo de saída:
1. O contexto traz o objetivo geral (consultoria de marketing digital) e menciona a intenção de usar inteligência artificial (ferramenta/metodologia), mas faltam detalhes sobre como a IA será aplicada. O diferencial e o público foram identificados, mas seria importante detalhar exemplos de serviços ou resultados esperados.
2. Estou planejando criar um roadmap para lançar um serviço de consultoria de marketing digital voltado para pequenas empresas. A proposta é utilizar inteligência artificial para potencializar as soluções oferecidas, focando em atendimento especializado como diferencial competitivo. Ainda preciso definir detalhadamente como as soluções baseadas em IA serão implementadas e os principais resultados que pretendo alcançar.

# Lembretes
O objetivo principal é APERFEIÇOAR o contexto para depois criar um roadmap detalhado.
Inclua/explique sempre as três dimensões: ferramenta/método pretendido, contexto geral do objetivo e contexto específico da ideia do cliente.
A saída deve seguir as duas seções SEMPRE na ordem: análise rápida + contexto melhorado.
Se faltar alguma dimensão, mostre isso na análise e sinalize falta no texto melhorado, usando frases como: “[Detalhar aqui qual ferramenta/metodologia será usada]”. {input_output_text}"""
melhorando_contexto = Agent(
  name="Melhorando Contexto",
  instructions=melhorando_contexto_instructions,
  model="gpt-5-nano",
  model_settings=ModelSettings(
    store=True,
    reasoning=Reasoning(
      effort="low"
    )
  )
)


class CriandoTaksDoRoadmapContext:
  def __init__(self, input_output_text: str):
    self.input_output_text = input_output_text

def criando_taks_do_roadmap_instructions(run_context: RunContextWrapper[CriandoTaksDoRoadmapContext], _agent: Agent[CriandoTaksDoRoadmapContext]):
  input_output_text = run_context.context.input_output_text
  return f"""You will receive a JSON array of roadmap steps that have already been created in the database. Each step has an "id" field containing a UUID string (like "edb072f3-01df-4d54-ac94-f6705a23e76a") that you MUST copy EXACTLY as the "step_id" for all tasks.

CRITICAL REQUIREMENTS:
1. The step_id must be the EXACT UUID from the input's "id" field. DO NOT simplify it or create your own IDs like "1a", "001", etc. Copy the full UUID string exactly as provided.
2. You MUST generate tasks for ALL steps in the input array. DO NOT stop after the first step. Process EVERY single step provided.
3. Each step should have multiple tasks (at least 2-4 tasks per step, depending on complexity).

For every generated task, thoroughly analyze dependencies and logical work units within its respective step. Identify all implicit and explicit sub-tasks, ensuring no sub-action or requirement is omitted. When possible, break down steps into multiple granular, actionable tasks rather than a single task per step, unless truly atomic. Maintain clarity and completeness.

For each generated task, provide only these fields:
- description: A clear, detailed explanation of the task's purpose and requirements.
- task_order: The sequential integer for the task within its step (always resetting to 1 for each new roadmap step).
- step_id: The EXACT UUID string from the input step's "id" field (must be a valid UUID format like "edb072f3-01df-4d54-ac94-f6705a23e76a").
- suggested_tools: An array of relevant tools or technologies for the task (always as an array, even with a single tool).

# Steps

1. Receive a JSON array of project roadmap steps; each input step will include: id (UUID string), title, description, and step_order.
2. For EACH AND EVERY step in the input array (do not skip any):
    - Thoroughly review its requirements, expected deliverables, implicit and explicit processes.
    - Break it into as many distinct, well-defined, and ordered tasks as necessary (analysis, design, implementation, review, etc.).
    - Start task_order at 1 for the first task of each step, incrementing by 1 for each subsequent task in the same step.
    - Assign each task the EXACT step_id (UUID) from the input step's "id" field.
3. For each task, provide:
    - description (detailed and clear)
    - task_order (ordered, starting at 1 within each step)
    - step_id (EXACT UUID copied from the input step's "id" field)
    - suggested_tools (array of appropriate tools/technologies)
4. Before producing output, internally confirm that:
    - You have processed ALL steps from the input array (count them to verify).
    - All step content is captured as individual or multiple tasks as needed.
    - No logical work unit is omitted or merged unnecessarily.
    - task_order restarts at 1 for each new step, and step_id is the exact UUID from input.

# Output Format

Respond exclusively with a JSON array of task objects (in order; can be grouped or not, but always flatten the output), each including:
- "description": string
- "task_order": integer (starting at 1 for each step)
- "step_id": UUID string (EXACT copy from input's "id" field)
- "suggested_tools": array of strings

Do NOT wrap your output in code blocks, markdown, or add any supplementary explanations—only the JSON array, one object per task.

# Example Output

Example: If you receive 6 steps in the input, you MUST generate tasks for all 6 steps. Here's a sample showing tasks for 3 steps (but you must do ALL steps):

[
  {{
    "description": "Identificar e documentar todos os requisitos do projeto com as partes interessadas.",
    "task_order": 1,
    "step_id": "edb072f3-01df-4d54-ac94-f6705a23e76a",
    "suggested_tools": ["Google Docs", "Miro"]
  }},
  {{
    "description": "Realizar entrevistas e questionários para capturar requisitos adicionais das partes interessadas.",
    "task_order": 2,
    "step_id": "edb072f3-01df-4d54-ac94-f6705a23e76a",
    "suggested_tools": ["Google Forms"]
  }},
  {{
    "description": "Validar e priorizar os requisitos coletados com a equipe.",
    "task_order": 3,
    "step_id": "edb072f3-01df-4d54-ac94-f6705a23e76a",
    "suggested_tools": ["Trello", "Jira"]
  }},
  {{
    "description": "Realizar uma análise de viabilidade técnica baseada nos requisitos documentados.",
    "task_order": 1,
    "step_id": "106eb4fe-c374-4699-b119-bbf6ce64c6bc",
    "suggested_tools": ["Google Sheets"]
  }},
  {{
    "description": "Avaliar riscos técnicos e operacionais identificados durante a análise de viabilidade.",
    "task_order": 2,
    "step_id": "106eb4fe-c374-4699-b119-bbf6ce64c6bc",
    "suggested_tools": ["Trello", "Excel"]
  }},
  {{
    "description": "Documentar as conclusões da análise de viabilidade e apresentar para stakeholders.",
    "task_order": 3,
    "step_id": "106eb4fe-c374-4699-b119-bbf6ce64c6bc",
    "suggested_tools": ["PowerPoint", "Google Slides"]
  }},
  {{
    "description": "Prototipar as principais funcionalidades para validação inicial com stakeholders.",
    "task_order": 1,
    "step_id": "f39b0048-eabd-4507-b5e9-fd1a2e82cbc3",
    "suggested_tools": ["Figma", "Adobe XD"]
  }},
  {{
    "description": "Coletar feedback dos stakeholders sobre o protótipo e documentar ajustes necessários.",
    "task_order": 2,
    "step_id": "f39b0048-eabd-4507-b5e9-fd1a2e82cbc3",
    "suggested_tools": ["Google Forms", "Miro"]
  }},
  {{
    "description": "Refinar o protótipo com base no feedback recebido.",
    "task_order": 3,
    "step_id": "f39b0048-eabd-4507-b5e9-fd1a2e82cbc3",
    "suggested_tools": ["Figma"]
  }}
  ... (continue for ALL remaining steps in the input)
]
(IMPORTANTE: Este exemplo mostra apenas 3 steps. Você DEVE processar TODOS os steps do input e gerar tasks para cada um deles. Se receber 6 steps, gere tasks para os 6. Se receber 10 steps, gere tasks para os 10.)

# Notes

- YOU MUST PROCESS ALL STEPS IN THE INPUT ARRAY. Count them and verify you've created tasks for each one.
- Each task's task_order starts at 1 within its respective step and increments only within that step.
- ALWAYS use the exact UUID from the input's "id" field as step_id. Never create simplified identifiers.
- Always populate the step_id field for every task, copying the exact UUID string.
- Tasks must be granular, complete, and directly reflect every implicit or explicit sub-action within the step.
- Generate at least 2-4 tasks per step (more if the step is complex).
- Always use suggested_tools as an array (one or more items).
- Never wrap your output in code blocks or add explanations.
- Outputs must be maximally granular to ensure every necessary sub-action is a separate task.
- DO NOT STOP after generating tasks for the first step. Continue until ALL steps have tasks.

Remember: Your goal is to decompose EVERY SINGLE roadmap step (having a UUID in the "id" field) into as many actionable, clearly described tasks as necessary, always producing a JSON array where each task includes description, step_id (exact UUID copied), task_order (resetting per step), and suggested_tools—without any superfluous formatting or explanations. 

INPUT STEPS WITH IDs:
{input_output_text}"""
criando_taks_do_roadmap = Agent(
  name="Criando Taks do Roadmap",
  instructions=criando_taks_do_roadmap_instructions,
  model="gpt-5-nano",
  output_type=CriandoTaksDoRoadmapSchema,
  model_settings=ModelSettings(
    store=True,
    reasoning=Reasoning(
      effort="medium"
    )
  )
)


class CriandoPassosDoRoadmapContext:
  def __init__(self, input_output_text: str):
    self.input_output_text = input_output_text
def criando_passos_do_roadmap_instructions(run_context: RunContextWrapper[CriandoPassosDoRoadmapContext], _agent: Agent[CriandoPassosDoRoadmapContext]):
  input_output_text = run_context.context.input_output_text
  return f"""Crie um roadmap completo e detalhado com PELO MENOS 5-6 etapas (passos) bem definidas. Quanto mais completo e detalhado o roadmap, melhor. Para cada etapa do roadmap, forneça:
- title: um título curto e claro para a etapa/categoria.
- description: uma descrição sucinta explicando o propósito e os objetivos dessa etapa/categoria no contexto do roadmap.
- step_order: a posição sequencial lógica dessa etapa/categoria no roadmap (começando em 1).

IMPORTANTE: Você DEVE criar um roadmap completo com no MÍNIMO 5-6 etapas. Não crie apenas 1 ou 2 etapas. Pense em todas as fases necessárias desde o início até a conclusão do projeto.

Antes de listar as etapas, reflita sobre quais fases principais compõem um roadmap típico para o contexto fornecido:
- Planejamento inicial e definição de objetivos
- Pesquisa e análise
- Design e prototipação
- Desenvolvimento/Implementação
- Testes e validação
- Lançamento e monitoramento
- (outras etapas conforme necessário para o contexto específico)

Considere a ordem ideal para aprendizado ou execução. Não pule etapas e não coloque conclusões, resumos ou classificações: apenas os dados estruturados de cada etapa, mantendo a ordem lógica.

Ao estruturar a resposta:
- Pense primeiro em TODAS as fases essenciais do roadmap (mínimo 5-6, idealmente 6-8).
- Justifique internamente a escolha e ordem de cada uma (chain-of-thought antes do output, mas NÃO inclua este raciocínio na resposta final).
- Só então produza o JSON solicitado com TODAS as etapas.
- Garanta que todas as etapas estejam bem descritas e nomeadas de maneira clara para um usuário leigo.

Formato de saída: 
Devolva um único array em JSON no seguinte formato (sem texto extra):

[
  {{
    "title": "Nome da Etapa 1",
    "description": "Descrição da primeira etapa.",
    "step_order": 1
  }},
  {{
    "title": "Nome da Etapa 2",
    "description": "Descrição da segunda etapa.",
    "step_order": 2
  }},
  {{
    "title": "Nome da Etapa 3",
    "description": "Descrição da terceira etapa.",
    "step_order": 3
  }},
  {{
    "title": "Nome da Etapa 4",
    "description": "Descrição da quarta etapa.",
    "step_order": 4
  }},
  {{
    "title": "Nome da Etapa 5",
    "description": "Descrição da quinta etapa.",
    "step_order": 5
  }},
  {{
    "title": "Nome da Etapa 6",
    "description": "Descrição da sexta etapa.",
    "step_order": 6
  }}
]

Importante: A resposta deve conter somente o JSON, diretamente, sem introdução, resumo ou comentários. Certifique-se de que cada etapa é única e sua ordem faz sentido pedagógico e prático. CRIE NO MÍNIMO 5-6 ETAPAS COMPLETAS.

Lembrete: Crie TODAS as etapas apropriadas para um roadmap completo (mínimo 5-6 etapas), sempre seguindo a ordem lógica e detalhando cada fase brevemente. Não seja minimalista - pense em todas as fases necessárias do início ao fim. {input_output_text}"""
criando_passos_do_roadmap = Agent(
  name="Criando Passos do RoadMap",
  instructions=criando_passos_do_roadmap_instructions,
  model="gpt-5-nano",
  output_type=CriandoPassosDoRoadmapSchema,
  model_settings=ModelSettings(
    store=True,
    reasoning=Reasoning(
      effort="medium"
    )
  )
)


class WorkflowInput(BaseModel):
  input_as_text: str


# Main code entrypoint
async def run_workflow(workflow_input: WorkflowInput, roadmap_id: str):
  with trace("New workflow"):
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
    criando_contexto_result_temp = await Runner.run(
      criando_contexto,
      input=[
        *conversation_history
      ],
      run_config=RunConfig(trace_metadata={
        "__trace_source__": "agent-builder",
        "workflow_id": "wf_68fac6772f308190a2d9ea695cfcd1690ce4e89111a0123c"
      })
    )

    conversation_history.extend([item.to_input_item() for item in criando_contexto_result_temp.new_items])

    criando_contexto_result = {
      "output_text": criando_contexto_result_temp.final_output_as(str)
    }
    melhorando_contexto_result_temp = await Runner.run(
      melhorando_contexto,
      input=[
        *conversation_history
      ],
      run_config=RunConfig(trace_metadata={
        "__trace_source__": "agent-builder",
        "workflow_id": "wf_68fac6772f308190a2d9ea695cfcd1690ce4e89111a0123c"
      }),
      context=MelhorandoContextoContext(input_output_text=criando_contexto_result["output_text"])
    )

    conversation_history.extend([item.to_input_item() for item in melhorando_contexto_result_temp.new_items])

    melhorando_contexto_result = {
      "output_text": melhorando_contexto_result_temp.final_output_as(str)
    }
    criando_passos_do_roadmap_result_temp = await Runner.run(
      criando_passos_do_roadmap,
      input=[
        *conversation_history
      ],
      run_config=RunConfig(trace_metadata={
        "__trace_source__": "agent-builder",
        "workflow_id": "wf_68fac6772f308190a2d9ea695cfcd1690ce4e89111a0123c"
      }),
      context=CriandoPassosDoRoadmapContext(input_output_text=melhorando_contexto_result["output_text"])
    )

    conversation_history.extend([item.to_input_item() for item in criando_passos_do_roadmap_result_temp.new_items])

    criando_passos_do_roadmap_result = {
      "output_text": criando_passos_do_roadmap_result_temp.final_output.json(),
      "output_parsed": criando_passos_do_roadmap_result_temp.final_output.model_dump()
    }

    steps: list[dict[str, str | int]] = []
    try:
        roadmap_steps_data = json.loads(criando_passos_do_roadmap_result["output_text"])
        print(f"roadmap_steps_data: {roadmap_steps_data}")

        # O output_type retorna {'steps': [...]}
        if isinstance(roadmap_steps_data, dict) and 'steps' in roadmap_steps_data:
            roadmap_steps = roadmap_steps_data['steps']
        else:
            roadmap_steps = roadmap_steps_data

        print(f"roadmap_steps: {roadmap_steps}")

        for step in roadmap_steps:
            roadmap_steps_parsed = RoadmapSteps(
                roadmap_id=roadmap_id,
                step_order=int(step["step_order"]),
                title=step["title"],
                description=step["description"]
            )

            step_id = create_roadmap_steps(roadmap_steps_parsed)

            steps.append({
                "id": step_id,
                "step_order": int(step["step_order"]),
                "title": step["title"],
                "description": step["description"]
            })

        print(f"steps criados: {steps}")
    except Exception as e:
        print(f"Erro ao criar roadmap steps no banco de dados: {e}")
        import traceback
        traceback.print_exc()
        return  # Não continua se falhou ao criar steps

    # Só executa tasks se os steps foram criados com sucesso
    if len(steps) > 0:
        # Prepara o JSON com os steps e seus IDs para o agente de tasks
        steps_with_ids = json.dumps(steps)

        criando_taks_do_roadmap_result_temp = await Runner.run(
          criando_taks_do_roadmap,
          input=[
            *conversation_history
          ],
          run_config=RunConfig(trace_metadata={
            "__trace_source__": "agent-builder",
            "workflow_id": "wf_68fac6772f308190a2d9ea695cfcd1690ce4e89111a0123c"
          }),
          context=CriandoTaksDoRoadmapContext(input_output_text=steps_with_ids)
        )

        conversation_history.extend([item.to_input_item() for item in criando_taks_do_roadmap_result_temp.new_items])

        criando_taks_do_roadmap_result = {
          "output_text": criando_taks_do_roadmap_result_temp.final_output.json(),
          "output_parsed": criando_taks_do_roadmap_result_temp.final_output.model_dump()
        }

        try:
            roadmap_tasks_data = json.loads(criando_taks_do_roadmap_result["output_text"])
            print(f"roadmap_tasks_data: {roadmap_tasks_data}")

            if isinstance(roadmap_tasks_data, dict) and 'tarefas' in roadmap_tasks_data:
                roadmap_tasks = roadmap_tasks_data['tarefas']
            else:
                roadmap_tasks = roadmap_tasks_data

            print(f"roadmap_tasks: {roadmap_tasks}")

            for task in roadmap_tasks:
                roadmap_tasks_parsed = RoadmapTasks(
                    step_id=task["step_id"],
                    task_order=int(task["task_order"]),
                    description=task["description"],
                    suggested_tools=task["suggested_tools"]
                )

                task_id = create_roadmap_tasks(roadmap_tasks_parsed)
                if not task_id:
                    print(f"Erro ao criar roadmap tasks no banco de dados: {task}")
            print(f"tasks criadas: {len(roadmap_tasks)}")
        except Exception as e:
            print(f"Erro ao criar roadmap tasks no banco de dados: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("Nenhum step foi criado, pulando criação de tasks")
