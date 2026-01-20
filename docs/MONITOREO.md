# Monitoreo con Prometheus y Grafana

Este documento describe la implementacion del stack de monitoreo para el ecosistema de microservicios.

## Arquitectura de Monitoreo

```
+------------------+     +------------------+     +------------------+
|   Order Service  |     | Catalog Service  |     |     Gateway      |
|   :8081          |     |   :8082          |     |    :8080         |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         | /actuator/prometheus   | /actuator/prometheus   | /actuator/prometheus
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

## Componentes

### 1. Spring Boot Actuator + Micrometer

Cada microservicio expone metricas en formato Prometheus mediante:

**Dependencias (pom.xml):**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
    <scope>runtime</scope>
</dependency>
```

**Configuracion (application.properties):**
```properties
# Actuator endpoints
management.endpoints.web.exposure.include=health,info,metrics,prometheus
management.endpoint.health.show-details=always
management.metrics.tags.application=${spring.application.name}
```

### 2. Prometheus

Servidor de metricas que recolecta datos de todos los servicios.

**Ubicacion:** `infra/monitoring/prometheus/prometheus.yml`

**Configuracion de Scraping:**
```yaml
scrape_configs:
  - job_name: 'gateway'
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ['host.docker.internal:8080']
    scrape_interval: 10s

  - job_name: 'order-service'
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ['host.docker.internal:8081']
    scrape_interval: 10s

  - job_name: 'catalog-service'
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ['host.docker.internal:8082']
    scrape_interval: 10s
```

### 3. Grafana

Dashboard de visualizacion con paneles preconfigurados.

**Ubicacion del Dashboard:** `infra/monitoring/grafana/dashboards/microservices-dashboard.json`

## Endpoints de Metricas

| Servicio | URL de Metricas Prometheus |
|----------|---------------------------|
| Order Service | http://localhost:8081/actuator/prometheus |
| Catalog Service | http://localhost:8082/actuator/prometheus |
| Gateway | http://localhost:8080/actuator/prometheus |
| Prometheus UI | http://localhost:9090 |
| Grafana | http://localhost:3000 |

## Metricas Disponibles

### Metricas HTTP (Spring MVC)

| Metrica | Descripcion |
|---------|-------------|
| `http_server_requests_seconds_count` | Total de requests por endpoint |
| `http_server_requests_seconds_sum` | Tiempo total de respuesta |
| `http_server_requests_seconds_bucket` | Histograma de latencias |

**Ejemplo de consulta PromQL:**
```promql
# Requests por segundo por servicio
sum(rate(http_server_requests_seconds_count[1m])) by (application)

# Latencia P95 por servicio
histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket[5m])) by (le, application)) * 1000

# Tasa de errores (5xx)
sum(rate(http_server_requests_seconds_count{status=~"5.."}[5m])) / sum(rate(http_server_requests_seconds_count[5m])) * 100
```

### Metricas JVM

| Metrica | Descripcion |
|---------|-------------|
| `jvm_memory_used_bytes` | Memoria usada por area (heap/non-heap) |
| `jvm_memory_max_bytes` | Memoria maxima disponible |
| `jvm_threads_live_threads` | Threads activos |
| `jvm_gc_pause_seconds` | Pausas de Garbage Collection |

**Ejemplo de consulta PromQL:**
```promql
# Uso de memoria heap
jvm_memory_used_bytes{area="heap"}

# Threads activos por servicio
jvm_threads_live_threads
```

### Metricas de Sistema

| Metrica | Descripcion |
|---------|-------------|
| `system_cpu_usage` | Uso de CPU del sistema |
| `process_cpu_usage` | Uso de CPU del proceso |
| `process_uptime_seconds` | Tiempo de actividad |

## Dashboard de Grafana

El dashboard preconfigurado incluye los siguientes paneles:

### Fila: Overview
1. **Services Up** - Estado de disponibilidad de cada servicio
2. **Request Rate (Total)** - Requests por segundo totales
3. **P95 Latency** - Latencia percentil 95
4. **Error Rate %** - Porcentaje de errores 5xx

### Fila: HTTP Requests
5. **Request Rate by Service** - Grafico de requests por servicio
6. **Response Time by Service** - Latencia P50 y P95 por servicio

### Fila: JVM Metrics
7. **JVM Heap Memory Used** - Uso de memoria heap por servicio
8. **JVM Threads** - Threads activos por servicio

## Iniciar el Stack de Monitoreo

### 1. Levantar infraestructura con Docker

```bash
cd infra
docker-compose up -d prometheus grafana
```

### 2. Verificar servicios

```bash
# Verificar Prometheus
curl http://localhost:9090/-/healthy

# Verificar Grafana
curl http://localhost:3000/api/health
```

### 3. Acceder a Grafana

1. Abrir http://localhost:3000
2. Credenciales por defecto:
   - Usuario: `admin`
   - Password: `admin`
3. Ir a Dashboards > Microservices Dashboard

### 4. Iniciar los microservicios

Los servicios deben estar corriendo para que Prometheus pueda recolectar metricas:

```bash
# Terminal 1 - Order Service
cd services/order-service
./mvnw spring-boot:run

# Terminal 2 - Catalog Service  
cd services/catalog-service
./mvnw spring-boot:run

# Terminal 3 - Gateway
cd gateway
./mvnw spring-boot:run
```

## Alertas (Opcional)

Se pueden configurar alertas en Prometheus editando `prometheus.yml`:

```yaml
rule_files:
  - "alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

**Ejemplo de regla de alerta (`alerts.yml`):**
```yaml
groups:
  - name: microservices
    rules:
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Servicio {{ $labels.job }} caido"
          
      - alert: HighErrorRate
        expr: sum(rate(http_server_requests_seconds_count{status=~"5.."}[5m])) / sum(rate(http_server_requests_seconds_count[5m])) > 0.05
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Tasa de errores superior al 5%"
          
      - alert: HighLatency
        expr: histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket[5m])) by (le)) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Latencia P95 superior a 500ms"
```

## Troubleshooting

### Prometheus no ve los servicios

1. Verificar que los servicios estan corriendo
2. Verificar que los endpoints de metricas responden:
   ```bash
   curl http://localhost:8081/actuator/prometheus
   ```
3. En Windows/Mac, verificar que `host.docker.internal` resuelve correctamente

### Grafana no muestra datos

1. Verificar datasource en Grafana: Configuration > Data Sources > Prometheus
2. La URL debe ser `http://prometheus:9090` (dentro de Docker)
3. Click en "Test" para verificar conexion

### Metricas vacias

1. Generar trafico a los servicios:
   ```bash
   curl http://localhost:8081/orders
   curl http://localhost:8082/catalog/products
   ```
2. Esperar 15-30 segundos para que Prometheus recolecte datos

## Estructura de Archivos

```
infra/
├── docker-compose.yml              # Servicios Prometheus y Grafana
└── monitoring/
    ├── prometheus/
    │   └── prometheus.yml          # Configuracion de scraping
    └── grafana/
        ├── provisioning/
        │   ├── datasources/
        │   │   └── datasources.yml # Conexion a Prometheus
        │   └── dashboards/
        │       └── dashboards.yml  # Provider de dashboards
        └── dashboards/
            └── microservices-dashboard.json  # Dashboard preconfigurado
```

## Referencias

- [Spring Boot Actuator](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
- [Micrometer Prometheus](https://micrometer.io/docs/registry/prometheus)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
