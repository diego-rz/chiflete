# Implementation Plan: Clima actual por ciudad

**Branch**: `001-city-current-weather` | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-city-current-weather/spec.md`

## Summary

Una pantalla web mobile-first donde el usuario busca una ciudad por prefijo, sin distinguir
tildes ni mayúsculas, con resultados de 5 en 5, y ve su clima actual con siete datos en sistema
métrico. El navegador solo habla con el servidor Next.js 16, cuyos Route Handlers reenvían al
backend Spring Boot 4.1 (Java 25, virtual threads, arquitectura hexagonal). El backend consulta
Open-Meteo: la Geocoding API para las ciudades y la Forecast API (`current`) para el clima. Sin
persistencia. El contrato es un único documento OpenAPI del que se generan las interfaces del
backend y los tipos del frontend. Se levanta en local con docker-compose. Detalle de las
decisiones en [research.md](./research.md).

## Technical Context

**Language/Version**: Java 25 (backend); TypeScript 5.9.x en modo `strict` (frontend; 7.x no
verificado con Next.js 16, ver research R8)

**Primary Dependencies**:
- Backend: Spring Boot 4.1.2 (`webmvc`, `actuator`, `test`) y `openapi-generator-maven-plugin`
  7.26.0 (solo en build).
- Frontend: Next.js 16.4.x, React 19.3.x, Tailwind CSS 4.3.x, `openapi-typescript` 7.13.0 (solo en
  desarrollo).

**Storage**: N/A (sin persistencia, FR-026)

**Testing**:
- Backend: JUnit + MockMvc + `MockRestServiceServer` + `swagger-request-validator-mockmvc` 3.0.0
  (compatibilidad no verificada).
- Frontend: Vitest + React Testing Library; Playwright para E2E a 320 px.

**Target Platform**: contenedores Linux (docker-compose en local); navegadores Chrome/Edge/Firefox
≥ 111 y Safari ≥ 16.4 (mínimos de Next.js 16)

**Project Type**: aplicación web (frontend + backend)

**Performance Goals**: coincidencias en < 1 s (p95) y clima en < 2 s (p95) (SC-002, SC-003);
dependen sobre todo de la latencia de Open-Meteo.

**Constraints**:
- Límite de 5 s extremo a extremo (FR-022a): cada petición del backend hace una sola llamada a
  Open-Meteo, con 1 s de conexión y 3 s de lectura; los Route Handlers cortan a los 5 s hacia el
  backend.
- 320 px sin scroll horizontal y objetivos táctiles ≥ 44 × 44 px.
- Ni el texto de búsqueda ni IPs en logs o métricas.

**Scale/Scope**: 1 pantalla, 2 endpoints, sin cuentas de usuario; carga de uso público sin un
objetivo de volumen fijado por el spec.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principio / gate | Cómo lo cumple el plan | Pre | Post |
|---|------------------|-------------------------|-----|------|
| I | Contrato primero | `contract/openapi.yaml` es la fuente única; interfaces Spring generadas y tipos TS generados; ninguna definición duplicada a mano. Los Route Handlers de Next.js reenvían los cuerpos del contrato sin redefinirlos. | ✅ | ✅ |
| II | Test-first | Cada tarea empieza por la prueba que falla. Pruebas de contrato por endpoint (validador contra OpenAPI). Comando único: `make test`. Proveedor simulado, sin red: determinista. | ✅ | ✅ |
| III | Documentación | `backend/README.md`, `frontend/README.md`; `docs/adr/0001-arquitectura-inicial.md` con diagramas C4 de contexto y de contenedores (y de componentes del backend hexagonal); OpenAPI con cada endpoint. | ✅ | ✅ |
| IV | Privacidad | Sin persistencia ni cookies; Open-Meteo sin clave (uso no comercial), así que no hay secretos. El frontend no llama a terceros: solo a sus Route Handlers. Los errores solo llevan `code`. | ✅ | ✅ |
| V | Observabilidad | Logs ECS por petición (búsqueda con `offset`, clima con coordenadas) con resultado y duración; métricas de Actuator por endpoint, sin métricas propias. Pruebas automatizadas que comprueban la ausencia del texto de búsqueda y de IPs. Ver research R10. | ✅ | ✅ |
| VI | Simplicidad | Cada dependencia está justificada en la tabla siguiente. Sin capas extra: hexagonal en paquetes de un solo módulo, sin caché, sin librería i18n. | ✅ | ✅ |
| VII | Mobile-first | Diseño a 320 px primero; prueba E2E de ancho mínimo, scroll horizontal y tamaño táctil. | ✅ | ✅ |
| VIII | i18n | Todo texto visible sale de `es.json` (también unidades y puntos cardinales). Prueba que falla si un componente contiene literales visibles. | ✅ | ✅ |
| IX | Sistema de medida | Métrico global; `measurementSystem` en la respuesta; unidad de cada campo en OpenAPI (`x-unit`). La única transformación (m→km) es un cambio de escala dentro del sistema métrico. | ✅ | ✅ |

**Justificación de dependencias (Principio VI)**:

| Dependencia | Problema que resuelve | Por qué no basta lo más simple |
|-------------|-----------------------|--------------------------------|
| `spring-boot-starter-webmvc` | Servidor HTTP y API REST | Requisito del stack |
| `spring-boot-starter-actuator` | Healthcheck de compose y métricas (FR-028c) | Escribir endpoints de salud y métricas propios sería reinventarlos |
| `openapi-generator-maven-plugin` (build) | Interfaces del backend derivadas del contrato (Principio I) | Mantener DTOs a mano exigiría verificarlos igualmente |
| `swagger-request-validator-mockmvc` (test) | Pruebas de contrato por endpoint (Principio II) | Comparar a mano con el YAML no detecta deriva |
| `openapi-typescript` (dev) | Tipos del frontend derivados del contrato | Tipos escritos a mano violan el Principio I |
| Tailwind CSS | Estilos mobile-first | Requisito del stack |
| Vitest + React Testing Library (dev) | Pruebas unitarias y de componentes | Next.js no trae ejecutor de pruebas |
| Playwright (dev) | Medir scroll horizontal y tamaños táctiles a 320 px en un navegador real | jsdom no calcula layout |

## Decisiones abiertas

1. ~~**Prefijo por palabra (FR-006)**~~ — **Resuelta (2026-11-03)**: FR-006 se enmendó para
   comparar solo con el inicio del nombre completo, que es lo que Open-Meteo ofrece (research R1).
2. ~~**Supuestos del spec a actualizar**~~ — **Resuelta (2026-11-03)**: el spec ya define la
   observación como dato de modelo cada 15 minutos y la precipitación como la de esos 15 minutos.

## Project Structure

### Documentation (this feature)

```text
specs/001-city-current-weather/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   └── openapi.yaml     # Fase 1 (se copia a contract/openapi.yaml al implementar)
├── checklists/
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
contract/
└── openapi.yaml                 # Fuente única del contrato

backend/
├── pom.xml                      # Spring Boot 4.1.2, Java 25, openapi-generator
├── Dockerfile
├── README.md
└── src/
    ├── main/java/ar/chiflete/weather/
    │   ├── ChifleteApplication.java
    │   ├── domain/              # City, CurrentWeather, MeasurementSystem, reglas (antigüedad, paginación, m→km)
    │   ├── application/
    │   │   ├── port/in/         # SearchCities, GetCurrentWeather
    │   │   ├── port/out/        # CityCatalog, WeatherProvider
    │   │   └── service/         # Casos de uso; registran cada petición con SLF4J
    │   ├── adapter/in/web/      # Controlador que implementa la interfaz generada; mapeo de errores
    │   ├── adapter/out/openmeteo/  # Clientes RestClient de Geocoding y Forecast
    │   └── config/              # Beans, reloj, propiedades
    ├── main/resources/application.yaml
    └── test/java/ar/chiflete/weather/
        ├── domain/              # Pruebas unitarias puras
        ├── application/         # Casos de uso con puertos falsos
        ├── adapter/in/web/      # Pruebas de contrato (MockMvc + validador OpenAPI)
        ├── adapter/out/openmeteo/  # MockRestServiceServer con JSON reales de Open-Meteo
        ├── observability/       # Logs y métricas sin texto de búsqueda ni IPs
        └── architecture/        # El dominio no depende de Spring ni de los adaptadores

frontend/
├── package.json                 # next 16.4, react 19.3, tailwindcss 4.3, typescript 5.9
├── next.config.ts               # output: "standalone"
├── Dockerfile
├── README.md
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx             # Pantalla única
    │   ├── api/cities/
    │   │   └── route.ts         # GET → backend /api/v1/cities
    │   └── api/current-weather/
    │       └── route.ts         # GET → backend /api/v1/current-weather?latitude&longitude
    ├── components/              # CitySearch, CityResultList, CurrentWeatherCard, StaleWarning, ErrorMessage
    ├── lib/
    │   ├── api-types.ts         # Generado con openapi-typescript (no se edita a mano)
    │   ├── backend-client.ts    # Llamada servidor→backend con timeout de 5 s y log JSON
    │   ├── format.ts            # Hora del dispositivo, números, grados→punto cardinal
    │   └── use-latest-request.ts  # Descarta respuestas fuera de orden
    └── i18n/
        ├── messages/es.json
        └── t.ts                 # t(key) tipado
    tests/
    ├── unit/                    # Vitest + React Testing Library
    └── e2e/                     # Playwright a 320 px

docs/adr/
└── 0001-arquitectura-inicial.md # Contexto, decisión, alternativas, consecuencias y C4

compose.yaml                     # backend (interno) + frontend (:3000)
Makefile                         # make test, make up
```

**Structure Decision**: aplicación web con `backend/` y `frontend/` como componentes desplegables
separados (Principio I), con el contrato en `contract/` fuera de ambos para que ninguno sea su
dueño. El backend es un único módulo Maven con la arquitectura hexagonal expresada en paquetes y
protegida por una prueba de arquitectura. El nombre del paquete raíz (`ar.chiflete.weather`) es
provisional.

## Diseño por capas (resumen)

- **Flujo de búsqueda**: el navegador llama a `/api/cities?query&offset` en Next.js; el Route
  Handler llama a `GET /api/v1/cities` en el backend. El controlador invoca el caso de uso
  `SearchCities`, que usa el puerto `CityCatalog`, implementado por el adaptador de la Geocoding
  API (`count = min(offset + 6, 100)`, research R2).
- **Flujo de clima**: el navegador llama a `/api/current-weather?latitude&longitude` con las
  coordenadas de la ciudad elegida; el Route Handler reenvía al mismo recurso del backend. El caso
  de uso `GetCurrentWeather` pide los datos a `WeatherProvider` (Forecast API), en una sola
  llamada, y aplica las reglas de dominio: omitir los ausentes, m→km y `stale` con reloj
  inyectado. La ciudad no viaja en la respuesta: el frontend la conserva del resultado elegido
  (FR-019) y la reutiliza en "Actualizar".
- **Errores**: el adaptador traduce los fallos y los tiempos agotados de Open-Meteo en
  excepciones de puerto; el controlador las mapea a 502/504 con `code`. Next.js reenvía el código
  de estado y la UI muestra "Error interno" ante cualquier respuesta no 2xx, salvo en "Ver más",
  que conserva los resultados (FR-009a).
- **Concurrencia**: virtual threads en Tomcat (`spring.threads.virtual.enabled=true`); la llamada
  bloqueante a Open-Meteo no ocupa hilos de plataforma.

## Pendiente de verificar durante la implementación

Estos puntos no se pudieron confirmar en documentación oficial o en pruebas directas. Cada uno se
resuelve en la primera tarea que lo use; los detalles están en research.md.

| Punto | Dónde |
|-------|-------|
| Nombre del starter web en Boot 4 (`webmvc` frente a `web`) | R4 |
| Código de openapi-generator 7.26.0 con Boot 4.1.2 y Jackson 3 | R7 |
| `swagger-request-validator-mockmvc` 3.0.0 con Spring Framework 7 | R7 |
| Soporte de TypeScript 7 en Next.js 16 (se fija 5.9) | R8 |
| Vitest 5 con Next 16 y React 19.3 | R8 |
| La etiqueta `uri` de `http.client.requests` conserva la plantilla | R10 |
| Imagen `eclipse-temurin:25-jre` y herramienta disponible en ella para el healthcheck (`curl` o `wget`) | R12 |

## Complexity Tracking

No hay violaciones de la constitución que justificar.
