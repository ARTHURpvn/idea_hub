from pathlib import Path
p = Path(__file__).parent / 'test_write_out.txt'
p.write_text('write-test OK\n', encoding='utf-8')
print('WROTE', p)

