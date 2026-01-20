# Instrucciones para Agentes de Código (OpenCode / Copilot / Cursor)

> **Propósito:** Guía para que un agente de IA pueda avanzar el proyecto de forma segura y ordenada.

---

## Reglas Generales

### 🚨 NO ROMPER LO EXISTENTE
1. Antes de modificar cualquier archivo, verificar que el proyecto compila/corre
2. Ejecutar siempre: `mvn clean compile` en servicios Java antes de hacer cambios
3. Ejecutar siempre: `npm run build` en frontend antes de hacer cambios
4. Si algo falla después de un cambio, revertir inmediatamente

### 📦 CAMBIOS PEQUEÑOS E INCREMENTALES
1. Un PR/commit por tarea específica
2. Máximo 3-5 archivos por cambio
3. Mensajes de commit descriptivos: `feat(order-service): add SQS publisher for OrderCreated event`

### ✅ VALIDAR DESPUÉS DE CADA CAMBIO
```bash
# Backend (desde carpeta del servicio)
mvn clean compile
mvn spring-boot:run  # verificar que levanta

# Frontend
npm run build
npm run dev  # verificar que levanta

# Docker
docker compose -f infra/docker-compose.yml ps
```

### 📁 RESPETAR ESTRUCTURA
```
proyecto-arquitectura/
├── frontend/          # Solo React/Vite
├── gateway/           # Solo Spring Cloud Gateway
├── services/
│   ├── order-service/    # Solo Order Service
│   └── catalog-service/  # Solo Catalog Service
├── lambda/            # Solo proyectos Lambda
├── infra/             # Solo Docker/infra configs
└── docs/              # Solo documentación
```

---

## Etapa 1: Integración SQS + Lambda (Sprint 2)

### Paso 1.1: Script inicialización LocalStack

**Archivo a crear:** `infra/init-localstack.sh`

```bash
#!/bin/bash
# Esperar a que LocalStack esté listo
sleep 5
# Crear cola SQS
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name order-events
echo "Cola order-events creada"
```

**Archivo a modificar:** `infra/docker-compose.yml`

Agregar al servicio `localstack`:
```yaml
volumes:
  - ./init-localstack.sh:/etc/localstack/init/ready.d/init.sh
```

**Verificación:**
```bash
docker compose -f infra/docker-compose.yml up -d
aws --endpoint-url=http://localhost:4566 sqs list-queues
# Debe mostrar: order-events
```

---

### Paso 1.2: Publicador SQS en Order Service

**Archivo a modificar:** `services/order-service/pom.xml`

Agregar dependencias:
```xml
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>sqs</artifactId>
    <version>2.20.0</version>
</dependency>
```

**Archivo a crear:** `services/order-service/src/main/java/com/proyecto/orders/messaging/SqsPublisher.java`

```java
package com.proyecto.orders.messaging;

import com.proyecto.orders.model.Order;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;
import java.net.URI;

@Component
public class SqsPublisher {
    
    private final SqsClient sqsClient;
    private final String queueUrl;
    
    public SqsPublisher() {
        this.sqsClient = SqsClient.builder()
            .endpointOverride(URI.create("http://localhost:4566"))
            .build();
        this.queueUrl = "http://localhost:4566/000000000000/order-events";
    }
    
    public void publishOrderCreated(Order order) {
        String message = String.format("{\"orderId\":%d,\"event\":\"OrderCreated\"}", order.getId());
        sqsClient.sendMessage(SendMessageRequest.builder()
            .queueUrl(queueUrl)
            .messageBody(message)
            .build());
    }
}
```

**Archivo a modificar:** `services/order-service/src/main/java/com/proyecto/orders/controller/OrderController.java`

```java
// Agregar import
import com.proyecto.orders.messaging.SqsPublisher;

// Modificar constructor
private final SqsPublisher sqsPublisher;

public OrderController(OrderRepository repository, SqsPublisher sqsPublisher) {
    this.repository = repository;
    this.sqsPublisher = sqsPublisher;
}

// Modificar método create
@PostMapping
public Order create(@RequestBody Order order) {
    Order saved = repository.save(order);
    sqsPublisher.publishOrderCreated(saved);
    return saved;
}
```

**Verificación:**
```bash
cd services/order-service
mvn clean compile
mvn spring-boot:run

# En otra terminal
curl -X POST http://localhost:8081/orders -H "Content-Type: application/json" -d '{"customerName":"Test"}'

# Verificar mensaje en cola
aws --endpoint-url=http://localhost:4566 sqs receive-message --queue-url http://localhost:4566/000000000000/order-events
```

---

### Paso 1.3: Crear Lambda Order Notifier

**Archivos a crear en:** `lambda/order-notifier/`

1. `pom.xml` - Proyecto Maven con aws-lambda-java-core
2. `src/main/java/com/proyecto/lambda/OrderNotifierHandler.java` - Handler SQS
3. `template.yaml` - SAM template para LocalStack

**Verificación:**
```bash
cd lambda/order-notifier
mvn clean package

# Desplegar en LocalStack (requiere SAM CLI o awslocal)
```

---

### Paso 1.4: Agregar Swagger a Servicios

**Archivo a modificar:** `services/order-service/pom.xml` y `services/catalog-service/pom.xml`

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.3.0</version>
</dependency>
```

**Verificación:**
```bash
# Después de reiniciar servicios
curl http://localhost:8081/swagger-ui.html
curl http://localhost:8082/swagger-ui.html
```

---

## Etapa 2: Caché Redis (Sprint 3)

### Paso 2.1: Integrar Redis en Catalog Service

**Archivo a modificar:** `services/catalog-service/pom.xml`

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

**Archivo a modificar:** `services/catalog-service/src/main/resources/application.properties`

```properties
# Redis
spring.data.redis.host=localhost
spring.data.redis.port=6379
```

**Archivo a modificar:** `services/catalog-service/src/main/java/com/proyecto/catalog/CatalogServiceApplication.java`

```java
@SpringBootApplication
@EnableCaching  // Agregar esta anotación
public class CatalogServiceApplication { ... }
```

**Archivo a modificar:** `services/catalog-service/src/main/java/com/proyecto/catalog/controller/CatalogController.java`

```java
@GetMapping("/products")
@Cacheable("products")  // Agregar
public List<Product> getAll() { ... }

@PutMapping("/products/{id}/stock")
@CacheEvict(value = "products", allEntries = true)  // Agregar
public Product updateStock(...) { ... }
```

**Verificación:**
```bash
# Llamar endpoint dos veces, segunda no debe mostrar query SQL en logs
curl http://localhost:8082/catalog/products
curl http://localhost:8082/catalog/products

# Verificar Redis
docker exec -it app-redis redis-cli
> KEYS *
```

---

## Etapa 3: Elasticsearch (Sprint 3)

### Paso 3.1: Integrar Elasticsearch en Catalog Service

**Archivo a modificar:** `services/catalog-service/pom.xml`

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-elasticsearch</artifactId>
</dependency>
```

**Archivos a crear:**
- `ProductDocument.java` - Entidad para Elasticsearch
- `ProductSearchRepository.java` - Repository Elasticsearch
- Endpoint `GET /catalog/search?q=`

**Verificación:**
```bash
curl "http://localhost:8082/catalog/search?q=laptop"
curl http://localhost:9200/_cat/indices
```

---

## Comandos Útiles para el Agente

```bash
# Ver estado de contenedores
docker compose -f infra/docker-compose.yml ps

# Logs de un servicio
docker compose -f infra/docker-compose.yml logs -f postgres

# Reiniciar todo
docker compose -f infra/docker-compose.yml down
docker compose -f infra/docker-compose.yml up -d

# Compilar todo el backend
cd gateway && mvn clean compile && cd ..
cd services/order-service && mvn clean compile && cd ../..
cd services/catalog-service && mvn clean compile && cd ../..

# Frontend
cd frontend && npm install && npm run build && cd ..
```

---

## Checklist de Verificación por Etapa

### Después de Etapa 1 (SQS + Lambda + Swagger)
- [ ] `aws sqs list-queues` muestra `order-events`
- [ ] POST a `/api/orders` genera mensaje en cola
- [ ] Lambda procesa mensaje (verificar logs)
- [ ] Orden cambia status a `NOTIFIED`
- [ ] Swagger UI accesible en `:8081/swagger-ui.html`
- [ ] Swagger UI accesible en `:8082/swagger-ui.html`

### Después de Etapa 2 (Redis)
- [ ] Segunda llamada a `/catalog/products` no muestra SQL en logs
- [ ] Redis CLI muestra keys cacheadas

### Después de Etapa 3 (Elasticsearch)
- [ ] `/catalog/search?q=laptop` retorna resultados
- [ ] Índice visible en Elasticsearch