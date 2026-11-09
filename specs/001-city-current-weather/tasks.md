---

description: "Task list for feature 001-city-current-weather"
---

# Tasks: Clima actual por ciudad

**Input**: Design documents from `specs/001-city-current-weather/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml), [quickstart.md](./quickstart.md)

**Tests**: SE INCLUYEN. La constitución (Principio II, Test-First) obliga a escribir las pruebas antes que la implementación y a tener pruebas de contrato por endpoint. Cada tarea de prueba DEBE fallar antes de empezar la tarea de implementación correspondiente.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Backend: `backend/src/main/java/ar/chiflete/weather/` (código) y `backend/src/test/java/ar/chiflete/weather/` (pruebas); recursos en `backend/src/main/resources/` y `backend/src/test/resources/`
- Frontend: `frontend/src/` (código), `frontend/tests/unit/` (Vitest) y `frontend/tests/e2e/` (Playwright)
- Contrato: `contract/openapi.yaml` (fuente única)
- Todo texto visible al usuario va en `frontend/src/i18n/messages/es.json` (Principio VIII)
- Todo punto marcado "pendiente de verificar" en plan.md se verifica en la tarea indicada; si falla, se aplica la alternativa de research.md y se anota en el README del componente

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicializar los dos componentes, el contrato y la documentación de arquitectura.

- [ ] T001 Copiar `specs/001-city-current-weather/contracts/openapi.yaml` a `contract/openapi.yaml`; desde aquí es la fuente única del contrato, y la copia de specs queda como registro histórico
- [ ] T002 Crear `docs/adr/0001-arquitectura-inicial.md` con contexto, decisión, alternativas y consecuencias, más diagramas C4 en Mermaid: contexto (usuario, Chiflete, Open-Meteo), contenedores (navegador → Next.js → Spring Boot → Open-Meteo; el backend solo en la red interna) y componentes del backend hexagonal (domain, application/ports, adapter.in.web, adapter.out.openmeteo). Fuentes: plan.md y research.md R1–R12
- [ ] T003 Generar el backend con Spring Initializr (Spring Boot 4.1.2, Java 25, Maven, dependencias web MVC y Actuator) en `backend/`, con Maven Wrapper (`backend/mvnw`) y paquete raíz `ar.chiflete.weather`. Verificar el nombre real del starter web en Boot 4 (`spring-boot-starter-webmvc` o `spring-boot-starter-web`) y anotarlo en `backend/README.md` (plan, "Pendiente de verificar")
- [ ] T004 [P] Generar el frontend con `create-next-app` (Next.js 16.4.x, React 19.3.x, App Router, `src/`, Tailwind CSS 4.3.x, ESLint) en `frontend/`. Fijar `typescript` en 5.9.x en `frontend/package.json` (TypeScript 7 sin soporte verificado en Next 16) y comprobar que `frontend/tsconfig.json` tiene `"strict": true`
- [ ] T005 [P] Crear `Makefile` en la raíz con los objetivos `test` (`cd backend && ./mvnw verify` y `cd frontend && npm test`), `up` (`docker compose up --build`) y `generate` (regenera los artefactos derivados del contrato)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contrato generado en ambos lados, configuración, errores base, i18n y entorno local. Bloquea todas las historias.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend

- [ ] T006 Configurar `openapi-generator-maven-plugin` 7.26.0 en `backend/pom.xml` sobre `../contract/openapi.yaml`: generador `spring`, `interfaceOnly=true`, `useSpringBoot4=true`, `useJackson3=true`, `openApiNullable=false`, `documentationProvider=none`, `useTags=true`, paquetes `ar.chiflete.weather.adapter.in.web.api` y `ar.chiflete.weather.adapter.in.web.model`. Ejecutar `./mvnw compile` y verificar que el código generado compila con Boot 4.1.2 y Jackson 3; si no, documentar el ajuste en `backend/README.md`
- [ ] T007 [P] Configurar `backend/src/main/resources/application.yaml`: `spring.threads.virtual.enabled: true`, `spring.main.keep-alive: true`, `spring.http.clients.connect-timeout: 1s`, `spring.http.clients.read-timeout: 3s` (una sola llamada al proveedor por petición: termina antes del límite de 5 s del frontend, FR-022a), `logging.structured.format.console: ecs`, `management.endpoints.web.exposure.include: health,metrics`, `server.error.include-stacktrace: never`, `server.error.include-message: never`, y propiedades `chiflete.open-meteo.geocoding-url` (por defecto `https://geocoding-api.open-meteo.com`, variable `OPEN_METEO_GEOCODING_URL`) y `chiflete.open-meteo.forecast-url` (por defecto `https://api.open-meteo.com`, variable `OPEN_METEO_FORECAST_URL`)
- [ ] T008 [P] Escribir la prueba de arquitectura en `backend/src/test/java/ar/chiflete/weather/architecture/HexagonalArchitectureTest.java`: recorre los `.java` de `domain/` y `application/` en `backend/src/main/java/ar/chiflete/weather/` y falla si importan `org.springframework`, `tools.jackson`, `com.fasterxml`, `..adapter..` o `..config..`. Sin dependencias nuevas (Principio VI)
- [ ] T009 [P] Crear el modelo de dominio compartido en `backend/src/main/java/ar/chiflete/weather/domain/`: `City.java` (record: `long id`, `String name`, `String province` nullable, `String country` nullable, `double latitude`, `double longitude`) y `MeasurementSystem.java` (enum con el único valor `METRIC`)
- [ ] T010 [P] Crear las excepciones de puerto en `backend/src/main/java/ar/chiflete/weather/application/port/out/`: `ProviderUnavailableException.java` y `ProviderTimeoutException.java` (sin el mensaje del proveedor, para no filtrar detalles, FR-023)
- [ ] T011 Escribir `backend/src/test/java/ar/chiflete/weather/adapter/in/web/ApiExceptionHandlerTest.java` con `MockMvcBuilders.standaloneSetup` sobre un controlador definido solo dentro de la prueba (clase anidada con un `@RequestParam int` obligatorio y un endpoint que lanza `IllegalStateException`) más el `ApiExceptionHandler`; así no depende de los controladores reales, que llegan en US1 (T050). Un parámetro ausente o inválido devuelve `400` con cuerpo exactamente `{"code":"INVALID_REQUEST"}`; una excepción no prevista devuelve `500` sin trazas, rutas ni mensaje
- [ ] T012 Implementar `backend/src/main/java/ar/chiflete/weather/adapter/in/web/ApiExceptionHandler.java` (`@RestControllerAdvice`) para que pase T011, usando el modelo `Error` generado
- [ ] T013 [P] Crear `backend/src/main/java/ar/chiflete/weather/config/ClockConfig.java` con un bean `java.time.Clock` UTC, inyectado en los casos de uso para que la antigüedad de 2 h sea comprobable
- [ ] T014 [P] Capturar respuestas reales de Open-Meteo como fixtures en `backend/src/test/resources/openmeteo/`: `search-cordoba.json`, `search-empty.json` (sin campo `results`), `search-no-country.json` (resultado sin `country`, p. ej. "San Juan"), `forecast-cordoba.json` (los siete campos de `current` con `timeformat=unixtime`), `forecast-partial.json` (sin `visibility` ni `wind_direction_10m`) y `error-400.json`

### Frontend

- [ ] T015 Configurar `openapi-typescript` 7.13.0 como devDependency y el script `"generate:api": "openapi-typescript ../contract/openapi.yaml -o src/lib/api-types.ts"` en `frontend/package.json`; generar `frontend/src/lib/api-types.ts` (no se edita a mano) e incluirlo en `make generate`
- [ ] T016 [P] Configurar Vitest + React Testing Library + jsdom en `frontend/vitest.config.ts` y `frontend/tests/setup.ts`, con el script `"test": "vitest run && playwright test"` en `frontend/package.json`. Verificar la compatibilidad de Vitest 5 con Next 16 y React 19.3 (plan, "Pendiente de verificar")
- [ ] T017 [P] Configurar Playwright en `frontend/playwright.config.ts`: viewport 320 × 640, `webServer` con `next build && next start` y `BACKEND_URL` apuntando a un backend simulado en `frontend/tests/e2e/mock-backend.ts` (servidor HTTP de Node que sirve los ejemplos de `contract/openapi.yaml`)
- [ ] T018 [P] Escribir `frontend/tests/unit/i18n/t.test.ts` (`t(key)` devuelve el texto de `es.json`, y una clave inexistente es error de tipos, comprobado con `// @ts-expect-error`) y `frontend/tests/unit/i18n/no-literals.test.ts` (recorre los `.tsx` de `frontend/src/components/` y `frontend/src/app/` y falla si hay texto JSX literal visible, aceptando solo expresiones `{...}`) (Principio VIII)
- [ ] T019 Implementar `frontend/src/i18n/t.ts` (`t(key)` tipado con `keyof` del JSON) y `frontend/src/i18n/messages/es.json` con las claves iniciales (título de la app y etiqueta del cuadro de búsqueda) para que pase T018
- [ ] T020 [P] Escribir `frontend/tests/unit/lib/backend-client.test.ts`: `callBackend(path)` lee `process.env.BACKEND_URL` en cada llamada, aborta a los 5000 ms con `AbortSignal.timeout`, reenvía estado y cuerpo, y emite una línea JSON con `operation`, `outcome` y `durationMs` que NO contiene la query string ni cabeceras con IP (`x-forwarded-for`)
- [ ] T021 Implementar `frontend/src/lib/backend-client.ts` para que pase T020
- [ ] T022 Configurar `output: "standalone"` en `frontend/next.config.ts` y crear `frontend/src/app/layout.tsx` (`lang="es"`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, títulos desde `t()`)

### Entorno local

- [ ] T023 [P] Crear `backend/Dockerfile` multi-etapa (`eclipse-temurin:25-jdk` → `eclipse-temurin:25-jre`) que compila con `./mvnw -DskipTests package`, con el contexto de build en la raíz del repositorio para incluir `contract/`. Verificar que la etiqueta existe y qué herramienta (`curl` o `wget`) hay en la imagen para el healthcheck (plan, "Pendiente de verificar")
- [ ] T024 [P] Crear `frontend/Dockerfile` multi-etapa sobre `node:24-alpine` que ejecuta `npm ci`, `npm run generate:api` y `next build`, y arranca `node server.js` desde `.next/standalone`; contexto de build en la raíz para incluir `contract/`
- [ ] T025 Crear `compose.yaml` en la raíz: servicio `backend` sin puertos publicados, con `healthcheck` sobre `http://localhost:8080/actuator/health` y variables `OPEN_METEO_GEOCODING_URL`/`OPEN_METEO_FORECAST_URL` sobreescribibles; servicio `frontend` con `ports: ["3000:3000"]`, `BACKEND_URL=http://backend:8080` y `depends_on: backend: condition: service_healthy`
- [ ] T026 [P] Crear `backend/README.md` y `frontend/README.md` con propósito, construcción, ejecución (local y con compose), pruebas (`./mvnw verify`, `npm test`) y configuración (variables de entorno) (Principio III)

**Checkpoint**: `make test` pasa, `docker compose up --build` levanta ambos servicios y `curl http://localhost:8080` falla desde el host (el backend no está publicado)

---

## Phase 3: User Story 1 - Buscar una ciudad y ver su clima actual (Priority: P1) 🎯 MVP

**Goal**: escribir ≥ 3 caracteres, ver los 5 primeros resultados (ciudad grande; provincia · país pequeño y claro), elegir uno y ver los siete datos del clima en métrico con la hora de observación del dispositivo, y poder pulsar "Actualizar".

**Independent Test**: con el backend real o simulado, escribir `cordoba`, elegir "Córdoba, Provincia de Córdoba, Argentina" y comprobar los siete datos con °C, mm, km/h, punto cardinal, %, hPa y km, más la hora de observación; luego pulsar "Actualizar" (quickstart, escenarios 1, 2, 5 y 6).

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T027 [P] [US1] Prueba de dominio en `backend/src/test/java/ar/chiflete/weather/domain/SearchPageTest.java`: dada la lista del proveedor, `offset` y `limit`, devuelve la porción `[offset, offset + limit)` y `hasMore = true` solo si el proveedor devolvió más de `offset + limit` resultados y `offset + limit < 100`; y calcula el `count` pedido al proveedor como `min(offset + limit + 1, 100)` (research R2)
- [ ] T028 [P] [US1] Prueba de dominio en `backend/src/test/java/ar/chiflete/weather/domain/CurrentWeatherTest.java`: visibilidad en m ÷ 1000 = km; un valor `0` se conserva; un valor ausente queda vacío (no `0`); `stale = (ahora − observedAt) > 2 h` con un `Clock` fijo (exactamente 2 h → `false`; 2 h 1 s → `true`); sin `observedAt` → `stale = false`; `measurementSystem = METRIC`
- [ ] T029 [P] [US1] Prueba del caso de uso en `backend/src/test/java/ar/chiflete/weather/application/service/SearchCitiesServiceTest.java` con un `CityCatalog` falso: recorta espacios de los extremos; rechaza menos de 3 o más de 100 caracteres; con `offset = 0` y `limit = 5` pide `count = 6`; con un `ListAppender` de Logback, comprueba que registra con la API fluida de SLF4J `operation = SEARCH`, `offset`, `durationMs` y `outcome` `SUCCESS` o `NO_RESULTS`, sin el texto buscado (FR-028a, FR-028b)
- [ ] T030 [P] [US1] Prueba del caso de uso en `backend/src/test/java/ar/chiflete/weather/application/service/GetCurrentWeatherServiceTest.java` con un `WeatherProvider` falso: pide el clima con las coordenadas recibidas (una sola llamada), arma `CurrentWeather` y, con un `ListAppender` de Logback, comprueba que registra `operation = CURRENT_WEATHER`, `outcome = SUCCESS`, `durationMs`, `latitude` y `longitude` (FR-028a)
- [ ] T031 [P] [US1] Prueba del adaptador en `backend/src/test/java/ar/chiflete/weather/adapter/out/openmeteo/OpenMeteoCityCatalogTest.java` con `MockRestServiceServer` y los fixtures de T014: la petición es `GET /v1/search?name={texto}&count={n}&language=es&format=json`, con el texto codificado en URL (prueba con `ñandú`); mapea `id`, `name`, `admin1`→`province`, `country`, `latitude` y `longitude`; tolera la ausencia de `results`, `admin1` o `country`
- [ ] T032 [P] [US1] Prueba del adaptador en `backend/src/test/java/ar/chiflete/weather/adapter/out/openmeteo/OpenMeteoWeatherProviderTest.java` con `MockRestServiceServer`: la petición incluye `current=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,relative_humidity_2m,pressure_msl,visibility`, `timeformat=unixtime` y `timezone=GMT`; mapea `current.time` (segundos UTC) a `Instant` y cada variable a su campo; con `forecast-partial.json` los campos ausentes quedan vacíos
- [ ] T033 [P] [US1] Prueba de contrato en `backend/src/test/java/ar/chiflete/weather/adapter/in/web/CitiesContractTest.java` (MockMvc + `swagger-request-validator-mockmvc` 3.0.0 contra `../contract/openapi.yaml`, con los casos de uso simulados): `GET /api/v1/cities?query=cordoba` responde `200` válido según `CitySearchPage`, con `items` de como máximo 5, cada uno con `latitude` y `longitude`, y `province`/`country` omitidos cuando faltan. Verificar la compatibilidad del validador con Spring Framework 7; si falla, usar la alternativa de research R7
- [ ] T034 [P] [US1] Prueba de contrato en `backend/src/test/java/ar/chiflete/weather/adapter/in/web/CurrentWeatherContractTest.java`: `GET /api/v1/current-weather?latitude=-31.4135&longitude=-64.18105` responde `200` válido según `CurrentWeather` (`required: [measurementSystem, stale]`, `additionalProperties: false`, campos ausentes omitidos y no `null`); `latitude=91` o sin `longitude` → `400 {"code":"INVALID_REQUEST"}`
- [ ] T035 [P] [US1] Prueba de privacidad en `backend/src/test/java/ar/chiflete/weather/observability/SearchPrivacyTest.java` (`@SpringBootTest` + `OutputCaptureExtension` + `MockRestServiceServer`): tras `GET /api/v1/cities?query=cordoba` con la cabecera `X-Forwarded-For: 203.0.113.7`, ni los logs capturados ni las etiquetas de `http.server.requests` y `http.client.requests` contienen `cordoba` ni `203.0.113.7`; la etiqueta `uri` del cliente es la plantilla (plan, "Pendiente de verificar"; si falla, desactivar la etiqueta `uri` de ese cliente) (FR-028b)
- [ ] T036 [P] [US1] Pruebas de Route Handlers en `frontend/tests/unit/api/cities-route.test.ts` y `frontend/tests/unit/api/current-weather-route.test.ts`: `GET /api/cities?query=cordoba&offset=0` llama a `${BACKEND_URL}/api/v1/cities?query=cordoba&offset=0&limit=5` y reenvía estado y cuerpo; `GET /api/current-weather?latitude=-31.4135&longitude=-64.18105` llama a `${BACKEND_URL}/api/v1/current-weather?latitude=-31.4135&longitude=-64.18105`; el navegador nunca recibe la URL del backend
- [ ] T037 [P] [US1] Prueba unitaria en `frontend/tests/unit/lib/format.test.ts`: `toCardinal(grados)` devuelve una clave de 8 puntos (N, NE, E, SE, S, SO, O, NO) con sectores de 45° centrados (`22` → N, `23` → NE, `360` → N, `198` → S); `formatObservedAt(iso)` usa la zona horaria del dispositivo (prueba con `TZ=America/Argentina/Cordoba` y `TZ=Europe/Madrid`) e incluye la fecha cuando el día no es el de hoy
- [ ] T038 [P] [US1] Prueba unitaria en `frontend/tests/unit/lib/use-latest-request.test.ts`: si se lanzan las peticiones A y luego B, y A responde después de B, solo se aplica la respuesta de B (Edge Cases, "Respuestas fuera de orden")
- [ ] T039 [P] [US1] Prueba de componente en `frontend/tests/unit/components/CitySearch.test.tsx`: con 1–2 caracteres (o solo espacios) no hay petición ni lista; al escribir el 3.º carácter se pide sin pulsar Enter; cada cambio vuelve a pedir; al bajar de 3 caracteres desaparece la lista; muestra un indicador de carga mientras busca
- [ ] T040 [P] [US1] Prueba de componente en `frontend/tests/unit/components/CityResultList.test.tsx`: cada resultado muestra el nombre con clase de texto mayor y "provincia · país" con clase menor y de tono más claro; sin provincia, muestra solo el país, sin separador sobrante; los elementos son botones con altura y anchura mínimas de 44 px (`min-h-11 min-w-11`); al pulsar uno se emite la ciudad elegida
- [ ] T041 [P] [US1] Prueba de componente en `frontend/tests/unit/components/CurrentWeatherCard.test.tsx`: recibe la ciudad elegida como prop y muestra su nombre, provincia y país, los siete datos con su unidad desde el catálogo (°C, mm, km/h, punto cardinal, %, hPa, km), la hora de observación formateada y un botón "Actualizar" que emite el evento de recarga; con `status="loading"` muestra solo "Cargando…" y ningún valor de clima (FR-025)
- [ ] T042 [P] [US1] Prueba E2E en `frontend/tests/e2e/search-and-weather.spec.ts` a 320 px: escribir `cordoba` muestra 5 resultados; elegir el primero cierra la lista y muestra el clima; "Actualizar" vuelve a pedirlo; buscar y elegir otra ciudad con la respuesta de clima retrasada mediante `page.route` muestra "Cargando…" sin ningún valor de la ciudad anterior y después el clima de la nueva (FR-011, FR-020, FR-025); al recargar la página el cuadro está vacío, no hay clima, `context.cookies()` está vacío y `localStorage` y `sessionStorage` tienen longitud 0 (FR-026, SC-008); `document.documentElement.scrollWidth <= 320`; todos los elementos interactivos miden ≥ 44 × 44 px

### Implementation for User Story 1

- [ ] T043 [P] [US1] Implementar `backend/src/main/java/ar/chiflete/weather/domain/SearchPage.java` y `backend/src/main/java/ar/chiflete/weather/domain/CitySearchQuery.java` (validación: tras recortar, 3–100 caracteres; `offset ≥ 0`; `limit` 1–20; `offset + limit ≤ 100`) para que pase T027
- [ ] T044 [P] [US1] Implementar `backend/src/main/java/ar/chiflete/weather/domain/CurrentWeather.java` (record con `MeasurementSystem measurementSystem`, `Optional<Instant> observedAt`, `boolean stale` y siete `Optional`; fábrica con `Clock` que aplica la regla de 2 h y m→km) para que pase T028
- [ ] T045 [US1] Crear los puertos `backend/src/main/java/ar/chiflete/weather/application/port/in/SearchCities.java`, `backend/src/main/java/ar/chiflete/weather/application/port/in/GetCurrentWeather.java`, `backend/src/main/java/ar/chiflete/weather/application/port/out/CityCatalog.java` (`search(String text, int count)`) y `backend/src/main/java/ar/chiflete/weather/application/port/out/WeatherProvider.java` (`current(double latitude, double longitude)`)
- [ ] T046 [US1] Implementar `backend/src/main/java/ar/chiflete/weather/application/service/SearchCitiesService.java` para que pase T029 (depende de T043 y T045)
- [ ] T047 [US1] Implementar `backend/src/main/java/ar/chiflete/weather/application/service/GetCurrentWeatherService.java` para que pase T030 (depende de T044 y T045)
- [ ] T048 [P] [US1] Implementar `backend/src/main/java/ar/chiflete/weather/adapter/out/openmeteo/OpenMeteoCityCatalog.java` con `RestClient` del `RestClient.Builder` autoconfigurado y la plantilla de URI `/v1/search?name={name}&count={count}&language=es&format=json` para que pase T031
- [ ] T049 [P] [US1] Implementar `backend/src/main/java/ar/chiflete/weather/adapter/out/openmeteo/OpenMeteoWeatherProvider.java` (`/v1/forecast?latitude={lat}&longitude={lon}&current=...&timeformat=unixtime&timezone=GMT`) para que pase T032
- [ ] T050 [US1] Implementar `backend/src/main/java/ar/chiflete/weather/adapter/in/web/CitiesController.java`, que implementa las interfaces generadas `CitiesApi` y `WeatherApi` y mapea el dominio a los modelos generados, omitiendo los campos ausentes, para que pasen T033, T034 y T035
- [ ] T051 [US1] Crear `backend/src/main/java/ar/chiflete/weather/config/OpenMeteoConfig.java`, que construye los dos clientes con las URL de `chiflete.open-meteo.*` y conecta puertos y servicios
- [ ] T052 [P] [US1] Implementar `frontend/src/app/api/cities/route.ts` y `frontend/src/app/api/current-weather/route.ts` con `callBackend` de T021 y los tipos de `api-types.ts`, para que pase T036
- [ ] T053 [P] [US1] Implementar `frontend/src/lib/format.ts` (`toCardinal`, `formatObservedAt` con `Intl.DateTimeFormat` sin `timeZone` explícito, y `formatNumber` con `Intl.NumberFormat("es")`) para que pase T037
- [ ] T054 [P] [US1] Implementar `frontend/src/lib/use-latest-request.ts` para que pase T038
- [ ] T055 [US1] Añadir a `frontend/src/i18n/messages/es.json` las claves de US1: unidades (`°C`, `mm`, `km/h`, `%`, `hPa`, `km`), los 8 puntos cardinales, las etiquetas de los siete datos, "Hora de observación", "Actualizar", "Buscando…" y "Cargando…"
- [ ] T056 [US1] Implementar `frontend/src/components/CitySearch.tsx` (componente cliente; mínimo de 3 caracteres tras recortar, petición en cada cambio con `use-latest-request`) para que pase T039
- [ ] T057 [US1] Implementar `frontend/src/components/CityResultList.tsx` (mobile-first; nombre `text-lg`, provincia · país `text-sm` de tono más claro; botones `min-h-11`; texto que se ajusta sin desbordar a 320 px) para que pase T040
- [ ] T058 [US1] Implementar `frontend/src/components/CurrentWeatherCard.tsx` (componente cliente; recibe la ciudad como prop; la fecha se formatea en el navegador para usar la zona del dispositivo) para que pase T041
- [ ] T059 [US1] Componer la pantalla en `frontend/src/app/page.tsx`: búsqueda, lista y tarjeta de clima; la página guarda en memoria la `City` elegida y pide el clima con sus coordenadas, tanto al seleccionarla como al pulsar "Actualizar"; al elegir otra ciudad pasa a "cargando" y descarta los datos anteriores; nada se guarda en el navegador; para que pase T042

**Checkpoint**: User Story 1 completa y demostrable con `docker compose up --build` (quickstart, escenarios 1, 2, 5, 6 y 7)

---

## Phase 4: User Story 2 - Ver más resultados de búsqueda (Priority: P2)

**Goal**: un botón "Ver más resultados" añade tandas de 5 resultados mientras queden más; si falla la carga, se conservan los ya mostrados (FR-009a).

**Independent Test**: buscar `san` (más de 5 coincidencias), pulsar "Ver más resultados" hasta agotarlos y comprobar que el botón desaparece; con el proveedor simulado fallando en la segunda página, comprobar que los 5 primeros siguen visibles con "Error interno" debajo y el botón disponible.

### Tests for User Story 2 ⚠️

- [ ] T060 [P] [US2] Ampliar `backend/src/test/java/ar/chiflete/weather/adapter/in/web/CitiesContractTest.java`: `offset=5&limit=5` devuelve los resultados 6–10 y `hasMore` correcto; `offset=95&limit=5` → `hasMore=false`; `offset=96&limit=5` → `400 {"code":"INVALID_REQUEST"}` (`offset + limit` no puede superar 100); `limit=21` → `400`
- [ ] T061 [P] [US2] Ampliar `backend/src/test/java/ar/chiflete/weather/application/service/SearchCitiesServiceTest.java`: con `offset=5` y `limit=5` pide `count=11`, y el registro lleva `operation = SEARCH` y `offset = 5`
- [ ] T062 [P] [US2] Prueba de componente en `frontend/tests/unit/components/LoadMoreButton.test.tsx` y ampliación de `frontend/tests/unit/components/CityResultList.test.tsx`: con `hasMore=true` aparece "Ver más resultados" (≥ 44 × 44 px); al pulsarlo se pide el siguiente `offset` y se añaden resultados sin perder los anteriores; con `hasMore=false` no aparece; si la petición falla, se conservan los resultados, se muestra "Error interno" debajo y el botón sigue disponible
- [ ] T063 [P] [US2] Ampliar `frontend/tests/unit/components/CitySearch.test.tsx`: tras ampliar la lista, cambiar el texto vuelve a mostrar solo los 5 primeros de la nueva búsqueda
- [ ] T064 [P] [US2] Prueba E2E en `frontend/tests/e2e/load-more.spec.ts` a 320 px: buscar `san` en el backend simulado (con 12 resultados) muestra 5, luego 10 y luego 12, y el botón desaparece; sin scroll horizontal

### Implementation for User Story 2

- [ ] T065 [US2] Completar la validación de `offset`/`limit` en `backend/src/main/java/ar/chiflete/weather/domain/CitySearchQuery.java` y el paso de `offset` en `backend/src/main/java/ar/chiflete/weather/application/service/SearchCitiesService.java` para que pasen T060 y T061
- [ ] T066 [US2] Añadir a `frontend/src/i18n/messages/es.json` la clave "Ver más resultados"
- [ ] T067 [US2] Implementar `frontend/src/components/LoadMoreButton.tsx` e integrarlo en `frontend/src/components/CityResultList.tsx` y `frontend/src/components/CitySearch.tsx` (acumulación de páginas, reinicio al cambiar el texto, error local que conserva los resultados) para que pasen T062, T063 y T064
- [ ] T068 [US2] Añadir un conjunto de 12 resultados para `san` y la simulación de fallo en la segunda página en `frontend/tests/e2e/mock-backend.ts`

**Checkpoint**: User Stories 1 y 2 funcionan de forma independiente (quickstart, escenario 3)

---

## Phase 5: User Story 3 - Entender qué pasa cuando no hay datos o algo falla (Priority: P3)

**Goal**: "Sin resultados", "Error interno" ante fallos o tiempos agotados del proveedor (5 s), "-" para los datos ausentes, advertencia de datos desactualizados (> 2 h) y reintento sin recargar.

**Independent Test**: provocar por separado una búsqueda sin coincidencias, un dato ausente, una observación de más de 2 horas y un proveedor caído o lento, y comprobar el mensaje o valor mostrado (quickstart, escenarios 4, 8 y 9).

### Tests for User Story 3 ⚠️

- [ ] T069 [P] [US3] Ampliar `backend/src/test/java/ar/chiflete/weather/adapter/out/openmeteo/OpenMeteoCityCatalogTest.java` y `backend/src/test/java/ar/chiflete/weather/adapter/out/openmeteo/OpenMeteoWeatherProviderTest.java`: una respuesta `5xx` o `400` del proveedor → `ProviderUnavailableException`; un tiempo de conexión o de lectura agotado → `ProviderTimeoutException`; ninguna excepción incluye el `reason` del proveedor
- [ ] T070 [P] [US3] Ampliar `backend/src/test/java/ar/chiflete/weather/adapter/in/web/CitiesContractTest.java` y `backend/src/test/java/ar/chiflete/weather/adapter/in/web/CurrentWeatherContractTest.java`: proveedor caído → `502 {"code":"PROVIDER_UNAVAILABLE"}`; tiempo agotado → `504 {"code":"PROVIDER_TIMEOUT"}`; búsqueda sin coincidencias → `200 {"items":[],"hasMore":false}`; datos parciales y `stale: true`, validados contra el contrato
- [ ] T071 [P] [US3] Ampliar `backend/src/test/java/ar/chiflete/weather/application/service/SearchCitiesServiceTest.java` y `backend/src/test/java/ar/chiflete/weather/application/service/GetCurrentWeatherServiceTest.java`: los fallos se registran con `outcome` `PROVIDER_ERROR` o `TIMEOUT` y duración, y se propagan
- [ ] T072 [P] [US3] Ampliar `frontend/tests/unit/lib/backend-client.test.ts` y los tests de Route Handlers en `frontend/tests/unit/api/`: un backend que no responde en 5000 ms produce `504` con `{"code":"PROVIDER_TIMEOUT"}`; un backend inaccesible produce `502` con `{"code":"PROVIDER_UNAVAILABLE"}`; los códigos `4xx`/`5xx` del backend se reenvían
- [ ] T073 [P] [US3] Prueba de componente en `frontend/tests/unit/components/CitySearch.test.tsx` (ampliación) y `frontend/tests/unit/components/ErrorMessage.test.tsx`: lista vacía → "Sin resultados"; cualquier respuesta no 2xx → "Error interno" sin resultados; una nueva búsqueda tras el error vuelve a intentar y muestra resultados si el backend responde
- [ ] T074 [P] [US3] Prueba de componente en `frontend/tests/unit/components/CurrentWeatherCard.test.tsx` (ampliación) y `frontend/tests/unit/components/StaleWarning.test.tsx`: un campo omitido se muestra como "-" (con `windSpeed` presente y `windDirection` ausente, la dirección es "-"); `0` se muestra como `0` con su unidad; sin `observedAt`, los siete datos aparecen como "-" y no se muestra hora; `stale: true` muestra la advertencia "Datos desactualizados" junto a los datos y la hora, y `stale: false` no la muestra; un error al cargar o al pulsar "Actualizar" muestra "Error interno" en lugar de los datos, y se puede reintentar
- [ ] T075 [P] [US3] Prueba E2E en `frontend/tests/e2e/errors.spec.ts` a 320 px con el backend simulado: `xyzqwv` → "Sin resultados"; una búsqueda configurada para fallar → "Error interno"; una ciudad con datos parciales muestra "-"; una ciudad con `stale: true` muestra la advertencia

### Implementation for User Story 3

- [ ] T076 [US3] Traducir los errores HTTP y los tiempos agotados a excepciones de puerto en `backend/src/main/java/ar/chiflete/weather/adapter/out/openmeteo/OpenMeteoCityCatalog.java` y `backend/src/main/java/ar/chiflete/weather/adapter/out/openmeteo/OpenMeteoWeatherProvider.java` para que pase T069
- [ ] T077 [US3] Mapear `ProviderUnavailableException` → 502 y `ProviderTimeoutException` → 504 en `backend/src/main/java/ar/chiflete/weather/adapter/in/web/ApiExceptionHandler.java`, y registrar el `outcome` de fallo en `SearchCitiesService.java` y `GetCurrentWeatherService.java`, para que pasen T070 y T071
- [ ] T078 [US3] Completar la traducción de fallos en `frontend/src/lib/backend-client.ts` para que pase T072
- [ ] T079 [US3] Añadir a `frontend/src/i18n/messages/es.json` las claves "Sin resultados", "Error interno", "Datos desactualizados" y el marcador de dato ausente "-"
- [ ] T080 [US3] Implementar `frontend/src/components/ErrorMessage.tsx` y `frontend/src/components/StaleWarning.tsx`, y los estados vacío, error, "-" y desactualizado en `frontend/src/components/CitySearch.tsx`, `frontend/src/components/CityResultList.tsx` y `frontend/src/components/CurrentWeatherCard.tsx`, para que pasen T073 y T074
- [ ] T081 [US3] Añadir a `frontend/tests/e2e/mock-backend.ts` los casos "sin resultados", "fallo", "datos parciales" y "desactualizado" para que pase T075

**Checkpoint**: las tres historias funcionan de forma independiente (quickstart, escenarios 4, 8 y 9)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: verificación global contra la constitución y la quickstart.

- [ ] T082 [P] Prueba de métricas en `backend/src/test/java/ar/chiflete/weather/observability/MetricsTest.java`: tras una búsqueda y una consulta de clima, `http.server.requests` tiene una serie por endpoint (`uri` = `/api/v1/cities` y `/api/v1/current-weather`) con `status` y latencia, y `http.client.requests` existe; ninguna etiqueta contiene el texto buscado ni IPs (FR-028c)
- [ ] T083 [P] Revisar `frontend/tests/e2e/` para que cada spec compruebe a 320 px la ausencia de scroll horizontal y el tamaño táctil mínimo de todos los elementos interactivos de su pantalla (Principio VII); añadir un caso con nombres largos de ciudad, provincia y país
- [ ] T084 [P] Actualizar `docs/adr/0001-arquitectura-inicial.md`, `backend/README.md` y `frontend/README.md` con lo aprendido al implementar, incluido el resultado de cada punto "pendiente de verificar" del plan
- [ ] T085 Añadir la atribución de datos requerida ("Datos meteorológicos: Open-Meteo" y "Ubicaciones: GeoNames") desde el catálogo en `frontend/src/i18n/messages/es.json` y mostrarla al pie de `frontend/src/app/page.tsx`
- [ ] T086 Ejecutar `make test` (objetivo de `Makefile`) y comprobar que pasa por completo, de forma determinista y sin red
- [ ] T087 Recorrer [quickstart.md](./quickstart.md) completo con `docker compose up --build`, incluidos los escenarios de fallo y la comprobación de que los logs no contienen el texto buscado

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias. T003 y T004 pueden ir en paralelo tras T001.
- **Foundational (Phase 2)**: depende de Setup y bloquea todas las historias. T006 depende de T001 y T003; T015 depende de T001 y T004; T025 depende de T023 y T024.
- **User Stories (Phase 3+)**: dependen de Foundational.
  - US1 primero (MVP).
  - US2 y US3 reutilizan componentes de US1 (`CitySearch`, `CityResultList`, `CurrentWeatherCard`, los adaptadores), así que en la práctica van después de US1. Entre sí son independientes y pueden hacerse en paralelo.
- **Polish (Phase 6)**: depende de las historias que se quieran entregar.

### User Story Dependencies

- **US1 (P1)**: tras Foundational; no depende de otras historias.
- **US2 (P2)**: modifica `CitySearchQuery`, `SearchCitiesService`, `CityResultList` y `CitySearch` creados en US1.
- **US3 (P3)**: modifica los adaptadores, `ApiExceptionHandler`, `backend-client` y los componentes creados en US1. No depende de US2; la parte de "Ver más" con error ya está en US2 (T062, T067).

### Within Each User Story

- Las pruebas se escriben primero y deben FALLAR antes de implementar (Principio II).
- Dominio → puertos → casos de uso → adaptadores → controlador; en el frontend: utilidades → Route Handlers → componentes → página.
- Cada tarea de implementación indica qué prueba debe pasar.

### Parallel Opportunities

- Setup: T004 y T005 en paralelo con T003.
- Foundational: T007, T008, T009, T010, T013 y T014 (backend) en paralelo con T016, T017, T018 y T020 (frontend), y T023, T024 y T026.
- US1: las pruebas T027–T042 en paralelo (archivos distintos); luego T043 y T044, T048 y T049, y T052, T053 y T054 en paralelo.
- US2 y US3 pueden repartirse entre dos personas una vez cerrada US1, coordinando los archivos compartidos (`CitySearch.tsx`, `CityResultList.tsx`, `es.json`).

---

## Parallel Example: User Story 1

```bash
# Pruebas de US1 en paralelo (deben fallar):
Task: "Prueba de dominio SearchPageTest en backend/src/test/java/ar/chiflete/weather/domain/SearchPageTest.java"
Task: "Prueba de dominio CurrentWeatherTest en backend/src/test/java/ar/chiflete/weather/domain/CurrentWeatherTest.java"
Task: "Prueba de contrato CitiesContractTest en backend/src/test/java/ar/chiflete/weather/adapter/in/web/CitiesContractTest.java"
Task: "Prueba unitaria format.test.ts en frontend/tests/unit/lib/format.test.ts"
Task: "Prueba de componente CityResultList.test.tsx en frontend/tests/unit/components/CityResultList.test.tsx"

# Implementación en paralelo cuando sus pruebas fallan:
Task: "OpenMeteoCityCatalog en backend/src/main/java/ar/chiflete/weather/adapter/out/openmeteo/OpenMeteoCityCatalog.java"
Task: "OpenMeteoWeatherProvider en backend/src/main/java/ar/chiflete/weather/adapter/out/openmeteo/OpenMeteoWeatherProvider.java"
Task: "Route Handlers en frontend/src/app/api/cities/route.ts y frontend/src/app/api/current-weather/route.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup.
2. Phase 2: Foundational (contrato generado, errores base, i18n y compose).
3. Phase 3: User Story 1.
4. **STOP and VALIDATE**: `make test` y quickstart, escenarios 1, 2, 5, 6 y 7.
5. Demo local con `docker compose up --build`.

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → búsqueda y clima (MVP).
3. US2 → "Ver más resultados".
4. US3 → estados vacíos, errores, "-" y datos desactualizados.
5. Polish → métricas, revisión mobile-first, atribución, documentación y quickstart completa.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Verificar que cada prueba falla antes de implementar (Principio II)
- Ningún texto visible fuera de `es.json` (Principio VIII); ningún secreto en el repositorio (Principio IV); ningún texto de búsqueda ni IP en logs o métricas (Principio V)
- Si una tarea necesita una dependencia no justificada en plan.md, se actualiza primero el plan (Principio VI)
- Commit after each task or logical group
