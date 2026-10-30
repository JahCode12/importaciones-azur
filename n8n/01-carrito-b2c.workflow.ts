import { workflow, node, trigger, ifElse, newCredential, expr } from '@n8n/workflow-sdk';

const pedidoWebhook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {
    name: 'Webhook Pedido B2C',
    parameters: {
      httpMethod: 'POST',
      path: 'azur-pedido',
      responseMode: 'responseNode',
      options: { allowedOrigins: '*', ignoreBots: true }
    }
  },
  output: [{ body: { nombre: 'María Quispe', correo: 'maria@example.com', celular: '987654321', items: [{ sku: 'AZ-COC-001', qty: 1 }], website: '' } }]
});

const validarPedido = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Validar y Preparar Pedido',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const PRICES = {"AZ-ORG-001":["Repisa Nicho Roble",189],"AZ-ORG-002":["Set 3 Repisas Flotantes",129],"AZ-ORG-003":["Cajonera Nórdica 4 Cajones",459],"AZ-ORG-004":["Taburete Multiuso de Madera",119],"AZ-ORG-005":["Ropero Organizador Nogal",899],"AZ-COC-001":["Olla Esmaltada Roja 5 L",249],"AZ-COC-002":["Set 5 Vasos Cerámica Arena",89],"AZ-COC-003":["Taza Porcelana Nube 350 ml",29],"AZ-COC-004":["Grifería Monocomando Dorada",389],"AZ-COC-005":["Set Ollas Acero Inox 6 Piezas",429],"AZ-DOR-001":["Velador Nórdico con Cajón",279],"AZ-DOR-002":["Banca Pie de Cama Capitoneada",549],"AZ-DOR-003":["Cabecera Tapizada Grafito",639],"AZ-DOR-004":["Par de Banquetas Terracota",399],"AZ-DOR-005":["Butaca de Lectura Mostaza",699],"AZ-BAN-001":["Toallero Barra Negro Mate",79],"AZ-BAN-002":["Lavatorio de Pedestal Clásico",349],"AZ-BAN-003":["Bandeja de Bambú para Tina",119],"AZ-BAN-004":["Mueble Flotante con Lavabo",1290],"AZ-BAN-005":["Espejo Redondo LED 60 cm",359],"AZ-DEC-001":["Tapiz Macramé Artesanal",159],"AZ-DEC-002":["Vela Aromática Ámbar y Cedro",49],"AZ-DEC-003":["Arreglo de Pampa Natural",69],"AZ-DEC-004":["Set Galería 9 Marcos",199],"AZ-DEC-005":["Lámpara Colgante Globo Cristal",289],"AZ-TEX-001":["Funda de Cojín Rayas Terracota",45],"AZ-TEX-002":["Set 4 Cojines Decorativos",139],"AZ-TEX-003":["Cojines Terciopelo Verde x2",99],"AZ-TEX-004":["Edredón Gris Perla Queen",329],"AZ-TEX-005":["Alfombra Beige 160x230",379]};
const NL = String.fromCharCode(10);
const inp = $input.first().json;
const b = (inp.body && typeof inp.body === 'object') ? inp.body : inp;
const clean = (v, max) => String(v == null ? '' : v).replace(/[<>{}]/g, '').trim().slice(0, max);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nombre = clean(b.nombre, 80);
const correo = clean(b.correo, 120).toLowerCase();
const celular = clean(b.celular, 20).replace(/[ ()-]/g, '');
const errors = [];
if (clean(b.website, 50)) errors.push('bot');
if (nombre.length < 3 || !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/.test(nombre)) errors.push('nombre');
if (!/^[^ @]+@[^ @]+[.][^ @.]{2,}$/.test(correo)) errors.push('correo');
if (!/^([+]?51)?9[0-9]{8}$/.test(celular)) errors.push('celular');
const raw = Array.isArray(b.items) ? b.items.slice(0, 30) : [];
const items = [];
for (const it of raw) {
  const sku = clean(it && it.sku, 20);
  const qty = Math.floor(Number(it && it.qty));
  if (!PRICES[sku] || !(qty >= 1 && qty <= 999)) continue;
  const p = PRICES[sku];
  items.push({ sku, nombre: p[0], cantidad: qty, precio: p[1], subtotal: qty * p[1] });
}
if (!items.length) errors.push('items');
const total = items.reduce((s, i) => s + i.subtotal, 0);
const now = new Date();
const idPedido = 'AZ-' + now.toISOString().slice(2, 10).split('-').join('') + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
const fecha = now.toLocaleString('es-PE', { timeZone: 'America/Lima', hour12: false });
const detalleTexto = items.map(i => '• ' + i.cantidad + ' x ' + i.nombre + ' (' + i.sku + ') - S/ ' + i.subtotal.toFixed(2)).join(NL);
const msg = 'Hola Importaciones Azur, quiero confirmar mi pedido ' + idPedido + ':' + NL + detalleTexto + NL + 'Total: S/ ' + total.toFixed(2) + NL + NL + 'Mis datos:' + NL + 'Nombre: ' + nombre + NL + 'Correo: ' + correo + NL + 'Celular: ' + celular + NL + NL + 'Quisiera coordinar la entrega y el pago.';
const whatsappUrl = 'https://wa.me/51982770361?text=' + encodeURIComponent(msg);
const filas = items.map(i => '<tr><td style="padding:8px;border-bottom:1px solid #e6efe9">' + esc(i.nombre) + '<br><small style="color:#6b7f74">' + i.sku + '</small></td><td style="padding:8px;border-bottom:1px solid #e6efe9;text-align:center">' + i.cantidad + '</td><td style="padding:8px;border-bottom:1px solid #e6efe9;text-align:right">S/ ' + i.subtotal.toFixed(2) + '</td></tr>').join('');
const emailHtml = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #d8e8de;border-radius:12px;overflow:hidden"><div style="background:#0b7a55;color:#fff;padding:18px 24px"><h2 style="margin:0">Nuevo pedido minorista (B2C)</h2><p style="margin:4px 0 0">' + idPedido + ' · ' + esc(fecha) + '</p></div><div style="padding:20px 24px"><h3 style="color:#0b7a55;margin-top:0">Ficha del cliente</h3><p><b>Nombre:</b> ' + esc(nombre) + '<br><b>Correo:</b> ' + esc(correo) + '<br><b>Celular:</b> ' + esc(celular) + '<br><b>Tipo:</b> Venta minorista · Urgencia: compra inmediata</p><table style="width:100%;border-collapse:collapse"><tr style="background:#eef7f1"><th style="padding:8px;text-align:left">Producto</th><th style="padding:8px">Cant.</th><th style="padding:8px;text-align:right">Subtotal</th></tr>' + filas + '<tr><td colspan="2" style="padding:10px;text-align:right"><b>Total</b></td><td style="padding:10px;text-align:right"><b>S/ ' + total.toFixed(2) + '</b></td></tr></table><p style="margin-top:18px"><a href="' + whatsappUrl + '" style="background:#25d366;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Ver mensaje de WhatsApp generado</a></p></div></div>';
return [{ json: { valid: errors.length === 0, errors, idPedido, fecha, nombre, correo, celular, items, detalleTexto, detalleJson: JSON.stringify(items), total: Number(total.toFixed(2)), whatsappUrl, emailHtml } }];`
    }
  },
  output: [{ valid: true, errors: [], idPedido: 'AZ-261030-ABCDE', fecha: '30/10/2026, 10:00:00', nombre: 'María Quispe', correo: 'maria@example.com', celular: '987654321', items: [{ sku: 'AZ-COC-001', nombre: 'Olla Esmaltada Roja 5 L', cantidad: 1, precio: 249, subtotal: 249 }], detalleTexto: '• 1 x Olla Esmaltada Roja 5 L (AZ-COC-001) - S/ 249.00', detalleJson: '[]', total: 249, whatsappUrl: 'https://wa.me/51982770361?text=Hola', emailHtml: '<div></div>' }]
});

const pedidoValido = ifElse({
  version: 2.2,
  config: {
    name: '¿Pedido Válido?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [{ leftValue: expr('{{ $json.valid }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and'
      }
    }
  }
});

const registrarVenta = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Registrar en Hoja Ventas',
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'sheet',
      operation: 'append',
      authentication: 'oAuth2',
      documentId: { __rl: true, mode: 'id', value: '1TMZdtypy1xgrwgpTpTEtyAC_2uGd45kYFpcBkHBmhJU', cachedResultName: 'CRM - Importaciones Azur' },
      sheetName: { __rl: true, mode: 'list', value: '0', cachedResultName: 'Ventas' },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          'Fecha/Hora': expr('{{ $json.fecha }}'),
          'ID Pedido': expr('{{ $json.idPedido }}'),
          'Nombre': expr('{{ $json.nombre }}'),
          'Correo': expr('{{ $json.correo }}'),
          'Celular': expr("{{ \"'\" + $json.celular }}"),
          'Detalle de Productos (JSON/Texto)': expr('{{ $json.detalleTexto }}'),
          'Total (S/)': expr('{{ $json.total }}'),
          'Enlace WhatsApp Generado': expr('{{ $json.whatsappUrl }}')
        },
        schema: [
          { id: 'Fecha/Hora', displayName: 'Fecha/Hora', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'ID Pedido', displayName: 'ID Pedido', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Nombre', displayName: 'Nombre', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Correo', displayName: 'Correo', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Celular', displayName: 'Celular', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Detalle de Productos (JSON/Texto)', displayName: 'Detalle de Productos (JSON/Texto)', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Total (S/)', displayName: 'Total (S/)', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true },
          { id: 'Enlace WhatsApp Generado', displayName: 'Enlace WhatsApp Generado', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
        ]
      },
      options: { cellFormat: 'USER_ENTERED' }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets - Azur') }
  },
  output: [{ 'ID Pedido': 'AZ-261030-ABCDE' }]
});

const notificarVenta = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Notificar Venta por Gmail',
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: 'atco.jah@gmail.com',
      subject: expr("🛒 Nuevo pedido B2C {{ $('Validar y Preparar Pedido').item.json.idPedido }} · S/ {{ $('Validar y Preparar Pedido').item.json.total.toFixed(2) }} · {{ $('Validar y Preparar Pedido').item.json.nombre }}"),
      emailType: 'html',
      message: expr("{{ $('Validar y Preparar Pedido').item.json.emailHtml }}"),
      options: { appendAttribution: false, senderName: 'Importaciones Azur · Web' }
    },
    credentials: { gmailOAuth2: newCredential('Gmail - Azur') }
  },
  output: [{ id: '18c0', threadId: '18c0', labelIds: ['SENT'] }]
});

const responderOk = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Responder Pedido OK',
    parameters: {
      respondWith: 'json',
      responseBody: expr("{{ JSON.stringify({ ok: true, idPedido: $('Validar y Preparar Pedido').item.json.idPedido, total: $('Validar y Preparar Pedido').item.json.total, whatsappUrl: $('Validar y Preparar Pedido').item.json.whatsappUrl }) }}"),
      options: { responseCode: 200 }
    }
  }
});

const responderError = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Responder Pedido Inválido',
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ JSON.stringify({ ok: false, errors: $json.errors }) }}'),
      options: { responseCode: 400 }
    }
  }
});

export default workflow('azur-carrito-b2c', 'Azur · Procesamiento de Carrito B2C')
  .add(pedidoWebhook)
  .to(validarPedido)
  .to(pedidoValido
    .onTrue(registrarVenta.to(notificarVenta.to(responderOk)))
    .onFalse(responderError));
