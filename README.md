# Proyecto Arquitectura (Monorepo)

Este repositorio contiene el **ecosistema completo** para el proyecto de Arquitectura de Software, incluyendo microservicios, API Gateway, Frontend, mensajeria asincrona y funciones serverless.

[![CI Pipeline](https://github.com/USER/proyecto-arquitectura/actions/workflows/ci.yml/badge.svg)](https://github.com/USER/proyecto-arquitectura/actions/workflows/ci.yml)
[![Docker Build](https://github.com/USER/proyecto-arquitectura/actions/workflows/docker-build.yml/badge.svg)](https://github.com/USER/proyecto-arquitectura/actions/workflows/docker-build.yml)

---

## Stack y Tecnologias

### Backend
| Componente | Tecnologia | Version |
|------------|------------|---------|
| API Gateway | Spring Cloud Gateway | 2024.0.0 |
| Order Service | Spring Boot | 3.4.1 |
| Catalog Service | Spring Boot | 3.4.1 |
| Lambda | AWS Lambda (Python) | Python 3.12 |
| Runtime | Java | 21 |
| Build | Maven | 3.9+ |

### Frontend
| Componente | Tecnologia | Version |
|------------|------------|---------|
| Framework | React | 19.2.0 |
| Build Tool | Vite | 7.2.4 |
| Runtime | Node.js | 20+ |

### Infraestructura
| Servicio | Imagen | Puerto |
|----------|--------|--------|
| PostgreSQL | postgres:16 | 5433 |
| Redis | redis:7 | 6379 |
| Elasticsearch | elasticsearch:8.14.3 | 9200 |
| LocalStack (SQS) | localstack:3 | 4566 |
| Prometheus | prom/prometheus:v2.48.0 | 9090 |
| Grafana | grafana/grafana:10.2.0 | 3000 |

---

## Estructura del Repositorio

```
proyecto-arquitectura/
├── .github/
│   └── workflows/           # CI/CD Pipelines
│       ├── ci.yml           # Build y test
│       └── docker-build.yml # Docker images
├── frontend/                # React + Vite (UI)
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf
├── gateway/                 # Spring Cloud Gateway
│   ├── src/
│   └── Dockerfile
├── services/
│   ├── order-service/       # Microservicio de ordenes
│   │   ├── src/
│   │   └── Dockerfile
│   └── catalog-service/     # Microservicio de catalogo
│       ├── src/
│       └── Dockerfile
├── lambda/
│   └── order-notification/  # Lambda de notificacion
├── infra/
│   ├── docker-compose.yml   # Infraestructura Docker
│   └── monitoring/          # Prometheus y Grafana
│       ├── prometheus/
│       └── grafana/
├── docs/
│   ├── ARQUITECTURA.md      # Diagramas y patrones arquitectonicos
│   ├── INFRAESTRUCTURA.md   # Diagramas de infraestructura
│   ├── MONITOREO.md         # Documentacion Prometheus/Grafana
│   ├── MODELADO_C4.md       # Guia para Icepanel
│   ├── ATRIBUTOS_CALIDAD.md # Analisis de atributos de calidad
│   ├── CI_CD.md             # Documentacion de pipelines
│   ├── FASE1.md             # Conexion Frontend-APIs
│   ├── FASE2.md             # Sistema de eventos SQS+Lambda
│   ├── FASE3.md             # Cache Redis
│   ├── FASE4.md             # Busqueda Elasticsearch
│   └── api/
│       └── openapi-completo.json  # OpenAPI para SwaggerHub
└── README.md
```

---

## Puertos Utilizados

| Componente | Puerto | URL |
|------------|--------|-----|
| Frontend (Vite) | 5173 | http://localhost:5173 |
| API Gateway | 8080 | http://localhost:8080 |
| Order Service | 8081 | http://localhost:8081 |
| Catalog Service | 8082 | http://localhost:8082 |
| PostgreSQL | 5433 | localhost:5433 |
| Redis | 6379 | localhost:6379 |
| Elasticsearch | 9200 | http://localhost:9200 |
| LocalStack | 4566 | http://localhost:4566 |
| Prometheus | 9090 | http://localhost:9090 |
| Grafana | 3000 | http://localhost:3000 |

---

## Documentacion API (Swagger)

| Servicio | Swagger UI | OpenAPI JSON |
|----------|------------|--------------|
| Order Service | http://localhost:8081/swagger-ui.html | http://localhost:8081/api-docs |
| Catalog Service | http://localhost:8082/swagger-ui.html | http://localhost:8082/api-docs |
| Gateway (agregado) | http://localhost:8080/swagger-ui.html | - |

### Archivo OpenAPI Consolidado

Para subir a **SwaggerHub**, usar el archivo consolidado con todas las APIs:

```
docs/api/openapi-completo.json
```

**Pasos para SwaggerHub:**
1. Ir a https://app.swaggerhub.com
2. Click en "Create New" > "Import and Document API"
3. Subir el archivo `docs/api/openapi-completo.json`
4. Publicar la API

---

## Inicio Rapido

### 1) Clonar y configurar

```bash
git clone https://github.com/USER/proyecto-arquitectura.git
cd proyecto-arquitectura

# Copiar variables de entorno
cp .env.example .env

# Crear .env del frontend
echo "VITE_API_URL=http://localhost:8080" > frontend/.env
```

### 2) Levantar infraestructura (Docker)

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d
docker ps  # Verificar contenedores
```

### 3) Ejecutar servicios backend

```bash
# Terminal 1: Gateway
cd gateway && mvn spring-boot:run

# Terminal 2: Order Service
cd services/order-service && mvn spring-boot:run

# Terminal 3: Catalog Service
cd services/catalog-service && mvn spring-boot:run
```

### 4) Ejecutar frontend

```bash
cd frontend
npm install
npm run dev
```

### 5) Verificar

- Frontend: http://localhost:5173
- Gateway Health: http://localhost:8080/actuator/health
- Swagger Order: http://localhost:8081/swagger-ui.html
- Swagger Catalog: http://localhost:8082/swagger-ui.html
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (usuario: admin, password: admin)

---

## Monitoreo

El proyecto incluye un stack de monitoreo con Prometheus y Grafana.

### Acceso

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3000 | admin / admin |

### Metricas Disponibles

- **HTTP Requests**: Rate, latencia P50/P95, errores
- **JVM**: Memoria heap, threads, GC
- **Sistema**: CPU, uptime

### Endpoints de Metricas

```bash
# Order Service
curl http://localhost:8081/actuator/prometheus

# Catalog Service
curl http://localhost:8082/actuator/prometheus

# Gateway
curl http://localhost:8080/actuator/prometheus
```

Ver [docs/MONITOREO.md](docs/MONITOREO.md) para documentacion completa.

---

## CI/CD

El proyecto incluye pipelines de GitHub Actions para integracion y despliegue continuo.

### Pipelines Disponibles

| Pipeline | Trigger | Descripcion |
|----------|---------|-------------|
| **CI Pipeline** | Push/PR a main, develop | Build, test, validacion |
| **Docker Build** | Push a main, tags | Build y push de imagenes |

### Badges

```markdown
[![CI Pipeline](https://github.com/USER/proyecto-arquitectura/actions/workflows/ci.yml/badge.svg)](https://github.com/USER/proyecto-arquitectura/actions/workflows/ci.yml)
```

### Ejecutar CI Localmente

```bash
# Con act (https://github.com/nektos/act)
act push -W .github/workflows/ci.yml
```

### Documentacion Completa

Ver [docs/CI_CD.md](docs/CI_CD.md) para detalles completos sobre:
- Jobs y stages
- Dockerfiles
- Variables y secretos
- Proceso de release

---

## Dockerfiles

Cada servicio incluye un Dockerfile optimizado con multi-stage build:

| Servicio | Dockerfile | Imagen Base |
|----------|------------|-------------|
| Gateway | `gateway/Dockerfile` | eclipse-temurin:21-jre-alpine |
| Order Service | `services/order-service/Dockerfile` | eclipse-temurin:21-jre-alpine |
| Catalog Service | `services/catalog-service/Dockerfile` | eclipse-temurin:21-jre-alpine |
| Frontend | `frontend/Dockerfile` | nginx:alpine |

### Build Local

```bash
# Build individual
docker build -t order-service:local ./services/order-service

# Build todos
docker compose -f infra/docker-compose.yml build
```

---

## Rutas del Gateway

| Ruta | Servicio Destino | Descripcion |
|------|------------------|-------------|
| `/api/orders/**` | Order Service (8081) | Gestion de ordenes |
| `/api/catalog/**` | Catalog Service (8082) | Catalogo y busqueda |

---

## Funcionalidades Implementadas

### Order Service
- CRUD de ordenes
- Publicacion de eventos a SQS
- Actualizacion de estado via Lambda

### Catalog Service
- CRUD de productos
- Cache con Redis (TTL 5 min)
- Busqueda full-text con Elasticsearch
- Sincronizacion de indices

### Lambda (order-notification)
- Consumo de eventos SQS
- Actualizacion de estado de ordenes a NOTIFIED

---

## Documentacion Adicional

| Documento | Descripcion |
|-----------|-------------|
| [ARQUITECTURA.md](docs/ARQUITECTURA.md) | Diagramas de arquitectura y patrones usados |
| [INFRAESTRUCTURA.md](docs/INFRAESTRUCTURA.md) | Diagramas de infraestructura y despliegue |
| [MONITOREO.md](docs/MONITOREO.md) | Stack de Prometheus y Grafana |
| [MODELADO_C4.md](docs/MODELADO_C4.md) | Guia para crear modelo C4 en Icepanel |
| [ATRIBUTOS_CALIDAD.md](docs/ATRIBUTOS_CALIDAD.md) | Analisis de cache, latencia, escalabilidad, etc. |
| [CI_CD.md](docs/CI_CD.md) | Pipelines de GitHub Actions |
| [FASE1.md](docs/FASE1.md) | Conexion Frontend con APIs |
| [FASE2.md](docs/FASE2.md) | Sistema de eventos SQS + Lambda |
| [FASE3.md](docs/FASE3.md) | Implementacion de Cache Redis |
| [FASE4.md](docs/FASE4.md) | Busqueda con Elasticsearch |

### OpenAPI / SwaggerHub

El archivo `docs/api/openapi-completo.json` contiene la especificacion OpenAPI 3.0 consolidada de todas las APIs, listo para subir a SwaggerHub.

---

## Variables de Entorno

### Archivo raiz: `.env`

```env
POSTGRES_PORT=5433
POSTGRES_DB=appdb
POSTGRES_USER=appuser
POSTGRES_PASSWORD=apppass
REDIS_PORT=6379
ELASTIC_PORT=9200
LOCALSTACK_PORT=4566
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin
```

### Frontend: `frontend/.env`

```env
VITE_API_URL=http://localhost:8080
```

---

## Notas Importantes

- **No subir `.env`**: Contiene configuracion local y datos sensibles
- **Frontend siempre via Gateway**: No consumir microservicios directamente
- **Docker requerido**: Para levantar PostgreSQL, Redis, Elasticsearch, LocalStack, Prometheus, Grafana
- **Java 21**: Los microservicios requieren JDK 21
- **Node.js 20+**: El frontend requiere Node.js 20 o superior

---

## Contribuir

1. Crear branch desde `develop`
2. Hacer cambios y commits
3. Abrir Pull Request
4. CI validara automaticamente
5. Merge tras aprobacion

---

*Proyecto de Arquitectura de Software - 2026*
