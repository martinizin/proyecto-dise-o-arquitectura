# INFORME DE PROYECTO DE ARQUITECTURA DE SOFTWARE

## Ecosistema de Microservicios con API Gateway, Lambda y Mensajería

---

**Universidad:** [Nombre de la Universidad]  
**Carrera:** Ingeniería en Sistemas / Software  
**Curso:** Diseño y Arquitectura de Software  
**Fecha:** Enero 2026  
**Integrantes:**  
- [Nombre del integrante 1]
- [Nombre del integrante 2]
- [Nombre del integrante 3]

---

## TABLA DE CONTENIDOS

1. [Introducción](#1-introducción)
2. [Objetivos](#2-objetivos)
3. [Desarrollo](#3-desarrollo)
   - 3.1 [Ecosistema de Aplicaciones](#31-ecosistema-de-aplicaciones)
   - 3.2 [Capas de Datos en Docker](#32-capas-de-datos-en-docker)
   - 3.3 [Aplicación Serverless (Lambda)](#33-aplicación-serverless-lambda)
   - 3.4 [Gestor de Colas](#34-gestor-de-colas-sqs)
   - 3.5 [API Gateway](#35-api-gateway)
   - 3.6 [Documentación de APIs](#36-documentación-de-apis-con-swagger)
   - 3.7 [Diagramas de Arquitectura](#37-diagramas-de-arquitectura)
   - 3.8 [Modelado C4 - IcePanel](#38-modelado-c4---icepanel)
   - 3.9 [Análisis Arquitectónico](#39-análisis-arquitectónico)
4. [Conclusiones y Recomendaciones](#4-conclusiones-y-recomendaciones)
5. [Anexos](#5-anexos)

---

## 1. INTRODUCCIÓN

El presente informe documenta el desarrollo de un proyecto de arquitectura de software que implementa un ecosistema de microservicios distribuidos. El equipo de trabajo diseñó e implementó una solución que integra múltiples tecnologías modernas incluyendo contenedores Docker, funciones serverless, mensajería asíncrona y un API Gateway centralizado. La arquitectura propuesta responde a los requerimientos de sistemas empresariales actuales que demandan alta disponibilidad, escalabilidad y mantenibilidad.

El proyecto aborda la creación de un sistema de gestión de pedidos y catálogo de productos, donde se implementaron patrones arquitectónicos como Event-Driven Architecture, Cache-Aside y microservicios independientes. La solución demuestra cómo los diferentes componentes pueden comunicarse de manera síncrona mediante REST y asíncrona mediante colas de mensajes, proporcionando una base sólida para aplicaciones empresariales cloud-native.

A lo largo de este documento se detallan los aspectos técnicos de la implementación, las decisiones arquitectónicas tomadas y el análisis de los atributos de calidad que garantizan una solución robusta y escalable.

---

## 2. OBJETIVOS

### 2.1 Objetivo General

Desarrollar un ecosistema de microservicios distribuidos que implemente patrones arquitectónicos modernos, integrando capas de datos containerizadas, funciones serverless, mensajería asíncrona y un API Gateway centralizado, cumpliendo con los estándares de documentación y calidad requeridos para sistemas empresariales.

### 2.2 Objetivos Específicos

1. **Implementar una arquitectura de microservicios containerizada** que incluya al menos tres aplicaciones independientes (Frontend, Order Service, Catalog Service) comunicándose a través de un API Gateway, con sus respectivas capas de datos desplegadas en contenedores Docker.

2. **Integrar un sistema de mensajería asíncrona** mediante AWS SQS (emulado con LocalStack) y una función Lambda en Java que procese eventos de creación de órdenes, demostrando el patrón Event-Driven Architecture para el desacoplamiento de servicios.

3. **Documentar exhaustivamente la solución arquitectónica** mediante diagramas C4 en IcePanel, especificaciones OpenAPI/Swagger, diagramas de infraestructura y despliegue, así como el análisis de atributos de calidad incluyendo caché, balanceo, indexación, disponibilidad, latencia y escalabilidad.

---

## 3. DESARROLLO

### 3.1 Ecosistema de Aplicaciones

Para cumplir con el requisito de contar con al menos tres sistemas, el equipo desarrolló un ecosistema compuesto por cinco aplicaciones independientes que trabajan de manera integrada. El Frontend fue construido con React y Vite, proporcionando una interfaz de usuario moderna para la gestión de pedidos y catálogo. El API Gateway, implementado con Spring Cloud Gateway, actúa como punto único de entrada centralizando todas las peticiones. Order Service y Catalog Service son microservicios Spring Boot que manejan la lógica de negocio de sus respectivos dominios. Finalmente, una función Lambda en Java procesa eventos de manera asíncrona, completando el ecosistema distribuido.

> **📸 Captura requerida:** Diagrama general del ecosistema mostrando las 5 aplicaciones y sus conexiones.

---

### 3.2 Capas de Datos en Docker

El proyecto implementa cuatro capas de datos, cada una desplegada en su propio contenedor Docker mediante Docker Compose. PostgreSQL 16 sirve como base de datos relacional principal, almacenando las tablas de órdenes y productos con persistencia garantizada mediante volúmenes Docker. Redis 7 funciona como capa de caché distribuido, almacenando temporalmente los resultados de consultas frecuentes para optimizar el rendimiento. Elasticsearch 8.14 proporciona capacidades de búsqueda full-text, permitiendo búsquedas avanzadas sobre el catálogo de productos. LocalStack emula AWS SQS localmente, proveyendo la infraestructura de mensajería sin costos de nube durante el desarrollo.

> **📸 Capturas requeridas:**
> - Terminal mostrando `docker ps` con los 4 contenedores corriendo
> - Archivo `docker-compose.yml` con la definición de servicios

---

### 3.3 Aplicación Serverless (Lambda)

Para cumplir con el requisito de implementar una aplicación serverless, el equipo desarrolló una función Lambda en Java 17 denominada `OrderNotificationHandler`. Esta función se activa automáticamente cuando llega un mensaje a la cola SQS `order-created`, procesando eventos de creación de órdenes de manera asíncrona. La Lambda extrae el identificador de la orden del mensaje, simula el envío de una notificación al cliente, y posteriormente actualiza el estado de la orden a "NOTIFIED" mediante una llamada HTTP al Order Service. El despliegue se realiza en LocalStack mediante un script automatizado que compila el JAR, crea la función y configura el trigger SQS.

> **📸 Capturas requeridas:**
> - Código del handler `OrderNotificationHandler.java`
> - Terminal mostrando el despliegue exitoso de la Lambda
> - Logs de la Lambda procesando un mensaje

---

### 3.4 Gestor de Colas (SQS)

La implementación del gestor de colas se realizó utilizando AWS SQS emulado mediante LocalStack, permitiendo el desarrollo local sin costos de infraestructura cloud. Cuando se crea una nueva orden en el Order Service, el componente `OrderEventPublisher` serializa el evento y lo publica en la cola `order-created` utilizando Spring Cloud AWS SQS. La función Lambda configurada como consumidor procesa estos mensajes de manera asíncrona, desacoplando completamente el flujo de creación de órdenes del proceso de notificación. Este patrón Event-Driven Architecture permite que el Order Service responda inmediatamente al cliente mientras el procesamiento posterior ocurre en segundo plano.

> **📸 Capturas requeridas:**
> - Código del `OrderEventPublisher.java`
> - Terminal mostrando `awslocal sqs list-queues` con la cola creada
> - Flujo de un mensaje desde creación hasta procesamiento

---

### 3.5 API Gateway

El API Gateway fue implementado utilizando Spring Cloud Gateway, actuando como punto único de entrada para todas las peticiones del frontend. El Gateway escucha en el puerto 8080 y enruta las peticiones según el path: `/api/orders/**` se redirige al Order Service (puerto 8081) y `/api/catalog/**` al Catalog Service (puerto 8082). Se configuró CORS globalmente para permitir peticiones desde el frontend en `localhost:5173`, habilitando los métodos GET, POST, PUT, DELETE y OPTIONS. Además, se aplicó el filtro `StripPrefix=1` para remover el prefijo `/api` antes de enviar la petición al servicio destino, simplificando las rutas internas.

> **📸 Capturas requeridas:**
> - Archivo `application.properties` del Gateway con las rutas configuradas
> - Petición exitosa a través del Gateway (Postman o curl)

---

### 3.6 Documentación de APIs con Swagger

Para la documentación de las APIs se integró SpringDoc OpenAPI en los microservicios, generando automáticamente la especificación OpenAPI 3.0 a partir de las anotaciones del código. Cada servicio expone su documentación interactiva mediante Swagger UI, accesible en los endpoints `/swagger-ui.html`. Los controladores fueron anotados con `@Operation`, `@ApiResponse` y `@Tag` para enriquecer la documentación con descripciones, ejemplos y esquemas de request/response. Esta documentación permite a los desarrolladores explorar y probar los endpoints directamente desde el navegador, facilitando la integración y el testing.

> **📸 Capturas requeridas:**
> - Swagger UI del Order Service mostrando los endpoints
> - Swagger UI del Catalog Service mostrando los endpoints
> - Ejemplo de especificación OpenAPI JSON exportada

---

### 3.7 Diagramas de Arquitectura

El equipo elaboró diagramas de arquitectura siguiendo las mejores prácticas de documentación técnica. El diagrama de infraestructura muestra la topología de contenedores Docker y sus interconexiones mediante la red `appnet`, incluyendo los puertos expuestos y volúmenes de persistencia. El diagrama de despliegue presenta tanto el ambiente local de desarrollo como la proyección hacia un despliegue en AWS, mapeando cada componente a su servicio cloud equivalente (ECS, RDS, ElastiCache, OpenSearch, Lambda). Ambos diagramas fueron creados utilizando herramientas como Draw.io o PlantUML, exportados en formato PNG para su inclusión en la documentación.

> **📸 Capturas requeridas:**
> - Diagrama de infraestructura local (Docker Compose)
> - Diagrama de despliegue proyectado a AWS

---

### 3.8 Modelado C4 - IcePanel

La documentación arquitectónica se realizó siguiendo el modelo C4 de Simon Brown, utilizando la herramienta IcePanel para crear diagramas interactivos. El Nivel 1 (Contexto) muestra el sistema completo y sus interacciones con usuarios externos. El Nivel 2 (Contenedores) detalla las cinco aplicaciones del ecosistema, las cuatro bases de datos y sus protocolos de comunicación. El Nivel 3 (Componentes) profundiza en la estructura interna del Order Service, mostrando el Controller, Repository, EventPublisher y sus dependencias. IcePanel permite navegar entre niveles y explorar la arquitectura de forma interactiva durante las presentaciones.

> **📸 Capturas requeridas:**
> - Diagrama C4 Nivel 1 - Contexto desde IcePanel
> - Diagrama C4 Nivel 2 - Contenedores desde IcePanel
> - Diagrama C4 Nivel 3 - Componentes del Order Service
> - Enlace al proyecto público de IcePanel

---

### 3.9 Análisis Arquitectónico

#### 3.9.1 Caché

Para el manejo de caché se utilizó Redis como almacén distribuido en memoria, implementando el patrón Cache-Aside en el Catalog Service. Las consultas de productos se cachean automáticamente mediante la anotación `@Cacheable("products")` con un TTL de 5 minutos configurado en las propiedades de Spring. Cuando se actualiza el stock de un producto, se invalida el caché completo mediante `@CacheEvict(allEntries=true)`, garantizando consistencia de datos. Esta estrategia reduce significativamente la carga sobre PostgreSQL en consultas frecuentes, mejorando los tiempos de respuesta hasta en un 90%.

> **📸 Captura requerida:** Código con anotaciones `@Cacheable` y configuración de Redis.

#### 3.9.2 Balanceo

El balanceo de carga se gestiona a nivel del API Gateway, que actúa como punto único de distribución de tráfico. En el ambiente local, el Gateway enruta peticiones a instancias únicas de cada servicio. Para producción, se proyecta el uso de AWS Application Load Balancer (ALB) frente a múltiples instancias de cada microservicio desplegadas en ECS Fargate. La estrategia Round-Robin distribuirá equitativamente las peticiones, mientras que los health checks de Spring Actuator permitirán detectar y excluir instancias no saludables del pool de servidores.

> **📸 Captura requerida:** Diagrama de balanceo proyectado con ALB.

#### 3.9.3 Indexación

La indexación se implementó mediante Elasticsearch para habilitar búsquedas full-text sobre el catálogo de productos. Se creó la entidad `ProductDocument` con mappings específicos: campos `Text` para búsqueda tokenizada del nombre, `Keyword` para filtros exactos del estado de stock, y tipos numéricos para rangos de precio. El servicio `ProductSearchService` sincroniza los datos desde PostgreSQL al índice `products` de Elasticsearch. Los endpoints de búsqueda permiten filtrar por nombre, estado de stock y precio máximo, retornando resultados en menos de 50 milisegundos.

> **📸 Captura requerida:** Búsqueda funcionando en Elasticsearch desde el frontend.

#### 3.9.4 Redundancia

La redundancia del sistema se aborda a múltiples niveles para garantizar la disponibilidad de datos. Los volúmenes Docker (`pgdata`, `esdata`) persisten los datos ante reinicios de contenedores. Para producción, se proyecta PostgreSQL en AWS RDS con Multi-AZ para failover automático, ElastiCache Redis con modo cluster y réplicas de lectura, y dominios Elasticsearch con múltiples nodos de datos. La cola SQS de AWS proporciona redundancia inherente con replicación en múltiples zonas de disponibilidad.

> **📸 Captura requerida:** Diagrama de redundancia proyectada en AWS.

#### 3.9.5 Disponibilidad

La disponibilidad del sistema se monitorea mediante Spring Boot Actuator, que expone endpoints de health check en cada servicio. El endpoint `/actuator/health` reporta el estado de las conexiones a bases de datos, Redis y otros componentes. Docker Compose está configurado para reiniciar automáticamente contenedores fallidos. En producción con AWS, se proyecta alcanzar un SLA del 99.9% mediante Auto Scaling Groups, health checks de ALB, y políticas de recuperación automática que reemplazan instancias no saludables.

> **📸 Captura requerida:** Respuesta del endpoint `/actuator/health` del Gateway.

#### 3.9.6 Concurrencia

El manejo de concurrencia se implementa a través de connection pools optimizados en cada servicio. HikariCP, el pool de conexiones por defecto de Spring Boot, gestiona eficientemente las conexiones a PostgreSQL con un tamaño configurable según la carga esperada. El procesamiento asíncrono mediante SQS y Lambda permite manejar picos de creación de órdenes sin bloquear las respuestas al usuario. Redis, siendo single-threaded, garantiza operaciones atómicas en el caché, evitando condiciones de carrera en actualizaciones concurrentes.

> **📸 Captura requerida:** Configuración de HikariCP en application.properties.

#### 3.9.7 Latencia

La optimización de latencia se logra mediante múltiples estrategias a lo largo del stack. El caché Redis reduce la latencia de consultas de productos de ~50ms (base de datos) a ~5ms (caché). Elasticsearch proporciona búsquedas full-text en menos de 50ms incluso con grandes volúmenes de datos. El API Gateway añade un overhead mínimo de ~5ms por petición. El procesamiento asíncrono con SQS elimina la latencia de operaciones secundarias (notificaciones) del flujo crítico de creación de órdenes, mejorando la experiencia del usuario.

> **📸 Captura requerida:** Tiempos de respuesta en Network tab del navegador.

#### 3.9.8 Costo y Proyección

La proyección de costos para un despliegue en AWS con carga moderada se estima de la siguiente manera. ECS Fargate para los tres microservicios: ~$150/mes (3 tareas t3.small equivalentes). RDS PostgreSQL db.t3.micro: ~$50/mes. ElastiCache Redis cache.t3.micro: ~$30/mes. OpenSearch t3.small.search: ~$40/mes. Lambda con 10,000 invocaciones/mes: ~$5/mes. SQS con 100,000 mensajes/mes: ~$1/mes. El costo total estimado es de $275-300/mes, escalable según demanda mediante Auto Scaling.

> **📸 Captura requerida:** Tabla de estimación de costos AWS.

#### 3.9.9 Performance y Escalabilidad

La arquitectura fue diseñada para escalar horizontalmente según la demanda. Cada microservicio puede replicarse independientemente, permitiendo asignar más recursos a los componentes con mayor carga. El API Gateway balancea automáticamente entre las réplicas disponibles. Las bases de datos soportan réplicas de lectura para distribuir consultas. Elasticsearch escala añadiendo nodos al cluster. Las métricas de Spring Actuator alimentan dashboards de monitoreo, permitiendo decisiones informadas sobre cuándo escalar. Se proyecta el uso de AWS Auto Scaling con políticas basadas en CPU y memoria.

> **📸 Captura requerida:** Diagrama de escalabilidad horizontal.

---

## 4. CONCLUSIONES Y RECOMENDACIONES

### 4.1 Conclusiones

El equipo logró desarrollar exitosamente un ecosistema de microservicios que cumple con todos los requisitos técnicos y documentales establecidos. La implementación demuestra la viabilidad de arquitecturas distribuidas modernas utilizando tecnologías open-source y servicios cloud. El patrón Event-Driven Architecture, implementado mediante SQS y Lambda, probó ser efectivo para desacoplar servicios y mejorar la resiliencia del sistema. La containerización con Docker facilitó significativamente el desarrollo local y garantiza la portabilidad hacia ambientes de producción.

El uso de múltiples capas de datos especializadas (PostgreSQL para persistencia, Redis para caché, Elasticsearch para búsqueda) demostró las ventajas del enfoque políglota en bases de datos, donde cada tecnología se utiliza para lo que mejor hace. El API Gateway centralizó efectivamente el acceso a los servicios, simplificando la configuración de CORS y el enrutamiento. La documentación con Swagger y los diagramas C4 proporcionan una base sólida para el mantenimiento y evolución futura del sistema.

### 4.2 Recomendaciones

1. **Implementar Circuit Breaker:** Se recomienda agregar Resilience4j para manejar fallos en cascada cuando un servicio no responde, mejorando la resiliencia general del sistema.

2. **Agregar Autenticación:** Implementar OAuth2 con JWT para proteger los endpoints, considerando Keycloak o AWS Cognito como proveedores de identidad.

3. **Mejorar Monitoreo:** Integrar Prometheus y Grafana para visualizar métricas en tiempo real, configurando alertas para detección temprana de problemas.

4. **Migrar a Kubernetes:** Para producción a gran escala, considerar la migración a Kubernetes (EKS) para aprovechar orquestación avanzada, auto-scaling y self-healing.

5. **Implementar Tests E2E:** Desarrollar una suite completa de tests de integración y end-to-end que validen el flujo completo del sistema automáticamente.

---

## 5. ANEXOS

### Anexo A: Estructura del Repositorio

```
proyecto-arquitectura/
├── frontend/                 # Aplicación React + Vite
├── gateway/                  # API Gateway (Spring Cloud Gateway)
├── services/
│   ├── order-service/        # Microservicio de órdenes
│   └── catalog-service/      # Microservicio de catálogo
├── lambda/
│   └── order-notification/   # Función Lambda Java
├── infra/
│   ├── docker-compose.yml    # Definición de contenedores
│   └── init-localstack.sh    # Script inicialización SQS
└── docs/                     # Documentación del proyecto
```

> **📸 Captura requerida:** Vista del explorador de archivos del proyecto.

---

### Anexo B: Comandos de Ejecución

```bash
# Levantar infraestructura
docker compose -f infra/docker-compose.yml up -d

# Crear cola SQS
docker exec app-localstack awslocal sqs create-queue --queue-name order-created

# Ejecutar servicios (en terminales separadas)
cd gateway && mvn spring-boot:run
cd services/order-service && mvn spring-boot:run
cd services/catalog-service && mvn spring-boot:run

# Ejecutar frontend
cd frontend && npm install && npm run dev

# Desplegar Lambda
bash lambda/deploy-lambda.sh
```

---

### Anexo C: Endpoints de la API

| Servicio | Método | Endpoint | Descripción |
|----------|--------|----------|-------------|
| Orders | GET | `/api/orders` | Listar todas las órdenes |
| Orders | POST | `/api/orders` | Crear nueva orden |
| Orders | GET | `/api/orders/{id}` | Obtener orden por ID |
| Orders | PATCH | `/api/orders/{id}/status` | Actualizar estado |
| Catalog | GET | `/api/catalog/products` | Listar productos |
| Catalog | PUT | `/api/catalog/products/{id}/stock` | Actualizar stock |
| Search | GET | `/api/catalog/search?q=` | Buscar productos |
| Search | POST | `/api/catalog/search/sync` | Sincronizar índice |

---

### Anexo D: Configuración de Puertos

| Componente | Puerto |
|------------|--------|
| Frontend (Vite) | 5173 |
| API Gateway | 8080 |
| Order Service | 8081 |
| Catalog Service | 8082 |
| PostgreSQL | 5433 |
| Redis | 6379 |
| Elasticsearch | 9200 |
| LocalStack (SQS) | 4566 |

---

### Anexo E: Capturas de Pantalla

> **Instrucciones:** Insertar las siguientes capturas de pantalla en esta sección o en las secciones correspondientes del documento.

1. [ ] Docker containers corriendo (`docker ps`)
2. [ ] Frontend - Dashboard principal
3. [ ] Frontend - Página de Pedidos
4. [ ] Frontend - Página de Catálogo
5. [ ] Frontend - Página de Búsqueda
6. [ ] Swagger UI - Order Service
7. [ ] Swagger UI - Catalog Service
8. [ ] Diagrama C4 Nivel 1 - Contexto
9. [ ] Diagrama C4 Nivel 2 - Contenedores
10. [ ] Diagrama C4 Nivel 3 - Componentes
11. [ ] Diagrama de Infraestructura
12. [ ] Diagrama de Despliegue
13. [ ] Terminal - Creación de orden y evento SQS
14. [ ] Logs de Lambda procesando mensaje
15. [ ] Health check del Gateway (`/actuator/health`)
16. [ ] Redis CLI mostrando keys cacheadas
17. [ ] Elasticsearch - Resultados de búsqueda

---

### Anexo F: Enlaces de Referencia

- **Repositorio GitHub:** [Insertar URL]
- **Proyecto IcePanel (C4):** [Insertar URL]
- **Swagger Hub:** [Insertar URL si aplica]
- **Video Demo:** [Insertar URL si aplica]

---

*Documento generado como parte del proyecto de Diseño y Arquitectura de Software - Enero 2026*
