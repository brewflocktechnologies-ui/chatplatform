# Build stage: full JDK + the project's own Maven wrapper. The BuildKit cache
# mount keeps ~/.m2 across builds so only the first build downloads the world.
# Tests are skipped here on purpose - they need a live Postgres (and the full
# quality gates run at `mvn verify` locally/CI); the image build is packaging,
# not verification.
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
COPY src src
RUN --mount=type=cache,target=/root/.m2 sh mvnw -q package -DskipTests

# Runtime stage: JRE only, non-root. Fat jar, not extracted layers - this is a
# local-first setup; switch to `java -Djarmode=tools -jar app.jar extract
# --layers` if image-push size ever matters.
FROM eclipse-temurin:25-jre
RUN useradd -r -u 1001 spring
USER spring
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# BootUI's developer-local store (accepted-risk rule dismissals). Owned by the
# runtime user because BootUI persists changes back to it atomically.
COPY --chown=spring:spring .bootui .bootui
# 8080 REST API + Swagger UI + BootUI, 8081 actuator (bind it to 0.0.0.0 via
# MANAGEMENT_SERVER_ADDRESS env when the container's health must be reachable -
# the yaml default is loopback-only, invisible outside the container netns).
EXPOSE 8080 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
