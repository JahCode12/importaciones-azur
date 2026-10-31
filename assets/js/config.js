// URLs públicas de los webhooks de producción en n8n.
// Solo aceptan escritura validada (POST) o devuelven datos anónimos; ninguna expone datos de clientes.
const N8N = 'https://jahcode.app.n8n.cloud/webhook';

export const CONFIG = {
  whatsapp: '51982770361',
  endpoints: {
    chat: `${N8N}/azur-chat`,
    // Chatbot de captura de leads (workflow "AZUR PUEBAS finales": Chat Trigger + agente con memoria).
    chatLeads: `${N8N}/71807831-681c-444f-99ca-18cd944dc200/chat`,
    pedido: `${N8N}/azur-pedido`,
    aliado: `${N8N}/azur-aliado`,
    disponibilidad: `${N8N}/azur-disponibilidad`
  },
  chatMaxChars: 500
};
