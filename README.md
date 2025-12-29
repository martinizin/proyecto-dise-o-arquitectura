# Proyecto Arquitectura (Monorepo) — Sprint 1 (Base técnica)

Este repositorio contiene la **base del ecosistema** para el proyecto de Arquitectura. En el **Sprint 1** se dejó lista la estructura del monorepo, la infraestructura base en Docker, el **API Gateway** funcionando (Spring Cloud Gateway) y el **Frontend** en React consumiendo únicamente el Gateway.

> **Estado actual:** el Gateway y el Front ya levantan.  
> Los servicios `Order` y `Catalog` (y la Lambda) se desarrollarán en los siguientes sprints.

---

## Stack y herramientas

### Backend (Gateway)
- **Java 17**
- **Spring Boot + Spring Cloud Gateway**
- **Maven**
- **IDE:** IntelliJ IDEA

### Frontend
- **React + Vite**
- **Node 18+ (recomendado 20)**
- **IDE:** VS Code (o IntelliJ IDEA si se prefiere)

### Infraestructura (local)
- **Docker + Docker Compose**
- Contenedores: **PostgreSQL**, **Redis**, **Elasticsearch**, **LocalStack (SQS)**

---

## Estructura del repositorio

```
/
├── frontend/        # React + Vite (UI)
├── gateway/         # Spring Cloud Gateway (API Gateway)
├── infra/           # docker-compose (Postgres, Redis, Elastic, LocalStack)
├── services/        # (placeholder) futuros microservicios Order/Catalog
├── lambda/          # (placeholder) futura AWS Lambda
├── docs/            # (placeholder) documentación y evidencias
├── .env.example
├── .gitignore
└── README.md
```

---

## Puertos utilizados (local)

| Componente | Puerto |
|----------|--------|
| Frontend (Vite) | `5173` |
| API Gateway | `8080` |
| Order Service (futuro) | `8081` |
| Catalog Service (futuro) | `8082` |
| PostgreSQL | `5432` |
| Redis | `6379` |
| Elasticsearch | `9200` |
| LocalStack (SQS) | `4566` |

---

## Variables de entorno

### 1) Archivo raíz: `.env.example`
En la raíz hay un archivo `.env.example` con la configuración de puertos y servicios.  
Copia y crea tu `.env` local (NO se sube al repo):

```bash
cp .env.example .env
```

### 2) Frontend: `frontend/.env`

Crea `frontend/.env` con:

```env
VITE_API_URL=http://localhost:8080
```

> El Front **debe consumir SIEMPRE** el Gateway, no los microservicios directamente.

---

## Levantar el proyecto (paso a paso)

### 1) Levantar infraestructura base (Docker)

Desde la raíz del repo:

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d
docker ps
```

Verificaciones rápidas:

* Elasticsearch: `http://localhost:9200`
* LocalStack: `http://localhost:4566`

---

### 2) Ejecutar el API Gateway (Spring Cloud Gateway)

#### Opción A: IntelliJ IDEA

1. Abrir la carpeta `gateway/` como proyecto Maven.
2. Ejecutar `GatewayApplication`.

#### Opción B: Terminal (desde `gateway/`)

```bash
mvn clean package
mvn spring-boot:run
```

Gateway quedará en:

* `http://localhost:8080`

---

### 3) Ejecutar el Frontend (React + Vite)

#### Opción A: VS Code (recomendado)

Desde `frontend/`:

```bash
npm install
npm run dev
```

Frontend quedará en:

* `http://localhost:5173`

> Asegúrate de tener `VITE_API_URL=http://localhost:8080` en `frontend/.env`.

---

## Rutas configuradas en el Gateway (Sprint 1)

En `gateway/src/main/resources/application.properties` se configuró:

* `/api/orders/**` → `http://localhost:8081` (Order Service, pendiente)
* `/api/catalog/**` → `http://localhost:8082` (Catalog Service, pendiente)

Además:

* **CORS habilitado** para `http://localhost:5173`.

> En Sprint 1 el Gateway enruta, pero los servicios aún no existen; por eso estas rutas responderán error hasta que Julián implemente los microservicios.

---

## Qué se logró en el Sprint 1

* Monorepo organizado y subido correctamente a GitHub.
* Infraestructura base lista y reproducible con Docker Compose.
* API Gateway funcionando con:
  * puerto `8080`
  * CORS para el frontend
  * rutas base hacia servicios futuros
* Frontend React + Vite funcionando y apuntando al Gateway.
* Carpetas placeholder agregadas (`docs/`, `services/`, `lambda/`) para el roadmap del proyecto.

---

## Próximos pasos (Sprint 2 y 3)

### Sprint 2

* Crear cola SQS en LocalStack.
* Publicar evento `OrderCreated` desde `Order Service`.
* AWS Lambda Java consumiendo SQS (LocalStack) y actualizando estado a `NOTIFIED`.
* Caché Redis en `Catalog Service`.
* Postman E2E + OpenAPI actualizado.

### Sprint 3

* Indexación/búsqueda con Elasticsearch.
* CI/CD (GitHub Actions) y monitoreo (Actuator + opcional Prom/Grafana).
* Documentación completa:
  * SwaggerHub (OpenAPI)
  * C4 (IcePanel)
  * Diagramas de Infraestructura/Despliegue
  * Análisis arquitectónico (caché, balanceo, indexación, redundancia, disponibilidad, concurrencia, latencia, costo, performance, escalabilidad)

---

## Notas importantes

* **No subir `.env`**: contiene configuración local y potencialmente datos sensibles.
* Git no versiona carpetas vacías: por eso existen `.gitkeep` en `docs/`, `lambda/`, `services/`.
