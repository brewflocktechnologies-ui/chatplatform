# Build stage: full JDK + the project's own Maven wrapper (protoc for the
# copied accountservice contract is fetched by protobuf-maven-plugin). The
# BuildKit cache mount keeps ~/.m2 across builds. Tests are skipped here on
# purpose - the full quality gates run at `mvn verify` locally/CI; the image
# build is packaging, not verification.
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
COPY src src
RUN --mount=type=cache,target=/root/.m2 sh mvnw -q package -DskipTests

# Runtime stage: JRE only, non-root. Fat jar, not extracted layers - this is a
# local-first setup; switch to layered extraction if image-push size matters.
FROM eclipse-temurin:25-jre
RUN useradd -r -u 1001 spring
USER spring
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# BootUI's developer-local store (accepted-risk rule dismissals). Owned by the
# runtime user because BootUI persists changes back to it atomically.
COPY --chown=spring:spring .bootui .bootui
# 8100 REST API + Swagger UI + BootUI, 8101 actuator (loopback in yaml -
# override MANAGEMENT_SERVER_ADDRESS=0.0.0.0 in the container for reachable
# health probes).
EXPOSE 8100 8101
ENTRYPOINT ["java", "-jar", "app.jar"]
