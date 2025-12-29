# Proyecto de Arquitectura de Software - E-commerce

Sistema de comercio electrónico basado en microservicios para gestión de catálogo de productos y órdenes de compra.

## 🏗️ Arquitectura - Sprint 1

Este proyecto implementa una arquitectura de microservicios con los siguientes componentes:

- **Frontend**: Aplicación React + Vite para la interfaz de usuario
- **API Gateway**: Spring Cloud Gateway para enrutamiento y punto de entrada único
- **Infraestructura**: PostgreSQL, Redis, Elasticsearch y LocalStack (AWS local)
- **Servicios** (en desarrollo): Catalog Service y Order Service
- **Serverless** (planificado): AWS Lambda para procesamiento asíncrono

### Estado Actual
En este Sprint 1 se ha completado:
- ✅ Estructura del monorepo
- ✅ Docker Compose con infraestructura base
- ✅ API Gateway funcional con enrutamiento
- ✅ Frontend funcional con integración al Gateway
- ⏳ Placeholders para servicios y funciones Lambda

## 📋 Requisitos

Antes de comenzar, asegúrate de tener instalado:

- **Java 17** o superior
- **Maven 3.8+**
- **Node.js 18+** y npm
- **Docker Desktop** (para la infraestructura)

## 🚀 Ejecución Local

### 1. Levantar la infraestructura

Primero, inicia los servicios de infraestructura con Docker Compose:

```bash
cd infra
docker compose up -d
```

Esto levantará:
- PostgreSQL (puerto 5432)
- Redis (puerto 6379)
- Elasticsearch (puerto 9200)
- LocalStack (puerto 4566)

### 2. Ejecutar el API Gateway

**Opción A - Usando Maven:**
```bash
cd gateway
mvn spring-boot:run
```

**Opción B - Usando IntelliJ IDEA:**
1. Abre el proyecto `gateway/` en IntelliJ
2. Ejecuta la clase `GatewayApplication.java`

El Gateway estará disponible en `http://localhost:8080`

### 3. Ejecutar el Frontend

```bash
cd frontend
npm ci
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## ⚙️ Variables de Entorno

### Frontend

Crea un archivo `.env` en la carpeta `frontend/` basado en `.env.example`:

```env
VITE_API_URL=http://localhost:8080
```

### Gateway

El archivo `gateway/src/main/resources/application.properties` ya contiene la configuración necesaria.

## 🔌 Puertos Utilizados

| Servicio         | Puerto | URL                        |
|------------------|--------|----------------------------|
| Frontend         | 5173   | http://localhost:5173      |
| API Gateway      | 8080   | http://localhost:8080      |
| Order Service    | 8081   | http://localhost:8081      |
| Catalog Service  | 8082   | http://localhost:8082      |
| PostgreSQL       | 5432   | localhost:5432             |
| Redis            | 6379   | localhost:6379             |
| Elasticsearch    | 9200   | http://localhost:9200      |
| LocalStack       | 4566   | http://localhost:4566      |

## 🧪 Pruebas Rápidas

### Verificar el Gateway

```bash
# Health check
curl http://localhost:8080/actuator/health
```

### Rutas configuradas (servicios aún no implementados)

- **Órdenes**: `http://localhost:8080/api/orders/**` → Order Service (8081)
- **Catálogo**: `http://localhost:8080/api/catalog/**` → Catalog Service (8082)

### Verificar el Frontend

Abre `http://localhost:5173` en tu navegador. Deberías ver la interfaz de la aplicación.

### Verificar infraestructura

```bash
# PostgreSQL
docker exec -it postgres-db psql -U postgres

# Redis
docker exec -it redis-cache redis-cli ping

# Elasticsearch
curl http://localhost:9200

# LocalStack
curl http://localhost:4566/_localstack/health
```

## 🛣️ Próximos Pasos - Sprint 2

- [ ] Implementar Order Service con PostgreSQL
- [ ] Implementar Catalog Service con PostgreSQL y cache Redis
- [ ] Configurar cola SQS en LocalStack para procesamiento asíncrono
- [ ] Implementar función Lambda para procesamiento de órdenes
- [ ] Integrar Elasticsearch para búsqueda de productos
- [ ] Agregar pruebas E2E

## 📁 Estructura del Proyecto

```
proyecto-arquitectura/
├── frontend/          # Aplicación React + Vite
├── gateway/           # Spring Cloud Gateway
├── infra/            # Docker Compose (PostgreSQL, Redis, etc.)
├── services/         # Microservicios (Order, Catalog)
├── lambda/           # Funciones AWS Lambda
└── docs/             # Documentación adicional
```

## 🤝 Contribuir

1. Crea una rama feature: `git checkout -b feature/nueva-funcionalidad`
2. Realiza tus cambios y commitea: `git commit -m 'Agrega nueva funcionalidad'`
3. Push a la rama: `git push origin feature/nueva-funcionalidad`
4. Abre un Pull Request

## 📄 Licencia

Este proyecto es para fines educativos.
