// Sonda visual. No corre en npm test porque necesita un navegador: se carga
// desde la consola del preview (o con el MCP del browser) en cada página.
//
//   const t = await fetch('/scripts/sonda-visual.js').then(r=>r.text());
//   (0,eval)(t); SONDA();
//
// Busca lo que un test estático no ve: círculos que salieron óvalos, imágenes
// deformadas, desbordes horizontales, targets chicos, links vacíos y restos de
// plantilla. Salió de un bug real: la foto de Leonardo en el cierre del home se
// mostraba 23x56 en vez de 56x56 porque el flex-shrink estaba puesto en el
// <img> y el hijo del flex era el <picture>.
window.SONDA=function(){
  const o={p:location.pathname,fallas:[]};
  const vw=document.documentElement.clientWidth;
  const add=s=>o.fallas.push(s);

  // Aspecto declarado vs renderizado. Se excluye object-fit cover/contain:
  // ahí el recorte es a propósito.
  document.querySelectorAll('img[width][height]').forEach(i=>{
    const cs=getComputedStyle(i);
    if(cs.objectFit==='cover'||cs.objectFit==='contain') return;
    const b=i.getBoundingClientRect(); if(b.width<2||b.height<2) return;
    const dec=(+i.getAttribute('width'))/(+i.getAttribute('height')), ren=b.width/b.height;
    if(Math.abs(dec-ren)/dec>0.12) add('IMG deformada '+i.src.split('/').pop()+' declarada '+i.getAttribute('width')+'x'+i.getAttribute('height')+' se ve '+Math.round(b.width)+'x'+Math.round(b.height));
  });

  // Un círculo que salió óvalo (el caso de la foto de Leonardo).
  document.querySelectorAll('img,picture,figure').forEach(e=>{
    const cs=getComputedStyle(e);
    if(!/50%/.test(cs.borderRadius)) return;
    const b=e.getBoundingClientRect(); if(b.width<14||b.height<14||b.height>170) return;
    if(Math.abs(b.width-b.height)/Math.max(b.width,b.height)>0.15)
      add('CIRCULO ovalado '+e.tagName+'.'+(''+e.className).slice(0,22)+' '+Math.round(b.width)+'x'+Math.round(b.height));
  });

  if(document.documentElement.scrollWidth>vw+2) add('SCROLL-H '+document.documentElement.scrollWidth+'/'+vw);
  document.querySelectorAll('body *').forEach(e=>{
    const b=e.getBoundingClientRect();
    if(b.width>0&&b.right>vw+2&&getComputedStyle(e).position!=='fixed'&&!/saltar/.test(''+e.className))
      add('DESBORDA '+e.tagName+'.'+(''+e.className).slice(0,22));
  });

  document.querySelectorAll('a').forEach(a=>{
    const t=(a.innerText||'').trim(), h=a.getAttribute('href');
    if(!t&&!a.getAttribute('aria-label')&&!a.querySelector('img,svg')) add('LINK sin texto '+(h||'').slice(0,40));
    if(h===''||h==='#') add('LINK vacío: «'+t.slice(0,26)+'»');
  });

  document.querySelectorAll('a.btn,button,input,select,summary').forEach(e=>{
    const b=e.getBoundingClientRect();
    if(b.width>0&&b.height>0&&b.height<24) add('TARGET '+Math.round(b.width)+'x'+Math.round(b.height)+' «'+(e.innerText||'').trim().slice(0,18)+'»');
  });

  const txt=document.body.innerText;
  ['lorem','ipsum','placeholder','undefined','NaN','[object','{{','<%'].forEach(m=>{ if(txt.includes(m)) add('TEXTO de plantilla: '+m); });

  document.querySelectorAll('img').forEach(i=>{ if(i.complete&&i.naturalWidth===0) add('IMG no carga '+i.src.split('/').pop()); });

  // Encabezados vacíos o duplicados exactos en la misma página
  const hs=[...document.querySelectorAll('h1,h2,h3')].map(h=>(h.innerText||'').trim());
  hs.forEach((t,i)=>{ if(!t) add('ENCABEZADO vacío en posición '+i); });
  const dup=hs.filter((t,i)=>t&&hs.indexOf(t)!==i);
  [...new Set(dup)].forEach(t=>add('ENCABEZADO repetido: «'+t.slice(0,34)+'»'));

  o.fallas=[...new Set(o.fallas)];
  return o;
};
