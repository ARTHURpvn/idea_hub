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
  return f"""You will receive a JSON array of roadmap steps that have already been created in the database. Each step has an "id" field (UUID) that you MUST use as "step_id" for all tasks belonging to that step.

For every generated task, thoroughly analyze dependencies and logical work units within its respective step. Identify all implicit and explicit sub-tasks, ensuring no sub-action or requirement is omitted. When possible, break down steps into multiple granular, actionable tasks rather than a single task per step, unless truly atomic. Maintain clarity and completeness.

For each generated task, provide only these fields:
- description: A clear, detailed explanation of the task’s purpose and requirements.
- passos_name: The name/title of the roadmap step to which this task belongs (string; directly derived from the original step).
- task_order: The sequential integer for the task within its step (always resetting to 1 for each new roadmap step).
- step_id: The original step_id corresponding to this task’s roadmap step, copied verbatim from the input step.
- suggested_tools: An array of relevant tools or technologies for the task (always as an array, even with a single tool).

# Steps

1. Receive a JSON array of project roadmap steps; each input step MUST include at least: a name (passos_name or similar), an intended outcome/description, and step_id (string or number).
2. For each step:
    - Thoroughly review its requirements, expected deliverables, implicit and explicit processes.
    - Break it into as many distinct, well-defined, and ordered tasks as necessary (analysis, design, implementation, review, etc.).
    - Start task_order at 1 for the first task of each step, incrementing by 1 for each subsequent task in the same step.
    - Assign each task the respective passos_name and step_id from the step (both exactly as provided).
3. For each task, provide:
    - description (detailed and clear)
    - passos_name (copied verbatim from the step)
    - task_order (ordered, starting at 1 within each step)
    - step_id (taken verbatim from the step)
    - suggested_tools (array of appropriate tools/technologies)
4. Before producing output, internally confirm that:
    - All step content is captured as individual or multiple tasks as needed.
    - No logical work unit is omitted or merged unnecessarily.
    - task_order restarts at 1 for each new step, and passos_name and step_id are present for each task.

# Output Format

Respond exclusively with a JSON array of task objects (in order; can be grouped or not, but always flatten the output), each including:
- "description": string
- "passos_name": string
- "task_order": integer (starting at 1 for each step)
- "step_id": (string or number, as passed in input)
- "suggested_tools": array of strings

Do NOT wrap your output in code blocks, markdown, or add any supplementary explanations—only the JSON array, one object per task.

# Example Output

[
  {{
    "description": "Identificar e documentar todos os requisitos do projeto com as partes interessadas.",
    "passos_name": "Levantamento de Requisitos",
    "task_order": 1,
    "step_id": "001",
    "suggested_tools": ["Google Docs", "Miro"]
  }},
  {{
    "description": "Realizar entrevistas e questionários para capturar requisitos adicionais das partes interessadas.",
    "passos_name": "Levantamento de Requisitos",
    "task_order": 2,
    "step_id": "001",
    "suggested_tools": ["Google Forms"]
  }},
  {{
    "description": "Realizar uma análise de viabilidade técnica baseada nos requisitos documentados.",
    "passos_name": "Análise de Viabilidade",
    "task_order": 1,
    "step_id": "002",
    "suggested_tools": ["Google Sheets"]
  }},
  {{
    "description": "Avaliar riscos técnicos e operacionais identificados durante a análise de viabilidade.",
    "passos_name": "Análise de Viabilidade",
    "task_order": 2,
    "step_id": "002",
    "suggested_tools": ["Trello", "Excel"]
  }},
  {{
    "description": "Prototipar as principais funcionalidades para validação inicial com stakeholders.",
    "passos_name": "Prototipagem",
    "task_order": 1,
    "step_id": "003",
    "suggested_tools": ["Figma", "Adobe XD"]
  }},
  {{
    "description": "Coletar feedback dos stakeholders sobre o protótipo e documentar ajustes necessários.",
    "passos_name": "Prototipagem",
    "task_order": 2,
    "step_id": "003",
    "suggested_tools": ["Google Forms", "Miro"]
  }}
]
(Observe que task_order reinicia a partir de 1 para cada passo, cada task possui o passos_name e step_id correspondentes. Nos exemplos reais haverá tantos passos e tasks quanto apropriado aos dados de entrada.)

# Notes

- Each task’s task_order starts at 1 within its respective step and increments only within that step.
- Always populate the passos_name and step_id fields for every task, copying exactly as provided from the step.
- Tasks must be granular, complete, and directly reflect every implicit or explicit sub-action within the step.
- Always use suggested_tools as an array (one or more items).
- Never wrap your output in code blocks or add explanations.
- Outputs must be maximally granular to ensure every necessary sub-action is a separate task.

Remember: Your goal is to decompose each roadmap step (having a step_id) into as many actionable, clearly described tasks as necessary, always producing a JSON array where each task includes description, passos_name, step_id (copied), task_order (resetting per step), and suggested_tools—without any superfluous formatting or explanations. {input_output_text}"""
criando_taks_do_roadmap = Agent(
  name="Criando Taks do Roadmap",
  instructions=criando_taks_do_roadmap_instructions,
  model="gpt-5-nano",
  output_type=CriandoTaksDoRoadmapSchema,
  model_settings=ModelSettings(
    store=True,
    reasoning=Reasoning(
      effort="low"
    )
  )
)


class CriandoPassosDoRoadmapContext:
  def __init__(self, input_output_text: str):
    self.input_output_text = input_output_text
def criando_passos_do_roadmap_instructions(run_context: RunContextWrapper[CriandoPassosDoRoadmapContext], _agent: Agent[CriandoPassosDoRoadmapContext]):
  input_output_text = run_context.context.input_output_text
  return f"""Crie um agente responsável por gerar as etapas (passos) ou categorias de um roadmap personalizado, retornando a resposta em formato JSON. Para cada etapa do roadmap, forneça:
- title: um título curto e claro para a etapa/categoria.
- description: uma descrição sucinta explicando o propósito e os objetivos dessa etapa/categoria no contexto do roadmap.
- step_order: a posição sequencial lógica dessa etapa/categoria no roadmap (começando em 1).

Antes de listar as etapas, reflita sobre quais fases principais compõem um roadmap típico para o contexto fornecido. Considere a ordem ideal para aprendizado ou execução. Não pule etapas e não coloque conclusões, resumos ou classificações: apenas os dados estruturados de cada etapa, mantendo a ordem lógica.

Ao estruturar a resposta:
- Pense primeiro nos passos essenciais do roadmap e justifique internamente a escolha e ordem de cada um (chain-of-thought antes do output, mas NÃO inclua este raciocínio na resposta final).
- Só então produza o JSON solicitado.
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
  }}
]

Importante: A resposta deve conter somente o JSON, diretamente, sem introdução, resumo ou comentários. Certifique-se de que cada etapa é única e sua ordem faz sentido pedagógico e prático.

Lembrete: Crie as etapas apropriadas para o roadmap solicitado, sempre seguindo a ordem lógica e detalhando cada fase brevemente. {input_output_text}"""
criando_passos_do_roadmap = Agent(
  name="Criando Passos do RoadMap",
  instructions=criando_passos_do_roadmap_instructions,
  model="gpt-5-nano",
  output_type=CriandoPassosDoRoadmapSchema,
  model_settings=ModelSettings(
    store=True,
    reasoning=Reasoning(
      effort="low"
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

