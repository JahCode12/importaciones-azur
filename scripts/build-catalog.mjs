// Genera assets/js/catalog.js a partir de data/catalog.json (fuente única del inventario).
import { readFileSync, writeFileSync } from 'node:fs';

const catalog = JSON.parse(readFileSync(new URL('../data/catalog.json', import.meta.url), 'utf8'));
const products = catalog.map((p) => ({
  sku: p.sku,
  name: p.name,
  category: p.category,
  price: p.price,
  stock: p.stock,
  desc: p.desc,
  img: `https://images.unsplash.com/photo-${p.img}?auto=format&fit=crop&w=640&h=640&q=70`
}));

const out = `// Archivo generado por scripts/build-catalog.mjs — no editar a mano.\nexport const PRODUCTS = ${JSON.stringify(products, null, 2)};\n`;
writeFileSync(new URL('../assets/js/catalog.js', import.meta.url), out);
console.log(`catalog.js generado con ${products.length} productos`);
