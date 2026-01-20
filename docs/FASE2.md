# Fase 2: Sistema de Eventos con SQS y Lambda

## Resumen

En esta fase se implemento un sistema de eventos asincrono usando AWS SQS (via LocalStack) y una funcion Lambda en Java 17. Cuando se crea una orden, se publica un evento a la cola SQS, y la Lambda lo procesa para actualizar el estado de la orden a `NOTIFIED`.

## Objetivos Completados

- Crear script de inicializacion para cola SQS en LocalStack
- Integrar Spring Cloud AWS en Order Service
- Implementar publicador de eventos SQS
- Crear endpoint PATCH para actualizar estado de ordenes
- Desarrollar Lambda Java 17 para procesar eventos
- Crear script de despliegue de Lambda

---

## Arquitectura del Sistema de Eventos

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE EVENTOS                                │
└─────────────────────────────────────────────────────────────────────────┘

  Frontend                Order Service              SQS                Lambda
     │                         │                      │                    │
     │  POST /api/orders       │                      │                    │
     ├────────────────────────>│                      │                    │
     │                         │                      │                    │
     │                         │ save(order)          │                    │
     │                         │ status=CREATED       │                    │
     │                         │                      │                    │
     │                         │ publish event        │                    │
     │                         ├─────────────────────>│                    │
     │                         │                      │                    │
     │   Response (CREATED)    │                      │                    │
     │<────────────────────────│                      │                    │
     │                         │                      │                    │
     │                         │                      │ poll messages      │
     │                         │                      │<───────────────────│
     │                         │                      │                    │
     │                         │                      │ OrderCreatedEvent  │
     │                         │                      ├───────────────────>│
     │                         │                      │                    │
     │                         │  PATCH /orders/{id}/status               │
     │                         │<─────────────────────────────────────────│
     │                         │  {status: NOTIFIED}                      │
     │                         │                      │                    │
     │                         │ update order         │                    │
     │                         │ status=NOTIFIED      │                    │
     │                         │                      │                    │
```

---

## Archivos Creados/Modificados

### Nuevos Archivos

| Archivo | Descripcion |
|---------|-------------|
| `infra/init-localstack.sh` | Script para crear cola SQS en LocalStack |
| `services/order-service/.../event/OrderCreatedEvent.java` | DTO del evento |
| `services/order-service/.../service/OrderEventPublisher.java` | Servicio publicador SQS |
| `lambda/order-notification/pom.xml` | Proyecto Maven de la Lambda |
| `lambda/order-notification/.../OrderNotificationHandler.java` | Handler de la Lambda |
| `lambda/deploy-lambda.sh` | Script de despliegue |

### Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `services/order-service/pom.xml` | Agregado Spring Cloud AWS SQS |
| `services/order-service/.../application.properties` | Config AWS/SQS |
| `services/order-service/.../controller/OrderController.java` | Publicacion de eventos + endpoint PATCH |

---

## Detalles de Implementacion

### 1. Inicializacion de LocalStack (`infra/init-localstack.sh`)

Script bash que:
- Espera a que LocalStack este disponible
- Crea la cola SQS `order-created`
- Muestra la URL de la cola

```bash
# Ejecutar despues de docker compose up
./infra/init-localstack.sh
```

### 2. Spring Cloud AWS en Order Service

**Dependencias agregadas (pom.xml):**
```xml
<dependency>
    <groupId>io.awspring.cloud</groupId>
    <artifactId>spring-cloud-aws-starter-sqs</artifactId>
</dependency>
```

**Configuracion (application.properties):**
```properties
# AWS / LocalStack Configuration
spring.cloud.aws.region.static=us-east-1
spring.cloud.aws.credentials.access-key=test
spring.cloud.aws.credentials.secret-key=test
spring.cloud.aws.sqs.endpoint=http://localhost:4566

# Custom SQS Queue Name
app.sqs.queue-name=order-created
```

### 3. Evento OrderCreated

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderCreatedEvent {
    private Long orderId;
    private String customerName;
    private Double total;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime eventTimestamp;
}
```

### 4. Publicador de Eventos SQS

```java
@Service
public class OrderEventPublisher {
    private final SqsTemplate sqsTemplate;
    
    public void publishOrderCreated(Order order) {
        OrderCreatedEvent event = OrderCreatedEvent.fromOrder(...);
        String messageBody = objectMapper.writeValueAsString(event);
        sqsTemplate.send(queueName, messageBody);
    }
}
```

### 5. Endpoint de Actualizacion de Estado

```java
@PatchMapping("/{id}/status")
public ResponseEntity<Order> updateStatus(@PathVariable Long id, 
                                           @RequestBody Map<String, String> body) {
    String newStatus = body.get("status");
    // ... actualizar orden
}
```

### 6. Lambda Handler (Java 17)

La Lambda:
1. Recibe eventos SQS en batch
2. Parsea cada mensaje JSON
3. Extrae el `orderId`
4. Simula procesamiento de notificacion
5. Llama al Order Service via HTTP para actualizar estado

```java
public class OrderNotificationHandler implements RequestHandler<SQSEvent, String> {
    @Override
    public String handleRequest(SQSEvent event, Context context) {
        for (SQSMessage message : event.getRecords()) {
            // Parsear evento
            Long orderId = parseOrderId(message);
            // Actualizar estado
            updateOrderStatus(orderId, "NOTIFIED");
        }
    }
}
```

---

## Guia de Ejecucion

### Prerequisitos

- Docker y Docker Compose
- Java 17
- Maven
- AWS CLI (para interactuar con LocalStack)

### Paso 1: Levantar Infraestructura

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d
```

### Paso 2: Crear Cola SQS

```bash
./infra/init-localstack.sh
```

### Paso 3: Compilar y Desplegar Lambda

```bash
./lambda/deploy-lambda.sh
```

### Paso 4: Iniciar Order Service

```bash
cd services/order-service
mvn spring-boot:run
```

### Paso 5: Probar el Flujo

```bash
# Crear una orden
curl -X POST http://localhost:8081/orders \
  -H "Content-Type: application/json" \
  -d '{"customerName": "Test User", "total": 99.99}'

# Verificar que el estado cambio a NOTIFIED
curl http://localhost:8081/orders/1
```

---

## Verificacion

### Ver mensajes en SQS

```bash
aws --endpoint-url=http://localhost:4566 \
    --region us-east-1 \
    sqs receive-message \
    --queue-url http://localhost:4566/000000000000/order-created
```

### Ver logs de Lambda

```bash
aws --endpoint-url=http://localhost:4566 \
    --region us-east-1 \
    logs tail /aws/lambda/order-notification --follow
```

### Invocar Lambda manualmente

```bash
aws --endpoint-url=http://localhost:4566 \
    --region us-east-1 \
    lambda invoke \
    --function-name order-notification \
    --payload '{"Records":[{"body":"{\"orderId\":1}"}]}' \
    output.txt
```

---

## Diagrama de Componentes

```
┌────────────────────────────────────────────────────────────────────────┐
│                           ORDER SERVICE (:8081)                        │
├────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────┐    ┌───────────────┐  │
│  │ OrderController │───>│ OrderEventPublisher │───>│   SqsTemplate │  │
│  │                 │    │                     │    │ (Spring Cloud)│  │
│  │ POST /orders    │    │ publishOrderCreated │    │               │  │
│  │ PATCH /{id}/    │    └─────────────────────┘    └───────┬───────┘  │
│  │      status     │                                       │          │
│  └─────────────────┘                                       │          │
└────────────────────────────────────────────────────────────┼──────────┘
                                                             │
                                                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        LOCALSTACK SQS (:4566)                          │
├────────────────────────────────────────────────────────────────────────┤
│                        Queue: order-created                            │
│                                                                        │
│   ┌─────────────────────────────────────────────────────────────┐     │
│   │ Message: {"orderId":1,"customerName":"Test","total":99.99} │     │
│   └─────────────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ Event Source Mapping
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    LAMBDA: order-notification                          │
├────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐                                          │
│  │ OrderNotificationHandler│                                          │
│  │                         │                                          │
│  │ 1. Parse SQS event      │                                          │
│  │ 2. Extract orderId      │                                          │
│  │ 3. Simulate notification│                                          │
│  │ 4. PATCH /orders/{id}/  │                                          │
│  │         status          │                                          │
│  └───────────┬─────────────┘                                          │
└──────────────┼─────────────────────────────────────────────────────────┘
               │
               │ HTTP PATCH
               ▼
         Order Service
         (status → NOTIFIED)
```

---

## Transiciones de Estado

| Estado | Descripcion | Quien lo establece |
|--------|-------------|-------------------|
| `CREATED` | Orden recien creada | Order Service (prePersist) |
| `NOTIFIED` | Notificacion enviada | Lambda (via PATCH) |

---

## Variables de Entorno

### Order Service

| Variable | Valor | Descripcion |
|----------|-------|-------------|
| `spring.cloud.aws.sqs.endpoint` | `http://localhost:4566` | Endpoint de LocalStack |
| `app.sqs.queue-name` | `order-created` | Nombre de la cola SQS |

### Lambda

| Variable | Valor | Descripcion |
|----------|-------|-------------|
| `ORDER_SERVICE_URL` | `http://host.docker.internal:8081` | URL del Order Service |

---

## Proximos Pasos (Fase 3)

- Implementar cache Redis en Catalog Service
- Agregar anotaciones `@Cacheable` y `@CacheEvict`
- Verificar reduccion de consultas a la base de datos
