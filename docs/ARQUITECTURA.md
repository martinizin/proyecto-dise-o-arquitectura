# Arquitectura del Sistema

Este documento describe la arquitectura del ecosistema de microservicios, los patrones utilizados y los estilos arquitectonicos aplicados.

## Vision General

El sistema es una plataforma de e-commerce compuesta por microservicios independientes que se comunican a traves de un API Gateway centralizado y mensajeria asincrona.

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
|  |   Routing   |  |Rate Limiting|  |    CORS     |  |   Logging   |               |
|  +-------------+  +-------------+  +-------------+  +-------------+               |
+----------+---------------------------+--------------------------------------------+
           |                           |
           | /api/orders/*             | /api/catalog/*
           v                           v
+----------+---------+      +----------+---------+
|   ORDER SERVICE    |      |  CATALOG SERVICE   |
|      :8081         |      |      :8082         |
|                    |      |                    |
| +----------------+ |      | +----------------+ |
| | OrderController| |      | |CatalogController | |
| +----------------+ |      | +----------------+ |
| | OrderService   | |      | | CatalogService | |
| +----------------+ |      | +----------------+ |
| | OrderRepository| |      | |ProductRepository| |
| +----------------+ |      | +----------------+ |
+--------+-----------+      +----+----------+----+
         |                       |          |
         |                       |          |
         v                       v          v
+--------+---------+   +--------+--+  +----+-------+
|    PostgreSQL    |   |   Redis   |  |Elasticsearch|
|     :5433        |   |   :6379   |  |   :9200    |
| (Orders Table)   |   |  (Cache)  |  | (Search)   |
+------------------+   +-----------+  +------------+

         |
         | Publish Event (async)
         v
+--------+---------+
|   AWS SQS        |
| (LocalStack)     |
|    :4566         |
+--------+---------+
         |
         | Trigger
         v
+--------+---------+
|  AWS Lambda      |
| (Notification)   |
| (LocalStack)     |
+------------------+
```

## Componentes del Sistema

### 1. Frontend (React + Vite)

**Puerto:** 5173

**Responsabilidades:**
- Interfaz de usuario SPA (Single Page Application)
- Consumo de APIs REST via API Gateway
- Gestion de estado del cliente

**Tecnologias:**
- React 18
- Vite (build tool)
- Axios (HTTP client)

### 2. API Gateway (Spring Cloud Gateway)

**Puerto:** 8080

**Responsabilidades:**
- Punto de entrada unico (Single Entry Point)
- Enrutamiento de requests a microservicios
- Cross-cutting concerns (CORS, logging, rate limiting)
- Agregacion de documentacion Swagger

**Rutas configuradas:**
| Ruta | Destino |
|------|---------|
| `/api/orders/**` | Order Service :8081 |
| `/api/catalog/**` | Catalog Service :8082 |

### 3. Order Service

**Puerto:** 8081

**Responsabilidades:**
- Gestion del ciclo de vida de ordenes
- Publicacion de eventos a SQS
- Persistencia en PostgreSQL

**Endpoints:**
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/orders` | Listar ordenes |
| POST | `/orders` | Crear orden |
| GET | `/orders/{id}` | Obtener orden |
| PATCH | `/orders/{id}/status` | Actualizar estado |

### 4. Catalog Service

**Puerto:** 8082

**Responsabilidades:**
- CRUD de productos
- Cache de productos en Redis
- Indexacion y busqueda en Elasticsearch

**Endpoints:**
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/catalog/products` | Listar productos |
| POST | `/catalog/products` | Crear producto |
| GET | `/catalog/products/{id}` | Obtener producto |
| PUT | `/catalog/products/{id}/stock` | Actualizar stock |
| DELETE | `/catalog/products/{id}` | Eliminar producto |
| GET | `/catalog/search` | Buscar productos |
| POST | `/catalog/search/sync` | Sincronizar indice |

### 5. Lambda Function (Notification)

**Runtime:** Python 3.12

**Trigger:** AWS SQS (order-events queue)

**Responsabilidades:**
- Procesar eventos de ordenes creadas
- Simular envio de notificaciones
- Actualizar estado de orden a NOTIFIED

## Patrones Arquitectonicos

### 1. API Gateway Pattern

```
+--------+     +-------------+     +------------------+
| Client | --> | API Gateway | --> | Microservices    |
+--------+     +-------------+     +------------------+
```

**Implementacion:** Spring Cloud Gateway

**Beneficios:**
- Punto de entrada unico
- Desacoplamiento cliente-servicios
- Facilita cross-cutting concerns
- Simplifica el descubrimiento de servicios

### 2. Database per Service Pattern

```
+----------------+     +----------------+
| Order Service  |     | Catalog Service|
+-------+--------+     +-------+--------+
        |                      |
        v                      v
+-------+--------+     +-------+--------+
|   PostgreSQL   |     |   PostgreSQL   |
| (orders table) |     | (products table)|
+----------------+     +----------------+
```

**Implementacion:** Cada servicio tiene su propia base de datos/schema

**Beneficios:**
- Independencia de datos
- Evita acoplamiento a nivel de base de datos
- Permite escalar datos independientemente

### 3. Event-Driven Architecture

```
+----------------+     +-----------+     +----------------+
| Order Service  | --> |    SQS    | --> |    Lambda      |
| (Publisher)    |     |  (Queue)  |     | (Consumer)     |
+----------------+     +-----------+     +----------------+
```

**Implementacion:** AWS SQS + Lambda (LocalStack)

**Beneficios:**
- Desacoplamiento temporal
- Procesamiento asincrono
- Resiliencia ante fallos
- Escalabilidad independiente

### 4. Cache-Aside Pattern

```
+----------------+                  +-----------+
| Catalog Service| <-- Cache Miss --| GET /products
+-------+--------+                  +-----------+
        |
        | 1. Check Cache
        v
+-------+--------+
|     Redis      | <-- Cache Hit --> Return Data
+-------+--------+
        |
        | 2. Cache Miss: Query DB
        v
+-------+--------+
|   PostgreSQL   |
+-------+--------+
        |
        | 3. Update Cache
        v
+-------+--------+
|     Redis      |
+----------------+
```

**Implementacion:** Spring Cache + Redis

**Beneficios:**
- Reduce latencia de lecturas
- Disminuye carga en base de datos
- Mejora throughput del sistema

### 5. CQRS-Lite (Command Query Separation)

```
Commands (Write)                    Queries (Read)
+----------------+                  +----------------+
| POST /products | --> PostgreSQL   | GET /search    | --> Elasticsearch
| PUT /stock     |                  | (full-text)    |
+----------------+                  +----------------+
```

**Implementacion:** PostgreSQL para escrituras, Elasticsearch para busquedas

**Beneficios:**
- Optimizacion de lecturas y escrituras
- Busqueda full-text eficiente
- Indexacion especializada

### 6. Backend for Frontend (BFF)

```
+----------+     +-------------+     +------------------+
| React    | --> | API Gateway | --> | Order Service    |
| Frontend |     | (BFF)       | --> | Catalog Service  |
+----------+     +-------------+     +------------------+
```

**Implementacion:** API Gateway como BFF simplificado

**Beneficios:**
- API optimizada para el frontend
- Agregacion de respuestas
- Simplificacion de llamadas

## Estilos Arquitectonicos

### Microservicios

El sistema sigue el estilo de microservicios con las siguientes caracteristicas:

| Caracteristica | Implementacion |
|---------------|----------------|
| Servicios pequenos y enfocados | Order Service, Catalog Service |
| Despliegue independiente | Docker containers individuales |
| Descentralizacion de datos | Database per service |
| Comunicacion via API | REST + mensajeria asincrona |
| Automatizacion | CI/CD con GitHub Actions |

### Arquitectura en Capas (por servicio)

Cada microservicio sigue una arquitectura en capas:

```
+----------------------------------+
|        Controller Layer          |  <-- REST endpoints
+----------------------------------+
|         Service Layer            |  <-- Business logic
+----------------------------------+
|       Repository Layer           |  <-- Data access
+----------------------------------+
|          Model Layer             |  <-- Entities
+----------------------------------+
```

### Arquitectura Hexagonal (Ports & Adapters)

```
                    +-------------------+
                    |    Controllers    |  <-- Primary Adapters (input)
                    +--------+----------+
                             |
              +--------------v--------------+
              |        Application Core      |
              |   +---------------------+    |
              |   |    Domain Logic     |    |
              |   +---------------------+    |
              +--------------+--------------+
                             |
    +------------------------+------------------------+
    |                        |                        |
+---v---+              +-----v-----+            +-----v-----+
| JPA   |              |   Redis   |            |    SQS    |
|Adapter|              |  Adapter  |            |  Adapter  |
+-------+              +-----------+            +-----------+
Secondary Adapters (output)
```

## Flujos de Datos

### Flujo 1: Crear Orden

```
1. Frontend envia POST /api/orders
2. Gateway rutea a Order Service
3. Order Service guarda en PostgreSQL
4. Order Service publica evento a SQS
5. Lambda recibe mensaje de SQS
6. Lambda actualiza estado via PATCH /orders/{id}/status
7. Frontend recibe respuesta con orden creada
```

### Flujo 2: Buscar Productos

```
1. Frontend envia GET /api/catalog/search?q=laptop
2. Gateway rutea a Catalog Service
3. Catalog Service consulta Elasticsearch
4. Elasticsearch retorna resultados rankeados
5. Frontend recibe lista de productos
```

### Flujo 3: Obtener Productos (con cache)

```
1. Frontend envia GET /api/catalog/products
2. Gateway rutea a Catalog Service
3. Catalog Service consulta Redis
4a. [Cache Hit] Redis retorna datos -> Respuesta inmediata
4b. [Cache Miss] Consulta PostgreSQL -> Guarda en Redis -> Respuesta
```

## Decisiones de Arquitectura

### ADR-001: Uso de API Gateway

**Contexto:** Necesitamos un punto de entrada unico para multiples microservicios.

**Decision:** Usar Spring Cloud Gateway.

**Consecuencias:**
- (+) Centralizacion de concerns transversales
- (+) Simplificacion del frontend
- (-) Punto unico de fallo (mitigable con replicas)

### ADR-002: Mensajeria Asincrona con SQS

**Contexto:** Las notificaciones no deben bloquear la creacion de ordenes.

**Decision:** Usar AWS SQS para desacoplar el procesamiento.

**Consecuencias:**
- (+) Mejor tiempo de respuesta
- (+) Resiliencia ante fallos de Lambda
- (-) Consistencia eventual

### ADR-003: Cache con Redis

**Contexto:** El catalogo de productos es leido frecuentemente.

**Decision:** Implementar cache-aside con Redis.

**Consecuencias:**
- (+) Reduccion de latencia (cache hit ~1ms vs DB ~10-50ms)
- (+) Menor carga en PostgreSQL
- (-) Complejidad de invalidacion

### ADR-004: Busqueda con Elasticsearch

**Contexto:** Se requiere busqueda full-text eficiente.

**Decision:** Usar Elasticsearch para indexacion y busqueda.

**Consecuencias:**
- (+) Busqueda full-text con ranking
- (+) Filtros complejos eficientes
- (-) Necesidad de sincronizacion con PostgreSQL

## Referencias

- [Microservices Patterns](https://microservices.io/patterns/)
- [Spring Cloud Gateway](https://spring.io/projects/spring-cloud-gateway)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Cache-Aside Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
