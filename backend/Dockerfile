# Imagen del backend para desplegar (Render, etc.). Se construye desde la carpeta backend/.
# Etapa 1: compila el jar con Maven (sin correr los tests: ya corren en el desarrollo).
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

# Etapa 2: solo el jar y un Java liviano, con un usuario sin privilegios.
FROM eclipse-temurin:17-jre
RUN useradd --system --uid 1001 asisti
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
USER asisti
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080
# Render pasa el puerto en PORT; el plan gratuito tiene 512 MB, por eso el tope de memoria del Java.
ENTRYPOINT ["sh", "-c", "exec java -Xmx380m -XX:+UseSerialGC -Dserver.port=${PORT:-8080} -jar app.jar"]
