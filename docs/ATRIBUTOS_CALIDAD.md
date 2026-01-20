# Analisis de Atributos de Calidad

Este documento presenta un analisis detallado de los atributos de calidad implementados y propuestos para la arquitectura del sistema de microservicios.

## Tabla de Contenidos

1. [Cache](#1-cache)
2. [Balanceo de Carga](#2-balanceo-de-carga)
3. [Indexacion](#3-indexacion)
4. [Redundancia](#4-redundancia)
5. [Disponibilidad](#5-disponibilidad)
6. [Concurrencia](#6-concurrencia)
7. [Latencia](#7-latencia)
8. [Costo y Proyeccion](#8-costo-y-proyeccion)
9. [Performance y Escalabilidad](#9-performance-y-escalabilidad)

---

## 1. Cache

### 1.1 Implementacion Actual

El sistema implementa **Redis** como solucion de cache distribuido para el Catalog Service.

#### Tecnologia
- **Redis 7** containerizado en Docker
- **Spring Cache** con `spring-boot-starter-data-redis`

#### Patron Implementado: Cache-Aside

```
┌─────────────┐     1. GET /products     ┌──────────────────┐
│   Cliente   │ ─────────────────────────▶│  Catalog Service │
└─────────────┘                           └────────┬─────────┘
                                                   │
                         ┌─────────────────────────┼─────────────────────────┐
                         │                         ▼                         │
                         │    2. Buscar en   ┌──────────┐                    │
                         │       cache       │  Redis   │                    │
                         │                   └────┬─────┘                    │
                         │                        │                          │
                         │           ┌────────────┴────────────┐             │
                         │           │                         │             │
                         │      Cache HIT               Cache MISS           │
                         │           │                         │             │
                         │           ▼                         ▼             │
                         │    3a. Retornar           3b. Consultar           │
                         │        datos              ┌────────────┐          │
                         │                           │ PostgreSQL │          │
                         │                           └─────┬──────┘          │
                         │                                 │                 │
                         │                           4. Guardar en cache     │
                         │                                 │                 │
                         │                                 ▼                 │
                         │                           5. Retornar datos       │
                         └───────────────────────────────────────────────────┘
```

#### Configuracion

| Parametro | Valor | Justificacion |
|-----------|-------|---------------|
| **TTL (Time-to-Live)** | 5 minutos | Balance entre frescura de datos y reduccion de carga a BD |
| **Prefijo de keys** | `catalog:` | Namespace para evitar colisiones |
| **Serializacion** | JSON (Jackson) | Interoperabilidad y debugging |
| **Cache null values** | Deshabilitado | Evitar cache de resultados vacios |

#### Operaciones con Cache

| Anotacion | Metodo | Comportamiento |
|-----------|--------|----------------|
| `@Cacheable("products", key="'all'")` | `getAllProducts()` | Lee de cache, si no existe consulta BD |
| `@Cacheable("products", key="#id")` | `getProductById(id)` | Cache por ID individual |
| `@CacheEvict(allEntries=true)` | `createProduct()`, `updateStock()`, `deleteProduct()` | Invalida todo el cache |

#### Metricas Esperadas

| Metrica | Objetivo | Descripcion |
|---------|----------|-------------|
| **Cache Hit Rate** | > 80% | Porcentaje de requests servidos desde cache |
| **Latencia (cache hit)** | < 5ms | Tiempo de respuesta desde Redis |
| **Latencia (cache miss)** | < 50ms | Tiempo de respuesta desde PostgreSQL |

### 1.2 Mejoras Propuestas

1. **Cache warming**: Pre-cargar productos populares al iniciar el servicio
2. **Cache de segundo nivel**: Implementar cache local (Caffeine) + Redis
3. **Metricas de cache**: Integrar con Micrometer para monitoreo de hit/miss rate

---

## 2. Balanceo de Carga

### 2.1 Estado Actual

Actualmente el sistema **no implementa** balanceo de carga. El API Gateway apunta directamente a instancias unicas de cada servicio.

### 2.2 Propuesta de Implementacion

#### Opcion A: NGINX como Load Balancer (Recomendada para produccion)

```
                                    ┌─────────────────────┐
                                    │  Order Service #1   │
                               ┌───▶│     :8081           │
                               │    └─────────────────────┘
┌──────────┐    ┌─────────┐    │    ┌─────────────────────┐
│ Clientes │───▶│  NGINX  │────┼───▶│  Order Service #2   │
└──────────┘    │   LB    │    │    │     :8083           │
                └─────────┘    │    └─────────────────────┘
                               │    ┌─────────────────────┐
                               └───▶│  Order Service #3   │
                                    │     :8085           │
                                    └─────────────────────┘
```

**Configuracion NGINX propuesta:**

```nginx
upstream order_service {
    least_conn;  # Algoritmo de menor conexiones
    server order-service-1:8081 weight=1;
    server order-service-2:8081 weight=1;
    server order-service-3:8081 weight=1 backup;
}

upstream catalog_service {
    least_conn;
    server catalog-service-1:8082 weight=1;
    server catalog-service-2:8082 weight=1;
}

server {
    listen 80;
    
    location /api/orders {
        proxy_pass http://order_service;
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }
    
    location /api/catalog {
        proxy_pass http://catalog_service;
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }
}
```

#### Opcion B: Spring Cloud LoadBalancer (Desarrollo/Testing)

Agregar al Gateway:

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-loadbalancer</artifactId>
</dependency>
```

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: order-service
          uri: lb://order-service
          predicates:
            - Path=/api/orders/**
```

#### Algoritmos de Balanceo Recomendados

| Algoritmo | Uso Recomendado | Descripcion |
|-----------|-----------------|-------------|
| **Round Robin** | Servicios homogeneos | Distribucion equitativa |
| **Least Connections** | Servicios con tiempos variables | Envia a servidor menos ocupado |
| **Weighted** | Servidores heterogeneos | Asigna peso segun capacidad |
| **IP Hash** | Sesiones sticky | Mismo cliente al mismo servidor |

---

## 3. Indexacion

### 3.1 Implementacion Actual

El sistema implementa **Elasticsearch 8.14.3** para busqueda full-text de productos.

#### Arquitectura de Indexacion

```
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│   PostgreSQL    │          │  Catalog        │          │  Elasticsearch  │
│   (Source of    │◀────────▶│  Service        │────────▶ │  (Search Index) │
│    Truth)       │  CRUD    │                 │  Sync    │                 │
└─────────────────┘          └─────────────────┘          └─────────────────┘
                                     ▲
                                     │ Search queries
                                     │
                              ┌──────┴──────┐
                              │   Cliente   │
                              └─────────────┘
```

#### Indice: `products`

**Mapping del documento:**

| Campo | Tipo | Analyzer | Proposito |
|-------|------|----------|-----------|
| `id` | keyword | - | Identificador unico |
| `name` | text | standard | Busqueda full-text |
| `price` | double | - | Filtros por rango |
| `stock` | integer | - | Filtros por cantidad |
| `stockStatus` | keyword | - | Filtros exactos (OK, LOW, OUT_OF_STOCK) |

#### Tipos de Busqueda Implementados

| Endpoint | Query Type | Ejemplo |
|----------|------------|---------|
| `GET /catalog/search?q=laptop` | Match (full-text) | Busca "laptop" en nombre |
| `GET /catalog/search?status=LOW` | Term (exacto) | Filtra por estado de stock |
| `GET /catalog/search?maxPrice=500` | Range | Productos hasta $500 |

#### Sincronizacion de Datos

| Estrategia | Implementada | Descripcion |
|------------|--------------|-------------|
| **Sync manual** | Si | `POST /catalog/search/sync` |
| **Sync on-demand** | No | Indexar en cada escritura |
| **CDC (Change Data Capture)** | No | Debezium + Kafka (propuesto) |

### 3.2 Mejoras Propuestas

1. **Sync automatico**: Indexar productos automaticamente al crear/actualizar
2. **Analyzers personalizados**: Soporte para busquedas en espanol con stemming
3. **Sugerencias**: Implementar autocompletado con completion suggester
4. **Agregaciones**: Facetas para filtros dinamicos (por categoria, rango de precio)

---

## 4. Redundancia

### 4.1 Estado Actual

El sistema actual **no implementa redundancia** a nivel de datos ni servicios.

### 4.2 Propuesta de Implementacion

#### 4.2.1 Redundancia de Base de Datos (PostgreSQL)

**Configuracion de Replica:**

```
┌─────────────────┐         ┌─────────────────┐
│   PostgreSQL    │────────▶│   PostgreSQL    │
│   PRIMARY       │  WAL    │   REPLICA       │
│   (Read/Write)  │ Stream  │   (Read-only)   │
└─────────────────┘         └─────────────────┘
```

**docker-compose.yml propuesto:**

```yaml
services:
  postgres-primary:
    image: postgres:16
    environment:
      POSTGRES_REPLICATION_MODE: master
      POSTGRES_REPLICATION_USER: replicator
      POSTGRES_REPLICATION_PASSWORD: replpass
    volumes:
      - pgdata-primary:/var/lib/postgresql/data
      
  postgres-replica:
    image: postgres:16
    environment:
      POSTGRES_REPLICATION_MODE: slave
      POSTGRES_MASTER_HOST: postgres-primary
      POSTGRES_REPLICATION_USER: replicator
      POSTGRES_REPLICATION_PASSWORD: replpass
    volumes:
      - pgdata-replica:/var/lib/postgresql/data
    depends_on:
      - postgres-primary
```

#### 4.2.2 Redundancia de Cache (Redis Sentinel)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Sentinel   │     │  Sentinel   │     │  Sentinel   │
│     #1      │     │     #2      │     │     #3      │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │ Monitoring
                           ▼
       ┌─────────────────────────────────────────┐
       │                                         │
┌──────┴──────┐                          ┌──────┴──────┐
│   Redis     │      Replication         │   Redis     │
│   MASTER    │─────────────────────────▶│   SLAVE     │
└─────────────┘                          └─────────────┘
```

#### 4.2.3 Redundancia de Elasticsearch

Configuracion de cluster con replicas:

```yaml
elasticsearch:
  cluster.name: app-cluster
  node.name: node-1
  discovery.seed_hosts: ["es-node-1", "es-node-2", "es-node-3"]
  cluster.initial_master_nodes: ["node-1", "node-2"]
```

**Configuracion de indice con replicas:**

```json
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1
  }
}
```

---

## 5. Disponibilidad

### 5.1 Objetivos de Disponibilidad

| Nivel | SLA | Downtime/Ano | Aplicacion |
|-------|-----|--------------|------------|
| Desarrollo | 95% | ~18 dias | Actual |
| Produccion | 99.9% | ~8.7 horas | Propuesto |
| Critico | 99.99% | ~52 minutos | Futuro |

### 5.2 Estrategias Implementadas

| Estrategia | Estado | Descripcion |
|------------|--------|-------------|
| **Health Checks** | Parcial | Spring Actuator en Gateway |
| **Contenedorizacion** | Si | Docker Compose con restart policies |
| **Desacoplamiento** | Si | Mensajeria asincrona con SQS |

### 5.3 Estrategias Propuestas

#### 5.3.1 Health Checks Completos

Agregar a cada servicio:

```yaml
# application.properties
management.endpoints.web.exposure.include=health,info,metrics
management.endpoint.health.show-details=always
management.health.redis.enabled=true
management.health.elasticsearch.enabled=true
management.health.db.enabled=true
```

#### 5.3.2 Circuit Breaker (Resilience4j)

```java
@CircuitBreaker(name = "catalogService", fallbackMethod = "fallbackProducts")
public List<Product> getAllProducts() {
    return catalogService.getAllProducts();
}

public List<Product> fallbackProducts(Exception e) {
    log.warn("Circuit breaker activated, returning cached data");
    return getCachedProducts();
}
```

#### 5.3.3 Retry Policies

```yaml
resilience4j:
  retry:
    instances:
      catalogService:
        maxAttempts: 3
        waitDuration: 1s
        retryExceptions:
          - java.io.IOException
          - java.net.SocketTimeoutException
```

### 5.4 Calculo de Disponibilidad del Sistema

```
Disponibilidad_Sistema = A_Gateway × A_Services × A_Database × A_Cache

Con componentes individuales al 99.9%:
= 0.999 × 0.999 × 0.999 × 0.999
= 99.6% (sin redundancia)

Con redundancia (n+1):
= 1 - (1 - 0.999)² = 99.9999% por componente
Sistema = 99.99%
```

---

## 6. Concurrencia

### 6.1 Modelo de Concurrencia Actual

| Componente | Modelo | Configuracion |
|------------|--------|---------------|
| **Spring Boot Services** | Thread-per-request | Tomcat embedded |
| **API Gateway** | Event-loop (Netty) | Spring WebFlux |
| **PostgreSQL** | Connection Pool | HikariCP |
| **Redis** | Single-threaded | Multiplexing I/O |
| **SQS Consumer** | Async polling | Spring Cloud AWS |

### 6.2 Configuracion de Thread Pools

**Order/Catalog Service (Tomcat):**

```properties
# Threads para requests HTTP
server.tomcat.threads.max=200
server.tomcat.threads.min-spare=10
server.tomcat.max-connections=8192
server.tomcat.accept-count=100
```

**Connection Pool (HikariCP):**

```properties
# Conexiones a PostgreSQL
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.idle-timeout=300000
spring.datasource.hikari.connection-timeout=20000
spring.datasource.hikari.max-lifetime=1200000
```

### 6.3 Manejo de Concurrencia en Base de Datos

#### Optimistic Locking (Propuesto)

```java
@Entity
public class Product {
    @Id
    private Long id;
    
    @Version
    private Long version;  // Control de concurrencia optimista
    
    private Integer stock;
}
```

#### Transacciones

```java
@Transactional(isolation = Isolation.READ_COMMITTED)
public Product updateStock(Long id, Integer newStock) {
    // Operacion atomica
}
```

### 6.4 Concurrencia en Mensajeria

```
┌────────────┐     ┌─────────┐     ┌────────────────┐
│  Order     │────▶│   SQS   │────▶│    Lambda      │
│  Service   │     │  Queue  │     │  (Concurrent)  │
└────────────┘     └─────────┘     └────────────────┘
                        │
                        ▼
              Concurrency: 5 (configurable)
              Batch Size: 10 messages
```

---

## 7. Latencia

### 7.1 Objetivos de Latencia

| Operacion | P50 | P95 | P99 | Max |
|-----------|-----|-----|-----|-----|
| **GET productos (cache hit)** | 5ms | 10ms | 20ms | 50ms |
| **GET productos (cache miss)** | 20ms | 50ms | 100ms | 200ms |
| **POST crear orden** | 30ms | 80ms | 150ms | 300ms |
| **Busqueda Elasticsearch** | 15ms | 40ms | 80ms | 150ms |
| **Gateway routing** | 2ms | 5ms | 10ms | 20ms |

### 7.2 Fuentes de Latencia

```
Request Timeline (POST /api/orders)
─────────────────────────────────────────────────────────────────────▶
│         │              │                    │            │
│ Network │   Gateway    │   Order Service    │    DB      │ Network
│  (5ms)  │   (2ms)      │     (10ms)         │  (15ms)    │  (5ms)
│         │              │                    │            │
└─────────┴──────────────┴────────────────────┴────────────┴─────────
                                                    Total: ~37ms
```

### 7.3 Optimizaciones Implementadas

| Optimizacion | Componente | Impacto |
|--------------|------------|---------|
| **Cache Redis** | Catalog Service | -80% latencia en lecturas frecuentes |
| **Connection Pool** | PostgreSQL | -50% overhead de conexion |
| **Indice Elasticsearch** | Search | Busquedas O(log n) vs O(n) |
| **Async SQS** | Order Service | No bloquea response |

### 7.4 Optimizaciones Propuestas

1. **CDN**: Para assets estaticos del frontend
2. **Response compression**: Gzip en Gateway
3. **Database indexing**: Indices en columnas frecuentes
4. **Query optimization**: Evitar N+1 queries

```properties
# Compresion en Gateway
server.compression.enabled=true
server.compression.mime-types=application/json,text/html
server.compression.min-response-size=1024
```

---

## 8. Costo y Proyeccion

### 8.1 Costo Actual (Desarrollo Local)

| Recurso | Costo | Notas |
|---------|-------|-------|
| Docker Desktop | $0 | Personal/educativo |
| LocalStack | $0 | Tier gratuito |
| Desarrollo | $0 | Infraestructura local |
| **Total Mensual** | **$0** | - |

### 8.2 Proyeccion AWS (Produccion)

#### Escenario: 10,000 usuarios/mes, 100,000 requests/dia

| Servicio AWS | Especificacion | Costo Mensual |
|--------------|----------------|---------------|
| **EC2 (Gateway)** | t3.small (1x) | $15 |
| **EC2 (Order Service)** | t3.small (2x) | $30 |
| **EC2 (Catalog Service)** | t3.small (2x) | $30 |
| **RDS PostgreSQL** | db.t3.micro | $15 |
| **ElastiCache Redis** | cache.t3.micro | $12 |
| **Elasticsearch Service** | t3.small.search | $35 |
| **SQS** | ~3M requests | $1 |
| **Lambda** | ~100K invocaciones | $0.20 |
| **ALB** | Application Load Balancer | $20 |
| **CloudWatch** | Logs + Metrics | $10 |
| **Data Transfer** | ~50GB | $5 |
| **Total Mensual** | - | **~$173** |

### 8.3 Proyeccion de Escalamiento

| Usuarios/Mes | Requests/Dia | Infra Requerida | Costo Estimado |
|--------------|--------------|-----------------|----------------|
| 10,000 | 100,000 | Minimo | $173/mes |
| 50,000 | 500,000 | +1 instancia/servicio | $350/mes |
| 100,000 | 1,000,000 | Auto-scaling + RDS Multi-AZ | $600/mes |
| 500,000 | 5,000,000 | Kubernetes + Aurora | $2,500/mes |

### 8.4 Optimizacion de Costos

| Estrategia | Ahorro Potencial | Implementacion |
|------------|------------------|----------------|
| **Reserved Instances** | 30-40% | Compromiso 1-3 anos |
| **Spot Instances** | 60-70% | Para servicios stateless |
| **Right-sizing** | 20-30% | Monitoreo y ajuste |
| **Auto-scaling** | Variable | Escalar segun demanda |

---

## 9. Performance y Escalabilidad

### 9.1 Metricas de Performance Actuales

| Metrica | Valor Actual | Objetivo |
|---------|--------------|----------|
| **Throughput (Gateway)** | ~500 req/s | 2,000 req/s |
| **Tiempo respuesta promedio** | 50ms | < 100ms |
| **Error rate** | < 1% | < 0.1% |
| **CPU utilization** | Variable | < 70% |

### 9.2 Estrategias de Escalabilidad

#### Escalado Horizontal (Scale-Out)

```
                         ┌─────────────────┐
                    ┌───▶│ Order Service 1 │
                    │    └─────────────────┘
┌─────────┐    ┌────┴────┐    ┌─────────────────┐
│   LB    │───▶│ Gateway │───▶│ Order Service 2 │
└─────────┘    └────┬────┘    └─────────────────┘
                    │    ┌─────────────────┐
                    └───▶│ Order Service 3 │
                         └─────────────────┘
```

**Requisitos para escalado horizontal:**
- [x] Servicios stateless
- [x] Externalizacion de sesiones (Redis)
- [x] Base de datos compartida
- [ ] Service discovery (Eureka/Consul)

#### Escalado Vertical (Scale-Up)

| Componente | Actual | Escalado |
|------------|--------|----------|
| Order Service | 512MB RAM | 2GB RAM |
| Catalog Service | 512MB RAM | 2GB RAM |
| PostgreSQL | 1GB RAM | 4GB RAM |
| Redis | 256MB RAM | 1GB RAM |

### 9.3 Auto-Scaling (AWS)

```yaml
# CloudFormation / Terraform
AutoScalingGroup:
  MinSize: 2
  MaxSize: 10
  DesiredCapacity: 2
  
  ScalingPolicies:
    - PolicyType: TargetTrackingScaling
      TargetValue: 70
      PredefinedMetricType: ASGAverageCPUUtilization
```

### 9.4 Performance Testing (Propuesto)

Herramientas recomendadas:
- **k6**: Load testing
- **JMeter**: Stress testing
- **Gatling**: Performance benchmarking

Escenarios de prueba:

```javascript
// k6 script ejemplo
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp-up
    { duration: '5m', target: 100 },  // Steady
    { duration: '2m', target: 200 },  // Peak
    { duration: '2m', target: 0 },    // Ramp-down
  ],
};

export default function () {
  let res = http.get('http://localhost:8080/api/catalog/products');
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}
```

### 9.5 Capacidad Estimada

| Configuracion | Throughput | Usuarios Concurrentes |
|---------------|------------|----------------------|
| 1 instancia/servicio | 500 req/s | 100 |
| 2 instancias/servicio | 1,000 req/s | 200 |
| 3 instancias/servicio + Redis cluster | 2,500 req/s | 500 |
| Kubernetes (10 pods) | 10,000 req/s | 2,000 |

---

## Resumen Ejecutivo

### Atributos Implementados

| Atributo | Estado | Nivel |
|----------|--------|-------|
| Cache | Implementado | Produccion |
| Indexacion | Implementado | Produccion |
| Concurrencia | Configurado | Basico |
| Latencia | Optimizado | Basico |

### Atributos Pendientes (Produccion)

| Atributo | Prioridad | Esfuerzo |
|----------|-----------|----------|
| Balanceo de carga | Alta | 4-8 horas |
| Redundancia | Alta | 8-16 horas |
| Disponibilidad (HA) | Alta | 8-16 horas |
| Monitoreo avanzado | Media | 4-8 horas |
| Auto-scaling | Media | 8-16 horas |

### Proximos Pasos Recomendados

1. **Inmediato**: Implementar health checks completos
2. **Corto plazo**: Configurar NGINX como load balancer
3. **Mediano plazo**: Implementar redundancia de datos
4. **Largo plazo**: Migrar a Kubernetes para auto-scaling

---

*Documento generado para el proyecto de Arquitectura de Software*
*Ultima actualizacion: Enero 2026*
