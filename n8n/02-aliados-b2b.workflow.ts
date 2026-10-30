import { workflow, node, trigger, ifElse, newCredential, expr } from '@n8n/workflow-sdk';

const aliadoWebhook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {
    name: 'Webhook Aliado B2B',
    parameters: {
      httpMethod: 'POST',
      path: 'azur-aliado',
      responseMode: 'responseNode',
      options: { allowedOrigins: 'https://importaciones-azur.vercel.app', ignoreBots: true }
    }
  },
  output: [{ body: { nombre: 'Rosa Huamán', correo: 'rosa@empresa.pe', celular: '987654321', empresa: 'Bazar Rosa SAC', cargo: 'Gerente', urgencia: 'Lo más pronto posible', cita: '2026-11-02T10:00:00-05:00', website: '' } }]
});

const validarLead = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Validar Lead B2B',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const URG = ['Lo más pronto posible', 'Entre uno y tres meses', 'Después de tres meses', 'Solo estoy consultando información'];
const inp = $input.first().json;
const b = (inp.body && typeof inp.body === 'object') ? inp.body : inp;
const clean = (v, max) => String(v == null ? '' : v).replace(/[<>{}]/g, '').trim().slice(0, max);
const nombre = clean(b.nombre, 80);
const correo = clean(b.correo, 120).toLowerCase();
const celular = clean(b.celular, 20).replace(/[ ()-]/g, '');
const empresa = clean(b.empresa, 100);
const cargo = clean(b.cargo, 80);
const urgencia = clean(b.urgencia, 60);
const errors = [];
if (clean(b.website, 50)) errors.push('bot');
if (nombre.length < 3 || !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/.test(nombre)) errors.push('nombre');
if (!/^[^ @]+@[^ @]+[.][^ @.]{2,}$/.test(correo)) errors.push('correo');
if (!/^([+]?51)?9[0-9]{8}$/.test(celular)) errors.push('celular');
if (empresa.length < 2) errors.push('empresa');
if (cargo.length < 2) errors.push('cargo');
if (!URG.includes(urgencia)) errors.push('urgencia');
const pool = (urgencia === URG[0] || urgencia === URG[1]) ? 'A' : 'B';
let quiereCita = false, citaInicio = '', citaFin = '', citaTexto = '';
const citaRaw = clean(b.cita, 40);
if (urgencia === URG[0] && citaRaw) {
  const t = new Date(citaRaw);
  if (isNaN(t.getTime())) { errors.push('cita'); }
  else {
    const lima = new Date(t.getTime() - 5 * 3600 * 1000);
    const dow = lima.getUTCDay(); const h = lima.getUTCHours(); const m = lima.getUTCMinutes();
    const okDia = dow >= 1 && dow <= 6;
    const fin = dow === 6 ? 13 : 17;
    const okHora = okDia && m === 0 && h >= 9 && (h + 1) <= fin;
    const ahora = Date.now();
    const okFecha = t.getTime() > ahora + 60 * 60 * 1000 && t.getTime() < ahora + 31 * 24 * 3600 * 1000;
    if (!okHora || !okFecha) { errors.push('cita_fuera_de_horario'); }
    else {
      quiereCita = true;
      const pad = (n) => String(n).padStart(2, '0');
      const ymd = lima.getUTCFullYear() + '-' + pad(lima.getUTCMonth() + 1) + '-' + pad(lima.getUTCDate());
      citaInicio = ymd + 'T' + pad(h) + ':00:00-05:00';
      citaFin = ymd + 'T' + pad(h + 1) + ':00:00-05:00';
      const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      citaTexto = dias[dow] + ' ' + pad(lima.getUTCDate()) + '/' + pad(lima.getUTCMonth() + 1) + '/' + lima.getUTCFullYear() + ' ' + pad(h) + ':00 - ' + pad(h + 1) + ':00 (hora Perú)';
    }
  }
}
const now = new Date();
const idLead = 'AL-' + now.toISOString().slice(2, 10).split('-').join('') + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
const fecha = now.toLocaleString('es-PE', { timeZone: 'America/Lima', hour12: false });
return [{ json: { valid: errors.length === 0, errors, idLead, fecha, nombre, correo, celular, empresa, cargo, urgencia, pool, quiereCita, citaInicio, citaFin, citaTexto } }];`
    }
  },
  output: [{ valid: true, errors: [], idLead: 'AL-261030-ABCDE', fecha: '30/10/2026, 10:00:00', nombre: 'Rosa Huamán', correo: 'rosa@empresa.pe', celular: '987654321', empresa: 'Bazar Rosa SAC', cargo: 'Gerente', urgencia: 'Lo más pronto posible', pool: 'A', quiereCita: true, citaInicio: '2026-11-02T10:00:00-05:00', citaFin: '2026-11-02T11:00:00-05:00', citaTexto: 'lunes 02/11/2026 10:00 - 11:00 (hora Perú)' }]
});

const leadValido = ifElse({
  version: 2.2,
  config: {
    name: '¿Lead Válido?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [{ leftValue: expr('{{ $json.valid }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and'
      }
    }
  }
});

const leerHistorial = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Leer Historial de Aliados',
    alwaysOutputData: true,
    executeOnce: true,
    parameters: {
      resource: 'sheet',
      operation: 'read',
      authentication: 'oAuth2',
      documentId: { __rl: true, mode: 'id', value: '1TMZdtypy1xgrwgpTpTEtyAC_2uGd45kYFpcBkHBmhJU', cachedResultName: 'CRM - Importaciones Azur' },
      sheetName: { __rl: true, mode: 'list', value: '1', cachedResultName: 'Posibles Aliados' },
      options: {}
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets - Azur') }
  },
  output: [{ 'ID Lead': 'AL-261029-XYZ12', 'Vendedor Asignado (Ana/Bella/Charlie/Delfi)': 'Ana' }]
});

const asignarVendedor = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Asignar Vendedor (Urgencia + Round-Robin)',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const lead = $('Validar Lead B2B').first().json;
const COL = 'Vendedor Asignado (Ana/Bella/Charlie/Delfi)';
const TODOS = ['Ana', 'Bella', 'Charlie', 'Delfi'];
const POOLS = { A: ['Ana', 'Bella'], B: ['Charlie', 'Delfi'] };
const historial = $input.all().map(i => String((i.json && i.json[COL]) || '').trim()).filter(v => TODOS.includes(v));
const ultimoGeneral = historial.length ? historial[historial.length - 1] : null;
const pool = POOLS[lead.pool];
const ultimoDelPool = historial.slice().reverse().find(v => pool.includes(v)) || null;
let vendedor = ultimoDelPool ? pool[(pool.indexOf(ultimoDelPool) + 1) % pool.length] : pool[0];
if (vendedor === ultimoGeneral) vendedor = pool.find(v => v !== ultimoGeneral);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const mensaje = 'Hola, ' + vendedor + ', soy ' + lead.nombre + ', de la empresa ' + lead.empresa + ' (' + lead.cargo + '), mi correo es ' + lead.correo + ' y mi celular es ' + lead.celular + ', estoy interesado en convertirme en su aliado, por favor, deseo más información';
const waLink = 'https://wa.me/51982770361?text=' + encodeURIComponent(mensaje);
const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&color=0b5d43&data=' + encodeURIComponent(waLink);
const beneficio = (t, d) => '<td style="width:33%;padding:10px;vertical-align:top"><div style="background:#eef7f1;border-radius:12px;padding:14px;height:100%"><div style="font-weight:bold;color:#0b5d43;font-size:15px">' + t + '</div><div style="color:#4a5d53;font-size:13px;margin-top:6px">' + d + '</div></div></td>';
const promoHtml = '<div style="background:#f4f8f5;padding:24px 8px;font-family:Arial,Helvetica,sans-serif"><table role="presentation" style="max-width:620px;width:100%;margin:auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #d8e8de" cellspacing="0" cellpadding="0">'
  + '<tr><td style="background:linear-gradient(135deg,#0b5d43,#12a073);background-color:#0b7a55;padding:28px 32px;color:#ffffff"><div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;opacity:.85">Importaciones Azur · Aliados</div><div style="font-size:26px;font-weight:bold;margin-top:6px">¡Hola, ' + esc(lead.nombre.split(' ')[0]) + '! Bienvenido a nuestra red de aliados</div><div style="margin-top:8px;font-size:15px;opacity:.95">Precios al por mayor altamente atractivos a partir de las 50 unidades.</div></td></tr>'
  + '<tr><td style="padding:24px 32px 8px;color:#23342b;font-size:15px;line-height:1.55">Gracias por tu interés en convertir a <b>' + esc(lead.empresa) + '</b> en aliado de Importaciones Azur. Tu ejecutivo(a) asignado(a) es <b style="color:#0b7a55">' + vendedor + '</b>, quien te acompañará con una propuesta a la medida de tu negocio.</td></tr>'
  + '<tr><td style="padding:8px 22px"><table role="presentation" style="width:100%" cellspacing="0" cellpadding="0"><tr>' + beneficio('Precio mayorista', 'Tarifas escalonadas desde 50 unidades por SKU.') + beneficio('30 productos hogar', 'Organización, cocina, dormitorio, baño, deco y textil.') + beneficio('Atención dedicada', 'Un ejecutivo exclusivo y despacho a todo el Perú.') + '</tr></table></td></tr>'
  + (lead.quiereCita ? '<tr><td style="padding:8px 32px;color:#23342b;font-size:14px"><div style="border-left:4px solid #12a073;padding:8px 12px;background:#f4faf6">📅 Solicitaste una reunión para el <b>' + esc(lead.citaTexto) + '</b>. Recibirás la invitación de Google Calendar en tu correo.</div></td></tr>' : '')
  + '<tr><td style="padding:20px 32px;text-align:center"><a href="' + waLink + '" style="display:inline-block;background:#25d366;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px;font-size:16px">Escribir a ' + vendedor + ' por WhatsApp</a></td></tr>'
  + '<tr><td style="padding:4px 32px 24px;text-align:center"><div style="color:#4a5d53;font-size:13px;margin-bottom:10px">¿Estás en tu computadora? Escanea este código QR con tu celular:</div><img src="' + qrUrl + '" width="240" height="240" alt="Código QR para escribir a ' + vendedor + ' por WhatsApp" style="border:6px solid #eef7f1;border-radius:12px"></td></tr>'
  + '<tr><td style="background:#0b5d43;color:#d9efe3;padding:16px 32px;font-size:12px;text-align:center">Importaciones Azur · Tienda 100% virtual de artículos para el hogar · WhatsApp +51 982 770 361<br>Recibes este correo porque registraste tu interés en nuestro programa de aliados.</td></tr>'
  + '</table></div>';
return [{ json: Object.assign({}, lead, { vendedor, ultimoGeneral, ultimoDelPool, mensajeWhatsapp: mensaje, waLink, qrUrl, promoHtml }) }];`
    }
  },
  output: [{ idLead: 'AL-261030-ABCDE', fecha: '30/10/2026, 10:00:00', nombre: 'Rosa Huamán', correo: 'rosa@empresa.pe', celular: '987654321', empresa: 'Bazar Rosa SAC', cargo: 'Gerente', urgencia: 'Lo más pronto posible', pool: 'A', quiereCita: true, citaInicio: '2026-11-02T10:00:00-05:00', citaFin: '2026-11-02T11:00:00-05:00', citaTexto: 'lunes 02/11/2026 10:00 - 11:00 (hora Perú)', vendedor: 'Bella', ultimoGeneral: 'Ana', ultimoDelPool: 'Ana', mensajeWhatsapp: 'Hola, Bella, ...', waLink: 'https://wa.me/51982770361?text=Hola', qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?data=x', promoHtml: '<div></div>' }]
});

const requiereCita = ifElse({
  version: 2.2,
  config: {
    name: '¿Requiere Cita?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [{ leftValue: expr('{{ $json.quiereCita }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and'
      }
    }
  }
});

const verificarDisponibilidad = node({
  type: 'n8n-nodes-base.googleCalendar',
  version: 1.3,
  config: {
    name: 'Verificar Disponibilidad en Calendar',
    parameters: {
      resource: 'calendar',
      operation: 'availability',
      calendar: { __rl: true, mode: 'id', value: 'primary' },
      timeMin: expr('{{ $json.citaInicio }}'),
      timeMax: expr('{{ $json.citaFin }}'),
      options: { outputFormat: 'availability' }
    },
    credentials: { googleCalendarOAuth2Api: newCredential('Google Calendar - Azur') }
  },
  output: [{ available: true }]
});

const bloqueLibre = ifElse({
  version: 2.2,
  config: {
    name: '¿Bloque Libre?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [{ leftValue: expr('{{ $json.available }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and'
      }
    }
  }
});

const crearEvento = node({
  type: 'n8n-nodes-base.googleCalendar',
  version: 1.3,
  config: {
    name: 'Crear Evento en Calendar',
    parameters: {
      resource: 'event',
      operation: 'create',
      calendar: { __rl: true, mode: 'id', value: 'primary' },
      start: expr("{{ $('Asignar Vendedor (Urgencia + Round-Robin)').item.json.citaInicio }}"),
      end: expr("{{ $('Asignar Vendedor (Urgencia + Round-Robin)').item.json.citaFin }}"),
      useDefaultReminders: true,
      additionalFields: {
        summary: expr("Reunión Aliado Azur · {{ $('Asignar Vendedor (Urgencia + Round-Robin)').item.json.empresa }} · Ejecutivo: {{ $('Asignar Vendedor (Urgencia + Round-Robin)').item.json.vendedor }}"),
        description: expr("Lead {{ $('Asignar Vendedor (Urgencia + Round-Robin)').item.json.idLead }} · {{ $('Asignar Vendedor (Urgencia + Round-Robin)').item.json.nombre }} ({{ $('Asignar Vendedor (Urgencia + Round-Robin)').item.json.cargo }}) · Urgencia: Lo más pronto posible · Ejecutivo asignado: {{ $('Asignar Vendedor (Urgencia + Round-Robin)').item.json.vendedor }}"),
        attendees: [expr("{{ $('Asignar Vendedor (Urgencia + Round-Robin)').item.json.correo }}")],
        conferenceDataUi: { conferenceDataValues: { conferenceSolution: 'hangoutsMeet' } },
        sendUpdates: 'all',
        guestsCanSeeOtherGuests: false
      }
    },
    credentials: { googleCalendarOAuth2Api: newCredential('Google Calendar - Azur') }
  },
  output: [{ id: 'evt123', htmlLink: 'https://calendar.google.com/event?eid=x', status: 'confirmed' }]
});

const consolidarLead = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Consolidar Lead y Cita',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const a = $('Asignar Vendedor (Urgencia + Round-Robin)').first().json;
let citaEstado = 'no_solicitada';
let citaColumna = 'No';
if (a.quiereCita) {
  if ($('Crear Evento en Calendar').isExecuted) { citaEstado = 'agendada'; citaColumna = 'Sí - ' + a.citaTexto; }
  else { citaEstado = 'ocupado'; citaColumna = 'No - bloque ocupado (' + a.citaTexto + ')'; }
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fila = (k, v) => '<tr><td style="padding:6px 10px;color:#4a5d53;width:38%">' + k + '</td><td style="padding:6px 10px"><b>' + esc(v) + '</b></td></tr>';
const internoHtml = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #d8e8de;border-radius:12px;overflow:hidden"><div style="background:#0b5d43;color:#fff;padding:18px 24px"><h2 style="margin:0">Nuevo posible aliado (B2B)</h2><p style="margin:4px 0 0">' + a.idLead + ' · ' + esc(a.fecha) + '</p></div><table style="width:100%;border-collapse:collapse;font-size:14px">'
  + fila('Nombre', a.nombre) + fila('Correo', a.correo) + fila('Celular', a.celular) + fila('Empresa', a.empresa) + fila('Cargo', a.cargo)
  + fila('Urgencia', a.urgencia) + fila('Pool', a.pool === 'A' ? 'Alta / Media-Alta (Ana-Bella)' : 'Media-Baja / Informativa (Charlie-Delfi)')
  + fila('Asesor asignado', a.vendedor) + fila('Asesor del lead anterior', a.ultimoGeneral || '—') + fila('Cita', citaColumna)
  + '</table><p style="padding:0 24px 20px"><a href="' + a.waLink + '" style="background:#25d366;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Ver mensaje de WhatsApp del lead</a></p></div>';
return [{ json: Object.assign({}, a, { citaEstado, citaColumna, internoHtml }) }];`
    }
  },
  output: [{ idLead: 'AL-261030-ABCDE', fecha: '30/10/2026, 10:00:00', nombre: 'Rosa Huamán', correo: 'rosa@empresa.pe', celular: '987654321', empresa: 'Bazar Rosa SAC', cargo: 'Gerente', urgencia: 'Lo más pronto posible', vendedor: 'Bella', citaEstado: 'agendada', citaColumna: 'Sí - lunes 02/11/2026 10:00 - 11:00 (hora Perú)', promoHtml: '<div></div>', internoHtml: '<div></div>', waLink: 'https://wa.me/51982770361' }]
});

const enviarPromo = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Enviar PromoMail con QR',
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ $json.correo }}'),
      subject: expr('🌿 {{ $json.nombre.split(" ")[0] }}, tu ejecutivo(a) {{ $json.vendedor }} te espera · Aliados Importaciones Azur'),
      emailType: 'html',
      message: expr('{{ $json.promoHtml }}'),
      options: { appendAttribution: false, senderName: 'Importaciones Azur' }
    },
    credentials: { gmailOAuth2: newCredential('Gmail - Azur') }
  },
  output: [{ id: '18c0', threadId: '18c0', labelIds: ['SENT'] }]
});

const registrarAliado = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Registrar en Posibles Aliados',
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'sheet',
      operation: 'append',
      authentication: 'oAuth2',
      documentId: { __rl: true, mode: 'id', value: '1TMZdtypy1xgrwgpTpTEtyAC_2uGd45kYFpcBkHBmhJU', cachedResultName: 'CRM - Importaciones Azur' },
      sheetName: { __rl: true, mode: 'list', value: '1', cachedResultName: 'Posibles Aliados' },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          'Fecha/Hora': expr("{{ $('Consolidar Lead y Cita').item.json.fecha }}"),
          'ID Lead': expr("{{ $('Consolidar Lead y Cita').item.json.idLead }}"),
          'Nombre': expr("{{ $('Consolidar Lead y Cita').item.json.nombre }}"),
          'Correo': expr("{{ $('Consolidar Lead y Cita').item.json.correo }}"),
          'Celular': expr("{{ \"'\" + $('Consolidar Lead y Cita').item.json.celular }}"),
          'Empresa': expr("{{ $('Consolidar Lead y Cita').item.json.empresa }}"),
          'Cargo': expr("{{ $('Consolidar Lead y Cita').item.json.cargo }}"),
          'Plazo para Empezar (Urgencia)': expr("{{ $('Consolidar Lead y Cita').item.json.urgencia }}"),
          'Vendedor Asignado (Ana/Bella/Charlie/Delfi)': expr("{{ $('Consolidar Lead y Cita').item.json.vendedor }}"),
          'Cita Agendada (Sí/No + Fecha/Hora)': expr("{{ $('Consolidar Lead y Cita').item.json.citaColumna }}"),
          'Estado PromoMail': expr("{{ $json.id ? 'Enviado (' + $json.id + ')' : 'Error de envío' }}")
        },
        schema: [
          { id: 'Fecha/Hora', displayName: 'Fecha/Hora', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'ID Lead', displayName: 'ID Lead', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Nombre', displayName: 'Nombre', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Correo', displayName: 'Correo', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Celular', displayName: 'Celular', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Empresa', displayName: 'Empresa', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Cargo', displayName: 'Cargo', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Plazo para Empezar (Urgencia)', displayName: 'Plazo para Empezar (Urgencia)', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Vendedor Asignado (Ana/Bella/Charlie/Delfi)', displayName: 'Vendedor Asignado (Ana/Bella/Charlie/Delfi)', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Cita Agendada (Sí/No + Fecha/Hora)', displayName: 'Cita Agendada (Sí/No + Fecha/Hora)', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Estado PromoMail', displayName: 'Estado PromoMail', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
        ]
      },
      options: { cellFormat: 'USER_ENTERED' }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets - Azur') }
  },
  output: [{ 'ID Lead': 'AL-261030-ABCDE' }]
});

const notificarAliado = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Notificar Lead B2B por Gmail',
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: 'atco.jah@gmail.com',
      subject: expr("🤝 Nuevo aliado {{ $('Consolidar Lead y Cita').item.json.idLead }} · {{ $('Consolidar Lead y Cita').item.json.empresa }} · {{ $('Consolidar Lead y Cita').item.json.urgencia }} → {{ $('Consolidar Lead y Cita').item.json.vendedor }}"),
      emailType: 'html',
      message: expr("{{ $('Consolidar Lead y Cita').item.json.internoHtml }}"),
      options: { appendAttribution: false, senderName: 'Importaciones Azur · CRM' }
    },
    credentials: { gmailOAuth2: newCredential('Gmail - Azur') }
  },
  output: [{ id: '18c1', threadId: '18c1', labelIds: ['SENT'] }]
});

const responderAliadoOk = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Responder Aliado OK',
    parameters: {
      respondWith: 'json',
      responseBody: expr("{{ JSON.stringify({ ok: true, idLead: $('Consolidar Lead y Cita').item.json.idLead, vendedor: $('Consolidar Lead y Cita').item.json.vendedor, cita: $('Consolidar Lead y Cita').item.json.citaEstado, citaTexto: $('Consolidar Lead y Cita').item.json.citaTexto, whatsappUrl: $('Consolidar Lead y Cita').item.json.waLink }) }}"),
      options: { responseCode: 200 }
    }
  }
});

const responderAliadoError = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Responder Lead Inválido',
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ JSON.stringify({ ok: false, errors: $json.errors }) }}'),
      options: { responseCode: 400 }
    }
  }
});

export default workflow('azur-aliados-b2b', 'Azur · Procesamiento de Aliados B2B')
  .add(aliadoWebhook)
  .to(validarLead)
  .to(leadValido
    .onTrue(leerHistorial.to(asignarVendedor.to(requiereCita
      .onTrue(verificarDisponibilidad.to(bloqueLibre
        .onTrue(crearEvento.to(consolidarLead))
        .onFalse(consolidarLead)))
      .onFalse(consolidarLead))))
    .onFalse(responderAliadoError))
  .add(consolidarLead)
  .to(enviarPromo)
  .to(registrarAliado)
  .to(notificarAliado)
  .to(responderAliadoOk);
