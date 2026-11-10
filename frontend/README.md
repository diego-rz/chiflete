# Chiflete — Frontend

Pantalla web mobile-first para buscar una ciudad y ver su clima actual. El navegador solo habla
con este servidor Next.js; sus Route Handlers (`/api/*`) llaman al backend.

- **Stack**: Next.js 16.4 (App Router, `output: "standalone"`), React 19.3, TypeScript 5.9 en modo
  `strict`, Tailwind CSS 4.3.
- **Contrato**: los tipos de `src/lib/api-types.ts` se generan desde
  [`../contract/openapi.yaml`](../contract/openapi.yaml) con `openapi-typescript`. El archivo no se
  versiona ni se edita: se regenera solo antes de `dev`, `build` y `test`.
- **Textos**: todo texto visible sale de [`src/i18n/messages/es.json`](src/i18n/messages/es.json)
  mediante `t(key)` (Principio VIII). Una prueba falla si un componente tiene texto incrustado.
- **Llamadas al backend**: `src/lib/backend-client.ts` lee `BACKEND_URL` en cada petición, corta a
  los 5 s y registra una línea JSON por llamada, sin la query string ni IPs.

## Pantalla y estados

Componentes en `src/components/`: `CitySearch` (cuadro, búsqueda desde 3 caracteres y tandas de
5), `CityResultList` y `LoadMoreButton`, `CurrentWeatherCard`, `ErrorMessage` y `StaleWarning`.
`src/lib/use-latest-request.ts` descarta las respuestas fuera de orden.

| Situación | Lo que ve el usuario |
|-----------|----------------------|
| Búsqueda sin coincidencias | "Sin resultados" |
| Fallo o tiempo agotado al buscar u obtener el clima | "Error interno", sin datos; se reintenta escribiendo de nuevo o con "Actualizar" |
| Fallo al cargar más resultados | Se conservan los mostrados, "Error interno" debajo y el botón disponible |
| Dato no informado por el proveedor | "-" (un 0 se muestra como 0 con su unidad) |
| Observación de más de 2 horas | "Datos desactualizados" junto a los datos y la hora |

Al pie se muestra la atribución que exigen las licencias de Open-Meteo (CC BY 4.0) y GeoNames.
La página no guarda nada en el navegador: ni cookies ni `localStorage`.

## Construir y ejecutar

Requisitos: Node.js 24 LTS.

```bash
npm ci
BACKEND_URL=http://localhost:8080 npm run dev     # http://localhost:3000
npm run build                                     # genera .next/standalone
```

Con Docker, desde la raíz del repositorio (el contexto de build es la raíz, para incluir
`contract/`):

```bash
docker compose up --build                         # http://localhost:3000
```

## Pruebas

```bash
npx playwright install chromium   # solo la primera vez
npm test                          # tsc + Vitest + Playwright; o, desde la raíz, make test
```

- `tsc --noEmit`: tipos, incluidas las claves del catálogo y las respuestas simuladas.
- Vitest + React Testing Library (`tests/unit/`).
- Playwright a 320 × 640 (`tests/e2e/`), contra el servidor standalone compilado y un backend
  simulado (`tests/e2e/mock-backend.mts`), sin red. Cada spec comprueba con
  `tests/e2e/mobile.ts` que no hay scroll horizontal y que todo elemento interactivo mide al
  menos 44 × 44 px. Las respuestas simuladas se tipan con los
  tipos del contrato (`satisfies`), así que `tsc` falla si dejan de cumplirlo.

## Configuración

| Variable | Uso |
|----------|-----|
| `BACKEND_URL` | URL del backend, leída en tiempo de ejecución (en compose: `http://backend:8080`) |
| `PORT`, `HOSTNAME` | Puerto y dirección del servidor standalone (en la imagen: `3000`, `0.0.0.0`) |

## Verificado durante la implementación

Resultado de los puntos "pendientes de verificar" del plan (2026-11-09):

| Punto | Resultado |
|-------|-----------|
| TypeScript | Se fija 5.9.3. `create-next-app` 16.4.5 instala `^5`; la última publicada es 7.0.2, sin soporte verificado en Next 16. |
| Vitest 5 con Next 16 y React 19.3 | Funciona (Vitest 5.1.0, jsdom 31). Exige `@types/node` ≥ 22 (se usa ^24). La configuración va en `vitest.config.mts`, como recomienda la guía de Next. |
| Plantilla de Next 16.4 | Activa `cacheComponents` y `partialPrefetching`. Se mantienen: los Route Handlers que leen la petición se ejecutan en cada petición. Se quitaron las fuentes de Google (Geist) para que el build no dependa de la red. |
| `next start` con `standalone` | No se debe combinar; las pruebas E2E arrancan `node .next/standalone/server.js`, igual que la imagen Docker. |
