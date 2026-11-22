# Contexto de build: raíz del repositorio (incluye contract/). Ver compose.yaml.
FROM node:24-alpine AS build
WORKDIR /workspace/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY contract/ /workspace/contract/
COPY frontend/ ./
# `npm run build` regenera los tipos del contrato (prebuild → generate:api) y compila.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /workspace/frontend/.next/standalone ./
COPY --from=build --chown=node:node /workspace/frontend/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
