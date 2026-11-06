"""Check the real full catalogue's photo mattes, CSS panels and every PDF page."""
import argparse,hashlib,json,pathlib,re,subprocess,sys,urllib.parse
from PIL import Image,ImageDraw
import pymupdf
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--release',required=True);parser.add_argument('--output',required=True)
args=parser.parse_args();release=pathlib.Path(args.release);work=pathlib.Path(args.output);work.mkdir(mode=0o700,exist_ok=True)
baseline=pathlib.Path('/var/tmp/ofissio-catalog-livecheck-20261106')
products=json.loads((baseline/'live-products.json').read_text())
sources=list(dict.fromkeys(s for p in products for s in [p['image'],*[v['image'] for v in p['variants']],*p['extraImages']] if s))
payload={'publicRoot':str(release/'public'),'products':products,'imageOrigins':list({urllib.parse.urlsplit(s).scheme+'://'+urllib.parse.urlsplit(s).netloc for s in sources if s.startswith('http')}),'options':{'format':'pdf','includeVariants':True,'showPrices':False}}
result=subprocess.run([sys.executable,str(release/'src/features/catalog-export/worker.py'),str(work)],input=json.dumps(payload),text=True,capture_output=True,timeout=300)
if result.returncode:raise RuntimeError(result.stderr)
summary=json.loads((work/'result.json').read_text());assert not summary['warnings']
expected=(217,226,238)
matte_checks=0
for source in json.loads((work/'source-images.json').read_text()):
    if not source['transparentPixels']:continue
    file=work/(hashlib.sha256(source['url'].encode()).hexdigest()[:24]+'.jpg')
    with Image.open(file) as image:
        points=[(0,0),(image.width-1,0),(0,image.height-1),(image.width-1,image.height-1)]
        checked=0
        for original,point in zip(source['corners'],points):
            if original[3]==0:
                assert max(abs(a-b) for a,b in zip(image.getpixel(point),expected))<=8,'Incorrect image matte: '+source['url']
                checked+=1
        if checked:matte_checks+=1
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True);page=browser.new_page()
    page.goto((work/'catalog.html').as_uri());page.evaluate('document.fonts.ready')
    panels=page.locator('.hero,.variant-photo,.photo-showcase').evaluate_all('(els)=>els.map(e=>({color:getComputedStyle(e).backgroundColor,classes:e.className}))')
    assert all(p['color']=='rgb(217, 226, 238)' for p in panels),panels
    browser.close()
before=pymupdf.open(baseline/'live-catalog.pdf');after=pymupdf.open(work/'catalog.pdf')
assert len(before)==len(after)==86
assert before.get_toc()==after.get_toc()
checked=[]
for i,(old,new) in enumerate(zip(before,after)):
    assert re.sub(r'\s+','',old.get_text())==re.sub(r'\s+','',new.get_text()),'Text changed on page '+str(i+1)
    assert old.rect==new.rect
    assert len(old.get_links())==len(new.get_links()),'Navigation changed'
    checked.append({'page':i+1,'images':len(new.get_images()),'textPreserved':True,'navigationPreserved':True})
for start in range(0,len(after),12):
    sheet=Image.new('RGB',(1680,960),'#bfc6d0');draw=ImageDraw.Draw(sheet)
    for offset,n in enumerate(range(start,min(start+12,len(after)))):
        pix=after[n].get_pixmap(matrix=pymupdf.Matrix(.49,.49),alpha=False)
        image=Image.frombytes('RGB',[pix.width,pix.height],pix.samples);x=(offset%4)*420;y=(offset//4)*320
        sheet.paste(image,(x,y+18));draw.text((x+8,y+3),'PAGE '+str(n+1),fill='#122162')
    sheet.save(work/('after-'+str(start+1).zfill(2)+'.jpg'),quality=91)
for n in [4,6,10,11,49,57,82]:after[n-1].get_pixmap(matrix=pymupdf.Matrix(1.3,1.3)).save(work/('detail-'+str(n)+'.png'))
proof={'ok':True,'pages':len(after),'products':len(products),'photoPanelsChecked':len(panels),'transparentPhotoMattesChecked':matte_checks,'uniqueImages':len(sources),'bytes':(work/'catalog.pdf').stat().st_size,'checks':['all-photo-panel-colors','transparent-photo-corners','all-page-text','all-page-navigation','same-pagination','no-missing-images'],'pagesChecked':checked}
(work/'photo-proof.json').write_text(json.dumps(proof,indent=2));print(json.dumps({k:v for k,v in proof.items() if k!='pagesChecked'}))
