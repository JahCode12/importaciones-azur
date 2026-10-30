// URLs públicas de los webhooks de producción en n8n.
// Solo aceptan escritura validada (POST) o devuelven datos anónimos; ninguna expone datos de clientes.
const N8N = 'https://jahcode.app.n8n.cloud/webhook';

export const CONFIG = {
  whatsapp: '51982770361',
  endpoints: {
    chat: `${N8N}/azur-chat`,
    pedido: `${N8N}/azur-pedido`,
    aliado: `${N8N}/azur-aliado`,
    disponibilidad: `${N8N}/azur-disponibilidad`
  },
  chatMaxChars: 500
};
