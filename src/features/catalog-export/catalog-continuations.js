/* global document, DOMParser */
(products) => {
  const model = new Map(products.map(p => [String(p.id),p]));
  const pagesFor = id => [...document.querySelectorAll('.product-page')].filter(p => p.dataset.productId===id);
  const description = page => page.querySelector('.description');
  const fits = page => {
    const d=description(page),primary=page.querySelector('.primary');
    return d.scrollHeight<=d.clientHeight+1 && d.scrollWidth<=d.clientWidth+1 && primary.scrollHeight<=primary.clientHeight+1;
  };
  const capture = () => [...model.keys()].map(id => ({id,
    text:pagesFor(id).map(p=>description(p).textContent.replace(/\s+/g,'')).join(''),
    images:pagesFor(id).flatMap(p=>[...p.querySelectorAll('.hero img,.variant-photo img,.photo-showcase img')].map(i=>[i.getAttribute('src'),i.getAttribute('alt')]))
  }));
  const before=capture(),merged=[],balanced=[];
  for(const p of document.querySelectorAll('.product-page'))p.dataset.sourcePage=String(Number(p.querySelector('.page-no').textContent));
  for(const p of [...document.querySelectorAll('.text-only')]){
    const d=description(p),words=d.textContent.trim().split(/\s+/).length;
    if(words>60)continue;
    const prev=p.previousElementSibling;
    if(!prev?.classList.contains('product-page') || prev.dataset.productId!==p.dataset.productId)continue;
    const target=description(prev),original=target.innerHTML,savedClass=prev.className,savedStyle=prev.getAttribute('style');
    const textPrevious=prev.classList.contains('text-only');
    prev.classList.add(textPrevious?'continuation-tight':'continuation-compact');target.innerHTML+=d.innerHTML;
    if(!textPrevious && !fits(prev))prev.style.setProperty('--continuation-copy-width','140mm');
    let success=fits(prev),redistributed=false;
    if(!success && !textPrevious){
      const group=pagesFor(p.dataset.productId);
      // Reflow only an adjacent pair, so no intermediate page is skipped.
      const first=prev.previousElementSibling;
      if(group.includes(first) && first!==p && first.dataset.productId===p.dataset.productId){
        const fd=description(first),saved=fd.innerHTML,firstClass=first.className;
        const nodes=[...fd.children,...new DOMParser().parseFromString(original,'text/html').body.children,...d.children].map(e=>e.outerHTML);
        first.classList.add(first.classList.contains('text-only')?'continuation-tight':'continuation-compact');let take=0;
        for(let i=1;i<nodes.length;i++){
          fd.innerHTML=nodes.slice(0,i).join('');
          if(fd.lastElementChild?.tagName==='H3')continue;
          if(fits(first))take=i;else break;
        }
        if(take){fd.innerHTML=nodes.slice(0,take).join('');target.innerHTML=nodes.slice(take).join('');success=fits(first)&&fits(prev);redistributed=success;}
        if(!success){fd.innerHTML=saved;first.className=firstClass;}
      }
    }
    if(success){
      merged.push({productId:p.dataset.productId,sourcePage:Number(p.dataset.sourcePage),intoSourcePage:Number(prev.dataset.sourcePage),words,redistributed});p.remove();
    }else{
      target.innerHTML=original;prev.className=savedClass;
      if(savedStyle===null)prev.removeAttribute('style');else prev.setAttribute('style',savedStyle);
    }
  }
  for(const p of document.querySelectorAll('.text-only')){
    const product=model.get(p.dataset.productId),d=description(p);
    const strip=document.createElement('div');strip.className='spec-strip';
    const sleeves=[...new Set(product.variants.map(v=>v.sleeve).filter(Boolean))].join(' / ');
    const sizes=[...new Set(product.variants.flatMap(v=>v.sizes))].join(' / ');
    for(const [label,value] of [['Material',product.material],['Lengan',sleeves],['Ukuran',sizes]]){
      const cell=document.createElement('div'),title=document.createElement('small');title.textContent=label;cell.append(title,document.createTextNode(value||'—'));strip.append(cell);
    }
    p.querySelector('.primary').append(strip);
    const original=d.innerHTML,nodes=[...d.children].map(e=>({html:e.outerHTML,tag:e.tagName}));
    const left=document.createElement('div'),right=document.createElement('div');left.className=right.className='text-column';d.replaceChildren(left,right);
    let best=null;
    for(let density=0;density<2&&!best;density++){
      if(density)p.classList.add('continuation-dense');
      for(let split=1;split<nodes.length;split++){
        if(nodes[split-1].tag==='H3')continue;
        left.innerHTML=nodes.slice(0,split).map(n=>n.html).join('');right.innerHTML=nodes.slice(split).map(n=>n.html).join('');
        const a=left.getBoundingClientRect().height,b=right.getBoundingClientRect().height;
        const score=Math.abs(a-b)+(nodes[split].tag==='H3'?0:24);
        if(Math.max(a,b)<=d.clientHeight+1&&(!best||score<best.score))best={split,score,leftHeight:a,rightHeight:b};
      }
    }
    if(best){
      left.innerHTML=nodes.slice(0,best.split).map(n=>n.html).join('');right.innerHTML=nodes.slice(best.split).map(n=>n.html).join('');
    }else{
      // Very long single paragraphs still flow naturally across two columns.
      // Original pagination was measured at this same readable geometry.
      p.classList.add('continuation-native');d.innerHTML=original;
    }
    if(!fits(p))throw new Error('Continuation text cannot fit');
    balanced.push({productId:p.dataset.productId,sourcePage:Number(p.dataset.sourcePage),native:!best,...best});
  }
  if(JSON.stringify(before)!==JSON.stringify(capture()))throw new Error('Continuation reflow changed product text or photos');
  const all=[...document.querySelectorAll('.page')],ranges=[];
  for(const id of model.keys()){
    const group=pagesFor(id);if(!group.length)throw new Error('Product lost during reflow');
    ranges.push({id:Number(id),firstPage:all.indexOf(group[0])+1,lastPage:all.indexOf(group[group.length-1])+1});
  }
  for(const [i,p] of all.entries()){
    const number=p.querySelector('.page-no');if(number)number.textContent=String(i+1).padStart(2,'0');
  }
  for(const link of document.querySelectorAll('.toc-link')){
    const target=document.querySelector(link.getAttribute('href'));
    if(!target)throw new Error('Category target lost');
    link.querySelector('b').textContent=String(all.indexOf(target)+1).padStart(2,'0');
  }
  return {totalPages:all.length,ranges,merged,balanced,descriptionAndImagesPreserved:true};
}
