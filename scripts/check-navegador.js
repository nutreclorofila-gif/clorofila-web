#!/usr/bin/env node
/**
 * La medición de punta a punta, en un Chrome de verdad y sin ventana.
 *
 * check-consentimiento.js prueba el código con un navegador simulado. Esto
 * prueba lo que de verdad le llega a Google y a Meta: sirve el sitio local
 * como si fuera clorofila.uy (consent.js solo mide ahí), carga gtag.js y el
 * píxel reales, y ataja cada envío (/g/collect de Analytics, /tr de Meta)
 * para leerlo y cortarlo antes de que salga. Nada llega a los informes.
 *
 * Es el chequeo que habría frenado el error del 7/9: el primer page_view de
 * quien aceptaba salía sin cookies y sin la dirección de llegada.
 *
 * Necesita Chrome instalado y conexión (baja gtag.js y fbevents.js), por eso
 * no va en npm test: corre en CI y a mano con `npm run check:navegador`.
 * Otro Chrome: CHROME=/ruta/al/chrome npm run check:navegador
 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const raiz = path.join(__dirname, '..');
const CANDIDATOS = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const CHROME = CANDIDATOS.find((c) => fs.existsSync(c));
if (!CHROME) {
  console.error('✗ navegador: no encontré Chrome. Indicá la ruta con CHROME=/ruta/al/chrome.');
  process.exit(1);
}
if (typeof WebSocket === 'undefined') {
  console.error('✗ navegador: hace falta Node 22 o más nuevo (usa el WebSocket propio de Node).');
  process.exit(1);
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const PUERTO_SITIO = 8700 + Math.floor(Math.random() * 200);

let fallas = 0;
let total = 0;
const check = (nombre, ok, detalle) => {
  total++;
  console.log((ok ? '  ok   ' : '  FALLA') + '  ' + nombre + (ok ? '' : '  → ' + String(JSON.stringify(detalle)).slice(0, 600)));
  if (!ok) fallas++;
};

async function abrirChrome() {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'medicion-'));
  const puerto = 9500 + Math.floor(Math.random() * 400);
  const proceso = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--no-sandbox',
    // Sin esto Chrome pasa http://clorofila.uy a https y abre el sitio
    // publicado en vez del local: la prueba miraba producción.
    '--disable-features=HttpsUpgrades,HttpsFirstBalancedModeAutoEnable',
    // El píxel de Meta no manda nada si el navegador se declara automatizado.
    '--disable-blink-features=AutomationControlled',
    // clorofila.uy se resuelve al servidor local; el resto de internet, normal.
    `--host-resolver-rules=MAP clorofila.uy:80 127.0.0.1:${PUERTO_SITIO}`,
    `--remote-debugging-port=${puerto}`, `--user-data-dir=${perfil}`, 'about:blank',
  ], { stdio: 'ignore' });
  // El primer arranque de Chrome en una máquina puede tardar más de 15 s.
  let destino;
  const inicio = Date.now();
  while (!destino && Date.now() - inicio < 60000) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${puerto}/json/list`, { signal: AbortSignal.timeout(1000) })).json();
      destino = lista.find((t) => t.type === 'page');
    } catch (e) { /* todavía arranca */ }
    if (!destino) await espera(250);
  }
  if (!destino) throw new Error('Chrome no arrancó');
  const ws = new WebSocket(destino.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pendientes = new Map();
  const envios = [];
  const cmd = (method, params = {}) => new Promise((r) => {
    const n = ++id;
    pendientes.set(n, r);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  ws.addEventListener('message', (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pendientes.has(d.id)) { pendientes.get(d.id)(d); pendientes.delete(d.id); return; }
    if (d.method === 'Fetch.requestPaused') {
      const q = d.params.request;
      envios.push({ url: q.url, cuerpo: q.postData || '' });
      // Se lee y se corta: el envío nunca sale de la máquina.
      cmd('Fetch.failRequest', { requestId: d.params.requestId, errorReason: 'BlockedByClient' });
    }
  });
  await cmd('Page.enable');
  await cmd('Runtime.enable');
  await cmd('Network.enable');
  // Tampoco si el navegador dice «HeadlessChrome».
  const version = await cmd('Browser.getVersion');
  await cmd('Network.setUserAgentOverride', { userAgent: version.result.userAgent.replace('HeadlessChrome', 'Chrome') });
  await cmd('Fetch.enable', { patterns: [{ urlPattern: '*/g/collect*' }, { urlPattern: '*facebook.com/tr*' }] });
  return {
    envios,
    cmd,
    evaluar: async (expr) => (await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.result.value,
    cerrar: () => { try { ws.close(); } catch (e) { /* ya estaba cerrado */ } proceso.kill('SIGKILL'); },
  };
}

// Cada envío de Analytics puede traer varios eventos: parámetros comunes en
// la dirección y uno por renglón en el cuerpo.
function eventosGA(envios) {
  const lista = [];
  envios.filter((e) => e.url.includes('/g/collect')).forEach((e) => {
    const base = new URL(e.url).searchParams;
    const renglones = e.cuerpo ? e.cuerpo.split('\n').filter(Boolean) : [''];
    renglones.forEach((r) => {
      const p = new URLSearchParams(base);
      new URLSearchParams(r).forEach((v, k) => p.set(k, v));
      if (p.get('en')) lista.push(p);
    });
  });
  return lista;
}
// El píxel manda el nombre del evento en la dirección o en el cuerpo, según
// el tamaño del envío.
const eventosMeta = (envios) => envios.filter((e) => e.url.includes('facebook.com/tr')).map((e) => {
  const enUrl = new URL(e.url).searchParams.get('ev');
  if (enUrl) return enUrl;
  const m = e.cuerpo.match(/(?:^|&)ev=([A-Za-z]+)/) || e.cuerpo.match(/name="ev"\s+([A-Za-z]+)/);
  return m && m[1];
}).filter(Boolean);

async function hasta(condicion, ms = 12000) {
  for (let t = 0; t < ms; t += 250) {
    if (condicion()) return true;
    await espera(250);
  }
  return condicion();
}

async function escenario(titulo, ruta, pruebas) {
  console.log('\n' + titulo);
  const c = await abrirChrome();
  try {
    await c.cmd('Page.navigate', { url: `http://clorofila.uy${ruta}` });
    await espera(3500); // tiempo para que un error mande algo sin permiso
    check('antes de decidir no sale nada', c.envios.length === 0, c.envios.map((e) => e.url.slice(0, 80)));
    const hayBoton = await c.evaluar(`(() => { const b = document.getElementById('cookie-accept'); if (!b) return false; b.click(); return true; })()`);
    check('el aviso de cookies tiene el botón Aceptar', hayBoton, hayBoton);
    await pruebas(c);
  } finally {
    c.cerrar();
  }
}

(async () => {
  const servidor = spawn(process.execPath, [path.join(raiz, 'scripts', 'servidor.js'), String(PUERTO_SITIO)], { stdio: 'ignore' });
  const corte = setTimeout(() => { console.error('✗ navegador: tiempo agotado'); servidor.kill(); process.exit(1); }, 240000);
  try {
    for (let i = 0; i < 40; i++) {
      try { await fetch(`http://127.0.0.1:${PUERTO_SITIO}/`); break; } catch (e) { await espera(150); }
    }

    await escenario('1) Llega a /curso desde un anuncio de Google y acepta', '/curso?gclid=PRUEBA', async (c) => {
      // Analytics junta eventos y los manda de a tandas: se espera a los tres.
      await hasta(() => ['page_view', 'view_producto'].every((n) => eventosGA(c.envios).some((p) => p.get('en') === n)) && eventosMeta(c.envios).includes('ViewContent'));
      const ga = eventosGA(c.envios);
      const vista = ga.find((p) => p.get('en') === 'page_view');
      check('Analytics recibe la visita de llegada', !!vista, ga.map((p) => p.get('en')));
      check('con los cuatro permisos dados (gcs=G111)', !!vista && vista.get('gcs') === 'G111', vista && vista.get('gcs'));
      check('marcada como primera visita (_fv)', !!vista && vista.has('_fv'), vista && [...vista.keys()]);
      check('con el gclid en la dirección', !!vista && /gclid=PRUEBA/.test(vista.get('dl') || ''), vista && vista.get('dl'));
      check('Analytics recibe la vista de producto', ga.some((p) => p.get('en') === 'view_producto'), ga.map((p) => p.get('en')));
      const meta = eventosMeta(c.envios);
      check('Meta recibe PageView y ViewContent', meta.includes('PageView') && meta.includes('ViewContent'), meta);
    });

    await escenario('2) Reservó el tapeo: /gracias?p=tapeo', '/gracias?p=tapeo', async (c) => {
      await hasta(() => eventosGA(c.envios).some((p) => p.get('en') === 'reserva_recibida') && eventosMeta(c.envios).includes('Schedule'));
      const ga = eventosGA(c.envios).map((p) => p.get('en'));
      check('Analytics recibe reserva_recibida', ga.includes('reserva_recibida'), ga);
      check('Meta recibe Schedule', eventosMeta(c.envios).includes('Schedule'), eventosMeta(c.envios));
      const capa = await c.evaluar(`JSON.stringify({sinVista: document.body.hasAttribute('data-sin-vista'), capa: (window.dataLayer || []).map((a) => [a[0], a[1]])})`);
      check('/gracias no manda vista de producto', !ga.includes('view_producto'), [ga, capa]);
    });

    await escenario('3) Pidió el temario: /gracias sin ?p=', '/gracias', async (c) => {
      await hasta(() => eventosGA(c.envios).some((p) => p.get('en') === 'generate_lead'));
      const ga = eventosGA(c.envios);
      const lead = ga.find((p) => p.get('en') === 'generate_lead');
      check('Analytics recibe generate_lead con method temario', !!lead && lead.get('ep.method') === 'temario', lead && [...lead.entries()].filter(([k]) => k.startsWith('ep.')));
      check('no cuenta como reserva', !ga.some((p) => p.get('en') === 'reserva_recibida'), ga.map((p) => p.get('en')));
      check('Meta no recibe Schedule', !eventosMeta(c.envios).includes('Schedule'), eventosMeta(c.envios));
    });
  } finally {
    clearTimeout(corte);
    servidor.kill();
  }

  console.log(
    fallas
      ? '\n✗ navegador: ' + fallas + ' comprobación(es) fallan. Mirá consent.js, track.js o /gracias.\n'
      : 'navegador: ' + total + ' comprobaciones con Chrome real, a Google y a Meta les llega lo que corresponde.'
  );
  process.exit(fallas ? 1 : 0);
})().catch((e) => {
  console.error('✗ navegador: ' + e.message);
  process.exit(1);
});
