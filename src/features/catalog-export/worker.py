"""Isolated catalogue renderer. Input: trusted server JSON on stdin; no browser network."""
import sys,json,re,os,io,base64,hashlib,tempfile,urllib.request,urllib.parse,concurrent.futures
from pathlib import Path
from html import escape as esc,unescape
from html.parser import HTMLParser
from PIL import Image
from playwright.sync_api import sync_playwright
import pymupdf
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

Image.MAX_IMAGE_PIXELS=30_000_000
# The JPEG matte and every CSS photo panel must share one color. Product
# pixels remain untouched; only transparent pixels receive this backdrop.
PHOTO_BACKGROUND='#d9e2ee'
class DescriptionParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.blocks=[];self.kind='paragraph';self.buffer=[];self.in_li=False
    def flush(self):
        text=re.sub(r'\s+',' ',''.join(self.buffer)).strip()
        if text:self.blocks.append((self.kind,text))
        self.buffer=[]
    def handle_starttag(self,tag,attrs):
        if tag=='li':self.flush();self.kind='list-item';self.in_li=True
        elif tag in ['h1','h2','h3','h4']:self.flush();self.kind='heading'
        elif tag=='p' and not self.in_li:self.flush();self.kind='paragraph'
        elif tag=='br':self.buffer.append(' ')
    def handle_endtag(self,tag):
        if tag=='li':self.flush();self.in_li=False;self.kind='paragraph'
        elif tag in ['h1','h2','h3','h4'] or (tag=='p' and not self.in_li):self.flush();self.kind='paragraph'
    def handle_data(self,data):self.buffer.append(data)

def format_tokens(tokens):
    groups=[]
    for block,kind,word in tokens:
        if not groups or groups[-1][0]!=block:groups.append([block,kind,[]])
        groups[-1][2].append(word)
    return ''.join(('<h3>'+esc(' '.join(words))+'</h3>') if kind=='heading' else '<p'+(' class="bullet"' if kind=='list-item' else '')+'>'+esc(' '.join(words))+'</p>' for _,kind,words in groups)

def main():
    payload=json.load(sys.stdin);work=Path(sys.argv[1]).resolve();work.mkdir(exist_ok=True)
    root=Path(payload['publicRoot']).resolve();options=payload['options'];products=payload['products'];warnings=[]
    assert 0<len(products)<=200
    font_source=root/'fonts/inter-latin-var.woff2';digest=hashlib.sha256(font_source.read_bytes()).hexdigest()[:16]
    cache=Path(tempfile.gettempdir())/('ofissio-catalog-fonts-'+digest);cache.mkdir(exist_ok=True)
    font_files={}
    for weight,style in [(400,'Regular'),(500,'Medium'),(600,'SemiBold'),(700,'Bold')]:
        target=cache/f'inter-{weight}.ttf'
        if not target.exists():
            font=instantiateVariableFont(TTFont(font_source),{'wght':weight},inplace=True);font.flavor=None
            for nid,value in [(1,'Ofissio Inter'),(2,style),(4,'Ofissio Inter '+style),(6,'OfissioInter-'+style),(16,'Ofissio Inter'),(17,style)]:font['name'].setName(value,nid,3,1,0x409)
            temporary=cache/f'{weight}-{os.getpid()}.ttf';font.save(temporary);os.replace(temporary,target)
        font_files[weight]=target
    allowed_origins=set(payload.get('imageOrigins',[]))
    def remote_target(source):
        if source.startswith('/api/media/wordpress/') and allowed_origins:source=sorted(allowed_origins)[0]+source[len('/api/media/wordpress'):]
        url=urllib.parse.urlsplit(source)
        origin=f'{url.scheme}://{url.netloc}'
        path=urllib.parse.unquote(url.path)
        if origin not in allowed_origins or url.scheme not in ['http','https'] or url.username or url.password or not path.startswith('/wp-content/uploads/') or '..' in path.split('/') or '\\' in path or '\x00' in path:raise ValueError('Unapproved product media URL')
        if Path(path).suffix.lower() not in ['.jpg','.jpeg','.png','.webp']:raise ValueError('Unapproved image type')
        return urllib.parse.urlunsplit((url.scheme,url.netloc,url.path,'',''))
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,*args):return None
    def image_bytes(source):
        if source.startswith('/products/'):
            path=(root/source.lstrip('/')).resolve()
            if not path.is_relative_to(root/'products') or path.stat().st_size>10*1024*1024:raise ValueError('Unapproved local image')
            return path.read_bytes()
        url=remote_target(source)
        with urllib.request.build_opener(NoRedirect).open(urllib.request.Request(url,headers={'User-Agent':'Ofissio-Catalog/1.0'}),timeout=20) as response:
            if int(response.headers.get('Content-Length','0'))>10*1024*1024:raise ValueError('Image exceeds size limit')
            data=response.read(10*1024*1024+1)
            if len(data)>10*1024*1024:raise ValueError('Image exceeds size limit')
            return data
    sources=list(dict.fromkeys(s for p in products for s in [p['image'],*[v['image'] for v in p['variants']],*p['extraImages']] if s))
    if len(sources)>2000:raise ValueError('Too many catalogue images')
    placeholder=work/'image-unavailable.svg';placeholder.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#edf0f4"/><text x="300" y="300" text-anchor="middle" font-family="Arial" font-size="22" fill="#62718b">Foto belum tersedia</text></svg>')
    def prepare(source):
        try:
            with Image.open(io.BytesIO(image_bytes(source))) as im:
                im.load();im.thumbnail((1600,1600));im=im.convert('RGBA')
                bg=Image.new('RGB',im.size,PHOTO_BACKGROUND);bg.paste(im,mask=im.getchannel('A'))
                target=work/(hashlib.sha256(source.encode()).hexdigest()[:24]+'.jpg');bg.save(target,quality=86,optimize=True)
                # Duplicate detection must not change when the presentation matte
                # changes; otherwise a distinct back view may be omitted.
                reference=Image.new('RGB',im.size,'#f0f3f7');reference.paste(im,mask=im.getchannel('A'))
                small=list(reference.convert('L').resize((9,8)).getdata());fingerprint=sum((small[y*9+x]>small[y*9+x+1])<<(y*8+x) for y in range(8) for x in range(8))
            return source,(target,fingerprint)
        except Exception:
            warnings.append('Sebagian foto produk tidak dapat dimuat; placeholder digunakan.');return source,(placeholder,None)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:images=dict(pool.map(prepare,sources))
    def img(source):return images.get(source,(placeholder,None))[0].as_uri()
    css=(Path(__file__).with_name('catalog-print.css')).read_text(encoding='utf-8')
    for weight,path in font_files.items():css=css.replace('__FONT_'+str(weight)+'__',path.as_uri())
    css+=':root{--catalog-photo-background:'+PHOTO_BACKGROUND+'}.primary .hero,.variant-photo,.photo-showcase,.variant-grid.single .variant-photo{background:var(--catalog-photo-background)}'
    css+='''.description .bullet{padding-left:3mm;position:relative;margin-bottom:1.5mm}.description .bullet:before{content:'•';position:absolute;left:0;color:#7a6428}.cover-page{padding:0}.cover-page:before,.cover-page:after{display:none}.catalog-cover{padding:0}.catalog-cover:before,.catalog-cover:after{display:none}.cover-heading{position:absolute;top:31mm;left:12mm;right:12mm;display:flex;justify-content:space-between;align-items:flex-end}.cover-heading h1{font-size:45px;line-height:1.05;letter-spacing:-1px;margin:3mm 0 0;font-weight:700}.cover-heading small{font-size:9px;letter-spacing:1.5px}.cover-heading p{font-size:11px;line-height:1.7;width:90mm;padding-left:5mm}.cover-photo{position:absolute;left:0;top:78mm;height:115mm;width:100%;object-fit:cover;object-position:center top;border-top:1mm solid #e8a92a}.catalog-cover .mast{position:absolute;left:12mm;right:12mm;top:10mm}.catalog-cover .cover-footer{position:absolute;left:0;right:0;bottom:0;height:17mm;background:#122162;color:white;display:flex;align-items:center;justify-content:space-between;padding:0 12mm;font-size:9px;border-top:.5mm solid #e8a92a}.price{font-size:9px!important;color:#122162!important;font-weight:600}.toolbar a{color:#122162}.product-sku{overflow-wrap:anywhere}.catalog-cover .mast{margin:0;padding:0;background:none}.catalog-cover .mast .logo{filter:none}.catalog-cover .mast .slogan{color:#122162}'''
    def logo():return (root/'brand/ofissio.png').as_uri()
    def mast():return '<header class="mast"><img class="logo" src="'+logo()+'" alt="Ofissio"><span class="slogan">Seragam Kerja Lebih Mudah</span></header>'
    def footer(n,category):return f'<footer class="foot"><b>OFISSIO</b><span>{esc(category)}</span><span class="page-no">{n:02}</span></footer>'
    def swatch(v):
        value=v.get('colorHex') or ''
        return '<i class="swatch" style="background:'+value+'"></i>' if re.fullmatch(r'#[0-9a-fA-F]{6}',value) else '<i class="swatch unknown"></i>'
    def facts(p):
        colors={v['color']:v for v in p['variants']};sleeves=list(dict.fromkeys(v['sleeve'] for v in p['variants'] if v['sleeve']));sizes=list(dict.fromkeys(s for v in p['variants'] for s in v['sizes']))
        entries=[('Material',esc(p['material'])),('Warna','<div class="colors">'+''.join('<span class="choice">'+swatch(v)+esc(c)+'</span>' for c,v in colors.items())+'</div>')]
        if sleeves:entries.append(('Lengan',esc(' / '.join(sleeves))))
        entries.append(('Ukuran',esc(' / '.join(sizes))))
        return '<dl class="facts">'+''.join('<dt>'+k+'</dt><dd>'+value+'</dd>' for k,value in entries)+'</dl>'
    def money(value):return 'Rp '+f'{value:,.0f}'.replace(',','.')
    def card(v):
        price='<p class="price">Mulai '+money(v['price'])+'</p>' if options['showPrices'] and v.get('price') else ''
        return '<article class="variant"><div class="variant-photo"><img src="'+img(v['image'])+'" alt="'+esc(v['color'])+'"></div><div class="variant-copy"><h3>'+swatch(v)+esc(v['color'])+'</h3><p>'+esc(('Lengan '+v['sleeve'].lower()) if v['sleeve'] else v['label'] or 'Pilihan produk')+'</p><p class="sku">'+esc(v['sku'])+'</p><p>'+esc(('SKU ukuran '+v['skuSize']) if v['skuSize'] else 'SKU produk')+'</p><p class="size">'+esc(' / '.join(v['sizes']))+'</p>'+price+'</div></article>'
    def template(p,batch,n,part,extra,text_only):
        left='<h1 class="name">'+esc(p['name'])+'</h1><div class="product-sku">SKU produk · '+esc(p['sku'])+'</div>'
        if part==1:left+='<div class="hero"><img src="'+img(p['image'])+'" alt="'+esc(p['name'])+'"></div>'+facts(p)
        left+='<div class="copy-label">Deskripsi produk'+(f'<small>Lanjutan {part}</small>' if part>1 else '')+'</div><div class="description"></div><div class="reading-note"></div>'
        right=''
        if batch:
            count=len(batch);kind='single large' if count==1 else 'large' if count<=2 else 'medium' if count<=4 else ''
            right='<div class="right-heading"><h2>'+('Pilihan warna & lengan' if options['includeVariants'] and len(p['variants'])>1 else 'Detail produk')+'</h2><span class="counter">'+str(len(p['variants']) if options['includeVariants'] else 1)+' pilihan</span></div><div class="variant-grid '+kind+'">'+''.join(card(v) for v in batch)+'</div>'
        elif extra:right='<div class="right-heading"><h2>Foto tambahan produk</h2></div><div class="photo-showcase"><img src="'+img(extra)+'" alt="Foto tambahan '+esc(p['name'])+'"></div>'
        return '<section class="page product-page'+(' continuation' if part>1 else '')+(' text-only' if text_only else '')+'" data-product-id="'+str(p['id'])+'" id="p'+str(n)+'">'+mast()+'<div class="layout"><section class="primary">'+left+'</section>'+('<section class="right">'+right+'</section>' if right else '')+'</div>'+footer(n,p['category'])+'</section>'
    def document(body):return '<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ofissio — Katalog Produk</title><style>'+css+'</style>'+body+'</html>'
    groups={}
    for p in products:groups.setdefault(p['category'],[]).append(p)
    pages=[];toc=[];audit=[];n=3
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True)
        context=browser.new_context(viewport={'width':1400,'height':1100})
        allowed_roots=[root,work,cache]
        def guard(route):
            url=urllib.parse.urlsplit(route.request.url)
            if url.scheme=='data':route.continue_();return
            if url.scheme=='file':
                path=Path(urllib.request.url2pathname(url.path)).resolve()
                if any(path.is_relative_to(folder) for folder in allowed_roots):route.continue_();return
            route.abort()
        context.route('**/*',guard)
        tab=context.new_page()
        for category,items in groups.items():
            toc.append((category,len(items),n))
            for p in items:
                parser=DescriptionParser();parser.feed(p['descriptionHtml']);parser.flush()
                tokens=[(i,kind,word) for i,(kind,text) in enumerate(parser.blocks) for word in text.split()]
                if not tokens:tokens=[(0,'paragraph','Deskripsi produk belum tersedia.')]
                pos=0;variant_pos=0;extra_pos=0;part=0;start=n;consumed=[]
                displayed=p['variants'] if options['includeVariants'] else p['variants'][:1]
                references=[images[s][1] for s in [p['image'],*[v['image'] for v in displayed]] if s in images and images[s][1] is not None]
                extras=[]
                for source in p['extraImages']:
                    fingerprint=images.get(source,(None,None))[1]
                    if fingerprint is not None and not any((fingerprint^old).bit_count()<=2 for old in references):extras.append(source);references.append(fingerprint)
                while pos<len(tokens) or variant_pos<len(displayed):
                    part+=1
                    if part>30 or n>800:raise ValueError('Catalogue exceeds page limit')
                    batch=displayed[variant_pos:variant_pos+8];extra=extras[extra_pos] if not batch and extra_pos<len(extras) else None
                    if extra:extra_pos+=1
                    page_html=template(p,batch,n,part,extra,part>1 and not batch and not extra)
                    measure=work/'measure.html';measure.write_text(document(page_html),encoding='utf-8')
                    tab.goto(measure.as_uri());tab.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');tab.evaluate('document.fonts.ready')
                    if tab.locator('.description').evaluate('(e)=>e.clientHeight')<25:raise ValueError('Product summary does not fit page')
                    lo=0;hi=len(tokens)-pos
                    while lo<hi:
                        mid=(lo+hi+1)//2
                        fit=tab.locator('.description').evaluate('(e,s)=>{e.innerHTML=s;return e.scrollHeight<=e.clientHeight+1&&e.scrollWidth<=e.clientWidth+1}',format_tokens(tokens[pos:pos+mid]))
                        if fit:lo=mid
                        else:hi=mid-1
                    take=lo
                    if take==0 and pos<len(tokens):raise ValueError('Description cannot fit readable text')
                    if take<len(tokens)-pos:
                        candidates=[i for i in range(take,max(0,int(take*.7)),-1) if tokens[pos+i-1][0]!=tokens[pos+i][0] and tokens[pos+i-1][1]!='heading']
                        if candidates:take=candidates[0]
                        elif take and tokens[pos+take-1][1]=='heading':
                            block=tokens[pos+take-1][0]
                            while take and tokens[pos+take-1][0]==block:take-=1
                    if take==0 and pos<len(tokens):raise ValueError('Description heading cannot fit')
                    chunk=tokens[pos:pos+take];consumed.extend(chunk);pos+=take;variant_pos+=len(batch)
                    page_html=page_html.replace('<div class="description"></div>','<div class="description">'+format_tokens(chunk)+'</div>').replace('<div class="reading-note"></div>','<div class="reading-note">'+('Deskripsi berlanjut pada halaman berikutnya.' if pos<len(tokens) else '')+'</div>')
                    pages.append(page_html);n+=1
                if consumed!=tokens:raise ValueError('Description pagination lost content')
                audit.append({'id':p['id'],'name':p['name'],'firstPage':start,'lastPage':n-1,'descriptionWords':len(tokens)})
        cover='<section class="page catalog-cover">'+mast()+'<div class="cover-heading"><div><small>OFISSIO / SIGNATURE COLLECTION</small><h1>KATALOG<br>SERAGAM KERJA</h1></div><p><b>Selamat datang di Ofissio.</b><br>Pilihan seragam yang mencerminkan karakter dan profesionalisme tim Anda.</p></div><img class="cover-photo" src="'+(root/'about-us/store-interior-selected.png').as_uri()+'" alt="Showroom Ofissio"><div class="cover-footer"><b>OFISSIO</b><span>KOLEKSI SERAGAM KERJA</span></div></section>'
        toc_html='<section class="page toc">'+mast()+'<div class="toc-layout"><div><h1>Seragam untuk<br>setiap peran.</h1><p>Selamat datang di Ofissio.<br>Pilihan seragam yang mencerminkan karakter dan profesionalisme tim Anda.</p><small>Klik kategori untuk menuju halaman yang dituju.<br>Deskripsi lengkap berlanjut bila diperlukan. SKU varian mengikuti ukuran yang disebutkan. Warna digital dapat berbeda dari kain asli.</small></div><nav>'+''.join(f'<a class="toc-link" href="#p{page}"><span>{esc(cat)}<small>{count} model</small></span><b>{page:02}</b></a>' for cat,count,page in toc)+'</nav></div>'+footer(2,'Daftar isi')+'</section>'
        html=document(cover+toc_html+''.join(pages));html_path=work/'catalog.html';html_path.write_text(html,encoding='utf-8')
        tab.goto(html_path.as_uri());tab.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)',timeout=120000);tab.evaluate('document.fonts.ready')
        # Initial pagination is measured using the original photo layout, then
        # the approved continuation rules reflow and verify complete products.
        tab.add_style_tag(content=Path(__file__).with_name('catalog-continuations.css').read_text(encoding='utf-8'))
        layout=tab.evaluate(Path(__file__).with_name('catalog-continuations.js').read_text(encoding='utf-8'),products)
        ranges={entry['id']:entry for entry in layout['ranges']}
        for entry in audit:entry.update({key:ranges[entry['id']][key] for key in ['firstPage','lastPage']})
        toc=[(category,len(items),ranges[items[0]['id']]['firstPage']) for category,items in groups.items()]
        n=layout['totalPages']+1
        html=tab.content();html_path.write_text(html,encoding='utf-8')
        tab.emulate_media(media='print')
        issues=tab.locator('.description,.primary,.right,.variant,.text-column').evaluate_all('(els)=>els.filter(e=>e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2).length')
        if issues:raise ValueError('Catalogue layout overflow')
        if options['format']=='pdf':tab.pdf(path=str(work/'catalog.pdf'),print_background=True,prefer_css_page_size=True)
        browser.close()
    if options['format']=='pdf':
        pdf=pymupdf.open(work/'catalog.pdf')
        if len(pdf)!=layout['totalPages']:raise ValueError('Unexpected PDF pagination')
        table=pdf[1]
        for cat,_,page in toc:
            hits=table.search_for(cat,clip=pymupdf.Rect(table.rect.width/2,70,table.rect.width,530))
            if len(hits)!=1:raise ValueError('Category link location missing')
            box=hits[0];table.insert_link({'kind':pymupdf.LINK_GOTO,'from':pymupdf.Rect(box.x0-4,box.y0-8,table.rect.width-25,box.y1+24),'page':page-1,'to':pymupdf.Point(0,0)})
        outline=[[1,'Cover',1],[1,'Daftar isi',2]]
        for i,(cat,_,page) in enumerate(toc):
            end=toc[i+1][2] if i+1<len(toc) else len(pdf)+1;outline.append([1,cat,page]);outline.extend([2,a['name'],a['firstPage']] for a in audit if page<=a['firstPage']<end)
        pdf.set_toc(outline,collapse=1)
        for i in range(2,len(pdf)):
            page=pdf[i];page.insert_font(fontname='OfissioNav',fontfile=str(font_files[500]));area=pymupdf.Rect(page.rect.width-178,page.rect.height-31,page.rect.width-94,page.rect.height-12)
            page.insert_text(pymupdf.Point(area.x0+6,page.rect.height-21),'Daftar isi',fontname='OfissioNav',fontsize=7.5,color=(.34,.41,.53));page.insert_link({'kind':pymupdf.LINK_GOTO,'from':area,'page':1,'to':pymupdf.Point(0,0)})
        pdf.saveIncr();pdf.close()
        pdf=pymupdf.open(work/'catalog.pdf')
        for _,_,page in toc:
            if not any(link.get('page')==page-1 for link in pdf[1].get_links()):raise ValueError('Category navigation failed verification')
        pdf.close()
    else:
        # A self-contained preview: no credentials, temporary paths or remote requests.
        def inline(match):
            uri=match.group(0);path=Path(urllib.request.url2pathname(urllib.parse.urlsplit(uri).path)).resolve()
            if not any(path.is_relative_to(folder) for folder in [root,work,cache]):raise ValueError('Unexpected preview asset')
            mime='font/ttf' if path.suffix=='.ttf' else 'image/png' if path.suffix=='.png' else 'image/svg+xml' if path.suffix=='.svg' else 'image/jpeg'
            return 'data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode()
        html=re.sub(r'file:///[^"\)\s]+',inline,html)
        (work/'preview.html').write_text(html,encoding='utf-8')
    result={'pages':n-1,'products':len(products),'warnings':sorted(set(warnings)),'audit':audit,'categories':[{'name':cat,'page':page} for cat,_,page in toc],'continuations':layout}
    (work/'result.json').write_text(json.dumps(result,ensure_ascii=False),encoding='utf-8')
    print(json.dumps({'ok':True,'pages':n-1,'products':len(products),'warnings':sorted(set(warnings))}))

if __name__=='__main__':
    try:main()
    except Exception:
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
