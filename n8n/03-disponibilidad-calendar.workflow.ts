import { workflow, node, trigger, newCredential, expr } from '@n8n/workflow-sdk';

const disponibilidadWebhook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {
    name: 'Webhook Disponibilidad',
    parameters: {
      httpMethod: 'GET',
      path: 'azur-disponibilidad',
      responseMode: 'responseNode',
      options: { allowedOrigins: 'https://importaciones-azur.vercel.app', ignoreBots: true }
    }
  },
  output: [{ query: {} }]
});

const leerEventos = node({
  type: 'n8n-nodes-base.googleCalendar',
  version: 1.3,
  config: {
    name: 'Leer Bloques Ocupados',
    alwaysOutputData: true,
    executeOnce: true,
    parameters: {
      resource: 'event',
      operation: 'getAll',
      calendar: { __rl: true, mode: 'id', value: 'primary' },
      returnAll: true,
      timeMin: expr('{{ $now.toISO() }}'),
      timeMax: expr('{{ $now.plus({ days: 15 }).toISO() }}'),
      options: { recurringEventHandling: 'expand', orderBy: 'startTime' }
    },
    credentials: { googleCalendarOAuth2Api: newCredential('Google Calendar - Azur') }
  },
  output: [{ start: { dateTime: '2026-11-02T10:00:00-05:00' }, end: { dateTime: '2026-11-02T11:00:00-05:00' }, status: 'confirmed' }]
});

const calcularBloques = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Calcular Bloques Libres (Anónimos)',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const toMs = (x) => x && x.dateTime ? new Date(x.dateTime).getTime() : (x && x.date ? new Date(x.date + 'T00:00:00-05:00').getTime() : NaN);
const busy = $input.all().map(i => i.json).filter(e => e && e.start && e.end && e.status !== 'cancelled' && e.transparency !== 'transparent').map(e => [toMs(e.start), toMs(e.end)]).filter(b => !isNaN(b[0]) && !isNaN(b[1]));
const pad = (n) => String(n).padStart(2, '0');
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const now = Date.now();
const minStart = now + 2 * 3600 * 1000;
const limaNow = new Date(now - 5 * 3600 * 1000);
const days = [];
for (let d = 0; d < 14; d++) {
  const day = new Date(Date.UTC(limaNow.getUTCFullYear(), limaNow.getUTCMonth(), limaNow.getUTCDate() + d));
  const dow = day.getUTCDay();
  if (dow === 0) continue;
  const ymd = day.getUTCFullYear() + '-' + pad(day.getUTCMonth() + 1) + '-' + pad(day.getUTCDate());
  const endH = dow === 6 ? 13 : 17;
  const slots = [];
  for (let h = 9; h < endH; h++) {
    const startIso = ymd + 'T' + pad(h) + ':00:00-05:00';
    const s = new Date(startIso).getTime();
    const e = s + 3600 * 1000;
    if (s < minStart) continue;
    if (busy.some(b => b[0] < e && b[1] > s)) continue;
    slots.push({ start: startIso, label: pad(h) + ':00 - ' + pad(h + 1) + ':00' });
  }
  if (slots.length) days.push({ date: ymd, label: DIAS[dow] + ' ' + day.getUTCDate() + ' ' + MESES[day.getUTCMonth()], slots });
}
return [{ json: { ok: true, timezone: 'America/Lima', reglas: 'Lun-Vie 09:00-17:00 · Sáb 09:00-13:00 · Dom cerrado', days } }];`
    }
  },
  output: [{ ok: true, timezone: 'America/Lima', reglas: 'Lun-Vie 09:00-17:00 · Sáb 09:00-13:00 · Dom cerrado', days: [{ date: '2026-11-02', label: 'Lun 2 nov', slots: [{ start: '2026-11-02T09:00:00-05:00', label: '09:00 - 10:00' }] }] }]
});

const responderBloques = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Responder Bloques Libres',
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ JSON.stringify($json) }}'),
      options: { responseCode: 200, responseHeaders: { entries: [{ name: 'Cache-Control', value: 'no-store' }] } }
    }
  }
});

export default workflow('azur-disponibilidad', 'Azur · Disponibilidad Calendar (Free/Busy Anónimo)')
  .add(disponibilidadWebhook)
  .to(leerEventos)
  .to(calcularBloques)
  .to(responderBloques);
