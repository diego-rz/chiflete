# Fixtures de Open-Meteo

Respuestas reales capturadas el 2026-11-09 (research R1 y R3):

| Archivo | Petición |
|---------|----------|
| `search-cordoba.json` | `GET geocoding-api.open-meteo.com/v1/search?name=cordoba&count=6&language=es&format=json` |
| `search-empty.json` | `GET .../v1/search?name=xyzqwv&count=6&language=es&format=json` (sin campo `results`) |
| `search-no-country.json` | Primer resultado de `GET .../v1/search?name=san%20juan&count=20&language=es&format=json` ("San Juan", Puerto Rico, sin `country`) |
| `forecast-cordoba.json` | `GET api.open-meteo.com/v1/forecast?latitude=-31.4135&longitude=-64.18105&current=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,relative_humidity_2m,pressure_msl,visibility&timeformat=unixtime&timezone=GMT` |
| `forecast-partial.json` | `forecast-cordoba.json` sin `visibility` ni `wind_direction_10m` (derivado: el proveedor real siempre los informó) |
| `error-400.json` | Cuerpo real de `400` de `GET .../v1/forecast?latitude=999&longitude=0&current=temperature_2m` |
