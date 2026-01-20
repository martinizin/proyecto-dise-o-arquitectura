# CI/CD Pipeline

Este documento describe la configuracion de Integracion Continua (CI) y Despliegue Continuo (CD) del proyecto.

## Tabla de Contenidos

1. [Pipelines](#pipelines)
2. [Workflow de CI](#workflow-de-ci)
3. [Workflow de Docker Build](#workflow-de-docker-build)
4. [Dockerfiles](#dockerfiles)
5. [Ejecucion Local](#ejecucion-local)
6. [Variables y Secretos](#variables-y-secretos)

---

## Pipelines

El proyecto cuenta con dos pipelines principales de GitHub Actions:

| Pipeline | Archivo | Trigger | Proposito |
|----------|---------|---------|-----------|
| **CI Pipeline** | `.github/workflows/ci.yml` | Push/PR a main, develop | Build, test, validacion |
| **Docker Build** | `.github/workflows/docker-build.yml` | Push a main, tags | Build y push de imagenes |

---

## Workflow de CI

### Diagrama de Jobs

```
┌─────────────────────────────────────────────────────────────────┐
│                        CI Pipeline                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ build-backend│  │build-frontend│  │ build-lambda │           │
│  │  (matrix)    │  │              │  │              │           │
│  │  - gateway   │  │  - npm ci    │  │  - mvn pkg   │           │
│  │  - order-svc │  │  - npm build │  │              │           │
│  │  - catalog   │  │              │  │              │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                    │
│         └────────────────┬┴─────────────────┘                    │
│                          │                                       │
│                          ▼                                       │
│                 ┌────────────────┐                               │
│                 │ validate-docker│                               │
│                 │ docker compose │                               │
│                 │    config      │                               │
│                 └────────┬───────┘                               │
│                          │                                       │
│                          ▼                                       │
│                 ┌────────────────┐                               │
│                 │ security-scan  │                               │
│                 │    (Trivy)     │                               │
│                 └────────┬───────┘                               │
│                          │                                       │
│                          ▼                                       │
│                 ┌────────────────┐                               │
│                 │  ci-summary    │                               │
│                 └────────────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Jobs Detallados

#### build-backend (Matrix Strategy)

Ejecuta en paralelo para cada servicio Java:

| Servicio | Path | Puerto |
|----------|------|--------|
| gateway | `gateway/` | 8080 |
| order-service | `services/order-service/` | 8081 |
| catalog-service | `services/catalog-service/` | 8082 |

**Pasos:**
1. Checkout del codigo
2. Setup JDK 17 (Temurin)
3. `mvn clean compile`
4. `mvn test`
5. `mvn package`
6. Upload artifact (JAR)

#### build-frontend

**Pasos:**
1. Checkout del codigo
2. Setup Node.js 20
3. `npm ci`
4. `npm run lint`
5. `npm run build`
6. Upload artifact (dist/)

#### build-lambda

**Pasos:**
1. Setup JDK 17
2. `mvn package` en `lambda/order-notification/`
3. Upload artifact (JAR)

#### validate-docker

Valida la sintaxis del docker-compose:
```bash
docker compose config --quiet
```

#### security-scan

Escaneo de vulnerabilidades con Trivy:
- Severidad: CRITICAL, HIGH
- Ignora vulnerabilidades sin fix

---

## Workflow de Docker Build

### Diagrama de Jobs

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Build Pipeline                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              build-and-push (matrix)                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │   │
│  │  │ gateway  │ │  order   │ │ catalog  │ │ frontend │     │   │
│  │  │          │ │ service  │ │ service  │ │          │     │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘     │   │
│  │       │            │            │            │            │   │
│  │       └────────────┴─────┬──────┴────────────┘            │   │
│  │                          │                                │   │
│  │                    Push to GHCR                           │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                    │
│                             ▼                                    │
│                 ┌─────────────────────┐                         │
│                 │create-release-compose│ (solo en tags)         │
│                 │ docker-compose.prod  │                         │
│                 └──────────┬──────────┘                         │
│                            │                                     │
│                            ▼                                     │
│                    ┌────────────┐                                │
│                    │   notify   │                                │
│                    └────────────┘                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Imagenes Generadas

| Imagen | Registry |
|--------|----------|
| `ghcr.io/{owner}/proyecto-arquitectura-gateway` | GitHub Container Registry |
| `ghcr.io/{owner}/proyecto-arquitectura-order-service` | GitHub Container Registry |
| `ghcr.io/{owner}/proyecto-arquitectura-catalog-service` | GitHub Container Registry |
| `ghcr.io/{owner}/proyecto-arquitectura-frontend` | GitHub Container Registry |

### Tags Generados

| Evento | Tags |
|--------|------|
| Push a main | `latest`, `main`, `{sha}` |
| Push tag v1.2.3 | `v1.2.3`, `1.2`, `1`, `latest` |
| Pull Request | `pr-{number}` |

---

## Dockerfiles

### Estructura Multi-Stage

Todos los Dockerfiles usan multi-stage build para optimizar el tamano:

```dockerfile
# Stage 1: Build
FROM eclipse-temurin:17-jdk-alpine AS builder
# Compilar aplicacion

# Stage 2: Runtime
FROM eclipse-temurin:17-jre-alpine
# Solo JRE, imagen mas pequena
```

### Caracteristicas de Seguridad

- **Usuario no-root**: Todos los contenedores corren como `appuser`
- **Health checks**: Verificacion de salud integrada
- **JVM optimizations**: Configuracion para contenedores

### Tamanos Estimados

| Imagen | Tamano Estimado |
|--------|-----------------|
| gateway | ~200 MB |
| order-service | ~220 MB |
| catalog-service | ~230 MB |
| frontend | ~25 MB |

---

## Ejecucion Local

### Build Local de Imagenes

```bash
# Build individual
docker build -t order-service:local ./services/order-service

# Build todos los servicios
docker compose -f infra/docker-compose.yml build
```

### Ejecutar CI Localmente (con act)

```bash
# Instalar act (https://github.com/nektos/act)
brew install act  # macOS
choco install act-cli  # Windows

# Ejecutar workflow de CI
act push -W .github/workflows/ci.yml

# Ejecutar job especifico
act push -W .github/workflows/ci.yml -j build-backend
```

---

## Variables y Secretos

### Variables de Entorno (Automaticas)

| Variable | Descripcion |
|----------|-------------|
| `GITHUB_TOKEN` | Token automatico para GHCR |
| `GITHUB_REPOSITORY` | Nombre del repositorio |
| `GITHUB_SHA` | SHA del commit |
| `GITHUB_REF` | Referencia (branch/tag) |

### Secretos Requeridos

Para produccion, configurar en Settings > Secrets:

| Secreto | Uso | Requerido |
|---------|-----|-----------|
| `GITHUB_TOKEN` | Push a GHCR | Automatico |
| `DOCKER_HUB_USERNAME` | Push a Docker Hub | Opcional |
| `DOCKER_HUB_TOKEN` | Push a Docker Hub | Opcional |
| `AWS_ACCESS_KEY_ID` | Deploy a AWS | Opcional |
| `AWS_SECRET_ACCESS_KEY` | Deploy a AWS | Opcional |

---

## Uso del Pipeline

### Para Desarrolladores

1. **Crear branch** desde `develop`
2. **Push commits** - CI se ejecuta automaticamente
3. **Abrir PR** - CI valida cambios
4. **Merge a main** - Docker build se ejecuta

### Para Releases

1. **Crear tag** con version semantica:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. **Pipeline automatico**:
   - Build de imagenes
   - Push a registry
   - Generacion de docker-compose.prod.yml

### Verificar Estado

- Ver ejecuciones: `https://github.com/{owner}/{repo}/actions`
- Ver imagenes: `https://github.com/{owner}/{repo}/pkgs/container`

---

## Proximas Mejoras

- [ ] Agregar deploy automatico a AWS ECS/EKS
- [ ] Implementar semantic-release
- [ ] Agregar notificaciones a Slack/Teams
- [ ] Implementar rollback automatico
- [ ] Agregar tests de integracion en pipeline
