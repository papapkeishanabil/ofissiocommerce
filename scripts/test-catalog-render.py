"""Integration test against the real isolated Chromium/PDF worker; no commerce requests."""
import json, os, subprocess, sys, tempfile
from pathlib import Path
if '--dependency-dir' in sys.argv:
    paths = [sys.argv[i+1] for i,v in enumerate(sys.argv) if v == '--dependency-dir']
    sys.path[:0] = paths
    os.environ['PYTHONPATH'] = os.pathsep.join(paths + [os.environ.get('PYTHONPATH', '')])
import pymupdf

root = Path(__file__).resolve().parents[1]
work = Path(tempfile.mkdtemp(prefix='ofissio-catalog-check-'))
image = '/products/kk-006/KK-006-front-nobg.webp'
variant = dict(color='Navy', colorHex='#192658', sleeve='Pendek', label='', sku='KK-001LPD-S', skuSize='S', sizes=['S','M','L'], image=image, price=125000)
product = dict(id=1, name='Kemeja KK-001', sku='KK-001', category='Kemeja', descriptionHtml='<p>'+' '.join('Informasi%04d' % n for n in range(950))+'</p>', material='American Drill', image=image, extraImages=[], variants=[variant])
second = dict(product, id=2, name=product['name'], sku='JK-001', category='Jaket', descriptionHtml='<p>Penutup deskripsi lengkap.</p>', variants=[dict(variant, color='Warna '+str(n), sku='JK-'+str(n)) for n in range(9)])
payload = dict(publicRoot=str(root/'public'), imageOrigins=[], products=[product,second], options=dict(includeVariants=True,showPrices=False,format='pdf'))
def render():
    result=subprocess.run([sys.executable,str(root/'src/features/catalog-export/worker.py'),str(work)],input=json.dumps(payload),text=True,capture_output=True,timeout=300)
    if result.returncode:raise RuntimeError(result.stderr)
    return json.loads((work/'result.json').read_text(encoding='utf-8'))
result=render()
pdf=pymupdf.open(work/'catalog.pdf')
text=' '.join(page.get_text() for page in pdf)
assert all('Informasi%04d' % n in text for n in range(950)), 'Description lost words'
assert 'Rp 125.000' not in text
assert result['audit'][0]['lastPage']>result['audit'][0]['firstPage']
assert result['audit'][0]['lastPage']<result['audit'][1]['firstPage'], 'Same-name products merged'
assert result['continuations']['descriptionAndImagesPreserved']
assert len(pdf[1].get_links())>=2
assert len(pdf.get_toc())>=6
assert all(any(link.get('page')==1 for link in page.get_links()) for page in list(pdf)[2:])
assert all(font[2]!='Type3' for page in pdf for font in page.get_fonts())
assert not result['warnings'], result['warnings']
pdf[2].get_pixmap(matrix=pymupdf.Matrix(1.3,1.3)).save(work/'product-page.png')
pdf.close()
payload['options'].update(format='preview',showPrices=True)
render()
html=(work/'preview.html').read_text(encoding='utf-8')
assert 'file:///' not in html
assert 'Rp 125.000' in html
assert 'data:font/ttf;base64,' in html
assert 'data-product-id="1"' in html and 'data-product-id="2"' in html
print(json.dumps(dict(ok=True,pages=result['pages'],output=str(work),checks=['full-description','nine-variants','category-links','back-links','static-fonts','private-preview','prices'])))
