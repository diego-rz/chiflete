# Research: Clima actual por ciudad

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Fecha**: 2026-11-01

Cada decisión indica su fuente y si fue **verificada** (documentación oficial consultada o prueba
directa contra la API el 2026-11-01) o **no verificada** (a confirmar en la primera tarea que la
use).

## R1. Proveedor de búsqueda de ciudades: Open-Meteo Geocoding API

- **Decision**: `GET https://geocoding-api.open-meteo.com/v1/search?name={texto}&count={n}&language=es&format=json`.
  Cada resultado incluye sus coordenadas, que el contrato expone para pedir el clima sin una
  segunda llamada al proveedor (ver R5). No se usa `GET /v1/get?id={id}`.
- **Rationale** (verificado en la documentación y con llamadas reales):
  - Desde 3 caracteres hace coincidencia por prefijo normalizada, sin distinguir mayúsculas ni
    diacríticos: `cordoba` → "Córdoba" (Argentina, España, México…). Cubre FR-005 sin lógica
    propia.
  - `language=es` devuelve nombres de ciudad, provincia (`admin1`) y país en español cuando
    existen ("Londres", "Reino Unido", "Estados Unidos"); si no, el nombre local. Cubre FR-005b.
  - `count` admite de 1 a 100; **no hay paginación**. Los resultados vienen ordenados por el
    proveedor (en las pruebas, por población descendente).
  - Sin coincidencias, la respuesta es `200` con un JSON **sin** el campo `results`.
  - Errores: `400` con `{"error": true, "reason": "..."}`.
  - Campos usados: `id`, `name`, `admin1` (puede faltar), `country` (puede faltar: "San Juan" de
    Puerto Rico llega sin `country`), `latitude`, `longitude`.
  - El texto debe ir codificado en URL; sin codificar, "ñandú" devuelve `403` del proxy nginx del
    proveedor.
  - Uso no comercial sin clave de API. Los datos provienen de GeoNames (atribución requerida).
- **Hallazgo que contradice el spec (FR-006)**: el proveedor solo compara con el **inicio del
  nombre completo**. `jose` no encuentra "San José" y `plata` no encuentra "La Plata". FR-006 exige
  coincidir también con el inicio de cualquier palabra, y eso no puede cumplirse con este
  proveedor sin mantener un índice propio de ciudades (descarga y búsqueda local de GeoNames), lo
  que el Principio VI no justifica para esta versión. **Resuelto el 2026-11-03**: FR-006 se enmendó
  para coincidir solo con el inicio del nombre completo.
- **Hallazgo compatible con el spec**: `london` también encuentra "Londres", porque el proveedor
  indexa nombres alternativos. FR-005b dice que "London" *no tiene por qué* encontrar "Londres"; no
  hay conflicto.
- **Alternatives considered**: Nominatim/OpenStreetMap (condiciones de uso más restrictivas y sin
  orden por población); índice GeoNames propio (cumpliría FR-006, pero añade almacenamiento,
  proceso de actualización y una capa nueva).

## R2. Paginación de "Ver más resultados"

- **Decision**: el backend expone `offset` y `limit` (5) y pide al proveedor
  `count = min(offset + limit + 1, 100)`. Devuelve la porción `[offset, offset + limit)` y
  `hasMore = true` si el proveedor devolvió más de `offset + limit`. Con `offset + limit >= 100`,
  `hasMore = false`.
- **Rationale**: el proveedor no pagina; pedir un elemento extra indica si hay más sin estado en
  el servidor ni caché (FR-026 y Principio VI). El máximo práctico es de 100 resultados (20 pulsaciones).
- **Alternatives considered**: pedir siempre 100 (más carga y latencia en cada tecla); guardar
  resultados en caché por sesión (estado que el spec no necesita).

## R3. Proveedor de clima actual: Open-Meteo Forecast API

- **Decision**: `GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,relative_humidity_2m,pressure_msl,visibility&timeformat=unixtime&timezone=GMT`.
- **Rationale** (verificado con una llamada real):
  - Los siete datos están disponibles en `current`. Las unidades por defecto ya son métricas y se
    confirman en `current_units`: `°C`, `mm`, `km/h`, `°` (dirección), `%`, `hPa`, y `m`
    (visibilidad).
  - `current.time` es el instante de validez del dato; con `timeformat=unixtime` llega como
    segundos UTC, sin ambigüedad de zona horaria. El frontend lo muestra en la zona del
    dispositivo (FR-017).
  - `pressure_msl` (presión a nivel del mar) es la presión que suelen informar los partes
    meteorológicos; se prefiere a `surface_pressure`.
  - Errores: `400` con `{"error": true, "reason": "..."}`. No requiere clave para uso no
    comercial.
- **Hallazgos que el spec debe conocer**:
  1. **Los datos no son observaciones de estación**: según la documentación, `current` se basa en
     datos de modelo meteorológico cada 15 minutos. En la prueba, el dato tenía unos 15 minutos de
     antigüedad, así que la advertencia de "más de 2 horas" (FR-015) casi nunca se activará; se
     implementa igual, tal como exige el spec.
  2. **Precipitación**: `precipitation` es la suma del intervalo previo (`interval = 900` s, es
     decir, 15 minutos), no de la última hora. El plan usa el valor de 15 minutos, sin cálculos
     propios; el spec se enmendó en este sentido el 2026-11-03.
  3. **Visibilidad** llega en metros; el backend la convierte a km (FR-013). Es un cambio de
    escala dentro del sistema métrico, no una conversión entre sistemas, así que no infringe el
    Principio IX.
- **Alternatives considered**: `hourly` con `past_hours=1` para precipitación horaria (añade
  lógica de agregación que el spec no pide); otros proveedores con observaciones reales (descartados: el
  usuario fijó Open-Meteo).

## R4. Backend: Java 25 + Spring Boot 4.1 con virtual threads

- **Decision**: Spring Boot **4.1.2** (última versión estable; 4.2.0 está en RC) sobre Java 25,
  con Maven, `spring-boot-starter-webmvc` y `spring.threads.virtual.enabled=true`.
- **Rationale** (verificado en docs.spring.io, 4.1.2):
  - Requisitos: Java 17 a 27 (Java 25 soportado), Spring Framework 7.0.x, Maven ≥ 3.6.3,
    Tomcat 11 (Servlet 6.1).
  - Virtual threads: `spring.threads.virtual.enabled=true`. La documentación recomienda Java 24
    o superior, avisa de los hilos "fijados" (*pinned*) y de que son *daemon*.
    `spring.main.keep-alive=true` mantiene viva la JVM; se activa por prudencia.
  - Una API bloqueante (MVC + `RestClient`) sobre virtual threads es más simple que WebFlux y da
    la misma concurrencia para llamadas de E/S.
- **No verificado**: el nombre exacto del starter web en Boot 4 (`spring-boot-starter-webmvc`
  frente a `spring-boot-starter-web`). Se confirma con start.spring.io al crear el proyecto.

## R5. Cliente HTTP hacia Open-Meteo y tiempos de espera

- **Decision**: `RestClient` creado desde el `RestClient.Builder` autoconfigurado, sobre el
  cliente JDK (`java.net.http.HttpClient`), con `spring.http.clients.connect-timeout=1s` y
  `spring.http.clients.read-timeout=3s`. Cada petición del backend hace **una sola** llamada al
  proveedor: la búsqueda llama a Geocoding y el clima llama a Forecast con las coordenadas que
  recibe (revisado el 2026-11-09: antes el clima resolvía primero la ciudad con `get?id`, dos
  llamadas seguidas que podían superar el límite de 5 s).
- **Rationale** (verificado en docs.spring.io, 4.1.2): el prefijo `spring.http.clients.*` aplica a
  todos los clientes autoconfigurados. Sin Apache ni Jetty en el classpath se usa el cliente JDK,
  sin dependencias extra. Con una sola llamada, el backend termina como mucho en unos 4 s
  (1 s de conexión + 3 s de lectura), antes del límite de 5 s del frontend (FR-022a). Así el
  resultado que registra el backend coincide siempre con lo que ve el usuario.
- **Alternatives considered**: interfaces `@HttpExchange` con `@ImportHttpServices` (válidas, pero
  añaden configuración por grupo para solo dos llamadas); mantener `get?id` con un plazo total
  por operación (más lógica para un dato que el frontend ya tiene).

## R6. Arquitectura hexagonal del backend

- **Decision**: paquetes `domain` (modelo y reglas puras), `application` (casos de uso, puertos
  de entrada `SearchCities` y `GetCurrentWeather`, puertos de salida `CityCatalog` y
  `WeatherProvider`), `adapter.in.web` (controlador REST que implementa la interfaz generada desde
  OpenAPI) y `adapter.out.openmeteo` (implementaciones de los puertos de salida).
- **Rationale**: lo pide el usuario y aísla el proveedor detrás de un puerto, que es justo lo que
  se cambiaría si el proveedor no cumple FR-006. Las reglas del spec (paginación, antigüedad de 2
  horas, conversión m→km) viven en `domain` y `application`, y se prueban sin Spring.
- **Alternatives considered**: módulos Maven separados por capa (más configuración de build; los
  paquetes y una prueba de arquitectura bastan para esta versión).

## R7. Contrato OpenAPI: generación y verificación

- **Decision**:
  - Fuente única: `contract/openapi.yaml` en la raíz del repositorio (copiada de
    [contracts/openapi.yaml](./contracts/openapi.yaml) en la primera tarea).
  - Backend: `openapi-generator-maven-plugin` **7.26.0**, generador `spring` con
    `interfaceOnly=true`, `useSpringBoot4=true`, `useJackson3=true`, `openApiNullable=false` y
    `documentationProvider=none`. El controlador implementa la interfaz generada.
  - Frontend: `openapi-typescript` **7.13.0** genera los tipos TypeScript del contrato.
  - Pruebas de contrato del backend: `swagger-request-validator-mockmvc` **3.0.0** valida cada
    respuesta de MockMvc contra `contract/openapi.yaml`.
- **Rationale**: cumple el Principio I (tipos derivados del contrato en ambos lados) y el II
  (pruebas de contrato por endpoint). `useSpringBoot4` y `useJackson3` existen desde
  openapi-generator 7.16.0; desde 7.21.0 el valor por defecto es Boot 3, así que hay que
  activarlos explícitamente (verificado en las notas de versión y en la receta de migración de
  OpenRewrite).
- **No verificado**:
  - Si el código generado por 7.26.0 compila sin ajustes con Spring Boot 4.1.2.
  - Si `swagger-request-validator-mockmvc` 3.0.0 es compatible con el MockMvc de Spring
    Framework 7. Si no lo es, la alternativa es validar el JSON de respuesta contra los esquemas
    del contrato con un validador de JSON Schema.

## R8. Frontend: Next.js 16 + React 19 como intermediario obligatorio

- **Decision**: Next.js **16.4.x** (App Router) con React **19.3.x**, TypeScript `strict` y
  Tailwind CSS **4.3.x**. El navegador solo habla con Next.js: los *Route Handlers*
  `app/api/cities/route.ts` y `app/api/current-weather/route.ts` llaman al
  backend con `fetch` y `AbortSignal.timeout(5000)`. La URL del backend se lee de
  `process.env.BACKEND_URL` en cada petición, en el servidor.
- **Rationale** (verificado en el anuncio oficial de Next.js 16):
  - Requiere Node.js ≥ 20.9 y TypeScript ≥ 5.1; Turbopack es el bundler por defecto.
  - `middleware.ts` pasa a llamarse `proxy.ts`. No se usa: no hay que interceptar todas las
    peticiones, solo dos rutas de API.
  - El *caching* es opcional (*Cache Components*), así que los Route Handlers se ejecutan en cada
    petición por defecto, como necesitamos para datos actuales.
  - Los Route Handlers, a diferencia de `rewrites`, permiten aplicar el límite de 5 s, traducir
    errores del backend a un único "Error interno" y leer `BACKEND_URL` en tiempo de ejecución, sin
    fijarla al compilar la imagen Docker.
  - `peerDependencies` de next 16.4.3: `react ^19.0.0`; `engines`: `node >=20.9.0` (verificado en
    el registro npm).
- **No verificado**:
  - TypeScript 7.0.2 es la última versión publicada, pero no hay constancia de que Next.js 16
    la soporte. Se fija **TypeScript 5.9.x**.
  - Compatibilidad de Vitest 5 con Next 16 y React 19.3 (la guía oficial de Next.js describe
    Vitest con React Testing Library).

## R9. Internacionalización sin dependencias

- **Decision**: catálogo `frontend/src/i18n/messages/es.json`, con un módulo propio de unas
  decenas de líneas que expone `t(key)` tipado a partir de las claves del JSON. Las fechas y los
  números se formatean con `Intl.DateTimeFormat` e `Intl.NumberFormat` en el cliente, con la zona
  horaria del dispositivo.
- **Rationale**: un único idioma y una única pantalla no justifican `next-intl` (Principio VI).
  El tipado de claves impide referencias a textos inexistentes. El formato de fecha y hora debe
  hacerse en el navegador para usar la zona horaria del dispositivo (FR-017).
- **Alternatives considered**: `next-intl` (enrutado por idioma y carga de mensajes en servidor;
  innecesario con un idioma).

## R10. Observabilidad

- **Decision**:
  - Backend: logs estructurados `logging.structured.format.console=ecs`. Cada petición se
    registra en el caso de uso con la API fluida de SLF4J: `operation` (`SEARCH` o
    `CURRENT_WEATHER`), `outcome`, `durationMs`, `offset` en las búsquedas y `latitude`/`longitude`
    en las de clima. Métricas: solo las de Spring Boot Actuator, `http.server.requests` y
    `http.client.requests` (número, latencia y estado por ruta), sin métricas propias. Se exponen
    solo `health` y `metrics`.
  - Frontend (servidor Next.js): una línea JSON por petición a los Route Handlers con
    `operation`, `outcome` y `durationMs`.
- **Rationale**: cubre FR-028a y FR-028c sin agentes ni registros externos (verificado en la
  documentación de logging de Boot 4.1.2). FR-028c mide por endpoint, y cada endpoint es una ruta
  de `http.server.requests`, así que no hace falta un contador propio ni un puerto para él
  (revisado el 2026-11-09). FR-028b se garantiza porque las etiquetas `uri` de
  Micrometer usan la plantilla de ruta (`/api/v1/cities`), no la URL real, y porque se llama al
  proveedor con plantillas de URI (`/v1/search?name={name}`). Pruebas automatizadas comprueban que
  ni el texto de búsqueda ni direcciones IP aparecen en logs ni métricas (Principio V).
- **No verificado**: que la etiqueta `uri` de `http.client.requests` conserve la plantilla y no
  la URL expandida cuando se usa `RestClient.uri(template, vars)`. Lo comprueba una prueba
  automatizada; si fallara, se desactiva la etiqueta `uri` para ese cliente.
- **Alternatives considered**: OpenTelemetry con un colector en docker-compose (más
  infraestructura sin un consumidor definido en esta versión).

## R11. Pruebas

- **Decision**:
  - Backend: JUnit (vía `spring-boot-starter-test`) para dominio y aplicación sin Spring.
    `@WebMvcTest` con MockMvc y validación del contrato para el adaptador web.
    `MockRestServiceServer` para el adaptador de Open-Meteo, con respuestas JSON reales
    capturadas el 2026-11-01. Los registros de los casos de uso se prueban con un
    `ListAppender` de Logback; la ausencia del texto buscado y de IPs, con `OutputCaptureExtension`
    en una prueba `@SpringBootTest`.
  - Frontend: Vitest + React Testing Library para componentes y Route Handlers; Playwright para
    E2E a 320 px (sin scroll horizontal, objetivos táctiles ≥ 44 × 44 px), con el backend
    simulado.
  - Comando único por componente: `./mvnw verify` y `npm test`. Un único comando raíz
    (`make test`) los ejecuta ambos.
- **Rationale**: `MockRestServiceServer` viene con `spring-test`, sin dependencias extra. Las
  pruebas no dependen de la red ni del proveedor real, así que son deterministas (Principio II).
- **Alternatives considered**: WireMock (dependencia adicional); pruebas contra la API real
  (no deterministas).

## R12. docker-compose local

- **Decision**: `compose.yaml` en la raíz con dos servicios:
  - `backend`: build multi-etapa, `eclipse-temurin:25-jdk` para compilar y `eclipse-temurin:25-jre`
    para ejecutar. Puerto 8080 solo en la red interna de compose, con `healthcheck` sobre
    `/actuator/health`.
  - `frontend`: build multi-etapa sobre `node:24-alpine` con `output: "standalone"`.
    `BACKEND_URL=http://backend:8080`, puerto 3000 publicado y `depends_on` del backend sano.
  - Solo se publica el puerto del frontend: el navegador no puede llegar al backend directamente,
    lo que refuerza el requisito de pasar por Next.js.
- **No verificado**: la disponibilidad de la etiqueta `eclipse-temurin:25-jre` en Docker Hub en
  la fecha de implementación (Temurin publica imágenes para cada LTS; 25 es LTS).
