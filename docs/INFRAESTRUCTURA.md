# Infraestructura y Despliegue

Este documento describe la infraestructura del sistema, la configuracion de contenedores y el proceso de despliegue.

## Diagrama de Infraestructura

### Ambiente Local (Docker Compose)

```
+-----------------------------------------------------------------------------------+
|                              HOST MACHINE (localhost)                              |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +---------------------------------------------------------------------------+   |
|  |                        Docker Network: appnet                              |   |
|  +---------------------------------------------------------------------------+   |
|  |                                                                           |   |
|  |  +-------------------+  +-------------------+  +-------------------+      |   |
|  |  |    PostgreSQL     |  |      Redis        |  |  Elasticsearch    |      |   |
|  |  |    (postgres)     |  |     (redis)       |  | (elasticsearch)   |      |   |
|  |  |    Port: 5433     |  |    Port: 6379     |  |   Port: 9200      |      |   |
|  |  |                   |  |                   |  |                   |      |   |
|  |  | Volume: pgdata    |  |                   |  | Volume: esdata    |      |   |
|  |  +-------------------+  +-------------------+  +-------------------+      |   |
|  |                                                                           |   |
|  |  +-------------------+  +-------------------+                             |   |
|  |  |   LocalStack      |  |   Prometheus      |                             |   |
|  |  |   (SQS/Lambda)    |  |                   |                             |   |
|  |  |   Port: 4566      |  |   Port: 9090      |                             |   |
|  |  +-------------------+  +-------------------+                             |   |
|  |                                                                           |   |
|  |  +-------------------+                                                    |   |
|  |  |     Grafana       |                                                    |   |
|  |  |   Port: 3000      |                                                    |   |
|  |  +-------------------+                                                    |   |
|  +---------------------------------------------------------------------------+   |
|                                                                                   |
|  +-------------------+  +-------------------+  +-------------------+             |
|  |   API Gateway     |  |  Order Service    |  | Catalog Service   |             |
|  |   (Java/Spring)   |  |  (Java/Spring)    |  |  (Java/Spring)    |             |
|  |   Port: 8080      |  |   Port: 8081      |  |   Port: 8082      |             |
|  +-------------------+  +-------------------+  +-------------------+             |
|                                                                                   |
|  +-------------------+                                                           |
|  |    Frontend       |                                                           |
|  |  (React/Vite)     |                                                           |
|  |   Port: 5173      |                                                           |
|  +-------------------+                                                           |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### Ambiente Cloud (AWS - Propuesto)

```
+-----------------------------------------------------------------------------------+
|                                    AWS Cloud                                       |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +---------------------------+                                                   |
|  |        Route 53           |  <-- DNS                                          |
|  +-------------+-------------+                                                   |
|                |                                                                  |
|                v                                                                  |
|  +-------------+-------------+                                                   |
|  |      CloudFront           |  <-- CDN (Frontend estático)                      |
|  +-------------+-------------+                                                   |
|                |                                                                  |
|       +--------+--------+                                                        |
|       |                 |                                                        |
|       v                 v                                                        |
|  +----+----+    +-------+--------+                                               |
|  |   S3    |    |  API Gateway   |                                               |
|  |(Frontend)|   | (AWS managed)  |                                               |
|  +---------+    +-------+--------+                                               |
|                         |                                                        |
|           +-------------+-------------+                                          |
|           |             |             |                                          |
|           v             v             v                                          |
|  +--------+--+  +-------+---+  +------+----+                                     |
|  |   ECS     |  |   ECS     |  |   ECS     |                                     |
|  | (Gateway) |  | (Orders)  |  | (Catalog) |                                     |
|  | Fargate   |  | Fargate   |  | Fargate   |                                     |
|  +-----------+  +-----------+  +-----------+                                     |
|        |              |              |                                           |
|        v              v              v                                           |
|  +-----+------+  +----+-----+  +-----+-----+                                     |
|  |    ALB     |  |   RDS    |  |ElastiCache|                                     |
|  |(internal)  |  |(Postgres)|  |  (Redis)  |                                     |
|  +------------+  +----------+  +-----------+                                     |
|                                                                                   |
|  +------------------+    +------------------+    +------------------+             |
|  |       SQS        |    |     Lambda       |    | OpenSearch       |             |
|  | (order-events)   |--->| (notification)   |    | (Elasticsearch)  |             |
|  +------------------+    +------------------+    +------------------+             |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

## Componentes de Infraestructura

### Bases de Datos

#### PostgreSQL
```yaml
Imagen: postgres:16
Puerto: 5433 (externo) -> 5432 (interno)
Volumen: pgdata
Variables:
  - POSTGRES_DB=appdb
  - POSTGRES_USER=appuser
  - POSTGRES_PASSWORD=apppass
```

**Uso:**
- Order Service: Tabla `orders`
- Catalog Service: Tabla `products`

#### Redis
```yaml
Imagen: redis:7
Puerto: 6379
```

**Uso:**
- Cache de productos (Catalog Service)
- TTL: 10 minutos

#### Elasticsearch
```yaml
Imagen: docker.elastic.co/elasticsearch/elasticsearch:8.14.3
Puerto: 9200
Volumen: esdata
Configuracion:
  - discovery.type=single-node
  - xpack.security.enabled=false
```

**Uso:**
- Indice `products` para busqueda full-text

### Mensajeria

#### LocalStack (AWS SQS)
```yaml
Imagen: localstack/localstack:3
Puerto: 4566
Servicios: sqs
```

**Colas:**
| Cola | Uso |
|------|-----|
| `order-events` | Eventos de ordenes creadas |

### Monitoreo

#### Prometheus
```yaml
Imagen: prom/prometheus:v2.48.0
Puerto: 9090
Volumen: prometheus_data
Configuracion: monitoring/prometheus/prometheus.yml
```

#### Grafana
```yaml
Imagen: grafana/grafana:10.2.0
Puerto: 3000
Volumen: grafana_data
Credenciales: admin/admin
```

## Dockerfiles

### Backend Services (Multi-stage build)

```dockerfile
# Ejemplo: services/order-service/Dockerfile

# Stage 1: Build
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**Caracteristicas:**
- Multi-stage para imagenes pequeñas (~200MB vs ~800MB)
- JRE en lugar de JDK
- Usuario non-root por seguridad
- Alpine Linux base

### Frontend (Nginx)

```dockerfile
# frontend/Dockerfile

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Docker Compose

### Archivo: `infra/docker-compose.yml`

```yaml
services:
  # --- Databases ---
  postgres:
    image: postgres:16
    ports: ["5433:5432"]
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: apppass
    volumes: [pgdata:/var/lib/postgresql/data]
    networks: [appnet]

  redis:
    image: redis:7
    ports: ["6379:6379"]
    networks: [appnet]

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.14.3
    ports: ["9200:9200"]
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes: [esdata:/usr/share/elasticsearch/data]
    networks: [appnet]

  # --- Messaging ---
  localstack:
    image: localstack/localstack:3
    ports: ["4566:4566"]
    environment:
      - SERVICES=sqs
    networks: [appnet]

  # --- Monitoring ---
  prometheus:
    image: prom/prometheus:v2.48.0
    ports: ["9090:9090"]
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    networks: [appnet]

  grafana:
    image: grafana/grafana:10.2.0
    ports: ["3000:3000"]
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    depends_on: [prometheus]
    networks: [appnet]

networks:
  appnet:

volumes:
  pgdata:
  esdata:
  prometheus_data:
  grafana_data:
```

## Comandos de Despliegue

### Desarrollo Local

```bash
# 1. Levantar infraestructura
cd infra
docker-compose up -d

# 2. Verificar servicios
docker-compose ps

# 3. Ver logs
docker-compose logs -f postgres
docker-compose logs -f elasticsearch

# 4. Iniciar microservicios (terminales separadas)
cd services/order-service && ./mvnw spring-boot:run
cd services/catalog-service && ./mvnw spring-boot:run
cd gateway && ./mvnw spring-boot:run

# 5. Iniciar frontend
cd frontend && npm run dev
```

### Build de Imagenes Docker

```bash
# Build individual
docker build -t proyecto/order-service:latest ./services/order-service
docker build -t proyecto/catalog-service:latest ./services/catalog-service
docker build -t proyecto/gateway:latest ./gateway
docker build -t proyecto/frontend:latest ./frontend

# Build con docker-compose (si se agrega al compose)
docker-compose build
```

### Push a Registry

```bash
# Tag para registry
docker tag proyecto/order-service:latest ghcr.io/usuario/order-service:latest

# Push
docker push ghcr.io/usuario/order-service:latest
```

## Puertos del Sistema

| Servicio | Puerto Local | Puerto Container | Protocolo |
|----------|-------------|------------------|-----------|
| Frontend | 5173 | 80 | HTTP |
| API Gateway | 8080 | 8080 | HTTP |
| Order Service | 8081 | 8081 | HTTP |
| Catalog Service | 8082 | 8082 | HTTP |
| PostgreSQL | 5433 | 5432 | TCP |
| Redis | 6379 | 6379 | TCP |
| Elasticsearch | 9200 | 9200 | HTTP |
| LocalStack | 4566 | 4566 | HTTP |
| Prometheus | 9090 | 9090 | HTTP |
| Grafana | 3000 | 3000 | HTTP |

## Variables de Entorno

### Order Service
```properties
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/appdb
SPRING_DATASOURCE_USERNAME=appuser
SPRING_DATASOURCE_PASSWORD=apppass
AWS_SQS_ENDPOINT=http://localhost:4566
AWS_SQS_QUEUE_URL=http://localhost:4566/000000000000/order-events
```

### Catalog Service
```properties
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/appdb
SPRING_DATASOURCE_USERNAME=appuser
SPRING_DATASOURCE_PASSWORD=apppass
SPRING_REDIS_HOST=localhost
SPRING_REDIS_PORT=6379
SPRING_ELASTICSEARCH_URIS=http://localhost:9200
```

## Health Checks

### Endpoints de Salud

| Servicio | URL | Respuesta Esperada |
|----------|-----|-------------------|
| Order Service | http://localhost:8081/actuator/health | `{"status":"UP"}` |
| Catalog Service | http://localhost:8082/actuator/health | `{"status":"UP"}` |
| Gateway | http://localhost:8080/actuator/health | `{"status":"UP"}` |
| PostgreSQL | `pg_isready -h localhost -p 5433` | exit 0 |
| Redis | `redis-cli ping` | `PONG` |
| Elasticsearch | http://localhost:9200/_cluster/health | `{"status":"green"}` |

### Script de Verificacion

```bash
#!/bin/bash
# scripts/health-check.sh

echo "Checking services..."

# PostgreSQL
pg_isready -h localhost -p 5433 && echo "PostgreSQL: OK" || echo "PostgreSQL: FAIL"

# Redis
redis-cli ping > /dev/null && echo "Redis: OK" || echo "Redis: FAIL"

# Elasticsearch
curl -s http://localhost:9200/_cluster/health | grep -q green && echo "Elasticsearch: OK" || echo "Elasticsearch: FAIL"

# Microservices
curl -s http://localhost:8081/actuator/health | grep -q UP && echo "Order Service: OK" || echo "Order Service: FAIL"
curl -s http://localhost:8082/actuator/health | grep -q UP && echo "Catalog Service: OK" || echo "Catalog Service: FAIL"
curl -s http://localhost:8080/actuator/health | grep -q UP && echo "Gateway: OK" || echo "Gateway: FAIL"
```

## Escalabilidad

### Horizontal Scaling (propuesto)

```
                    +------------------+
                    |   Load Balancer  |
                    +--------+---------+
                             |
         +-------------------+-------------------+
         |                   |                   |
+--------v--------+ +--------v--------+ +--------v--------+
| Order Service   | | Order Service   | | Order Service   |
| Instance 1      | | Instance 2      | | Instance 3      |
+-----------------+ +-----------------+ +-----------------+
```

### Recomendaciones para Produccion

1. **Replicas de servicios**: Minimo 2 instancias por servicio
2. **Base de datos**: RDS con Multi-AZ
3. **Cache**: ElastiCache con replicacion
4. **Load Balancer**: ALB con health checks
5. **Auto Scaling**: Basado en CPU/memoria

## Estructura de Directorios

```
proyecto-arquitectura/
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── ...
├── gateway/
│   ├── Dockerfile
│   └── ...
├── services/
│   ├── order-service/
│   │   ├── Dockerfile
│   │   └── ...
│   └── catalog-service/
│       ├── Dockerfile
│       └── ...
├── lambda/
│   └── notification/
│       └── handler.py
├── infra/
│   ├── docker-compose.yml
│   └── monitoring/
│       ├── prometheus/
│       │   └── prometheus.yml
│       └── grafana/
│           ├── provisioning/
│           └── dashboards/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── docker-build.yml
└── docs/
    ├── ARQUITECTURA.md
    ├── INFRAESTRUCTURA.md
    ├── MONITOREO.md
    └── api/
        └── openapi-completo.json
```

## Referencias

- [Docker Compose Specification](https://docs.docker.com/compose/compose-file/)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [12 Factor App](https://12factor.net/)
