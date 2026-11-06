"""Independent full-catalogue regression checks after continuation reflow."""
import argparse,collections,hashlib,html,json,pathlib,re,subprocess,sys,urllib.parse
import pymupdf
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw

parser=argparse.ArgumentParser();parser.add_argument('--release',required=True);parser.add_argument('--output',required=True)
args=parser.parse_args();release=pathlib.Path(args.release);out=pathlib.Path(args.output);out.mkdir(mode=0o700,exist_ok=True)
original=pathlib.Path('/var/tmp/ofissio-catalog-photo-v3')
products=json.loads(pathlib.Path('/var/tmp/ofissio-catalog-livecheck-20261106/live-products.json').read_text())
sources=[]
for p in products:sources.extend([p['image'],*p['extraImages'],*[v['image'] for v in p['variants']]])
origins=list({urllib.parse.urlsplit(url).scheme+'://'+urllib.parse.urlsplit(url).netloc for url in sources if url.startswith('http')})
payload={'publicRoot':str(release/'public'),'products':products,'imageOrigins':origins,'options':{'format':'pdf','includeVariants':True,'showPrices':False}}
run=subprocess.run([sys.executable,str(release/'src/features/catalog-export/worker.py'),str(out)],input=json.dumps(payload),text=True,capture_output=True,timeout=300)
if run.returncode:raise RuntimeError(run.stderr)
result=json.loads((out/'result.json').read_text());assert not result['warnings']
layout=result['continuations'];assert layout['descriptionAndImagesPreserved']
assert result['pages']==81 and len(layout['merged'])==5 and len(layout['balanced'])==15
assert {p['sourcePage'] for p in layout['merged']}=={35,46,62,65,68}
pdf=pymupdf.open(out/'catalog.pdf');before=pymupdf.open(original/'catalog.pdf')
assert len(pdf)==81
old_ranges={p['id']:p for p in json.loads((original/'result.json').read_text())['audit']}
new_ranges={p['id']:p for p in result['audit']}
assert set(new_ranges)=={p['id'] for p in products}
word_count=0
for p in products:
    interval=new_ranges[p['id']]
    text=''.join(re.sub(r'\s+','',pdf[n].get_text()).casefold() for n in range(interval['firstPage']-1,interval['lastPage']))
    words=re.findall(r'\w+',html.unescape(re.sub('<[^>]+>',' ',p['descriptionHtml'])))
    assert all(word.casefold() in text for word in words),'Description lost: '+p['sku']
    word_count+=len(words)
def photo_counts(doc,first,last):
    result=collections.Counter()
    logos={image[0] for image in doc[1].get_images()}
    for page in list(doc)[first-1:last]:
        # Logo is the first image, shared on every page; count actual product
        # image placements by excluding that repeated image's xref.
        for image in page.get_image_info(xrefs=True):
            if image['xref'] and image['xref'] not in logos:result[hashlib.sha256(doc.extract_image(image['xref'])['image']).hexdigest()]+=1
    return result
for p in products:
    old,new=old_ranges[p['id']],new_ranges[p['id']]
    assert photo_counts(before,old['firstPage'],old['lastPage'])==photo_counts(pdf,new['firstPage'],new['lastPage']),'Product photos changed: '+p['sku']
assert len([r for r in pdf.get_toc() if r[0]==2])==len(products)
for category in result['categories']:
    assert any(link.get('page')==category['page']-1 for link in pdf[1].get_links()),'Wrong category destination'
assert all(any(link.get('page')==1 for link in page.get_links()) for page in list(pdf)[2:])
assert all(font[2]!='Type3' for page in pdf for font in page.get_fonts())
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True);page=browser.new_page()
    page.goto((out/'catalog.html').as_uri());page.evaluate('document.fonts.ready')
    empty=page.locator('.text-only .description').evaluate_all('''els=>els.filter(d=>{
      const b=d.getBoundingClientRect(),w=document.createTreeWalker(d,NodeFilter.SHOW_TEXT);let n,right=0;
      while(n=w.nextNode()){if(!n.textContent.trim())continue;const r=document.createRange();r.selectNodeContents(n);for(const x of r.getClientRects())if(x.left>=b.left+b.width/2)right++;}return right===0;
    }).length''')
    assert empty==0,'Empty right column remains'
    colors=page.locator('.hero,.variant-photo,.photo-showcase').evaluate_all('els=>els.map(e=>getComputedStyle(e).backgroundColor)')
    assert all(color=='rgb(217, 226, 238)' for color in colors)
    browser.close()
for start in range(0,len(pdf),12):
    sheet=Image.new('RGB',(1680,960),'#bfc6d0');draw=ImageDraw.Draw(sheet)
    for offset,n in enumerate(range(start,min(start+12,len(pdf)))):
        pix=pdf[n].get_pixmap(matrix=pymupdf.Matrix(.49,.49),alpha=False);image=Image.frombytes('RGB',[pix.width,pix.height],pix.samples);x=(offset%4)*420;y=(offset//4)*320
        sheet.paste(image,(x,y+18));draw.text((x+8,y+3),'PAGE '+str(n+1),fill='#122162')
    sheet.save(out/('review-'+str(start+1).zfill(2)+'.jpg'),quality=90)
proof={'ok':True,'pages':81,'products':len(products),'variants':sum(len(p['variants']) for p in products),'mergedPages':len(layout['merged']),'balancedPages':len(layout['balanced']),'descriptionWordsChecked':word_count,'emptyRightColumns':empty,'productImagesPreserved':True,'checks':['all-product-text','all-product-photo-placements','five-short-pages-merged','fifteen-balanced-pages','category-targets','product-bookmarks','back-links','photo-backgrounds','static-fonts']}
(out/'continuation-proof.json').write_text(json.dumps(proof,indent=2));print(json.dumps(proof))
