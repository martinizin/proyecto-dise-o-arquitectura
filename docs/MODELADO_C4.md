# Guia de Modelado C4 en Icepanel

Esta guia proporciona instrucciones para crear el modelo C4 del sistema en [Icepanel](https://icepanel.io/).

## Que es el Modelo C4

El modelo C4 es una notacion para visualizar arquitectura de software en 4 niveles:

1. **Context (Contexto)**: Sistema y sus interacciones externas
2. **Container (Contenedor)**: Aplicaciones y almacenes de datos
3. **Component (Componente)**: Componentes dentro de cada contenedor
4. **Code (Codigo)**: Detalle de implementacion (opcional)

## Acceso a Icepanel

1. Ir a https://icepanel.io/
2. Crear cuenta o iniciar sesion
3. Crear nuevo proyecto: "Proyecto Arquitectura E-Commerce"

## Nivel 1: Diagrama de Contexto

### Elementos a Crear

| Tipo | Nombre | Descripcion |
|------|--------|-------------|
| Person | Usuario | Cliente que usa la aplicacion de e-commerce |
| Person | Administrador | Gestiona productos y ordenes |
| Software System | Sistema E-Commerce | Plataforma de comercio electronico |
| Software System | AWS Services | Servicios cloud (SQS, Lambda) |
| Software System | Sistema de Pagos | Procesador de pagos externo (futuro) |

### Relaciones

```
Usuario ---------> Sistema E-Commerce
                   "Navega catalogo, crea ordenes"

Administrador ---> Sistema E-Commerce
                   "Gestiona productos y ordenes"

Sistema E-Commerce --> AWS Services
                       "Envia eventos, ejecuta funciones"

Sistema E-Commerce --> Sistema de Pagos
                       "Procesa pagos (futuro)"
```

### Configuracion en Icepanel

1. Click en "+ Add Element" > "Person"
2. Nombre: "Usuario"
3. Descripcion: "Cliente que interactua con la plataforma"
4. Repetir para otros elementos
5. Conectar con flechas y agregar etiquetas

## Nivel 2: Diagrama de Contenedores

### Elementos a Crear

| Tipo | Nombre | Tecnologia | Descripcion |
|------|--------|------------|-------------|
| Container (Web App) | Frontend | React, Vite | SPA para usuarios |
| Container (API) | API Gateway | Spring Cloud Gateway | Punto de entrada |
| Container (API) | Order Service | Spring Boot | Gestion de ordenes |
| Container (API) | Catalog Service | Spring Boot | Gestion de catalogo |
| Container (Function) | Notification Lambda | Python | Procesa notificaciones |
| Container (Database) | PostgreSQL | PostgreSQL 16 | Base de datos relacional |
| Container (Cache) | Redis Cache | Redis 7 | Cache de productos |
| Container (Search) | Elasticsearch | ES 8.14 | Motor de busqueda |
| Container (Queue) | SQS Queue | AWS SQS | Cola de mensajes |

### Relaciones

```
Frontend ---------> API Gateway
                    "HTTPS/REST"

API Gateway ------> Order Service
                    "HTTP/REST /api/orders"

API Gateway ------> Catalog Service
                    "HTTP/REST /api/catalog"

Order Service ----> PostgreSQL
                    "JDBC, lee/escribe ordenes"

Order Service ----> SQS Queue
                    "Publica eventos de ordenes"

Catalog Service --> PostgreSQL
                    "JDBC, lee/escribe productos"

Catalog Service --> Redis Cache
                    "Cache de productos"

Catalog Service --> Elasticsearch
                    "Indexa y busca productos"

SQS Queue --------> Notification Lambda
                    "Trigger en mensaje"

Notification Lambda -> Order Service
                       "PATCH /orders/{id}/status"
```

### Configuracion en Icepanel

1. Expandir "Sistema E-Commerce"
2. Agregar contenedores con tipos apropiados
3. Usar iconos de tecnologia (React, Spring, PostgreSQL, etc.)
4. Definir relaciones con protocolo y proposito

## Nivel 3: Diagrama de Componentes

### Order Service - Componentes

| Componente | Tipo | Descripcion |
|------------|------|-------------|
| OrderController | Controller | REST endpoints /orders |
| OrderService | Service | Logica de negocio |
| OrderRepository | Repository | Acceso a datos JPA |
| OrderEventPublisher | Publisher | Publica eventos a SQS |
| Order | Entity | Modelo de orden |

```
OrderController --> OrderService
                    "Crea, consulta ordenes"

OrderService -----> OrderRepository
                    "CRUD de ordenes"

OrderService -----> OrderEventPublisher
                    "Publica evento ORDER_CREATED"

OrderRepository --> PostgreSQL (external)
                    "JPA/Hibernate"

OrderEventPublisher -> SQS Queue (external)
                       "AWS SDK"
```

### Catalog Service - Componentes

| Componente | Tipo | Descripcion |
|------------|------|-------------|
| CatalogController | Controller | REST endpoints /catalog/products |
| SearchController | Controller | REST endpoints /catalog/search |
| CatalogService | Service | Logica con cache |
| ProductSearchService | Service | Busqueda Elasticsearch |
| ProductRepository | Repository | Acceso JPA |
| ProductSearchRepository | Repository | Acceso Elasticsearch |
| Product | Entity | Modelo de producto |
| ProductDocument | Document | Documento ES |

```
CatalogController --> CatalogService
                      "CRUD productos"

SearchController ---> ProductSearchService
                      "Busqueda full-text"

CatalogService -----> ProductRepository
                      "Acceso a PostgreSQL"

CatalogService -----> Redis (external)
                      "Cache @Cacheable"

ProductSearchService -> ProductSearchRepository
                        "Queries Elasticsearch"
```

### API Gateway - Componentes

| Componente | Tipo | Descripcion |
|------------|------|-------------|
| RouteConfiguration | Config | Rutas a microservicios |
| CorsConfiguration | Config | Configuracion CORS |
| LoggingFilter | Filter | Logging de requests |

## Nivel 4: Diagrama de Codigo (Opcional)

Este nivel muestra clases y metodos. En Icepanel se puede vincular a repositorio de codigo.

### Ejemplo: OrderController

```java
@RestController
@RequestMapping("/orders")
public class OrderController {
    
    // GET /orders
    public List<Order> getAll()
    
    // POST /orders
    public Order create(@RequestBody Order order)
    
    // GET /orders/{id}
    public ResponseEntity<Order> getOne(@PathVariable Long id)
    
    // PATCH /orders/{id}/status
    public ResponseEntity<Order> updateStatus(@PathVariable Long id, @RequestBody Map<String,String> body)
}
```

## Vistas Adicionales en Icepanel

### Vista de Deployment

Mostrar donde se ejecuta cada contenedor:

| Contenedor | Ambiente Local | Ambiente AWS |
|------------|---------------|--------------|
| Frontend | localhost:5173 | S3 + CloudFront |
| API Gateway | localhost:8080 | ECS Fargate |
| Order Service | localhost:8081 | ECS Fargate |
| Catalog Service | localhost:8082 | ECS Fargate |
| PostgreSQL | Docker :5433 | RDS PostgreSQL |
| Redis | Docker :6379 | ElastiCache |
| Elasticsearch | Docker :9200 | OpenSearch |
| Lambda | LocalStack :4566 | AWS Lambda |

### Vista de Flujos

Crear diagramas de secuencia para flujos principales:

#### Flujo: Crear Orden

```
Usuario -> Frontend: Click "Crear Orden"
Frontend -> API Gateway: POST /api/orders
API Gateway -> Order Service: POST /orders
Order Service -> PostgreSQL: INSERT order
Order Service -> SQS: Publish ORDER_CREATED
Order Service -> API Gateway: 200 OK (order)
API Gateway -> Frontend: 200 OK (order)
Frontend -> Usuario: Muestra confirmacion

-- Async --
SQS -> Lambda: Trigger
Lambda -> Order Service: PATCH /orders/{id}/status
Lambda: Log "Notificacion enviada"
```

#### Flujo: Buscar Productos

```
Usuario -> Frontend: Buscar "laptop"
Frontend -> API Gateway: GET /api/catalog/search?q=laptop
API Gateway -> Catalog Service: GET /catalog/search?q=laptop
Catalog Service -> Elasticsearch: Search query
Elasticsearch -> Catalog Service: Results
Catalog Service -> API Gateway: 200 OK (products)
API Gateway -> Frontend: 200 OK (products)
Frontend -> Usuario: Muestra resultados
```

## Checklist de Elementos C4

### Nivel 1 - Contexto
- [ ] Usuario (Person)
- [ ] Administrador (Person)
- [ ] Sistema E-Commerce (System)
- [ ] AWS Services (External System)
- [ ] Relaciones con etiquetas

### Nivel 2 - Contenedores
- [ ] Frontend (React)
- [ ] API Gateway (Spring Cloud Gateway)
- [ ] Order Service (Spring Boot)
- [ ] Catalog Service (Spring Boot)
- [ ] Notification Lambda (Python)
- [ ] PostgreSQL (Database)
- [ ] Redis (Cache)
- [ ] Elasticsearch (Search Engine)
- [ ] SQS Queue (Message Queue)
- [ ] Relaciones con protocolos

### Nivel 3 - Componentes
- [ ] Order Service components
- [ ] Catalog Service components
- [ ] Gateway components
- [ ] Relaciones internas

### Adicionales
- [ ] Vista de Deployment
- [ ] Flujo de Crear Orden
- [ ] Flujo de Buscar Productos
- [ ] Metadata (tecnologias, puertos, descripciones)

## Exportar desde Icepanel

1. Click en "Export" en el menu superior
2. Seleccionar formato:
   - PNG/SVG para imagenes
   - JSON para backup
   - Markdown para documentacion
3. Descargar y agregar a `docs/diagrams/`

## Tips para Icepanel

1. **Usar colores consistentes**: 
   - Azul para servicios internos
   - Gris para externos
   - Verde para bases de datos
   
2. **Agregar iconos de tecnologia**: Icepanel tiene iconos para React, Spring, PostgreSQL, AWS, etc.

3. **Usar tags**: Etiquetar elementos por dominio (orders, catalog, infra)

4. **Vincular a codigo**: Conectar componentes con repositorio Git

5. **Crear multiples vistas**: Una por nivel C4 + vistas de flujo

## Referencias

- [Modelo C4 - Simon Brown](https://c4model.com/)
- [Icepanel Documentation](https://docs.icepanel.io/)
- [C4 Notation](https://c4model.com/notation/)
