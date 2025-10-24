import os
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from .chat.gen_roadmap_context import run_workflow, WorkflowInput
from ..database.querys.ideas_query import get_idea_by_id
from ..database.querys.roadmap_query import create_roadmap, Roadmap, get_roadmap_with_details
from .roadmap.roadmap_generator import RoadmapVisualGenerator

router = APIRouter()

@router.post("/create", status_code=200, tags=["Roadmap"])
async def create(idea_id: str, exported_to: str):
    roadmap=Roadmap(idea_id=idea_id, exported_to=exported_to)

    try:
        roadmap_id = create_roadmap(roadmap)
        if roadmap_id is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao criar roadmap no banco de dados")

        try:
            idea = get_idea_by_id(idea_id)
            if idea is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ideia não encontrada")

            user_input = WorkflowInput(
                input_as_text=f"User idea: {idea['ai_classification']} \n User Annotation: {idea['raw_content']}"
            )
            await run_workflow(user_input, roadmap_id)
        except HTTPException:
            raise
        except Exception as e:
            print(f"Erro ao executar workflow: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro ao gerar conteúdo do roadmap: {str(e)}")

        # Gerar visualização do roadmap
        try:
            roadmap_data = get_roadmap_with_details(roadmap_id)
            if roadmap_data and len(roadmap_data.get('steps', [])) > 0:
                generator = RoadmapVisualGenerator()

                # Criar diretório para salvar imagens se não existir
                output_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'roadmap_images')
                os.makedirs(output_dir, exist_ok=True)

                # Salvar imagem
                output_path = os.path.join(output_dir, f'roadmap_{roadmap_id}.png')
                generator.save_roadmap_image(roadmap_data, output_path)

                print(f"Imagem do roadmap gerada: {output_path}")

                return {
                    "roadmap_id": roadmap_id,
                    "image_generated": True,
                    "image_path": f"/api/roadmap/{roadmap_id}/image"
                }
            else:
                print("Roadmap sem steps, imagem não gerada")
                return {
                    "roadmap_id": roadmap_id,
                    "image_generated": False,
                    "message": "Roadmap criado mas sem steps para gerar imagem"
                }
        except Exception as e:
            print(f"Erro ao gerar visualização: {e}")
            import traceback
            traceback.print_exc()
            # Retorna sucesso mesmo se a imagem falhar
            return {
                "roadmap_id": roadmap_id,
                "image_generated": False,
                "error": str(e)
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao criar roadmap no banco de dados: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro ao criar roadmap: {str(e)}")


@router.get("/{roadmap_id}/image", status_code=200, tags=["Roadmap"])
async def get_roadmap_image(roadmap_id: str):
    """
    Retorna a imagem visual do roadmap
    """
    try:
        # Verificar se a imagem existe
        output_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'roadmap_images')
        image_path = os.path.join(output_dir, f'roadmap_{roadmap_id}.png')

        if not os.path.exists(image_path):
            # Tentar gerar a imagem se não existir
            roadmap_data = get_roadmap_with_details(roadmap_id)
            if not roadmap_data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap não encontrado")

            if len(roadmap_data.get('steps', [])) == 0:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap sem steps para gerar imagem")

            generator = RoadmapVisualGenerator()
            os.makedirs(output_dir, exist_ok=True)
            generator.save_roadmap_image(roadmap_data, image_path)

        return FileResponse(
            image_path,
            media_type="image/png",
            filename=f"roadmap_{roadmap_id}.png"
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao buscar imagem do roadmap: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro ao buscar imagem: {str(e)}")


@router.get("/{roadmap_id}", status_code=200, tags=["Roadmap"])
async def get_roadmap(roadmap_id: str):
    """
    Retorna os dados completos do roadmap (steps e tasks)
    """
    try:
        roadmap_data = get_roadmap_with_details(roadmap_id)
        if not roadmap_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap não encontrado")

        return roadmap_data

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao buscar roadmap: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro ao buscar roadmap: {str(e)}")

