# -*- coding: utf-8 -*-
import io
import os
from datetime import datetime
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Circle
import matplotlib.patheffects as path_effects
from PIL import Image
import textwrap
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas


class RoadmapVisualGenerator:
    """
    Gera um roadmap moderno, minimalista e em tema escuro com visualização horizontal ampla.
    """

    def __init__(self):
        # Configuração visual de alta qualidade
        plt.rcParams['figure.dpi'] = 100
        plt.rcParams['savefig.dpi'] = 100
        plt.rcParams['font.family'] = 'DejaVu Sans'
        plt.rcParams['axes.unicode_minus'] = False
        plt.rcParams['text.antialiased'] = True
        plt.rcParams['figure.autolayout'] = False

        # Layout e proporções - valores em polegadas (coerentes com figsize)
        # Esses são valores mínimos; cada card pode crescer para caber o título
        self.card_min_width = 12.0
        self.card_min_height = 4.0
        self.card_spacing_x = 1.5
        self.card_spacing_y = 1.5
        self.cols = 3
        self.margin_x = 1.0
        self.margin_y = 1.0
        self.header_height = 3.5
        # maximum width for a single card (in inches) to avoid cards growing indefinitely
        self.max_card_width = 24.0

        # Font sizes (em pontos) — controláveis e usados tanto no cálculo quanto na renderização
        self.card_title_pt = 36
        # aumentar descrição e tarefas para maior legibilidade (aumentei mais)
        self.card_desc_pt = 30
        # tasks should be close to description size for legibility
        self.card_task_pt = 30
        # smaller font used for suggested tools lines under each task
        self.card_tools_pt = max(14, int(self.card_task_pt * 0.6))
        # spacing constants (in inches) to tune vertical rhythm
        # gap between title and description, and between description and tasks
        self.card_content_gap = 0.34
        # extra vertical gap between individual tasks
        self.task_between_gap = 0.42
        # minimum top/bottom padding inside card
        self.card_pad_y_min = 1.2
        # passo: fonte ajustada para o marcador
        self.card_step_num_pt = 24
        # main title default (base) - we'll scale it later com limites
        self.main_title_pt = max(48, int(self.card_title_pt * 1.2))
        # heurística usada tanto para medição quanto para wrap
        self.chars_per_inch = 12

        # Paleta escura moderna e profissional
        self.bg_color = '#0A0E1A'
        self.card_bg = '#1A1F2E'
        self.card_border = '#2D3548'
        self.text_primary = '#FFFFFF'
        self.text_secondary = '#A0AEC0'
        self.text_muted = '#64748B'
        self.accent_glow = 'rgba(99, 102, 241, 0.1)'

        # Paleta de cores vibrantes e modernas
        self.step_colors = [
            {'primary': '#6366F1', 'light': '#828CF8', 'dark': '#4F46E5'},
            {'primary': '#8B5CF6', 'light': '#A78BFA', 'dark': '#7C3AED'},
            {'primary': '#EC4899', 'light': '#F472B6', 'dark': '#DB2777'},
            {'primary': '#F59E0B', 'light': '#FBBF24', 'dark': '#D97706'},
            {'primary': '#10B981', 'light': '#34D399', 'dark': '#059669'},
            {'primary': '#06B6D4', 'light': '#22D3EE', 'dark': '#0891B2'},
            {'primary': '#EF4444', 'light': '#F87171', 'dark': '#DC2626'},
            {'primary': '#14B8A6', 'light': '#2DD4BF', 'dark': '#0D9488'},
        ]

        try:
            env_limit = os.environ.get('ROADMAP_MAX_IMAGE_PIXELS')
            if env_limit is not None:
                if env_limit.lower() in ('none', 'null', 'none'):
                    Image.MAX_IMAGE_PIXELS = None
                else:
                    Image.MAX_IMAGE_PIXELS = int(env_limit)
            else:
                Image.MAX_IMAGE_PIXELS = 500_000_000
        except Exception:
            # se por algum motivo não for possível, ignore (PIL antigo)
            pass

    def _wrap_text(self, text, max_chars=15):
        """Quebra texto em múltiplas linhas de forma inteligente"""
        if not text:
            return ""
        try:
            wrapped = textwrap.fill(text, width=max_chars, break_long_words=True, break_on_hyphens=True)
        except Exception:
            words = text.split()
            lines = []
            cur = []
            cur_len = 0
            for w in words:
                if cur_len + len(w) + 1 <= max_chars:
                    cur.append(w)
                    cur_len += len(w) + 1
                else:
                    lines.append(' '.join(cur))
                    cur = [w]
                    cur_len = len(w) + 1
            if cur:
                lines.append(' '.join(cur))
            wrapped = '\n'.join(lines)
        lines = wrapped.split('\n')
        max_lines = 15
        return '\n'.join(lines[:max_lines])

    def _wrap_text_by_pixel(self, text, max_px, fontsize_pt, renderer, dpi=None, fontweight='normal'):
        """Wrap text to fit max_px using renderer metrics.

        Returns (wrapped_text, height_in_inches)
        """
        if not text:
            return '', 0.0
        # Use a robust approach: estimate average char width then do a char-based wrap,
        # finally measure each wrapped line with renderer to compute accurate height.
        from matplotlib import font_manager as fm
        prop = fm.FontProperties(size=fontsize_pt, weight=fontweight)

        # determine dpi fallback
        if dpi is None:
            try:
                dpi = renderer.get_canvas().figure.dpi
            except Exception:
                dpi = plt.rcParams.get('figure.dpi', 100)

        # try to get average char width in pixels (for 'M')
        try:
            sample_w_px, sample_h_px, _ = renderer.get_text_width_height_descent('M', prop, ismath=False)
            avg_char_px = max(1.0, float(sample_w_px) * 0.9)
        except Exception:
            # fallback conservative estimate: 0.5 * fontsize in pixels
            avg_char_px = max(1.0, float(fontsize_pt) * (dpi / 72.0) * 0.5)

        est_chars = max(1, int(max_px / avg_char_px))

        # If there are extremely long unbroken tokens, insert soft breaks every est_chars chars
        def _force_break_tokens(s, chunk_len):
            import re
            parts = []
            for tok in re.split(r'(\s+)', s):
                if len(tok) > chunk_len and not tok.isspace():
                    # split token into chunks
                    chunks = [tok[i:i+chunk_len] for i in range(0, len(tok), chunk_len)]
                    parts.append(' '.join(chunks))
                else:
                    parts.append(tok)
            return ''.join(parts)

        safe_text = _force_break_tokens(text, max(3, est_chars))

        # Use textwrap to break into lines (char-based). break_long_words ensures long tokens are split.
        try:
            wrapped = textwrap.fill(safe_text, width=est_chars, break_long_words=True, break_on_hyphens=True)
        except Exception:
            wrapped = self._wrap_text(safe_text, max_chars=est_chars)

        # enforce sensible max lines for title/desc to avoid massive cards
        # caller should decide which is title/desc; we'll not assume here, but we can apply general cap
        max_lines_global = 24
        lines = wrapped.split('\n')[:max_lines_global]
        wrapped = '\n'.join(lines)

        # Measure each wrapped line to compute height in pixels
        total_px = 0.0
        try:
            for ln in lines:
                if ln.strip() == '':
                    # empty line -> estimate minimal height
                    h_px = float(fontsize_pt) * (dpi / 72.0) * 0.8
                else:
                    try:
                        w_px, h_px, d_px = renderer.get_text_width_height_descent(ln, prop, ismath=False)
                        if not h_px or h_px <= 0:
                            _, sample_h_px, _ = renderer.get_text_width_height_descent('Mg', prop, ismath=False)
                            h_px = sample_h_px
                    except Exception:
                        h_px = float(fontsize_pt) * (dpi / 72.0)
                total_px += h_px
        except Exception:
            # fallback height estimate
            total_px = len(lines) * float(fontsize_pt) * (dpi / 72.0)

        # apply small line spacing multiplier
        total_px = total_px * 1.12
        height_in = float(total_px) / float(dpi)
        return wrapped, height_in

    def _draw_card(self, ax, x, y, width, height, color_scheme, step_num, title, wrapped_title=None, title_height=None, desc_wrapped=None, tasks_wrapped=None, renderer=None, dpi=None, raw_desc=None, raw_tasks=None):
        """Desenha um card moderno e limpo em tema escuro

        width/height estão em polegadas (coerente com figsize). Fontes são em pontos (pts).
        Conversões: 1 ponto = 1/72 polegada.
        """
        # aumentar paddings para dar mais espaço entre elementos
        pad_x = max(1.0, width * 0.09)
        pad_y = max(0.6, height * 0.1)
        circle_radius = max(0.18, (self.card_step_num_pt / 72.0) * 1.2)

        card = FancyBboxPatch(
            (x, y), width, height,
            boxstyle="round,pad=0.18",
            facecolor=self.card_bg,
            edgecolor=color_scheme['primary'],
            linewidth=1.5,
            zorder=2,
            alpha=0.98
        )
        ax.add_patch(card)

        circle_cx = x + pad_x + circle_radius
        circle_cy = y + height - pad_y - circle_radius
        circle = Circle(
            (circle_cx, circle_cy),
            circle_radius,
            facecolor=color_scheme['primary'],
            edgecolor=color_scheme['light'],
            linewidth=2,
            zorder=3
        )
        ax.add_patch(circle)

        # Número do step - em pontos controlados pela classe
        ax.text(
            circle_cx, circle_cy,
            str(step_num),
            ha='center', va='center',
            fontsize=self.card_step_num_pt, fontweight='bold',
            color='#FFFFFF',
            zorder=4
        )

        title_x = circle_cx + circle_radius + max(1.0, pad_x * 0.7)
        # title_y: posição do topo do título dentro do card (polegadas)
        title_y = y + height - pad_y - (self.card_title_pt / 72.0) * 0.12
        if dpi is None:
            try:
                dpi = renderer.get_canvas().figure.dpi
            except Exception:
                dpi = plt.rcParams.get('figure.dpi', 100)

        title_height_in = None
        title_to_draw = title
        # compute available pixel width for the title text (reserve some right padding)
        try:
            right_pad_in = 0.3
            inner_title_w_in = (x + width) - title_x - right_pad_in
            max_px_title = max(10, int(inner_title_w_in * dpi))
            # Prefer precomputed wrapped_title if provided (ensures consistency)
            if wrapped_title:
                title_to_draw = wrapped_title
                title_height_in = title_height if title_height is not None else (self.card_title_pt / 72.0) * 1.1
            else:
                # attempt to compute wrapped title based on final card width
                if renderer is not None:
                    wrapped_title_calc, wrapped_title_h = self._wrap_text_by_pixel(str(title), max_px_title, self.card_title_pt, renderer, dpi=dpi)
                    if wrapped_title_calc:
                        title_to_draw = wrapped_title_calc
                        title_height_in = wrapped_title_h
        except Exception:
            # fallback to provided wrapped_title or plain title
            if wrapped_title:
                title_to_draw = wrapped_title
                try:
                    # wrap_height might have been provided via title_height
                    title_height_in = title_height
                except Exception:
                    title_height_in = None

        if title_height_in is None:
            # if caller supplied a measurement, use it
            if title_height is not None:
                title_height_in = title_height
            else:
                title_height_in = (self.card_title_pt / 72.0) * 1.1

        # draw the title (wrapped or plain)
        title_text = ax.text(
            title_x, title_y,
            title_to_draw,
            ha='left', va='top',
            fontsize=self.card_title_pt, fontweight='bold',
            color=self.text_primary,
            zorder=4,
            linespacing=1.02
        )
        title_text.set_path_effects([path_effects.withStroke(linewidth=0.4, foreground='#000000', alpha=0.25)])

        # calcular altura do título (usando a medição passada se disponível)
        # divider positioned based on measured title height
        divider_y = title_y - title_height_in - self.card_content_gap
        ax.plot([x + 0.3, x + width - 0.3], [divider_y, divider_y],
                color=self.card_border, linewidth=1.25, alpha=0.6, zorder=3)

        # Descrição: prefer renderer-driven pixel wrapping/measurement quando disponível
        desc_x = title_x
        desc_h_in = 0.0
        # resolve dpi localmente
        if dpi is None:
            try:
                dpi = renderer.get_canvas().figure.dpi
            except Exception:
                dpi = plt.rcParams.get('figure.dpi', 100)

        if renderer is not None and raw_desc:
            # available width for text (in inches) is from title_x to right card edge minus small padding
            right_pad_in = 0.3
            inner_text_w_in = (x + width) - title_x - right_pad_in
            max_px = max(10, int(inner_text_w_in * dpi))
            # Prefer precomputed desc_wrapped if provided
            if desc_wrapped:
                # estimate height based on lines and fontsize
                desc_lines = desc_wrapped.count('\n') + (1 if desc_wrapped else 0)
                desc_h_in = desc_lines * ((self.card_desc_pt / 72.0) * 1.25)
                desc_y = divider_y - self.card_content_gap
                ax.text(
                    desc_x, desc_y,
                    desc_wrapped,
                    ha='left', va='top',
                    fontsize=self.card_desc_pt,
                    color=self.text_secondary,
                    zorder=4,
                    linespacing=1.25
                )
            else:
                wrapped_text, desc_h_in = self._wrap_text_by_pixel(str(raw_desc), max_px, self.card_desc_pt, renderer, dpi=dpi)
                if wrapped_text:
                    desc_y = divider_y - self.card_content_gap
                    ax.text(
                        desc_x, desc_y,
                        wrapped_text,
                        ha='left', va='top',
                        fontsize=self.card_desc_pt,
                        color=self.text_secondary,
                        zorder=4,
                        linespacing=1.25
                    )
        else:
            # fallback to previously-wrapped text (coarse estimation)
            if desc_wrapped:
                desc_lines = desc_wrapped.count('\n') + (1 if desc_wrapped else 0)
                desc_line_h_in = (self.card_desc_pt / 72.0) * 1.25
                desc_h_in = desc_lines * desc_line_h_in
                desc_y = divider_y - self.card_content_gap
                ax.text(
                    desc_x, desc_y,
                    desc_wrapped,
                    ha='left', va='top',
                    fontsize=self.card_desc_pt,
                    color=self.text_secondary,
                    zorder=4,
                    linespacing=1.25
                )
            else:
                desc_h_in = 0.0

        # tarefas: quando temos renderer e raw_tasks, fazemos wrap e medimos cada tarefa com precisão
        # leave an explicit gap between description and the first task
        task_start_y = divider_y - self.card_content_gap - desc_h_in
        task_y = task_start_y
        task_fontsize = self.card_task_pt
        tasks_to_render = []
        if renderer is not None and raw_tasks:
            # compute available width similar to description but allow a tad more for bullet indent
            right_pad_in = 0.3
            inner_text_w_in = (x + width) - title_x - right_pad_in
            max_px_task = max(10, int(inner_text_w_in * dpi))
            # Prefer precomputed tasks_wrapped if provided
            if tasks_wrapped:
                for tt in (tasks_wrapped[:6] if isinstance(tasks_wrapped, list) else []):
                    if not tt:
                        continue
                    lines = tt.count('\n') + (1 if tt else 0)
                    h_in = lines * ((task_fontsize / 72.0) * 1.25)
                    tasks_to_render.append((tt, h_in))
            else:
                # build list of (wrapped_text, height_in_inches)
                for t in (raw_tasks[:6] if isinstance(raw_tasks, list) else []):
                    task_desc = t.get('description', '') if isinstance(t, dict) else str(t)
                    if not task_desc:
                        continue
                    # wrap the main task text
                    wrapped_task, h_in = self._wrap_text_by_pixel(str(task_desc), max_px_task, task_fontsize, renderer, dpi=dpi)
                    combined_text = wrapped_task or ''
                    tools_h = 0.0
                    # if suggested_tools present, render them beneath the task with a smaller font
                    suggested = []
                    if isinstance(t, dict):
                        suggested = t.get('suggested_tools', []) or []
                    if suggested:
                        tools_line = 'Ferramentas: ' + ', '.join(suggested)
                        wrapped_tools, tools_h = self._wrap_text_by_pixel(str(tools_line), max_px_task, max(10, int(self.card_tools_pt)), renderer, dpi=dpi, fontweight='normal')
                        if wrapped_tools:
                            combined_text = combined_text + ('\n' if combined_text else '') + wrapped_tools
                    total_h = float(h_in) + float(tools_h)
                    if combined_text:
                        tasks_to_render.append((combined_text, total_h))
        else:
            # fallback to pre-wrapped text (coarse estimation)
            for tt in (tasks_wrapped or [])[:6]:
                lines = tt.count('\n') + (1 if tt else 0)
                # include extra per-task spacing estimate
                h_in = lines * ((task_fontsize / 72.0) * 1.35) + (self.task_between_gap)
                tasks_to_render.append((tt, h_in))

        # render tasks using measured heights so layout matches earlier measurement
        max_tasks = len(tasks_to_render)
        for i, (task_text, h_in) in enumerate(tasks_to_render[:6]):
            if task_y < y + self.card_pad_y_min:
                break
            bullet_x = title_x - 0.18
            ax.plot(bullet_x, task_y - 0.06, 'o', color=color_scheme['light'], markersize=9, zorder=4)
            # If the task_text contains a tools line (newline), draw with increased linespacing
            linesp = 1.45
            # render task text; detect if it contains a trailing tools line to style it
            if '\nFerramentas:' in task_text:
                # split to render main and tools with slightly different styling
                main_text, tools_text = task_text.split('\n', 1)
                ax.text(
                    title_x + 0.18, task_y,
                    main_text,
                    ha='left', va='top',
                    fontsize=task_fontsize,
                    color=self.text_secondary,
                    zorder=4,
                    linespacing=linesp
                )
                # render tools line below in muted color, slightly smaller and italic for emphasis
                # compute a dynamic offset based on the main font height
                main_line_h = (self.card_task_pt / 72.0) * 1.05
                tools_y = task_y - main_line_h - 0.04
                ax.text(
                    title_x + 0.18, tools_y,
                    tools_text,
                    ha='left', va='top',
                    fontsize=self.card_tools_pt,
                    color=self.text_muted,
                    style='italic',
                    zorder=4,
                    linespacing=1.05
                )
            else:
                ax.text(
                    title_x + 0.18, task_y,
                    task_text,
                    ha='left', va='top',
                    fontsize=task_fontsize,
                    color=self.text_secondary,
                    zorder=4,
                    linespacing=linesp
                )
            # add a bit more vertical gap between tasks to avoid crowding
            task_y -= h_in + self.task_between_gap

    def generate_roadmap_image(self, roadmap_data, start_y=None):
        steps = roadmap_data.get('steps', [])
        if not steps:
            return b''

        # --- Medir títulos para tornar os cards responsivos ---
        # Criar figura temporária só para obter um renderer e medir o texto em pixels
        temp_dpi = 100
        temp_fig = plt.figure(figsize=(6, 3), dpi=temp_dpi)
        temp_ax = temp_fig.add_subplot(111)
        canvas = FigureCanvas(temp_fig)
        # initial draw to prepare renderer
        canvas.draw()
        renderer = canvas.get_renderer()

        # medir largura do título (em polegadas) para cada step
        required_widths = []
        required_heights = []
        wrapped_titles = []
        wrapped_title_heights = []
        wrapped_descs = []
        wrapped_tasks_lists = []
        # we'll compute characters-per-line based on measured average char width per font
        for step in steps:
            title = step.get('title', '')
            t = temp_ax.text(0, 0, title, fontsize=self.card_title_pt, fontweight='bold')
            canvas.draw()
            renderer = canvas.get_renderer()
            bbox = t.get_window_extent(renderer=renderer)
            title_w_in = bbox.width / float(temp_dpi)
            title_h_in = bbox.height / float(temp_dpi)
            # calcular largura do card requerida inicialmente com padding
            pad_x = max(0.4, self.card_min_width * 0.06)
            extra_for_circle = 0.6
            # limit the required width so extremely long titles don't force huge cards
            req_w_candidate = max(self.card_min_width, title_w_in + pad_x * 2 + extra_for_circle)
            req_w = min(req_w_candidate, self.max_card_width)

            # agora que temos req_w, calcule quantos caracteres cabem por linha para a descrição
            desc = step.get('description', '') or ''
            # Compute average character width for description font (pixels)
            sample_char = temp_ax.text(0, 0, 'M', fontsize=self.card_desc_pt)
            canvas.draw(); renderer = canvas.get_renderer()
            char_bbox = sample_char.get_window_extent(renderer=renderer)
            char_w_px = max(1.0, char_bbox.width)
            sample_char.remove()
            # derive estimated chars per line from pixel width available
            est_chars_line = max(10, int((req_w * temp_dpi) / char_w_px))

            # compute wrapped title to fit inside req_w (reserve space for circle/gap)
            try:
                inner_title_w_in = max(0.5, req_w - (pad_x + extra_for_circle + 0.6))
                max_px_title = max(10, int(inner_title_w_in * temp_dpi))
                wrapped_title, wrapped_title_h_in = self._wrap_text_by_pixel(title, max_px_title, self.card_title_pt, renderer, dpi=temp_dpi)
            except Exception:
                wrapped_title = title
                wrapped_title_h_in = title_h_in
            wrapped_titles.append(wrapped_title if wrapped_title else title)
            wrapped_title_heights.append(wrapped_title_h_in)

            desc_wrapped = self._wrap_text(desc, max_chars=est_chars_line)
            # measure wrapped description using renderer to get accurate height
            if desc_wrapped:
                td = temp_ax.text(0, 0, desc_wrapped, fontsize=self.card_desc_pt)
                canvas.draw(); renderer = canvas.get_renderer()
                bbox_d = td.get_window_extent(renderer=renderer)
                desc_h_in = bbox_d.height / float(temp_dpi)
                td.remove()
            else:
                desc_h_in = 0.0
            # save wrapped desc for later drawing
            wrapped_descs.append(desc_wrapped if desc_wrapped else '')

            # tarefas: measure each task line height
            tasks = step.get('tasks', [])
            tasks_h_in = 0.0
            wrapped_tasks = []
            # compute char width for task font
            sample_char_t = temp_ax.text(0, 0, 'M', fontsize=self.card_task_pt)
            canvas.draw(); renderer = canvas.get_renderer()
            char_t_bbox = sample_char_t.get_window_extent(renderer=renderer)
            char_t_px = max(1.0, char_t_bbox.width)
            sample_char_t.remove()
            for i, task in enumerate(tasks[:6]):
                task_desc = task.get('description', '')
                if not task_desc:
                    continue
                wrapped_task = self._wrap_text(task_desc, max_chars=max(2, int((req_w * temp_dpi) / char_t_px)))
                tt = temp_ax.text(0, 0, wrapped_task, fontsize=self.card_task_pt)
                canvas.draw(); renderer = canvas.get_renderer()
                bbox_t = tt.get_window_extent(renderer=renderer)
                tasks_h_in += bbox_t.height / float(temp_dpi)
                # add per-task vertical gap estimate so measurement matches rendering spacing
                tasks_h_in += self.task_between_gap
                tt.remove()
                combined = wrapped_task
                # handle suggested_tools in measurement pass as well
                if isinstance(task, dict):
                    suggested = task.get('suggested_tools', []) or []
                    if suggested:
                        tools_line = 'Ferramentas: ' + ', '.join(suggested)
                        tt2 = temp_ax.text(0, 0, tools_line, fontsize=max(10, int(self.card_tools_pt)))
                        canvas.draw(); renderer = canvas.get_renderer()
                        bbox_t2 = tt2.get_window_extent(renderer=renderer)
                        tasks_h_in += bbox_t2.height / float(temp_dpi)
                        # include a small gap after tools as well
                        tasks_h_in += (self.task_between_gap * 0.5)
                        tt2.remove()
                        combined = combined + ('\n' if combined else '') + tools_line
                wrapped_tasks.append(combined)
            # store wrapped tasks list for drawing
            wrapped_tasks_lists.append(wrapped_tasks)

            # padding vertical
            pad_y = max(0.3, self.card_min_height * 0.06)
            # altura requerida: paddings + title + divider + desc + tasks + bottom padding
            title_h_est = max(wrapped_title_h_in if 'wrapped_title_h_in' in locals() else title_h_in, (self.card_title_pt / 72.0) * 1.1)
            # include content gaps and per-task spacing estimates
            req_h = pad_y + title_h_est + self.card_content_gap + desc_h_in + self.card_content_gap + tasks_h_in + pad_y

            required_widths.append(req_w)
            required_heights.append(req_h)
            t.remove()

        # If some steps had no description/tasks, ensure wrapped lists align with steps
        # (pad with empty values)
        while len(wrapped_descs) < len(steps):
            wrapped_descs.append('')
        while len(wrapped_tasks_lists) < len(steps):
            wrapped_tasks_lists.append([])

        plt.close(temp_fig)

        # Use per-step widths and heights so each card can size to its content
        widths_per_step = [min(max(w, self.card_min_width), self.max_card_width) for w in required_widths] if required_widths else [self.card_min_width] * len(steps)
        heights_per_step = [min(max(h, self.card_min_height), 40.0) for h in required_heights] if required_heights else [self.card_min_height] * len(steps)

        # compute column widths as the max width of cards in that column
        num_rows = (len(steps) + self.cols - 1) // self.cols
        col_widths = []
        for c in range(self.cols):
            col_items = widths_per_step[c::self.cols]
            col_w = max(col_items) if col_items else self.card_min_width
            col_widths.append(col_w)

        # Make all columns the same width to keep cards visually consistent
        if col_widths:
            uniform_w = max(col_widths)
            col_widths = [uniform_w for _ in range(self.cols)]

        # compute row heights as the max card height in each row
        row_heights = []
        for r in range(num_rows):
            start_idx = r * self.cols
            end_idx = min(start_idx + self.cols, len(heights_per_step))
            row_h = max(heights_per_step[start_idx:end_idx]) if start_idx < end_idx else self.card_min_height
            row_heights.append(row_h)

        fig_width = self.margin_x * 2 + sum(col_widths) + (self.cols - 1) * self.card_spacing_x
        fig_height = self.margin_y * 2 + sum(row_heights) + (num_rows - 1) * self.card_spacing_y + self.header_height

        fig, ax = plt.subplots(figsize=(fig_width, fig_height))
        ax.set_xlim(0, fig_width)
        ax.set_ylim(0, fig_height)
        ax.axis('off')
        fig.patch.set_facecolor(self.bg_color)
        ax.set_facecolor(self.bg_color)

        # Prepare renderer for accurate pixel measurements when drawing cards
        canvas = FigureCanvas(fig)
        canvas.draw()
        renderer = canvas.get_renderer()

        # Recompute wrapped title/description/tasks using the final card widths and the renderer
        final_wrapped_titles = []
        final_wrapped_title_heights = []
        final_wrapped_descs = []
        final_wrapped_desc_heights = []
        final_wrapped_tasks_lists = []
        final_wrapped_tasks_heights = []
        for idx, step in enumerate(steps):
            col = idx % self.cols
            card_w = col_widths[col]

            # Use the same padding rules as in _draw_card to compute available width
            pad_x = max(1.0, card_w * 0.09)
            circle_radius = max(0.18, (self.card_step_num_pt / 72.0) * 1.2)
            title_gap = max(1.0, pad_x * 0.7)
            right_pad_in = 0.3
            title_x_offset = pad_x + 2 * circle_radius + title_gap
            inner_title_w_in = max(0.5, card_w - title_x_offset - right_pad_in)
            max_px_title = max(10, int(inner_title_w_in * fig.dpi))

            # wrap title
            try:
                wrapped_title, wrapped_title_h = self._wrap_text_by_pixel(str(step.get('title', '')), max_px_title, self.card_title_pt, renderer, dpi=fig.dpi)
            except Exception:
                wrapped_title = step.get('title', '')
                wrapped_title_h = (self.card_title_pt / 72.0) * 1.1
            final_wrapped_titles.append(wrapped_title if wrapped_title else step.get('title', ''))
            final_wrapped_title_heights.append(wrapped_title_h)

            # description
            inner_text_w_in = inner_title_w_in
            max_px_desc = max(10, int(inner_text_w_in * fig.dpi))
            raw_desc = step.get('description', '') or ''
            try:
                wrapped_desc, desc_h = self._wrap_text_by_pixel(str(raw_desc), max_px_desc, self.card_desc_pt, renderer, dpi=fig.dpi)
            except Exception:
                # fallback to coarse wrap
                wrapped_desc = self._wrap_text(raw_desc, max_chars=max(10, int((card_w * fig.dpi) / 8)))
                # estimate height
                desc_h = (wrapped_desc.count('\n') + (1 if wrapped_desc else 0)) * ((self.card_desc_pt / 72.0) * 1.25)
            final_wrapped_descs.append(wrapped_desc if wrapped_desc else '')
            final_wrapped_desc_heights.append(desc_h)

            # tasks: wrap each task individually
            tasks = step.get('tasks', []) or []
            wrapped_tasks = []
            tasks_h_sum = 0.0
            for t in tasks[:6]:
                task_desc = t.get('description', '') if isinstance(t, dict) else str(t)
                if not task_desc:
                    continue
                try:
                    wrapped_task, task_h = self._wrap_text_by_pixel(str(task_desc), max_px_desc, self.card_task_pt, renderer, dpi=fig.dpi)
                except Exception:
                    wrapped_task = self._wrap_text(task_desc, max_chars=max(10, int((card_w * fig.dpi) / 10)))
                    # estimate height
                    task_h = (wrapped_task.count('\n') + (1 if wrapped_task else 0)) * ((self.card_task_pt / 72.0) * 1.25)
                combined = wrapped_task
                # include suggested tools lines measured with a smaller font
                if isinstance(t, dict):
                    suggested = t.get('suggested_tools', []) or []
                    if suggested:
                        tools_line = 'Ferramentas: ' + ', '.join(suggested)
                        try:
                            wrapped_tools, tools_h = self._wrap_text_by_pixel(str(tools_line), max_px_desc, max(10, int(self.card_tools_pt)), renderer, dpi=fig.dpi)
                        except Exception:
                            wrapped_tools = tools_line
                            tools_h = (wrapped_tools.count('\n') + (1 if wrapped_tools else 0)) * ((self.card_tools_pt / 72.0) * 1.25)
                        if wrapped_tools:
                            combined = combined + ('\n' if combined else '') + wrapped_tools
                            task_h = float(task_h) + float(tools_h)
                # add spacing after each task to match rendering
                task_h = float(task_h) + float(self.task_between_gap)
                wrapped_tasks.append(combined)
                tasks_h_sum += task_h
            final_wrapped_tasks_lists.append(wrapped_tasks)
            final_wrapped_tasks_heights.append(tasks_h_sum)

        # Now recompute per-card heights using the accurate wrapped heights so the figure layout won't clip text
        recomputed_heights = []
        for idx in range(len(steps)):
            col = idx % self.cols
            card_w = col_widths[col]
            pad_y = max(self.card_pad_y_min, self.card_min_height * 0.06)
            title_h = final_wrapped_title_heights[idx] if idx < len(final_wrapped_title_heights) else (self.card_title_pt / 72.0) * 1.1
            desc_h = final_wrapped_desc_heights[idx] if idx < len(final_wrapped_desc_heights) else 0.0
            tasks_h = final_wrapped_tasks_heights[idx] if idx < len(final_wrapped_tasks_heights) else 0.0
            # altura requerida: paddings + title + divider + desc + tasks + bottom padding
            req_h = pad_y + title_h + self.card_content_gap + desc_h + self.card_content_gap + tasks_h + pad_y
            # clamp height to reasonable bounds
            req_h = max(req_h, self.card_min_height)
            # allow taller cards for longer content
            req_h = min(req_h, 90.0)
            recomputed_heights.append(req_h)

        # Recompute row heights and figure size
        num_rows = (len(steps) + self.cols - 1) // self.cols
        row_heights = []
        for r in range(num_rows):
            start_idx = r * self.cols
            end_idx = min(start_idx + self.cols, len(recomputed_heights))
            row_h = max(recomputed_heights[start_idx:end_idx]) if start_idx < end_idx else self.card_min_height
            row_heights.append(row_h)

        fig_width = self.margin_x * 2 + sum(col_widths) + (self.cols - 1) * self.card_spacing_x
        fig_height = self.margin_y * 2 + sum(row_heights) + (num_rows - 1) * self.card_spacing_y + self.header_height

        # Recreate the figure with the corrected size and renderer before drawing
        plt.close(fig)
        fig, ax = plt.subplots(figsize=(fig_width, fig_height))
        ax.set_xlim(0, fig_width)
        ax.set_ylim(0, fig_height)
        ax.axis('off')
        fig.patch.set_facecolor(self.bg_color)
        ax.set_facecolor(self.bg_color)

        canvas = FigureCanvas(fig)
        canvas.draw()
        renderer = canvas.get_renderer()

        # recreate main title and subtitle on the new figure so we can compute subtitle bbox
        scaled_main_pt = max(self.main_title_pt, int(self.card_title_pt * 1.4))
        scaled_main_pt = min(scaled_main_pt, 96)
        title = ax.text(
            fig_width / 2, fig_height - 0.8,
            "ROADMAP DO PROJETO",
            ha='center', va='center',
            fontsize=scaled_main_pt, fontweight='bold',
            color=self.text_primary,
            zorder=5
        )
        title.set_path_effects([path_effects.withStroke(linewidth=1.5, foreground='#000000', alpha=0.85)])

        date_str = datetime.now().strftime("%d/%m/%Y")
        subtitle = ax.text(
            fig_width / 2, fig_height - 1.5,
            f"{len(steps)} Etapas • Gerado em {date_str}",
            ha='center', va='center',
            fontsize=22, color=self.text_secondary,
            zorder=2
        )

        # compute top position for the first card using subtitle bbox when possible
        try:
            bbox_pixels = subtitle.get_window_extent(renderer=renderer)
            bbox_data = ax.transData.inverted().transform_bbox(bbox_pixels)
            subtitle_bottom = bbox_data.y0
            top_gap = max(0.4, (bbox_data.y1 - bbox_data.y0) * 0.3)
            first_card_top = subtitle_bottom - top_gap
        except Exception:
            subtitle_y = fig_height - 2.5
            top_gap = max(0.6, self.margin_y * 0.3)
            first_card_top = subtitle_y - top_gap

        # precompute cumulative heights for rows to position cards vertically
        cumulative_before = [0]
        for h in row_heights[:-1]:
            cumulative_before.append(cumulative_before[-1] + h + self.card_spacing_y)

        # proceed to draw using final_wrapped_* lists and recomputed row_heights
        for idx, step in enumerate(steps):
            row = idx // self.cols
            col = idx % self.cols
            # x is margin plus widths of previous columns and spacing
            x = self.margin_x + sum(col_widths[:col]) + col * self.card_spacing_x
            # y bottom = first_card_top - cumulative_before[row] - row_heights[row]
            y = first_card_top - cumulative_before[row] - row_heights[row]
            color = self.step_colors[idx % len(self.step_colors)]
            title_wrapped = final_wrapped_titles[idx] if idx < len(final_wrapped_titles) else None
            title_h_in = final_wrapped_title_heights[idx] if idx < len(final_wrapped_title_heights) else None
            desc_wrapped = final_wrapped_descs[idx]
            tasks_wrapped = final_wrapped_tasks_lists[idx]
            card_h_this = row_heights[row]
            card_w_this = col_widths[col]
            self._draw_card(
                ax, x, y, card_w_this, card_h_this,
                color, idx + 1,
                step.get('title', f"Etapa {idx+1}"),
                title_wrapped,
                title_h_in,
                desc_wrapped,
                tasks_wrapped,
                renderer=renderer,
                dpi=fig.dpi,
                raw_desc=step.get('description', ''),
                raw_tasks=step.get('tasks', [])
            )

        # Rodapé moderno
        ax.text(
            fig_width / 2, self.margin_y / 2,
            "Gerado por IdeaHub • Design minimalista em tema escuro",
            ha='center', va='center',
            fontsize=32, color=self.text_muted, style='italic',  # Aumentado de 10 para 11
            zorder=5
        )

        buf = io.BytesIO()

        requested_dpi = 150
        env_max_pixels = os.environ.get('ROADMAP_MAX_PIXELS')
        if env_max_pixels:
            try:
                max_allowed_pixels = int(env_max_pixels)
            except Exception:
                max_allowed_pixels = Image.MAX_IMAGE_PIXELS or 178_956_970
        else:
            max_allowed_pixels = Image.MAX_IMAGE_PIXELS or 178_956_970

        try:
            if fig_width > 0 and fig_height > 0:
                max_dpi_from_pixels = int((max_allowed_pixels / (fig_width * fig_height)) ** 0.5)
            else:
                max_dpi_from_pixels = requested_dpi
        except Exception:
            max_dpi_from_pixels = requested_dpi

        dpi_to_save = min(requested_dpi, max_dpi_from_pixels, 300)

        fig.savefig(buf, format='png', dpi=dpi_to_save, bbox_inches='tight', pad_inches=0.1)
        plt.close(fig)
        buf.seek(0)
        return buf.read()
