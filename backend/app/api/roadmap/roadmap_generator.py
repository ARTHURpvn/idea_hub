# -*- coding: utf-8 -*-
"""
Módulo para gerar visualização de roadmaps - Design Ultra Moderno
"""
import io
import os
from typing import Dict
from PIL import Image, ImageDraw, ImageFont
from datetime import datetime


class RoadmapVisualGenerator:
    """Gera visualização ultra moderna de roadmap estilo infográfico"""

    def __init__(self):
        self.width = 1600
        self.margin = 80
        self.step_width = 450
        self.step_height_base = 180
        self.card_spacing = 60
        self.task_height = 45

        # Paleta de cores moderna e vibrante
        self.bg_gradient_top = (250, 251, 255)
        self.bg_gradient_bottom = (243, 244, 246)

        self.step_colors = [
            {'primary': (99, 102, 241), 'light': (199, 210, 254), 'dark': (67, 56, 202)},
            {'primary': (139, 92, 246), 'light': (221, 214, 254), 'dark': (109, 40, 217)},
            {'primary': (236, 72, 153), 'light': (251, 207, 232), 'dark': (190, 24, 93)},
            {'primary': (249, 115, 22), 'light': (254, 215, 170), 'dark': (194, 65, 12)},
            {'primary': (14, 165, 233), 'light': (186, 230, 253), 'dark': (2, 132, 199)},
            {'primary': (34, 197, 94), 'light': (187, 247, 208), 'dark': (21, 128, 61)},
        ]

        self.text_primary = (15, 23, 42)
        self.text_secondary = (100, 116, 139)
        self.white = (255, 255, 255)
        self.shadow = (203, 213, 225)

    def _get_font(self, size: int, bold: bool = False):
        """Carrega fontes do sistema que suportam UTF-8"""
        font_paths = [
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/Library/Fonts/Arial.ttf",
        ]

        for font_path in font_paths:
            try:
                return ImageFont.truetype(font_path, size)
            except:
                continue

        # Fallback para fonte padrão
        return ImageFont.load_default()

    def _draw_gradient_background(self, draw, width, height):
        """Desenha um gradiente suave de fundo"""
        for y in range(height):
            ratio = y / height
            r = int(self.bg_gradient_top[0] + (self.bg_gradient_bottom[0] - self.bg_gradient_top[0]) * ratio)
            g = int(self.bg_gradient_top[1] + (self.bg_gradient_bottom[1] - self.bg_gradient_top[1]) * ratio)
            b = int(self.bg_gradient_top[2] + (self.bg_gradient_bottom[2] - self.bg_gradient_top[2]) * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b))

    def _draw_card_with_shadow(self, draw, xy, radius, fill, border_color, border_width=3):
        """Desenha um card com sombra profunda"""
        x1, y1, x2, y2 = xy

        for i in range(8, 0, -1):
            shadow_color = (
                self.shadow[0] + (30 - i * 3),
                self.shadow[1] + (30 - i * 3),
                self.shadow[2] + (30 - i * 3)
            )
            shadow_xy = (x1 + i, y1 + i, x2 + i, y2 + i)
            draw.rounded_rectangle(shadow_xy, radius=radius, fill=shadow_color)

        draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=border_color, width=border_width)

    def _wrap_text(self, text: str, font, max_width: int):
        """Quebra texto em múltiplas linhas"""
        words = text.split()
        lines = []
        current_line = []

        for word in words:
            test_line = ' '.join(current_line + [word])
            bbox = font.getbbox(test_line)
            if bbox[2] - bbox[0] <= max_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]

        if current_line:
            lines.append(' '.join(current_line))

        return lines

    def generate_roadmap_image(self, roadmap_data: dict) -> bytes:
        """Gera uma imagem ultra moderna de roadmap estilo infográfico"""
        steps = roadmap_data.get('steps', [])

        if not steps:
            img = Image.new('RGB', (self.width, 400), self.bg_gradient_top)
            draw = ImageDraw.Draw(img)
            font = self._get_font(24)
            text = "Nenhuma etapa encontrada no roadmap"
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            draw.text(((self.width - text_width) // 2, 180), text, fill=self.text_primary, font=font)
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='PNG', quality=95)
            img_byte_arr.seek(0)
            return img_byte_arr.getvalue()

        # Calcular altura
        total_height = 250
        cols = 2
        for i in range(len(steps)):
            step = steps[i]
            tasks = step.get('tasks', [])
            task_height = max(50, len(tasks) * (self.task_height + 8) + 80)
            step_total_height = self.step_height_base + task_height
            if i % cols == 0:
                total_height += step_total_height + self.card_spacing
        total_height += 120

        # Criar imagem
        img = Image.new('RGB', (self.width, total_height), self.white)
        draw = ImageDraw.Draw(img)
        self._draw_gradient_background(draw, self.width, total_height)

        # Fontes
        mega_title_font = self._get_font(56, bold=True)
        title_font = self._get_font(20)
        step_number_font = self._get_font(42, bold=True)
        step_title_font = self._get_font(22, bold=True)
        step_desc_font = self._get_font(14)
        task_font = self._get_font(14)
        badge_font = self._get_font(11)
        small_font = self._get_font(12)

        # HEADER
        header_y = 60

        title = "ROADMAP DO PROJETO"
        title_bbox = draw.textbbox((0, 0), title, font=mega_title_font)
        title_width = title_bbox[2] - title_bbox[0]
        title_x = (self.width - title_width) // 2
        draw.text((title_x + 3, header_y + 23), title, fill=self.shadow, font=mega_title_font)
        draw.text((title_x, header_y + 20), title, fill=self.text_primary, font=mega_title_font)

        date_str = datetime.now().strftime("%d/%m/%Y")
        badge_text = f"{len(steps)} Etapas | Gerado em {date_str}"
        badge_bbox = draw.textbbox((0, 0), badge_text, font=title_font)
        badge_width = badge_bbox[2] - badge_bbox[0]
        badge_x = (self.width - badge_width) // 2 - 20
        badge_y = header_y + 90
        badge_bg = (99, 102, 241)
        draw.rounded_rectangle([badge_x - 15, badge_y - 8, badge_x + badge_width + 15, badge_y + 30], radius=20, fill=badge_bg)
        draw.text((badge_x, badge_y), badge_text, fill=self.white, font=title_font)

        # GRID DE STEPS
        current_y = 200
        col_width = (self.width - self.margin * 2 - self.card_spacing) // 2

        for idx, step in enumerate(steps):
            step_title = step.get('title', f'Etapa {idx + 1}')
            step_desc = step.get('description', '')
            tasks = step.get('tasks', [])
            color_scheme = self.step_colors[idx % len(self.step_colors)]

            col = idx % cols
            card_x = self.margin + col * (col_width + self.card_spacing)

            if col == 0 and idx > 0:
                prev_step = steps[idx - 1]
                prev_tasks = prev_step.get('tasks', [])
                prev_task_height = max(50, len(prev_tasks) * (self.task_height + 8) + 80)
                prev_total = self.step_height_base + prev_task_height
                current_y += prev_total + self.card_spacing

            task_area_height = max(50, len(tasks) * (self.task_height + 8) + 80)
            card_height = self.step_height_base + task_area_height

            # CARD
            card_xy = (card_x, current_y, card_x + col_width, current_y + card_height)
            self._draw_card_with_shadow(draw, card_xy, radius=20, fill=self.white, border_color=color_scheme['primary'], border_width=4)

            # HEADER COLORIDO
            header_height = 70
            for y in range(header_height):
                ratio = y / header_height
                r = int(color_scheme['light'][0] + (color_scheme['primary'][0] - color_scheme['light'][0]) * ratio)
                g = int(color_scheme['light'][1] + (color_scheme['primary'][1] - color_scheme['light'][1]) * ratio)
                b = int(color_scheme['light'][2] + (color_scheme['primary'][2] - color_scheme['light'][2]) * ratio)
                draw.line([(card_x + 4, current_y + y + 4), (card_x + col_width - 4, current_y + y + 4)], fill=(r, g, b))

            # NÚMERO
            step_num = str(idx + 1)
            num_x = card_x + 25
            num_y = current_y + 15
            circle_radius = 28
            draw.ellipse([num_x - circle_radius, num_y - circle_radius + 10, num_x + circle_radius, num_y + circle_radius + 10],
                        fill=self.white, outline=color_scheme['dark'], width=3)
            num_bbox = draw.textbbox((0, 0), step_num, font=step_number_font)
            num_w = num_bbox[2] - num_bbox[0]
            num_h = num_bbox[3] - num_bbox[1]
            draw.text((num_x - num_w // 2, num_y - num_h // 2 + 8), step_num, fill=color_scheme['dark'], font=step_number_font)

            # TÍTULO
            title_x = num_x + circle_radius + 20
            title_y = current_y + 23
            title_lines = self._wrap_text(step_title, step_title_font, col_width - 120)
            for line in title_lines[:1]:
                draw.text((title_x, title_y), line, fill=self.white, font=step_title_font)

            # DESCRIÇÃO
            desc_y = current_y + header_height + 20
            if step_desc:
                desc_lines = self._wrap_text(step_desc, step_desc_font, col_width - 50)
                for line_idx, line in enumerate(desc_lines[:2]):
                    draw.text((card_x + 25, desc_y + line_idx * 20), line, fill=self.text_secondary, font=step_desc_font)

            # TASKS
            if tasks:
                tasks_y = desc_y + 55
                task_label = f"{len(tasks)} {'tarefa' if len(tasks) == 1 else 'tarefas'}"
                draw.text((card_x + 25, tasks_y - 5), task_label, fill=self.text_secondary, font=badge_font)
                tasks_y += 25

                for task_idx, task in enumerate(tasks[:6]):
                    task_desc = task.get('description', '')
                    tools = task.get('suggested_tools', [])
                    task_y = tasks_y + task_idx * (self.task_height + 8)

                    task_bg_xy = (card_x + 20, task_y, card_x + col_width - 20, task_y + self.task_height - 5)
                    draw.rounded_rectangle(task_bg_xy, radius=10, fill=(249, 250, 251), outline=color_scheme['light'], width=1)

                    check_x = card_x + 35
                    check_y = task_y + 10
                    check_size = 20
                    draw.rounded_rectangle([check_x, check_y, check_x + check_size, check_y + check_size],
                                          radius=6, fill=self.white, outline=color_scheme['primary'], width=2)

                    task_text_x = check_x + check_size + 15
                    task_lines = self._wrap_text(task_desc, task_font, col_width - 200)
                    task_text = task_lines[0][:45] + '...' if len(task_lines[0]) > 45 else task_lines[0]
                    draw.text((task_text_x, task_y + 10), task_text, fill=self.text_primary, font=task_font)

                    if tools and len(tools) > 0:
                        tool = tools[0][:12]
                        tool_bbox = draw.textbbox((0, 0), tool, font=badge_font)
                        tool_w = tool_bbox[2] - tool_bbox[0]
                        badge_x = card_x + col_width - 30 - tool_w - 20
                        badge_y = task_y + 8
                        draw.rounded_rectangle([badge_x, badge_y, badge_x + tool_w + 16, badge_y + 22],
                                              radius=11, fill=color_scheme['primary'])
                        draw.text((badge_x + 8, badge_y + 4), tool, fill=self.white, font=badge_font)
                        if len(tools) > 1:
                            more = f"+{len(tools) - 1}"
                            draw.text((badge_x - 25, task_y + 12), more, fill=self.text_secondary, font=small_font)

                if len(tasks) > 6:
                    more_text = f"... e mais {len(tasks) - 6} tarefas"
                    draw.text((card_x + 25, tasks_y + 6 * (self.task_height + 8) + 10), more_text, fill=self.text_secondary, font=small_font)

        # FOOTER
        footer_y = total_height - 70
        footer_text = "Gerado automaticamente por IdeaHub | Seu assistente de projetos"
        footer_bbox = draw.textbbox((0, 0), footer_text, font=title_font)
        footer_width = footer_bbox[2] - footer_bbox[0]
        draw.text(((self.width - footer_width) // 2, footer_y), footer_text, fill=self.text_secondary, font=title_font)

        # Salvar
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG', quality=98, optimize=True)
        img_byte_arr.seek(0)
        return img_byte_arr.getvalue()

    def save_roadmap_image(self, roadmap_data: dict, output_path: str) -> str:
        """Gera e salva a imagem do roadmap em arquivo"""
        img_bytes = self.generate_roadmap_image(roadmap_data)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'wb') as f:
            f.write(img_bytes)
        return output_path

