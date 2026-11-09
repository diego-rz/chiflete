# Quickstart: Clima actual por ciudad

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contrato**: [contracts/openapi.yaml](./contracts/openapi.yaml)

Guía para levantar la aplicación en local y validar la funcionalidad de punta a punta. Los
archivos que se citan (`compose.yaml`, `Makefile`, Dockerfiles) se crean durante
`/speckit-implement`.

## Requisitos previos

- Docker con Compose v2 (`docker compose version`).
- Acceso a Internet hacia `geocoding-api.open-meteo.com` y `api.open-meteo.com`. No hace falta
  clave de API para uso no comercial.
- Solo para desarrollo sin Docker: JDK 25 y Node.js 24 LTS (≥ 20.9).

## 1. Levantar la aplicación

```bash
docker compose up --build
```

Resultado esperado:

- `backend` aparece como `healthy` (healthcheck sobre `/actuator/health`).
- `frontend` arranca después y escucha en <http://localhost:3000>.
- El puerto 8080 **no** está publicado: `curl http://localhost:8080` falla. El navegador solo
  llega al backend a través de Next.js.

## 2. Ejecutar las pruebas

```bash
make test        # ejecuta ./mvnw verify en backend/ y npm test en frontend/
```

Las pruebas no usan la red: el proveedor está simulado. El resultado debe ser determinista y
salir con código 0.

## 3. Escenarios de validación manual

Abre <http://localhost:3000> en el navegador, con las herramientas de desarrollo en modo
dispositivo a **320 px** de ancho.

| # | Acción | Resultado esperado | Requisitos |
|---|--------|--------------------|-----------|
| 1 | Escribir `co` | No aparece lista ni indicador de carga | FR-002 |
| 2 | Escribir `cordoba`, sin pulsar Enter | Aparecen 5 resultados; el primero es "Córdoba" en grande y, debajo, "Provincia de Córdoba · Argentina" más pequeño y claro; hay un botón "Ver más resultados" | FR-003, FR-005, FR-007, FR-008, FR-009 |
| 3 | Pulsar "Ver más resultados" | Se añaden hasta 5 resultados debajo de los anteriores | FR-009 |
| 4 | Escribir `xyzqwv` | La lista muestra "Sin resultados" | FR-010 |
| 5 | Elegir "Córdoba, Provincia de Córdoba, Argentina" | Se muestran los siete datos con °C, mm, km/h, punto cardinal, %, hPa y km, la ciudad y la hora de observación en la hora del dispositivo | FR-011 a FR-019 |
| 6 | Pulsar "Actualizar" | Se vuelve a cargar el clima de la misma ciudad | FR-020a |
| 7 | Comprobar a 320 px | No hay scroll horizontal; los elementos pulsables miden al menos 44 × 44 px | FR-029 |

## 4. Escenarios de fallo del proveedor

Simula la caída del proveedor sin tocar el código, apuntando el backend a una dirección
inexistente:

```bash
OPEN_METEO_GEOCODING_URL=http://10.255.255.1 OPEN_METEO_FORECAST_URL=http://10.255.255.1 \
  docker compose up --build
```

| # | Acción | Resultado esperado | Requisitos |
|---|--------|--------------------|-----------|
| 8 | Escribir `cordoba` | En unos 1–4 s aparece "Error interno" y ningún resultado | FR-021, FR-022a |
| 9 | Seleccionar una ciudad (con el proveedor de búsqueda sano y el de clima caído) | "Error interno" sin datos de clima | FR-022 |

La simulación de fallos al cargar más resultados y de datos de más de 2 horas está cubierta por
pruebas automatizadas con el proveedor simulado; no se reproduce a mano.

## 5. Observabilidad y privacidad

```bash
docker compose logs backend | tail -n 20
```

- Cada línea es JSON (formato ECS) con `operation` (`SEARCH` o `CURRENT_WEATHER`), `outcome` y
  `durationMs`; las búsquedas llevan `offset` y las de clima, las coordenadas de la ciudad
  (FR-028a).
- No aparecen ni el texto buscado (`cordoba`) ni direcciones IP (FR-028b, Principio V). Puedes
  comprobarlo con `docker compose logs | grep -i cordoba`, que no debe devolver nada.
- Las métricas se consultan desde dentro de la red de compose:
  `docker compose exec frontend wget -qO- http://backend:8080/actuator/metrics/http.server.requests`
  (la imagen del backend no trae `wget` ni `curl`; la del frontend sí trae `wget`)
  (FR-028c).

## 6. Contrato

- Contrato del endpoint de búsqueda: [contracts/openapi.yaml](./contracts/openapi.yaml), operación
  `searchCities`.
- Contrato del endpoint de clima: operación `getCurrentWeather`.
- Reglas de cada campo: [data-model.md](./data-model.md).
