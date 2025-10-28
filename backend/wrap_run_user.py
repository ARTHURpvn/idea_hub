import matplotlib
matplotlib.use('Agg')
from app.api.roadmap.roadmap_generator import RoadmapVisualGenerator
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
import matplotlib.pyplot as plt
from pathlib import Path
import json
import traceback
import sys


def main():
    try:
        # User-provided data (trimmed/cleaned) - kept concise but faithful to the structure
        data = {
          "id": "2c3e5440-41bb-4b88-bc17-59cc3641fe42",
          "idea_id": "4c947a36-126e-4687-b4e0-12580863693d",
          "generated_at": "2025-10-25T00:30:08.451569+00:00",
          "steps": [
            {"id":"11851bb2-0799-4e22-b3a9-43c7bcca71bf","step_order":1,"title":"Planejamento e Definição de Objetivos","description":"Definir o objetivo do chatbot, o público-alvo, idiomas prioritários, canais de atuação, métricas de sucesso (tempo de resposta, resolução na primeira interação, CSAT) e políticas de privacidade/governança de dados.","tasks":[{"id":"b5718506-90cf-4178-8573-a4661b59a2c9","task_order":1,"description":"Mapear os objetivos do chatbot junto aos stakeholders e documentar o objetivo principal, público-alvo e metas de sucesso."},{"id":"abdda26b-5165-4153-a92d-9d229dd4e383","task_order":2,"description":"Definir público-alvo, personas e cenários de uso para embasar o design da conversa."}]},
            {"id":"d2ba603e-dcf0-4357-bb79-627fcc717098","step_order":2,"title":"Análise de Requisitos e Pesquisa","description":"Mapear necessidades, casos de uso, conteúdos da base de conhecimento, requisitos técnicos, ferramentas de NLP/frameworks, plataformas de integração e requisitos de conformidade.","tasks":[{"id":"f849fd7b-ddf9-4409-a460-7bc8215e3445","task_order":1,"description":"Mapear necessidades e casos de uso com stakeholders, consolidando prioridades."}]},
            {"id":"d2f5ce60-3a0e-4f53-b079-8cf2f46bad59","step_order":3,"title":"Arquitetura e Design de Experiência","description":"Definir arquitetura do sistema, fluxos de conversa, intents/entidades, regras de escalonamento para atendimento humano, tom de voz, usabilidade e acessibilidade.","tasks":[]},
            {"id":"81458c6b-8e05-4172-b63a-61c1e6fe5c8a","step_order":4,"title":"Prototipação e Design de Provas de Conceito","description":"Construir um protótipo mínimo viável, validar com usuários, refinar intents/entidades, critérios de sucesso MVP e integração básica com a KB.","tasks":[]},
            {"id":"ba99098f-bb28-49b9-8685-d2b7836276a0","step_order":5,"title":"Desenvolvimento e Integração","description":"Implementar NLP, conectores com canais (web, mobile, embeds), integrar com base de conhecimento/CRM, configurar escalonamento, logs e observabilidade.","tasks":[]},
            {"id":"b07e1214-d6ac-44ec-bf55-6e9e43af3a42","step_order":6,"title":"Testes, Validação e Qualidade","description":"Executar testes de desempenho, precisão de classificação, recuperação de falhas, privacidade e conformidade, testes de carga e validação com usuários.","tasks":[]},
            {"id":"409e36a7-b06f-436b-b7c2-37251ec76512","step_order":7,"title":"Lançamento Gradual, Monitoramento e Melhoria Contínua","description":"Realizar rollout controlado, monitorar KPIs, coletar feedback, ajustar configurações, retrain do modelo e expansão de canais conforme necessário.","tasks":[]}
          ]
        }

        rg = RoadmapVisualGenerator()
        # renderer for measurement
        fig = plt.figure(figsize=(10,3), dpi=100)
        canvas = FigureCanvas(fig)
        canvas.draw()
        renderer = canvas.get_renderer()

        out_lines = ["STEP,WRAPPED_TITLE_LINES,WRAPPED_TITLE_PREVIEW,WRAPPED_DESC_LINES,WRAPPED_DESC_PREVIEW"]
        for i, s in enumerate(data['steps']):
            title = s.get('title','')
            desc = s.get('description','')
            # approximate inner width: use the generator's card_min_width and compute inner text width
            card_w_in = rg.card_min_width
            pad_x = max(1.0, card_w_in * 0.09)
            circle_radius = max(0.18, (rg.card_step_num_pt / 72.0) * 1.2)
            title_gap = max(1.0, pad_x * 0.7)
            right_pad_in = 0.3
            title_x_offset = pad_x + 2 * circle_radius + title_gap
            inner_title_w_in = max(0.5, card_w_in - title_x_offset - right_pad_in)
            max_px_title = max(10, int(inner_title_w_in * fig.dpi))

            wt, wth = rg._wrap_text_by_pixel(title, max_px_title, rg.card_title_pt, renderer, dpi=fig.dpi)
            wd, wdh = rg._wrap_text_by_pixel(desc, max_px_title, rg.card_desc_pt, renderer, dpi=fig.dpi)
            out_lines.append(f"{i+1},{len(wt.split('\n'))},\"{wt.replace('\n','\\n')[:140]}\",{len(wd.split('\n'))},\"{wd.replace('\n','\\n')[:200]}\"")

        # write diagnostics
        p = Path('backend/wrap_results_user.txt')
        p.write_text('\n'.join(out_lines), encoding='utf-8')

        # generate image file
        img = rg.generate_roadmap_image(data)
        out = Path('/tmp/test_roadmap_user.png')
        out.write_bytes(img)
        # append image info
        with open('backend/wrap_results_user.txt','a', encoding='utf-8') as f:
            f.write('\n')
            f.write('IMAGE_FILE,/tmp/test_roadmap_user.png,' + str(out.stat().st_size) + '\n')

        print('diagnostics written to backend/wrap_results_user.txt and image to /tmp/test_roadmap_user.png')

    except Exception:
        tb = traceback.format_exc()
        log_file = Path('backend/wrap_run_user.log')
        try:
            log_file.write_text(tb, encoding='utf-8')
        except Exception:
            # if logging fails, attempt to write to cwd
            try:
                Path('wrap_run_user.log').write_text(tb, encoding='utf-8')
            except Exception:
                pass
        print('ERROR - see backend/wrap_run_user.log for details')
        raise


if __name__ == '__main__':
    main()
