.PHONY: test test-backend test-frontend generate up down

# Ejecuta todas las pruebas de ambos componentes (Principio II). No usa la red.
test: test-backend test-frontend

test-backend:
	cd backend && ./mvnw -B verify

test-frontend:
	cd frontend && npm test

# Regenera los artefactos derivados de contract/openapi.yaml (Principio I).
# Las interfaces del backend se regeneran en cada build de Maven (generate-sources).
generate:
	cd backend && ./mvnw -B -q generate-sources
	cd frontend && npm run generate:api

# Levanta la aplicación completa en local: http://localhost:3000
up:
	docker compose up --build

down:
	docker compose down
