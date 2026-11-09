# Chiflete — Backend

API REST que busca ciudades y devuelve su clima actual, consultando
[Open-Meteo](https://open-meteo.com/) (Geocoding API y Forecast API). No guarda ningún dato.

- **Stack**: Java 25, Spring Boot 4.1.2 (MVC sobre virtual threads, `RestClient`), Maven.
- **Contrato**: [`../contract/openapi.yaml`](../contract/openapi.yaml), fuente única. Las
  interfaces y modelos de `ar.chiflete.weather.adapter.in.web.{api,model}` se generan en cada
  build con `openapi-generator-maven-plugin` 7.26.0 (en `target/generated-sources`; no se editan).
- **Arquitectura**: hexagonal en paquetes, protegida por `HexagonalArchitectureTest`. Ver
  [ADR 0001](../docs/adr/0001-arquitectura-inicial.md).

```text
ar.chiflete.weather
├── domain/                 Modelo y reglas puras (sin Spring ni Jackson)
├── application/            Casos de uso y puertos (sin Spring ni Jackson)
├── adapter/in/web/         Controlador y traducción de errores (ApiExceptionHandler)
├── adapter/out/openmeteo/  Clientes de Open-Meteo
└── config/                 Beans (reloj, clientes)
```

## Construir y ejecutar

Requisitos: JDK 25 (`JAVA_HOME` apuntando a él). Maven no hace falta: se usa el wrapper.

```bash
./mvnw spring-boot:run          # http://localhost:8080
./mvnw -DskipTests package      # target/chiflete-backend-0.0.1-SNAPSHOT.jar
```

Con Docker, desde la raíz del repositorio (el contexto de build es la raíz, para incluir
`contract/`):

```bash
docker compose up --build       # el backend queda solo en la red interna de compose
```

## Pruebas

```bash
./mvnw verify                   # o, desde la raíz, make test
```

Las pruebas no usan la red: Open-Meteo se simula con `MockRestServiceServer` y las respuestas
reales capturadas en [`src/test/resources/openmeteo/`](src/test/resources/openmeteo/README.md).

## Configuración

| Variable / propiedad | Por defecto | Uso |
|----------------------|-------------|-----|
| `OPEN_METEO_GEOCODING_URL` (`chiflete.open-meteo.geocoding-url`) | `https://geocoding-api.open-meteo.com` | Búsqueda de ciudades |
| `OPEN_METEO_FORECAST_URL` (`chiflete.open-meteo.forecast-url`) | `https://api.open-meteo.com` | Clima actual |
| `spring.http.clients.connect-timeout` / `read-timeout` | `1s` / `3s` | Una llamada al proveedor por petición, por debajo del límite de 5 s del frontend |

No hay secretos: Open-Meteo no requiere clave para uso no comercial.

## Observabilidad

- Logs estructurados ECS en la salida estándar (`logging.structured.format.console=ecs`).
- Actuator expone solo `health` y `metrics` (`/actuator/metrics/http.server.requests`,
  `/actuator/metrics/http.client.requests`).
- Los errores HTTP solo llevan `{"code": ...}`; nunca trazas, rutas ni mensajes.

## Verificado durante la implementación

Resultado de los puntos "pendientes de verificar" del plan (2026-11-09):

| Punto | Resultado |
|-------|-----------|
| Starter web en Boot 4 | `spring-boot-starter-webmvc` (Spring Initializr). La versión del parent es `4.1.2`; Initializr la escribe como `4.1.2.RELEASE`, que no existe en Maven Central. |
| `RestClient` y `spring.http.clients.*` | En Boot 4 están en un módulo aparte: hace falta `spring-boot-starter-restclient`. |
| openapi-generator 7.26.0 con Boot 4.1.2 y Jackson 3 | Compila con `useSpringBoot4` y `useJackson3`. Los modelos usan `@NotNull` de `jakarta.validation` aun con `useBeanValidation=false`, así que se añade solo `jakarta.validation-api` (sin validador). Usan `org.springframework.lang.Nullable`, obsoleto en Spring 7: solo produce un aviso de compilación. |
| `server.error.include-path` | Por defecto `always` en Boot 4.1.2; se fija en `never` (Principio IV). |
| Imagen `eclipse-temurin:25-jre` | Existe (Ubuntu 26.04, Java 25.0.5). No trae `curl` ni `wget`: el healthcheck usa `bash` y `/dev/tcp`. |
