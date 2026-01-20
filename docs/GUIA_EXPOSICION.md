# Guia de Exposicion - Proyecto de Arquitectura de Software

Esta guia proporciona el flujo completo para presentar el proyecto, explicando cada componente y demostrando las funcionalidades implementadas.

---

## Indice

1. [Vision General del Proyecto](#1-vision-general-del-proyecto)
2. [Arquitectura y Ecosistema](#2-arquitectura-y-ecosistema)
3. [Patrones Arquitectonicos](#3-patrones-arquitectonicos)
4. [Requisitos Tecnicos Implementados](#4-requisitos-tecnicos-implementados)
5. [Documentacion y Estandares](#5-documentacion-y-estandares)
6. [Atributos de Calidad](#6-atributos-de-calidad)
7. [Monitoreo](#7-monitoreo)
8. [Flujo de Demostracion Practica](#8-flujo-de-demostracion-practica)

---

## 1. Vision General del Proyecto

### Descripcion

Este proyecto implementa una **plataforma de e-commerce** basada en microservicios, disenada para demostrar conceptos avanzados de arquitectura de software.

### Componentes del Sistema

```
+------------------+     +------------------+     +------------------+
|     Frontend     |     |   Order Service  |     | Catalog Service  |
|   React + Vite   |     |   Spring Boot    |     |   Spring Boot    |
|     :5173        |     |     :8081        |     |     :8082        |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         |                        |                        |
         +------------------------+------------------------+
                                  |
                                  v
                    +-------------+-------------+
                    |        API Gateway        |
                    |   Spring Cloud Gateway    |
                    |          :8080            |
                    +---------------------------+
```

### Stack Tecnologico

| Capa | Tecnologia | Version |
|------|------------|---------|
| Frontend | React + Vite | React 19, Vite 7 |
| API Gateway | Spring Cloud Gateway | 2024.0.0 |
| Microservicios | Spring Boot | 3.4.1 |
| Serverless | AWS Lambda (Python) | Python 3.12 |
| Base de Datos | PostgreSQL | 16 |
| Cache | Redis | 7 |
| Busqueda | Elasticsearch | 8.14.3 |
| Mensajeria | AWS SQS (LocalStack) | - |
| Monitoreo | Prometheus + Grafana | v2.48 / v10.2 |

---

## 2. Arquitectura y Ecosistema

### Diagrama de Arquitectura Completo

```
                                    +------------------+
                                    |     Frontend     |
                                    |   React + Vite   |
                                    |     :5173        |
                                    +--------+---------+
                                             |
                                             | HTTP/REST
                                             v
+-----------------------------------------------------------------------------------+
|                              API GATEWAY (Spring Cloud Gateway)                    |
|                                      :8080                                         |
|  +-------------+  +-------------+  +-------------+  +-------------+               |
|  |   Routing   |  |    CORS     |  |   Logging   |  |   Metrics   |               |
|  +-------------+  +-------------+  +-------------+  +-------------+               |
+----------+---------------------------+--------------------------------------------+
           |                           |
           | /api/orders/*             | /api/catalog/*
           v                           v
+----------+---------+      +----------+---------+
|   ORDER SERVICE    |      |  CATALOG SERVICE   |
|      :8081         |      |      :8082         |
|                    |      |                    |
| - CRUD Ordenes     |      | - CRUD Productos   |
| - Eventos SQS      |      | - Cache Redis      |
| - Swagger/OpenAPI  |      | - Busqueda ES      |
+--------+-----------+      +----+----------+----+
         |                       |          |
         v                       v          v
+--------+---------+   +--------+--+  +----+-------+
|    PostgreSQL    |   |   Redis   |  |Elasticsearch|
|     :5433        |   |   :6379   |  |   :9200    |
+------------------+   +-----------+  +------------+

         |
         | Publish Event
         v
+--------+---------+
|   AWS SQS        |
| (LocalStack)     |
+--------+---------+
         |
         | Trigger
         v
+--------+---------+
|  AWS Lambda      |
| (Notification)   |
+------------------+
```

### Multi-Sistema (3+ Sistemas Independientes)

El proyecto cumple con el requisito de multi-sistema:

| Sistema | Responsabilidad | Independencia |
|---------|-----------------|---------------|
| **Order Service** | Gestion de ordenes de compra | Base de datos propia, API independiente |
| **Catalog Service** | Gestion de productos y busqueda | Cache propio, indice ES propio |
| **Lambda Function** | Procesamiento de notificaciones | Runtime independiente (Python) |
| **API Gateway** | Enrutamiento y cross-cutting | Configuracion independiente |
| **Frontend** | Interfaz de usuario | Aplicacion SPA independiente |

---

## 3. Patrones Arquitectonicos

### 3.1 API Gateway Pattern

**Que es:** Punto de entrada unico que centraliza el acceso a todos los microservicios.

**Implementacion:** Spring Cloud Gateway

**Beneficios demostrados:**
- Enrutamiento centralizado (`/api/orders/*` -> Order Service)
- CORS configurado en un solo lugar
- Logging y metricas unificadas

```
Cliente --> API Gateway --> Order Service
                        --> Catalog Service
```

### 3.2 Database per Service

**Que es:** Cada microservicio tiene su propia base de datos/schema.

**Implementacion:** PostgreSQL con tablas separadas por servicio.

**Beneficios demostrados:**
- Order Service: tabla `orders`
- Catalog Service: tabla `products`
- Independencia de datos

### 3.3 Event-Driven Architecture

**Que es:** Comunicacion asincrona mediante eventos.

**Implementacion:** AWS SQS + Lambda

**Flujo:**
```
Order Service --[ORDER_CREATED]--> SQS Queue --> Lambda --> Actualiza estado
```

**Beneficios demostrados:**
- Desacoplamiento temporal
- Procesamiento asincrono
- Resiliencia (si Lambda falla, el mensaje permanece en cola)

### 3.4 Cache-Aside Pattern

**Que es:** El servicio consulta primero el cache; si no hay datos, consulta la BD y actualiza el cache.

**Implementacion:** Spring Cache + Redis

**Flujo:**
```
Request --> Catalog Service --> Redis (Cache Hit?) 
                                   |
                            Si --> Retorna datos
                            No --> PostgreSQL --> Guarda en Redis --> Retorna
```

**Beneficios demostrados:**
- Reduccion de latencia (~1ms cache vs ~10-50ms BD)
- Menor carga en PostgreSQL

### 3.5 CQRS-Lite (Command Query Separation)

**Que es:** Separacion de operaciones de escritura y lectura con datastores optimizados.

**Implementacion:** PostgreSQL (escrituras) + Elasticsearch (lecturas/busqueda)

**Beneficios demostrados:**
- Busqueda full-text eficiente
- Filtros complejos sin afectar BD principal

---

## 4. Requisitos Tecnicos Implementados

### 4.1 Persistencia (Docker)

**Requisito:** Capas de datos contenerizadas en Docker.

**Implementacion:**

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    ports: ["5433:5432"]
    
  redis:
    image: redis:7
    ports: ["6379:6379"]
    
  elasticsearch:
    image: elasticsearch:8.14.3
    ports: ["9200:9200"]
```

**Verificacion:**
```bash
docker ps  # Muestra contenedores corriendo
```

### 4.2 Serverless (Lambda)

**Requisito:** Al menos un componente implementado con funciones serverless.

**Implementacion:** AWS Lambda en Python que procesa eventos de ordenes.

**Ubicacion:** `lambda/notification/handler.py`

**Funcion:**
1. Recibe mensaje de SQS con datos de orden
2. Simula envio de notificacion
3. Actualiza estado de orden a "NOTIFIED"

### 4.3 Mensajeria (Queue Manager)

**Requisito:** Gestor de colas para comunicacion asincrona.

**Implementacion:** AWS SQS (via LocalStack para desarrollo local)

**Cola:** `order-events`

**Flujo:**
```
Order Service --> SQS (order-events) --> Lambda
```

### 4.4 API Gateway

**Requisito:** Punto de entrada centralizado.

**Implementacion:** Spring Cloud Gateway en puerto 8080

**Rutas configuradas:**
| Ruta Externa | Servicio Interno |
|--------------|------------------|
| `/api/orders/**` | `http://localhost:8081/orders/**` |
| `/api/catalog/**` | `http://localhost:8082/catalog/**` |

### 4.5 Interfaz REST

**Requisito:** El Gateway recibe y responde mediante RESTful.

**Implementacion:** Todos los endpoints son REST con JSON.

**Endpoints Order Service:**
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/orders` | Listar ordenes |
| POST | `/orders` | Crear orden |
| GET | `/orders/{id}` | Obtener orden |
| PATCH | `/orders/{id}/status` | Actualizar estado |

**Endpoints Catalog Service:**
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/catalog/products` | Listar productos |
| POST | `/catalog/products` | Crear producto |
| GET | `/catalog/products/{id}` | Obtener producto |
| PUT | `/catalog/products/{id}/stock` | Actualizar stock |
| DELETE | `/catalog/products/{id}` | Eliminar producto |
| GET | `/catalog/search` | Buscar productos |
| POST | `/catalog/search/sync` | Sincronizar indice |

---

## 5. Documentacion y Estandares

### 5.1 Swagger/OpenAPI en APIs

**Requisito:** APIs documentadas con Swagger.

**Implementacion:** SpringDoc OpenAPI en cada servicio.

**URLs de Swagger UI:**
| Servicio | URL |
|----------|-----|
| Order Service | http://localhost:8081/swagger-ui.html |
| Catalog Service | http://localhost:8082/swagger-ui.html |
| Gateway (agregado) | http://localhost:8080/swagger-ui.html |

**Caracteristicas documentadas:**
- Descripcion de endpoints
- Parametros con ejemplos
- Schemas de request/response
- Codigos de respuesta

### 5.2 SwaggerHub

**Requisito:** Documentacion publicada en SwaggerHub.

**Implementacion:** Archivo OpenAPI consolidado listo para subir.

**Ubicacion:** `docs/api/openapi-completo.json`

**Contenido:**
- 13 endpoints documentados
- 3 tags: Orders, Catalog, Search
- 9 schemas: Order, Product, ProductDocument, etc.
- Ejemplos de request/response

**Pasos para publicar:**
1. Ir a https://app.swaggerhub.com
2. Create New > Import and Document API
3. Subir `docs/api/openapi-completo.json`
4. Publicar

### 5.3 Modelado C4

**Requisito:** Documentacion usando modelo C4 en Icepanel.

**Implementacion:** Guia detallada para crear el modelo.

**Ubicacion:** `docs/MODELADO_C4.md`

**Niveles documentados:**
- **Nivel 1 (Contexto):** Sistema y actores externos
- **Nivel 2 (Contenedores):** Servicios, bases de datos, colas
- **Nivel 3 (Componentes):** Controllers, Services, Repositories
- **Nivel 4 (Codigo):** Clases y metodos principales

### 5.4 Diagramas de Arquitectura

**Requisito:** Diagramas que expliquen estilos y patrones.

**Implementacion:** Documento con diagramas ASCII y explicaciones.

**Ubicacion:** `docs/ARQUITECTURA.md`

**Contenido:**
- Diagrama de arquitectura general
- Diagrama por cada patron implementado
- Flujos de datos principales
- Decisiones de arquitectura (ADRs)

### 5.5 Diagramas de Infraestructura

**Requisito:** Diagramas de infraestructura y despliegue.

**Implementacion:** Documento con diagramas de deployment.

**Ubicacion:** `docs/INFRAESTRUCTURA.md`

**Contenido:**
- Diagrama de ambiente local (Docker Compose)
- Diagrama de ambiente cloud (AWS propuesto)
- Configuracion de contenedores
- Puertos y redes
- Health checks

---

## 6. Atributos de Calidad

**Ubicacion:** `docs/ATRIBUTOS_CALIDAD.md`

### 6.1 Cache

**Implementacion:** Redis para cache de productos.

**Configuracion:**
- TTL: 10 minutos
- Estrategia: Cache-Aside
- Invalidacion: Al crear/actualizar/eliminar productos

**Metricas:**
- Cache Hit Rate objetivo: >80%
- Latencia cache: ~1ms
- Latencia sin cache: ~10-50ms

### 6.2 Balanceo de Carga

**Propuesta:** NGINX o AWS ALB frente al API Gateway.

**Estrategia:** Round-robin con health checks.

### 6.3 Indexacion

**Implementacion:** Elasticsearch para busqueda de productos.

**Indice:** `products`

**Campos indexados:**
- `name` (Text, full-text search)
- `price` (Double, range queries)
- `stock` (Integer)
- `stockStatus` (Keyword, filtros exactos)

### 6.4 Redundancia

**Propuesta para produccion:**
- PostgreSQL: RDS Multi-AZ
- Redis: ElastiCache con replicas
- Servicios: Minimo 2 instancias por servicio

### 6.5 Disponibilidad

**Objetivo:** 99.9% uptime (8.76 horas downtime/ano)

**Implementacion:**
- Health checks en cada servicio (`/actuator/health`)
- Graceful shutdown
- Retry en clientes HTTP

### 6.6 Concurrencia

**Implementacion:**
- Thread pools configurados en Spring Boot
- Conexiones de BD con pool (HikariCP)
- Redis con conexiones pooled

### 6.7 Latencia

**Objetivos:**
| Metrica | Objetivo |
|---------|----------|
| P50 | < 50ms |
| P95 | < 200ms |
| P99 | < 500ms |

**Optimizaciones:**
- Cache Redis
- Indices en PostgreSQL
- Connection pooling

### 6.8 Costo y Proyeccion

**Estimacion AWS (mensual):**
| Servicio | Costo Estimado |
|----------|----------------|
| ECS Fargate (3 servicios) | $50-100 |
| RDS PostgreSQL | $30-50 |
| ElastiCache Redis | $25-40 |
| OpenSearch | $50-80 |
| SQS + Lambda | $5-10 |
| **Total** | **$160-280/mes** |

### 6.9 Performance y Escalabilidad

**Capacidad estimada:**
- 100-500 requests/segundo con 2 instancias por servicio
- Escalamiento horizontal automatico con ECS

**Estrategia de escalamiento:**
- CPU > 70% → Scale out
- CPU < 30% → Scale in

---

## 7. Monitoreo

**Implementacion:** Prometheus + Grafana

### Stack de Monitoreo

```
+------------------+     +------------------+     +------------------+
|  Order Service   |     | Catalog Service  |     |     Gateway      |
| /actuator/prom   |     | /actuator/prom   |     | /actuator/prom   |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         +------------------------+------------------------+
                                  |
                                  v
                    +-------------+-------------+
                    |        Prometheus         |
                    |         :9090             |
                    +-------------+-------------+
                                  |
                                  v
                    +-------------+-------------+
                    |         Grafana           |
                    |         :3000             |
                    +---------------------------+
```

### Metricas Disponibles

| Categoria | Metricas |
|-----------|----------|
| HTTP | Request rate, latencia P50/P95/P99, error rate |
| JVM | Heap memory, threads, GC pauses |
| Sistema | CPU usage, uptime |

### Dashboard de Grafana

**Paneles incluidos:**
1. Services Up (estado de servicios)
2. Request Rate por servicio
3. P95 Latency
4. Error Rate %
5. JVM Heap Memory
6. JVM Threads

### Acceso

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3000 | admin / admin |

---

## 8. Flujo de Demostracion Practica

### Prerequisitos

- Docker Desktop instalado y corriendo
- Java 21 (JDK)
- Node.js 20+
- Maven 3.9+
- Terminales: 4 terminales abiertas

---

### PASO 1: Levantar Infraestructura Docker (2 min)

```bash
# Ir al directorio de infraestructura
cd infra

# Levantar todos los contenedores
docker compose up -d

# Verificar contenedores (deben ser 6)
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**Resultado esperado:**
```
NAMES               STATUS          PORTS
app-postgres        Up              0.0.0.0:5433->5432/tcp
app-redis           Up              0.0.0.0:6379->6379/tcp
app-elasticsearch   Up              0.0.0.0:9200->9200/tcp
app-localstack      Up              0.0.0.0:4566->4566/tcp
app-prometheus      Up              0.0.0.0:9090->9090/tcp
app-grafana         Up              0.0.0.0:3000->3000/tcp
```

**Verificar servicios:**
```bash
# PostgreSQL
docker exec app-postgres pg_isready
# Resultado: accepting connections

# Redis
docker exec app-redis redis-cli ping
# Resultado: PONG

# Elasticsearch
curl -s http://localhost:9200/_cluster/health | jq .status
# Resultado: "green" o "yellow"
```

---

### PASO 2: Levantar Microservicios (3 min)

**Terminal 1 - Gateway:**
```bash
cd gateway
./mvnw spring-boot:run
```
Esperar: "Started GatewayApplication"

**Terminal 2 - Order Service:**
```bash
cd services/order-service
./mvnw spring-boot:run
```
Esperar: "Started OrderServiceApplication"

**Terminal 3 - Catalog Service:**
```bash
cd services/catalog-service
./mvnw spring-boot:run
```
Esperar: "Started CatalogServiceApplication"

**Verificar health (Terminal 4):**
```bash
curl -s http://localhost:8080/actuator/health | jq .status
curl -s http://localhost:8081/actuator/health | jq .status
curl -s http://localhost:8082/actuator/health | jq .status
```
Resultado esperado: "UP" en los tres

---

### PASO 3: Levantar Frontend (1 min)

**Terminal 4:**
```bash
cd frontend
npm install
npm run dev
```

**Abrir navegador:** http://localhost:5173

---

### PASO 4: Demostrar Swagger/OpenAPI (2 min)

**Abrir en navegador:**

1. **Order Service Swagger:** http://localhost:8081/swagger-ui.html
   - Mostrar endpoints de Orders
   - Mostrar schema de Order

2. **Catalog Service Swagger:** http://localhost:8082/swagger-ui.html
   - Mostrar endpoints de Catalog y Search
   - Mostrar schemas de Product y ProductDocument

3. **Gateway Swagger (agregado):** http://localhost:8080/swagger-ui.html
   - Mostrar que agrega ambos servicios

**Mencionar:** El archivo `docs/api/openapi-completo.json` esta listo para subir a SwaggerHub.

---

### PASO 5: Demostrar Catalog Service + Cache Redis (3 min)

**Crear productos:**
```bash
# Producto 1
curl -X POST http://localhost:8080/api/catalog/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Laptop HP Pavilion", "price": 999.99, "stock": 50}'

# Producto 2
curl -X POST http://localhost:8080/api/catalog/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Mouse Logitech MX Master", "price": 99.99, "stock": 100}'

# Producto 3 (stock bajo)
curl -X POST http://localhost:8080/api/catalog/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Teclado Mecanico RGB", "price": 149.99, "stock": 3}'
```

**Demostrar Cache:**
```bash
# Primera llamada - va a PostgreSQL (ver logs del Catalog Service)
curl http://localhost:8080/api/catalog/products

# Segunda llamada - viene de Redis (mas rapido, ver logs)
curl http://localhost:8080/api/catalog/products

# Verificar keys en Redis
docker exec app-redis redis-cli KEYS "*"
```

**Explicar:** El patron Cache-Aside reduce latencia y carga en la BD.

---

### PASO 6: Demostrar Elasticsearch (2 min)

**Sincronizar productos al indice:**
```bash
curl -X POST http://localhost:8080/api/catalog/search/sync
```

**Busquedas:**
```bash
# Buscar por nombre (full-text)
curl "http://localhost:8080/api/catalog/search?q=laptop"

# Buscar por estado de stock
curl "http://localhost:8080/api/catalog/search?status=LOW"

# Buscar por precio maximo
curl "http://localhost:8080/api/catalog/search?maxPrice=100"

# Ver estadisticas del indice
curl http://localhost:8080/api/catalog/search/stats
```

**Explicar:** Elasticsearch permite busqueda full-text y filtros complejos sin afectar la BD principal (CQRS-Lite).

---

### PASO 7: Demostrar Order Service + SQS + Lambda (3 min)

**Crear cola SQS:**
```bash
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name order-events --region us-east-1
```

**Crear una orden:**
```bash
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerName": "Juan Perez", "total": 150.50}'
```

**Verificar en logs del Order Service:**
- "Orden creada: id=1"
- "Evento publicado a SQS"

**Ver mensaje en cola:**
```bash
aws --endpoint-url=http://localhost:4566 sqs receive-message \
  --queue-url http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/order-events \
  --region us-east-1
```

**Simular Lambda (actualizar estado):**
```bash
curl -X PATCH http://localhost:8080/api/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "NOTIFIED"}'
```

**Verificar orden actualizada:**
```bash
curl http://localhost:8080/api/orders/1
```

**Explicar:** El flujo es asincrono - la orden se crea inmediatamente y la notificacion se procesa despues via SQS + Lambda.

---

### PASO 8: Demostrar Monitoreo (3 min)

**Generar trafico:**
```bash
for i in {1..20}; do
  curl -s http://localhost:8080/api/catalog/products > /dev/null
  curl -s http://localhost:8080/api/orders > /dev/null
done
```

**Prometheus:** http://localhost:9090

1. Ir a Status > Targets
   - Mostrar que los 3 servicios estan UP

2. Ejecutar queries:
```promql
# Request rate
sum(rate(http_server_requests_seconds_count[1m])) by (application)

# Latencia P95
histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket[5m])) by (le)) * 1000
```

**Grafana:** http://localhost:3000 (admin/admin)

1. Ir a Dashboards > Microservices Dashboard
2. Mostrar paneles:
   - Services Up
   - Request Rate
   - P95 Latency
   - JVM Memory

---

### PASO 9: Mostrar Documentacion (2 min)

**Abrir y mostrar:**

| Archivo | Que mostrar |
|---------|-------------|
| `docs/ARQUITECTURA.md` | Diagrama general, patrones implementados |
| `docs/INFRAESTRUCTURA.md` | Diagrama Docker, puertos |
| `docs/ATRIBUTOS_CALIDAD.md` | Analisis de cache, latencia, escalabilidad |
| `docs/MODELADO_C4.md` | Guia para Icepanel |
| `docs/api/openapi-completo.json` | Archivo para SwaggerHub |

---

### PASO 10: Cerrar Demo

**Detener servicios:**
```bash
# Ctrl+C en cada terminal de servicios

# Detener Docker
cd infra
docker compose down
```

---

## Resumen de Puntos Evaluados

| Criterio | Implementacion | Donde se demuestra |
|----------|----------------|-------------------|
| Multi-Sistema | 5 sistemas independientes | Paso 2 |
| Funcionalidad | CRUD completo | Pasos 5-7 |
| Patrones | API Gateway, Cache-Aside, Event-Driven, CQRS | Pasos 4-7 |
| Docker | 6 contenedores | Paso 1 |
| Serverless | Lambda Python | Paso 7 |
| Mensajeria | SQS | Paso 7 |
| API Gateway | Spring Cloud Gateway | Todas las llamadas :8080 |
| REST | Endpoints JSON | Pasos 5-7 |
| Swagger | SpringDoc OpenAPI | Paso 4 |
| SwaggerHub | openapi-completo.json | Paso 4 |
| Modelado C4 | Guia Icepanel | Paso 9 |
| Diagramas Arquitectura | ARQUITECTURA.md | Paso 9 |
| Diagramas Infraestructura | INFRAESTRUCTURA.md | Paso 9 |
| Cache | Redis | Paso 5 |
| Indexacion | Elasticsearch | Paso 6 |
| Monitoreo | Prometheus + Grafana | Paso 8 |
| Atributos de Calidad | Documento completo | Paso 9 |

---

## Tiempo Estimado Total: 20-25 minutos

| Fase | Tiempo |
|------|--------|
| Infraestructura Docker | 2 min |
| Microservicios | 3 min |
| Frontend | 1 min |
| Swagger | 2 min |
| Catalog + Cache | 3 min |
| Elasticsearch | 2 min |
| Orders + SQS | 3 min |
| Monitoreo | 3 min |
| Documentacion | 2 min |
| Cierre | 1 min |

---

*Guia de Exposicion - Proyecto de Arquitectura de Software 2026*
