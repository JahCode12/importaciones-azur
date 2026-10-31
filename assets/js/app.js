import { PRODUCTS } from './catalog.js';
import { CONFIG } from './config.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const BY_SKU = new Map(PRODUCTS.map((p) => [p.sku, p]));
const CATEGORIES = [
  { name: 'Organización', hint: 'Repisas y orden', img: 'AZ-ORG-002' },
  { name: 'Cocina', hint: 'Ollas, vasos y más', img: 'AZ-COC-005' },
  { name: 'Dormitorio', hint: 'Descanso con estilo', img: 'AZ-DOR-002' },
  { name: 'Baño', hint: 'Tu spa en casa', img: 'AZ-BAN-005' },
  { name: 'Decoración', hint: 'Detalles que enamoran', img: 'AZ-DEC-001' },
  { name: 'Textil', hint: 'Cojines y mantas', img: 'AZ-TEX-002' }
];
const money = (n) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const RX = {
  nombre: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]{3,80}$/,
  correo: /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/,
  celular: /^(\+?51)?9\d{8}$/
};
const cleanPhone = (v) => v.replace(/[\s()-]/g, '');

// Almacenamiento local seguro (puede fallar en modo privado).
const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sin persistencia */ } }
};

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) node.append(c instanceof Node ? c : document.createTextNode(c));
  return node;
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-show'), 2600);
}

async function postJSON(url, body, timeoutMs = 45000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } finally { clearTimeout(timer); }
}

/* ---------------- Catálogo ---------------- */
const view = { category: 'Todos', query: '', sort: 'relevance' };

function productCard(p) {
  return el('article', { class: 'card' },
    el('div', { class: 'card__media' },
      el('button', { type: 'button', class: 'card__open', onclick: () => openProduct(p.sku), 'aria-label': `Ver detalle de ${p.name}` },
        el('img', { src: p.img, alt: p.name, loading: 'lazy', width: 640, height: 640 }),
        el('span', { class: 'card__view', text: '🔍 Ver detalle' })),
      el('span', { class: 'card__tag', text: p.category }),
      p.stock <= 10 ? el('span', { class: 'card__stock', text: `Últimas ${p.stock}` }) : null
    ),
    el('div', { class: 'card__body' },
      el('span', { class: 'card__sku', text: p.sku }),
      el('button', { type: 'button', class: 'card__name-btn', onclick: () => openProduct(p.sku) }, el('h3', { class: 'card__name', text: p.name })),
      el('p', { class: 'card__desc', text: p.desc }),
      el('div', { class: 'card__foot' },
        el('span', { class: 'price', text: money(p.price) }),
        el('button', { type: 'button', class: 'add-btn', onclick: () => addToCart(p.sku, 1), 'aria-label': `Agregar ${p.name} al carrito` }, '+ Agregar')
      )
    )
  );
}

const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function renderCatalog() {
  const q = normalize(view.query.trim());
  let list = PRODUCTS.filter((p) => (view.category === 'Todos' || p.category === view.category)
    && (!q || normalize(`${p.name} ${p.category} ${p.desc} ${p.sku}`).includes(q)));
  if (view.sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
  if (view.sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
  if (view.sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const grid = $('#productGrid');
  grid.replaceChildren(...(list.length ? list.map(productCard) : [el('p', { class: 'empty', text: 'No encontramos productos con ese filtro. Prueba otra búsqueda o pregúntale a Azur.' })]));
  $('#catalogInfo').textContent = `${list.length} ${list.length === 1 ? 'producto' : 'productos'}${view.category !== 'Todos' ? ` en ${view.category}` : ''}${q ? ` para “${view.query.trim()}”` : ''}`;
  $$('#filterChips .chip, #catNav button').forEach((b) => b.classList.toggle('is-active', b.dataset.cat === view.category));
}

function setCategory(cat, scroll = true) {
  view.category = cat;
  renderCatalog();
  if (scroll) $('#catalogo').scrollIntoView({ behavior: 'smooth' });
}

function initCatalog() {
  const cats = ['Todos', ...CATEGORIES.map((c) => c.name)];
  $('#filterChips').replaceChildren(...cats.map((c) => el('button', { type: 'button', class: 'chip', 'data-cat': c, onclick: () => setCategory(c, false) }, c)));
  $('#catNav').replaceChildren(...cats.map((c) => el('button', { type: 'button', 'data-cat': c, onclick: () => setCategory(c) }, c)));
  $('#catTiles').replaceChildren(...CATEGORIES.map((c) => {
    const count = PRODUCTS.filter((p) => p.category === c.name).length;
    return el('button', { type: 'button', class: 'cat-tile', onclick: () => setCategory(c.name) },
      el('img', { src: BY_SKU.get(c.img).img, alt: '', loading: 'lazy' }),
      el('span', {}, c.name, el('small', { text: `${c.hint} · ${count} productos` })));
  }));
  $('#searchForm').addEventListener('submit', (e) => { e.preventDefault(); $('#catalogo').scrollIntoView({ behavior: 'smooth' }); });
  $('#searchInput').addEventListener('input', (e) => { view.query = e.target.value.slice(0, 60); renderCatalog(); });
  $('#sortSelect').addEventListener('change', (e) => { view.sort = e.target.value; renderCatalog(); });
  renderCatalog();
}

/* ---------------- Detalle de producto ---------------- */
const pd = { sku: null };
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function setZoomOrigin(e) {
  const box = $('#pdZoom').getBoundingClientRect();
  const x = Math.min(100, Math.max(0, ((e.clientX - box.left) / box.width) * 100));
  const y = Math.min(100, Math.max(0, ((e.clientY - box.top) / box.height) * 100));
  $('#pdImg').style.transformOrigin = `${x}% ${y}%`;
}
function setZoom(on, e) {
  $('#pdZoom').classList.toggle('is-zoomed', on);
  $('#pdZoom').setAttribute('aria-label', on ? 'Alejar imagen' : 'Acercar imagen');
  if (on && e) setZoomOrigin(e);
  if (!on) $('#pdImg').style.transformOrigin = 'center';
}

function openProduct(sku, { updateHash = true } = {}) {
  const p = BY_SKU.get(sku);
  if (!p) return;
  pd.sku = sku;
  closeCart();
  setZoom(false);
  const img = $('#pdImg');
  img.src = p.img;           // la imagen chica ya está en caché: se muestra al instante
  img.alt = p.name;
  const large = new Image();
  large.onload = () => { if (pd.sku === sku) img.src = p.imgLarge; };
  large.src = p.imgLarge;
  $('#pdHint').textContent = canHover ? 'Pasa el cursor sobre la foto para hacer zoom' : 'Toca la foto para hacer zoom y desliza para recorrerla';
  $('#pdCat').textContent = p.category;
  $('#pdSku').textContent = p.sku;
  $('#pdName').textContent = p.name;
  $('#pdPrice').textContent = money(p.price);
  const stock = $('#pdStock');
  stock.textContent = p.stock <= 10 ? `¡Últimas ${p.stock} unidades!` : `En stock · ${p.stock} unidades disponibles`;
  stock.classList.toggle('is-low', p.stock <= 10);
  $('#pdDesc').textContent = p.desc;
  $('#pdSpecs').replaceChildren(...Object.entries(p.specs || {}).map(([k, v]) => el('div', {}, el('dt', { text: k }), el('dd', { text: v }))));
  $('#pdQty').value = 1;
  $('#pdQty').max = p.stock;
  const msg = `Hola Importaciones Azur, quiero más información sobre ${p.name} (${p.sku}) - ${money(p.price)}.`;
  $('#pdWa').href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
  if (!$('#productModal').open) $('#productModal').showModal();
  if (updateHash) history.replaceState(null, '', `#p=${sku}`);
}

function closeProduct() {
  if ($('#productModal').open) $('#productModal').close();
}

function initProductModal() {
  const zoom = $('#pdZoom');
  const modal = $('#productModal');
  if (canHover) {
    zoom.addEventListener('mouseenter', (e) => setZoom(true, e));
    zoom.addEventListener('mousemove', (e) => { if (zoom.classList.contains('is-zoomed')) setZoomOrigin(e); });
    zoom.addEventListener('mouseleave', () => setZoom(false));
  } else {
    zoom.addEventListener('click', (e) => setZoom(!zoom.classList.contains('is-zoomed'), e));
    zoom.addEventListener('pointermove', (e) => { if (zoom.classList.contains('is-zoomed')) setZoomOrigin(e); });
  }
  zoom.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    setZoom(!zoom.classList.contains('is-zoomed'));
  });
  const clampQty = (n) => Math.max(1, Math.min(Number($('#pdQty').max) || 1, Math.floor(Number(n)) || 1));
  $('#pdMinus').addEventListener('click', () => { $('#pdQty').value = clampQty(Number($('#pdQty').value) - 1); });
  $('#pdPlus').addEventListener('click', () => { $('#pdQty').value = clampQty(Number($('#pdQty').value) + 1); });
  $('#pdQty').addEventListener('change', (e) => { e.target.value = clampQty(e.target.value); });
  $('#pdAdd').addEventListener('click', () => { if (addToCart(pd.sku, clampQty($('#pdQty').value))) closeProduct(); });
  $$('[data-close-product]').forEach((b) => b.addEventListener('click', closeProduct));
  modal.addEventListener('click', (e) => { if (e.target === modal) closeProduct(); });   // clic en el fondo
  modal.addEventListener('close', () => {
    setZoom(false);
    if (location.hash.startsWith('#p=')) history.replaceState(null, '', location.pathname + location.search);
  });
  // Enlace directo a un producto: /#p=AZ-COC-001
  const fromHash = () => { const m = location.hash.match(/^#p=([A-Z0-9-]+)$/); if (m && BY_SKU.has(m[1])) openProduct(m[1], { updateHash: false }); };
  window.addEventListener('hashchange', fromHash);
  fromHash();
}

/* ---------------- Carrito ---------------- */
let cart = sanitizeCart(store.get('azur_cart', {}));

function sanitizeCart(raw) {
  const out = {};
  if (raw && typeof raw === 'object') {
    for (const [sku, qty] of Object.entries(raw)) {
      const p = BY_SKU.get(sku);
      const n = Math.floor(Number(qty));
      if (p && n > 0) out[sku] = Math.min(n, p.stock);
    }
  }
  return out;
}
const cartLines = () => Object.entries(cart).map(([sku, qty]) => ({ product: BY_SKU.get(sku), qty }));
const cartTotal = () => cartLines().reduce((s, l) => s + l.product.price * l.qty, 0);
const cartCount = () => cartLines().reduce((s, l) => s + l.qty, 0);

function saveCart() { store.set('azur_cart', cart); renderCart(); }

function addToCart(sku, qty = 1, { silent = false } = {}) {
  const p = BY_SKU.get(sku);
  if (!p) return false;
  const next = Math.min((cart[sku] || 0) + qty, p.stock);
  if (next === cart[sku]) { toast(`Solo tenemos ${p.stock} unidades de ${p.name}`); return false; }
  cart[sku] = next;
  saveCart();
  const btn = $('#cartOpen');
  btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
  if (!silent) toast(`✓ ${p.name} agregado al carrito`);
  return true;
}

function setQty(sku, qty) {
  const p = BY_SKU.get(sku);
  const n = Math.floor(Number(qty));
  if (!p) return;
  if (!n || n < 1) delete cart[sku];
  else cart[sku] = Math.min(n, p.stock);
  saveCart();
}

function renderCart() {
  $('#cartCount').textContent = cartCount();
  $('#cartSubtotal').textContent = money(cartTotal());
  $('#checkoutOpen').disabled = cartCount() === 0;
  const lines = cartLines();
  const body = $('#cartItems');
  if (!lines.length) {
    body.replaceChildren(el('div', { class: 'cart-empty' },
      el('img', { src: 'assets/img/azur.svg', alt: '', width: 72, height: 72 }),
      el('p', { text: 'Tu carrito está vacío.' }),
      el('button', { type: 'button', class: 'btn btn--ghost', onclick: () => { closeCart(); $('#catalogo').scrollIntoView({ behavior: 'smooth' }); } }, 'Explorar catálogo')));
    return;
  }
  body.replaceChildren(...lines.map(({ product: p, qty }) => el('div', { class: 'cart-item' },
    el('img', { src: p.img, alt: '' }),
    el('div', {},
      el('h3', { text: p.name }),
      el('div', { class: 'cart-item__price', text: `${money(p.price)} c/u` }),
      el('div', { class: 'qty' },
        el('button', { type: 'button', 'aria-label': 'Quitar uno', onclick: () => setQty(p.sku, qty - 1) }, '−'),
        el('input', { type: 'number', min: 1, max: p.stock, value: qty, 'aria-label': `Cantidad de ${p.name}`, onchange: (e) => setQty(p.sku, e.target.value) }),
        el('button', { type: 'button', 'aria-label': 'Agregar uno', onclick: () => setQty(p.sku, qty + 1) }, '+'))),
    el('div', { class: 'cart-item__right' },
      el('strong', { text: money(p.price * qty) }),
      el('button', { type: 'button', class: 'remove', onclick: () => setQty(p.sku, 0) }, 'Quitar')))));
}

function openCart() {
  $('#cartDrawer').classList.add('is-open');
  $('#cartDrawer').setAttribute('aria-hidden', 'false');
  $('#overlay').hidden = false;
  $('#cartClose').focus();
}
function closeCart() {
  $('#cartDrawer').classList.remove('is-open');
  $('#cartDrawer').setAttribute('aria-hidden', 'true');
  $('#overlay').hidden = true;
}

/* ---------------- Checkout B2C ---------------- */
function validateFields(form, names) {
  const errors = [];
  for (const name of names) {
    const input = form.elements[name];
    let value = input.value.trim();
    if (name === 'celular') value = cleanPhone(value);
    const ok = RX[name] ? RX[name].test(value) : value.length >= 2;
    input.classList.toggle('is-invalid', !ok);
    input.setAttribute('aria-invalid', String(!ok));
    if (!ok) errors.push(name);
  }
  return errors;
}
const FIELD_LABEL = { nombre: 'nombre completo', correo: 'correo', celular: 'celular (9 dígitos)', empresa: 'empresa', cargo: 'cargo', urgencia: 'plazo', items: 'productos', cita: 'horario', cita_fuera_de_horario: 'horario permitido', bot: 'formulario' };

function openCheckout() {
  if (!cartCount()) { toast('Agrega al menos un producto'); return; }
  closeCart();
  const lines = cartLines();
  $('#checkoutSummary').replaceChildren(
    el('ul', {}, lines.map(({ product: p, qty }) => el('li', { text: `${qty} × ${p.name} — ${money(p.price * qty)}` }))),
    el('div', {}, 'Total: ', el('strong', { text: money(cartTotal()) })));
  $('#checkoutError').textContent = '';
  const saved = store.get('azur_contact', {});
  const form = $('#checkoutForm');
  for (const k of ['nombre', 'correo', 'celular']) if (saved[k] && !form.elements[k].value) form.elements[k].value = saved[k];
  $('#checkoutModal').showModal();
}

function buildWhatsAppFallback(data) {
  const lines = cartLines().map(({ product: p, qty }) => `• ${qty} x ${p.name} (${p.sku}) - ${money(p.price * qty)}`);
  const text = `Hola Importaciones Azur, quiero hacer este pedido:\n${lines.join('\n')}\nTotal: ${money(cartTotal())}\n\nMis datos:\nNombre: ${data.nombre}\nCorreo: ${data.correo}\nCelular: ${data.celular}\n\nQuisiera coordinar la entrega y el pago.`;
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
}

async function submitCheckout(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const errors = validateFields(form, ['nombre', 'correo', 'celular']);
  if (errors.length) { $('#checkoutError').textContent = `Revisa: ${errors.map((x) => FIELD_LABEL[x]).join(', ')}.`; return; }
  const data = {
    nombre: form.elements.nombre.value.trim(),
    correo: form.elements.correo.value.trim(),
    celular: cleanPhone(form.elements.celular.value.trim()),
    website: form.elements.website.value,
    items: cartLines().map(({ product, qty }) => ({ sku: product.sku, qty }))
  };
  const btn = $('#checkoutSubmit');
  btn.disabled = true;
  btn.lastChild.textContent = ' Registrando tu pedido…';
  try {
    const { ok, data: res } = await postJSON(CONFIG.endpoints.pedido, data);
    if (!ok || !res.ok) {
      $('#checkoutError').textContent = res.errors ? `Revisa: ${res.errors.map((x) => FIELD_LABEL[x] || x).join(', ')}.` : 'No pudimos registrar el pedido. Inténtalo otra vez.';
      return;
    }
    store.set('azur_contact', { nombre: data.nombre, correo: data.correo, celular: data.celular });
    cart = {}; saveCart();
    $('#checkoutModal').close();
    toast(`Pedido ${res.idPedido} registrado. Abriendo WhatsApp…`);
    setTimeout(() => { window.location.href = res.whatsappUrl; }, 700);
  } catch {
    // Si el servidor no responde, no bloqueamos la venta: abrimos WhatsApp con el resumen local.
    const url = buildWhatsAppFallback(data);
    $('#checkoutError').textContent = 'Conexión lenta: te llevamos a WhatsApp con tu pedido.';
    setTimeout(() => { window.location.href = url; }, 900);
  } finally {
    btn.disabled = false;
    btn.lastChild.textContent = ' Confirmar y abrir WhatsApp';
  }
}

/* ---------------- Aliados B2B ---------------- */
const ally = { step: 1, slot: null, availability: null };

function showAllyStep(n) {
  ally.step = n;
  $$('.ally-step').forEach((s) => { s.hidden = Number(s.dataset.step) !== n; });
  $$('.stepper span').forEach((s, i) => s.classList.toggle('is-active', i < n));
  $('#allyError').textContent = '';
}

async function loadAvailability() {
  const box = $('#slotsBox');
  box.hidden = false;
  $('#slotStatus').textContent = 'Consultando horarios disponibles…';
  $('#slotDays').replaceChildren();
  $('#slotTimes').replaceChildren();
  ally.slot = null;
  try {
    const res = await fetch(CONFIG.endpoints.disponibilidad, { headers: { Accept: 'application/json' } });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.days)) throw new Error('bad');
    ally.availability = data.days;
    if (!data.days.length) { $('#slotStatus').textContent = 'No hay horarios libres en los próximos días. Envía tu solicitud y te contactaremos.'; return; }
    $('#slotStatus').textContent = 'Selecciona día y hora.';
    $('#slotDays').replaceChildren(...data.days.map((d, i) => el('button', { type: 'button', role: 'tab', 'data-i': i, onclick: () => selectDay(i) }, d.label)));
    selectDay(0);
  } catch {
    $('#slotStatus').textContent = 'No pudimos consultar el calendario. Puedes enviar tu solicitud igual y un ejecutivo te contactará.';
  }
}

function selectDay(i) {
  const day = ally.availability[i];
  $$('#slotDays button').forEach((b) => b.classList.toggle('is-active', Number(b.dataset.i) === i));
  $('#slotTimes').replaceChildren(...day.slots.map((s) => el('button', {
    type: 'button',
    class: ally.slot?.start === s.start ? 'is-active' : '',
    onclick: (e) => {
      ally.slot = { start: s.start, label: `${day.label}, ${s.label}` };
      $$('#slotTimes button').forEach((b) => b.classList.remove('is-active'));
      e.currentTarget.classList.add('is-active');
      $('#slotStatus').textContent = `Reunión elegida: ${ally.slot.label} (hora Perú)`;
    }
  }, s.label)));
}

function initAlly() {
  const form = $('#allyForm');
  $('[data-next]', form).addEventListener('click', () => {
    const errors = validateFields(form, ['nombre', 'correo', 'celular', 'empresa', 'cargo']);
    if (errors.length) { $('#allyError').textContent = `Revisa: ${errors.map((x) => FIELD_LABEL[x]).join(', ')}.`; return; }
    showAllyStep(2);
  });
  $('[data-prev]', form).addEventListener('click', () => showAllyStep(1));
  $$('input[name="urgencia"]', form).forEach((r) => r.addEventListener('change', () => {
    if (r.value === 'Lo más pronto posible') loadAvailability();
    else { $('#slotsBox').hidden = true; ally.slot = null; }
  }));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const urg = form.elements.urgencia.value;
    if (!urg) { $('#allyError').textContent = 'Elige cuándo quieres empezar.'; return; }
    if (urg === 'Lo más pronto posible' && ally.availability?.length && !ally.slot) { $('#allyError').textContent = 'Elige un horario para tu reunión.'; return; }
    const payload = {
      nombre: form.elements.nombre.value.trim(),
      correo: form.elements.correo.value.trim(),
      celular: cleanPhone(form.elements.celular.value.trim()),
      empresa: form.elements.empresa.value.trim(),
      cargo: form.elements.cargo.value.trim(),
      urgencia: urg,
      cita: urg === 'Lo más pronto posible' && ally.slot ? ally.slot.start : '',
      website: form.elements.website.value
    };
    const btn = $('#allySubmit');
    btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      const { ok, data } = await postJSON(CONFIG.endpoints.aliado, payload, 60000);
      if (!ok || !data.ok) {
        $('#allyError').textContent = data.errors ? `Revisa: ${data.errors.map((x) => FIELD_LABEL[x] || x).join(', ')}.` : 'No pudimos registrar tu solicitud. Inténtalo otra vez.';
        if (data.errors?.some((x) => x.startsWith('cita'))) loadAvailability();
        return;
      }
      $('#allyDoneTitle').textContent = `¡Gracias, ${payload.nombre.split(' ')[0]}!`;
      let text = `Tu ejecutivo(a) asignado(a) es ${data.vendedor}. `;
      if (data.cita === 'agendada') text += `Tu reunión quedó agendada para el ${data.citaTexto}; te llegará la invitación al correo.`;
      else if (data.cita === 'ocupado') text += 'El horario elegido se acaba de ocupar; tu ejecutivo te propondrá otro por WhatsApp.';
      else text += 'Te contactará muy pronto con la propuesta mayorista.';
      $('#allyDoneText').textContent = text;
      const wa = $('#allyDoneWa');
      wa.href = data.whatsappUrl;
      wa.textContent = `Escribir a ${data.vendedor} por WhatsApp`;
      $('.ally-done .qr')?.remove();
      wa.before(el('img', { class: 'qr', width: 180, height: 180, alt: `Código QR para escribir a ${data.vendedor} por WhatsApp`, src: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=6&color=0b5d43&data=${encodeURIComponent(data.whatsappUrl)}` }));
      showAllyStep(3);
    } catch {
      $('#allyError').textContent = 'Conexión lenta. Escríbenos directo por WhatsApp al +51 982 770 361.';
    } finally {
      btn.disabled = false; btn.textContent = 'Enviar solicitud';
    }
  });
}

/* ---------------- Chat Azur ---------------- */
const chat = { history: [], busy: false, lastSent: 0, opened: false };

function chatSessionId() {
  if (chat.sessionId) return chat.sessionId;
  let id = null;
  try { id = sessionStorage.getItem('azur_chat_session'); } catch { /* sin almacenamiento */ }
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    try { sessionStorage.setItem('azur_chat_session', id); } catch { /* sin almacenamiento */ }
  }
  chat.sessionId = id;
  return id;
}

function addMsg(text, who = 'bot', extra = '') {
  const node = el('div', { class: `msg msg--${who} ${extra}`.trim() });
  // El modelo usa **negritas** de Markdown: se pintan como <strong> sin tocar innerHTML.
  String(text).split('**').forEach((part, i) => node.append(i % 2 ? el('strong', { text: part }) : document.createTextNode(part)));
  $('#chatBody').append(node);
  $('#chatBody').scrollTop = $('#chatBody').scrollHeight;
  return node;
}

function addProducts(skus) {
  const wrap = el('div', { class: 'chat-products' }, skus.map((sku) => {
    const p = BY_SKU.get(sku);
    if (!p) return null;
    return el('div', { class: 'chat-product' },
      el('img', { src: p.img, alt: '' }),
      el('div', {}, el('strong', {}, el('button', { type: 'button', onclick: () => openProduct(p.sku) }, p.name)), el('span', { text: `${money(p.price)} · ${p.category}` })),
      el('button', { type: 'button', onclick: (e) => { if (addToCart(p.sku, 1)) { e.currentTarget.textContent = '✓'; } } }, 'Agregar'));
  }));
  $('#chatBody').append(wrap);
  $('#chatBody').scrollTop = $('#chatBody').scrollHeight;
}

function openB2B() {
  closeChat();
  $('#aliados').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => $('#aNombre').focus({ preventScroll: true }), 700);
}

function runActions(actions = []) {
  for (const a of actions) {
    if (a.type === 'add_to_cart' && BY_SKU.has(a.sku)) {
      if (addToCart(a.sku, a.qty || 1, { silent: true })) addMsg(`🛒 Agregué ${a.qty || 1} × ${BY_SKU.get(a.sku).name} a tu carrito.`, 'bot', 'chat-cta');
    } else if (a.type === 'show_products') {
      addProducts(a.skus || []);
    } else if (a.type === 'open_checkout') {
      const b = el('button', { type: 'button', class: 'btn btn--wa chat-cta', onclick: () => { closeChat(); openCheckout(); } }, 'Finalizar pedido');
      $('#chatBody').append(b);
    } else if (a.type === 'open_b2b') {
      const b = el('button', { type: 'button', class: 'btn btn--primary chat-cta', onclick: openB2B }, 'Ir al formulario de aliados');
      $('#chatBody').append(b);
    }
  }
  $('#chatBody').scrollTop = $('#chatBody').scrollHeight;
}

async function sendChat(text) {
  const message = text.trim().slice(0, CONFIG.chatMaxChars);
  if (!message || chat.busy) return;
  if (Date.now() - chat.lastSent < 1500) { toast('Espera un segundo 🙂'); return; }
  chat.busy = true; chat.lastSent = Date.now();
  addMsg(message, 'user');
  const typing = addMsg('', 'bot');
  typing.append(el('span', { class: 'typing', 'aria-label': 'Azur está escribiendo' }, el('i'), el('i'), el('i')));
  try {
    // El agente de captura guarda la conversación en su memoria por sessionId.
    const { data } = await postJSON(CONFIG.endpoints.chatLeads, { action: 'sendMessage', sessionId: chatSessionId(), chatInput: message }, 90000);
    typing.remove();
    const reply = typeof data.output === 'string' && data.output ? data.output : 'Uy, no te entendí. ¿Me lo dices de otra forma?';
    addMsg(reply, 'bot');
  } catch {
    typing.remove();
    addMsg('Tengo problemas de conexión 😕. Puedes escribirnos por WhatsApp al +51 982 770 361.', 'bot', 'msg--warn');
  } finally {
    chat.busy = false;
  }
}

function openChat() {
  $('#chat').hidden = false;
  $('#chatFab').hidden = true;
  if (!chat.opened) {
    chat.opened = true;
    addMsg('¡Hola! Soy Azur 🌿, el asistente de Importaciones Azur. Te cuento sobre nuestro Programa Aliados (20% de descuento desde 50 unidades por SKU) y te envío la propuesta a tu correo. ¿Empezamos con tu nombre?');
  }
  $('#chatInput').focus();
}
function closeChat() { $('#chat').hidden = true; $('#chatFab').hidden = false; }

function initChat() {
  $$('[data-open-chat]').forEach((b) => b.addEventListener('click', openChat));
  $('#chatClose').addEventListener('click', closeChat);
  $('#chatForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#chatInput').value; $('#chatInput').value = ''; sendChat(v); });
  const chips = [
    ['🤝 Quiero la propuesta', 'Hola, quiero recibir la propuesta del Programa Aliados'],
    ['🚢 Asesoría para importar', 'Me interesa la asesoría para importaciones'],
    ['🎓 Mini curso', 'Me interesa el mini curso de importaciones']
  ];
  $('#chatChips').replaceChildren(...chips.map(([label, msg]) => el('button', { type: 'button', onclick: () => sendChat(msg) }, label)));
}

/* ---------------- Reseñas (ficticias, de ejemplo) ---------------- */
const REVIEWS = [
  ['Lucía Paredes', 'Miraflores', 5, 'Las repisas flotantes cambiaron mi sala. Llegaron bien embaladas y coordinar por WhatsApp fue rapidísimo.'],
  ['Martín Salazar', 'Arequipa', 5, 'Pedí la olla esmaltada con ayuda del chat de Azur, me recomendó justo lo que buscaba y dentro de mi presupuesto.'],
  ['Valeria Ccori', 'Cusco', 4, 'El edredón es suave y abriga sin pesar. Me gustó poder ver todo el catálogo ordenado por categorías.'],
  ['Diego Fernández', 'Trujillo', 5, 'Tengo un bazar y me volví aliado: mi ejecutiva me envió la propuesta mayorista el mismo día.'],
  ['Camila Ríos', 'San Borja', 5, 'El espejo LED quedó precioso en el baño. Atención amable y sin complicaciones de pago en la web.'],
  ['Renzo Quispe', 'Piura', 4, 'Buenos precios en textiles y decoración. Los cojines de terciopelo verde son mis favoritos.']
];
function renderReviews() {
  $('#reviews').replaceChildren(...REVIEWS.map(([name, city, stars, text]) => el('article', { class: 'review' },
    el('div', { class: 'review__stars', 'aria-label': `${stars} de 5 estrellas`, text: '★'.repeat(stars) + '☆'.repeat(5 - stars) }),
    el('p', { text: `“${text}”` }),
    el('div', { class: 'review__who' },
      el('span', { class: 'review__avatar', 'aria-hidden': 'true', text: name.split(' ').map((w) => w[0]).join('') }),
      el('div', {}, el('strong', { text: name }), el('small', { text: city }))))));
}

/* ---------------- Init ---------------- */
function init() {
  $('#year').textContent = new Date().getFullYear();
  initCatalog();
  renderCart();
  renderReviews();
  initAlly();
  initChat();
  initProductModal();
  $('#cartOpen').addEventListener('click', openCart);
  $('#cartClose').addEventListener('click', closeCart);
  $('#overlay').addEventListener('click', closeCart);
  $('#checkoutOpen').addEventListener('click', openCheckout);
  $('#checkoutForm').addEventListener('submit', submitCheckout);
  $$('[data-close-modal]').forEach((b) => b.addEventListener('click', () => $('#checkoutModal').close()));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('#cartDrawer').classList.contains('is-open')) closeCart();
    else if (!$('#chat').hidden) closeChat();
  });
}

init();
