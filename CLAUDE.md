# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Chiflete es una aplicación web pública y mobile-first que busca ciudades y muestra su clima
actual usando Open-Meteo. Todo el proyecto (código, comentarios, docs, commits) está en español.

## Reglas del proyecto

La constitución en `.specify/memory/constitution.md` prevalece sobre cualquier otra convención.
Léela antes de cambios no triviales. Lo que más condiciona el trabajo diario:

- **Contrato primero**: `contract/openapi.yaml` es la única fuente de verdad entre frontend y
  backend. Un cambio de API se hace primero ahí; el backend genera sus interfaces y el frontend
  sus tipos a partir de él. Nunca se escriben a mano tipos de contrato. Todo campo que sea una
  magnitud indica su unidad (sistema métrico).
- **Test-first**: la prueba se escribe antes y se comprueba que falla. Cada endpoint tiene pruebas
  de contrato. Las pruebas no usan la red.
- **Privacidad**: nada de secretos, IPs ni texto buscado en logs, métricas ni respuestas de error.
  Hay pruebas que lo verifican (`SearchPrivacyTest`, `MetricsTest`).
- **Sin texto incrustado**: todo texto visible sale de `frontend/src/i18n/messages/es.json` vía
  `t(key)`; `tests/unit/i18n/no-literals.test.ts` falla si un componente tiene literales.
- **Mobile-first**: usable a 320 px, sin scroll horizontal, objetivos táctiles ≥ 44 × 44 px
  (lo verifica `frontend/tests/e2e/mobile.ts` en cada spec E2E).
- **Simplicidad justificada**: no se añaden dependencias, capas ni abstracciones que no estén
  justificadas en el `plan.md` de la funcionalidad.
- **Documentación en el mismo cambio**: README de cada componente, ADR en `docs/adr/` (con
  diagramas C4 en Mermaid) y OpenAPI se actualizan junto con el código.

## Flujo Spec Kit

Las funcionalidades se desarrollan con Spec Kit (skills `speckit-*`: specify → clarify → plan →
tasks → implement). Cada funcionalidad tiene una rama `NNN-nombre` y su carpeta en
`specs/NNN-nombre/` con `spec.md`, `plan.md`, `research.md`, `data-model.md`, `tasks.md`,
`quickstart.md` y una copia del contrato en `contracts/`. Los commits citan la funcionalidad y la
fase o historia de usuario, p. ej. `feat: load more search results (001, US2)`.

## Comandos

Desde la raíz:

```bash
make test        # todas las pruebas (backend + frontend), sin red
make generate    # regenera artefactos derivados del contrato
make up          # docker compose up --build → http://localhost:3000 (solo se publica el frontend)
make down
```

Backend (`backend/`, JDK 25, wrapper de Maven):

```bash
./mvnw verify                                   # pruebas (genera las interfaces del contrato)
./mvnw test -Dtest=SearchCitiesServiceTest      # una clase
./mvnw test -Dtest='SearchCitiesServiceTest#nombreDelMetodo'
./mvnw spring-boot:run                          # http://localhost:8080
```

Frontend (`frontend/`, Node 24):

```bash
npm ci
npx playwright install chromium                 # solo la primera vez
npm test                                        # tsc --noEmit + Vitest + Playwright
npm run test:unit -- tests/unit/lib/format.test.ts   # un archivo de Vitest
npm run test:e2e -- tests/e2e/errors.spec.ts         # un spec de Playwright
npm run lint
BACKEND_URL=http://localhost:8080 npm run dev   # http://localhost:3000
```

`src/lib/api-types.ts` no se versiona: lo regeneran `predev`, `prebuild` y `pretest`. Si se
ejecuta `vitest`/`tsc` directamente tras cambiar el contrato, correr antes `npm run generate:api`.

## Arquitectura

Dos contenedores (ver `docs/adr/0001-arquitectura-inicial.md`):

```
navegador → frontend Next.js (:3000, Route Handlers /api/*) → backend Spring Boot (/api/v1/*, red interna) → Open-Meteo
```

- **El navegador solo habla con Next.js.** `frontend/src/app/api/*/route.ts` reenvían al backend
  mediante `src/lib/backend-client.ts`, que lee `BACKEND_URL` en cada petición, corta a los 5 s y
  traduce sus propios fallos a `502 PROVIDER_UNAVAILABLE` / `504 PROVIDER_TIMEOUT` (los mismos
  códigos del contrato).
- **Backend hexagonal en paquetes** de `ar.chiflete.weather`, protegido por
  `HexagonalArchitectureTest`: `domain` y `application` no dependen de Spring ni de Jackson;
  `adapter.in.web` implementa las interfaces que `openapi-generator-maven-plugin` genera en
  `target/generated-sources` (paquetes `adapter.in.web.{api,model}`, no se editan);
  `adapter.out.openmeteo` implementa los puertos `CityCatalog` y `WeatherProvider`.
- **Sin persistencia ni caché.** Cada petición al backend hace una sola llamada al proveedor
  (1 s de conexión + 3 s de lectura), por debajo del límite de 5 s del frontend.
- **Errores**: las excepciones de puerto (`ProviderUnavailableException`,
  `ProviderTimeoutException`) no llevan mensaje ni causa a propósito, para que la URL (que contiene
  el texto buscado) no se filtre. `ApiExceptionHandler` responde solo `{"code": ...}`.
- **Observabilidad**: `OperationLog` (capa de aplicación) escribe una línea ECS por petición con
  `operation`, `outcome`, `durationMs` y `offset` o coordenadas. Actuator expone solo `health` y
  `metrics`.
- **Datos ausentes**: el backend los omite (Jackson `non_null`, nunca `null`); el frontend los
  muestra como "-". Observaciones de más de 2 h se marcan como desactualizadas.

## Pruebas

- Backend: Open-Meteo se simula con `MockRestServiceServer` y respuestas reales capturadas en
  `backend/src/test/resources/openmeteo/`. Las pruebas de contrato (`*ContractTest`) validan las
  respuestas contra `contract/openapi.yaml` con `openapi-request-validator-mockmvc`.
- Frontend E2E: Playwright a 320 × 640 contra el build standalone (`node .next/standalone/server.js`,
  no `next start`) y un backend simulado (`tests/e2e/mock-backend.mts`, puerto 4010). Sus
  respuestas usan `satisfies` con los tipos del contrato, así que `tsc` falla si se desvían.

## Avisos

- **Next.js 16 difiere de lo conocido** (ver `frontend/AGENTS.md`): consultar
  `frontend/node_modules/next/dist/docs/` antes de escribir código de Next. `next dev` reescribe
  ese bloque de `AGENTS.md`.
- **Spring Boot 4 es modular**: `RestClient` requiere `spring-boot-starter-restclient`. Los
  READMEs de cada componente tienen una sección "Verificado durante la implementación" con otras
  particularidades de versiones.
- TypeScript `strict` es obligatorio; prohibido desactivarlo o evadir el sistema de tipos.
