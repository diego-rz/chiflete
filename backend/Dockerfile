# Contexto de build: raíz del repositorio (incluye contract/). Ver compose.yaml.
FROM eclipse-temurin:25-jdk AS build
WORKDIR /workspace
COPY contract/ contract/
COPY backend/.mvn/ backend/.mvn/
COPY backend/mvnw backend/pom.xml backend/
WORKDIR /workspace/backend
# Descarga las dependencias en una capa propia para reutilizarla entre builds.
RUN ./mvnw -B -q dependency:go-offline
COPY backend/src/ src/
RUN ./mvnw -B -q -DskipTests package

FROM eclipse-temurin:25-jre
RUN useradd --system --uid 10001 chiflete
WORKDIR /app
COPY --from=build /workspace/backend/target/chiflete-backend-*.jar app.jar
USER chiflete
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
