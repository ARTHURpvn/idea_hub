import matplotlib
matplotlib.use('Agg')
from app.api.roadmap.roadmap_generator import RoadmapVisualGenerator
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
import matplotlib.pyplot as plt
from pathlib import Path

rg = RoadmapVisualGenerator()
cases = {
    'long_word': 'Título ' + ('A'*250) + ' END',
    'long_sentence': 'Descrição: ' + ('palavra ' * 80),
    'mixed': 'MIX ' + ('LongNoSpace_'*40) + ' normal words'
}
fig = plt.figure(figsize=(8,2), dpi=100)
canvas = FigureCanvas(fig)
canvas.draw()
renderer = canvas.get_renderer()

print('BEGIN_WRAP_TEST')
for name, text in cases.items():
    # simulate card width
    card_w = 12.0
    pad_x = max(1.0, card_w * 0.09)
    circle_radius = max(0.18, (rg.card_step_num_pt / 72.0) * 1.2)
    title_gap = max(1.0, pad_x * 0.7)
    right_pad_in = 0.3
    title_x_offset = pad_x + 2 * circle_radius + title_gap
    inner_title_w_in = max(0.5, card_w - title_x_offset - right_pad_in)
    max_px = max(10, int(inner_title_w_in * fig.dpi))
    wrapped, h = rg._wrap_text_by_pixel(text, max_px, rg.card_title_pt, renderer, dpi=fig.dpi)
    print(f'CASE:{name} LINES:{len(wrapped.split("\n"))} CHARS:{len(wrapped)} H_in:{h:.4f}')
    preview = wrapped.replace('\n','\\n')[:300]
    print('PREVIEW:', preview)

# generate one example image
print('\nGENERATING IMAGE...')
data = {'steps': [{'title': cases['mixed'], 'description': cases['long_sentence'], 'tasks': [{'description': 'Tarefa exemplo ' + ('x'*120)}]}]}
img = rg.generate_roadmap_image(data)
out = Path('/tmp/test_roadmap_wrap_test.png')
out.write_bytes(img)
print('IMAGE_WRITTEN', out, out.stat().st_size)
print('END_WRAP_TEST')

