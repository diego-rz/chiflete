# Data Model: Clima actual por ciudad

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contrato**: [contracts/openapi.yaml](./contracts/openapi.yaml)

No hay persistencia: todas las entidades viven solo durante una petición (FR-026). Los nombres
de campo coinciden con el contrato OpenAPI. Este documento añade las reglas de validación y de
derivación que el contrato no expresa.

## City (Ciudad)

Ciudad devuelta por la búsqueda y seleccionable por el usuario.

| Campo | Tipo | Obligatorio | Origen (Open-Meteo Geocoding) | Reglas |
|-------|------|-------------|-------------------------------|--------|
| `id` | entero de 64 bits | Sí | `id` | Identificador del proveedor (GeoNames). Identifica la ciudad de forma única; dos ciudades homónimas tienen `id` distintos. |
| `name` | texto | Sí | `name` con `language=es` | Nombre en español si existe; si no, el local (FR-005b). |
| `province` | texto | No | `admin1` | Se omite si el proveedor no lo informa. |
| `country` | texto | No | `country` | Se omite si el proveedor no lo informa (caso real: "San Juan", Puerto Rico). |

`latitude` y `longitude` existen en el dominio para pedir el clima, pero **no** se exponen en el
contrato: el clima se pide por `id` y el backend resuelve las coordenadas.

## CitySearch (Búsqueda) — solo entrada

| Campo | Tipo | Reglas |
|-------|------|--------|
| `query` | texto | Se recortan los espacios de los extremos. Debe tener al menos 3 caracteres (FR-002) y como máximo 100. Si no, `400`. |
| `offset` | entero ≥ 0 | Por defecto 0. Si `offset + limit` supera 100, `400`, porque el proveedor solo devuelve hasta 100 resultados. |
| `limit` | entero 1–20 | Por defecto 5 (FR-008). La UI siempre envía 5. |

## CitySearchPage (Página de resultados)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `items` | lista de `City` | Porción `[offset, offset + limit)` de los resultados del proveedor, en el orden del proveedor. Vacía si no hay coincidencias (la UI muestra "Sin resultados", FR-010). |
| `hasMore` | booleano | `true` si el proveedor devolvió más de `offset + limit` resultados y `offset + limit < 100` (FR-009). |

## CurrentWeather (Observación del clima)

| Campo | Tipo | Obligatorio | Origen (Open-Meteo Forecast, `current`) | Unidad con `METRIC` |
|-------|------|-------------|-----------------------------------------|---------------------|
| `city` | `City` | Sí | Geocoding `get?id` | — |
| `measurementSystem` | enum `METRIC` | Sí | Constante en esta versión (FR-013a) | — |
| `observedAt` | instante UTC (ISO-8601) | No | `time` (unixtime) | — |
| `stale` | booleano | Sí | Calculado | — |
| `temperature` | decimal | No | `temperature_2m` | °C |
| `precipitation` | decimal ≥ 0 | No | `precipitation` (suma del intervalo de 15 min) | mm |
| `windSpeed` | decimal ≥ 0 | No | `wind_speed_10m` | km/h |
| `windDirection` | entero 0–360 | No | `wind_direction_10m` | grados (de dónde viene el viento) |
| `relativeHumidity` | entero 0–100 | No | `relative_humidity_2m` | % |
| `pressure` | decimal | No | `pressure_msl` | hPa |
| `visibility` | decimal ≥ 0 | No | `visibility` ÷ 1000 | km |

Reglas:

- **Dato ausente frente a cero** (FR-018): si el proveedor no informa un campo, o lo informa como
  `null`, el campo se **omite** de la respuesta. Un `0` informado se conserva como `0`. La UI
  muestra "-" solo para los campos omitidos.
- **Antigüedad** (FR-014, FR-015): `stale = (instante de la consulta − observedAt) > 2 h`. Se
  calcula en el backend con un reloj inyectable, para poder probarlo. Sin `observedAt`,
  `stale = false` y la UI muestra los siete datos como "-" (supuesto del spec).
- **Nombres de campo neutrales**: los nombres no incluyen la unidad; la unidad la determina
  `measurementSystem`. Así, añadir el sistema imperial en el futuro no rompe el contrato (FR-013a,
  Principio IX).
- **Dirección cardinal**: el backend entrega grados; el frontend los convierte en uno de los 8
  puntos (N, NE, E, SE, S, SO, O, NO) con claves del catálogo i18n (FR-013, FR-030). Cada punto
  cubre un sector de 45° centrado en su dirección; 360° equivale a N.

## Estados de la UI (frontend, no se transmiten)

```text
Búsqueda:  vacía ─(≥3 caracteres)→ buscando ─→ con resultados | sin resultados | error
           con resultados ─("Ver más")→ cargando más ─→ con resultados | error al cargar más*
           cualquiera ─(<3 caracteres)→ vacía
Clima:     ninguno ─(selección)→ cargando ─→ mostrado | mostrado desactualizado | error
           mostrado* ─("Actualizar")→ cargando ─→ (igual que arriba)
```

`*` "Error al cargar más" conserva los resultados ya mostrados (FR-009a). Al pasar a "cargando"
desde "mostrado" se dejan de mostrar los datos anteriores (Edge Cases, "Espera"). Solo se acepta
la respuesta de la petición más reciente; las respuestas de peticiones anteriores se descartan
(Edge Cases, "Respuestas fuera de orden").

## Errores (contrato)

| Situación | HTTP del backend | `code` | UI |
|-----------|------------------|--------|----|
| Parámetros inválidos | 400 | `INVALID_REQUEST` | No debería ocurrir (la UI valida antes); se trata como "Error interno". |
| Ciudad inexistente | 404 | `CITY_NOT_FOUND` | "Error interno". |
| Proveedor caído o con error | 502 | `PROVIDER_UNAVAILABLE` | "Error interno". |
| Proveedor sin respuesta en 4 s | 504 | `PROVIDER_TIMEOUT` | "Error interno". |

El cuerpo de error solo lleva `code`; nunca trazas, rutas ni el nombre del proveedor (FR-023,
Principio IV).
