# Importaciones Azur 🌿

Tienda 100 % virtual de artículos para el hogar en Perú. Frontend estático (Vercel) + automatizaciones en n8n (Google Sheets, Gmail, Google Calendar y OpenAI). **Ningún pago se procesa en la web**: toda conversión cierra en WhatsApp (`+51 982 770 361`).

## Estructura

```
index.html                 Landing, catálogo, carrito, checkout, B2B y chat
assets/css/styles.css      Estilos (verde esmeralda, salvia, menta, bosque + blanco)
assets/js/app.js           Lógica de catálogo, carrito, checkout, aliados y chatbot
assets/js/catalog.js       Generado desde data/catalog.json (no editar a mano)
assets/js/config.js        URLs públicas de los webhooks de n8n
assets/img/                Logo, favicon y mascota "Azur" (SVG originales)
data/catalog.json          Inventario fuente: 30 productos, 6 categorías
n8n/*.workflow.ts          Código fuente (Workflow SDK) de los 4 flujos de n8n
scripts/build-catalog.mjs  Regenera catalog.js
vercel.json                Cabeceras de seguridad y CSP
```

Regenerar el catálogo tras editar `data/catalog.json`:

```bash
npm run build:catalog
```

Servidor local: `npm run dev` → http://localhost:5173

## Flujos de n8n

| Flujo | Webhook | Qué hace |
|---|---|---|
| Azur · Gateway del Chatbot | `POST /webhook/azur-chat` | Guardrail de entrada → agente gpt-4o-mini con herramienta `consultar_inventario` → guardrail de salida |
| Azur · Procesamiento de Carrito B2C | `POST /webhook/azur-pedido` | Revalida datos y **precios en servidor**, registra en `Ventas`, alerta por Gmail, devuelve el enlace de WhatsApp |
| Azur · Procesamiento de Aliados B2B | `POST /webhook/azur-aliado` | Valida, lee historial, asigna vendedor (urgencia + round-robin), verifica y crea cita en Calendar, envía PromoMail con QR, registra en `Posibles Aliados` y alerta por Gmail |
| Azur · Disponibilidad Calendar | `GET /webhook/azur-disponibilidad` | Devuelve **solo** bloques libres anónimos (L-V 9:00-17:00, Sáb 9:00-13:00, hora Perú) |

### Asignación de vendedores

- Pool A (urgencia alta/media-alta: *Lo más pronto posible*, *Entre uno y tres meses*): **Ana ↔ Bella**.
- Pool B (urgencia media-baja/informativa: *Después de tres meses*, *Solo estoy consultando información*): **Charlie ↔ Delfi**.
- El estado vive en la pestaña `Posibles Aliados`: se toma el último asesor del pool y se rota al siguiente; además se compara con el último lead general para que **nunca** se repita asesor en dos leads consecutivos.

## Seguridad

- **Sin claves en el frontend**: OpenAI se invoca solo desde n8n.
- **Zero-Read**: el frontend y el chatbot no tienen ningún endpoint de lectura sobre Sheets ni sobre detalles de Calendar. La disponibilidad solo expone rangos horarios libres.
- **Anti-prompt-injection en capas**: límite de 500 caracteres, normalización (acentos, caracteres invisibles), listas de patrones de inyección y exfiltración (también sobre el historial enviado por el navegador), delimitadores `<<< >>>` para datos no confiables, system prompt blindado con token canario, y guardrail de salida que bloquea fugas, enmascara correos/teléfonos y filtra acciones a una lista blanca de SKU.
- **Validación en servidor** de todos los formularios (regex, honeypot anti-bots, horario permitido de citas) y recálculo de precios desde el catálogo del servidor.
- **CSP estricta** y cabeceras de seguridad en `vercel.json`; todo el texto dinámico se pinta con `textContent` (sin `innerHTML`).

## Reseñas

Las reseñas de la landing son **ficticias, de ejemplo**, con nombres inventados; no provienen de ningún sitio de referencia.
