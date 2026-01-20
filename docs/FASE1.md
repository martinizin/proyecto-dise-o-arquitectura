# Fase 1: Conexion del Frontend con las APIs Reales

## Resumen

En esta fase se reemplazo el uso de datos mock (estaticos) en el frontend por llamadas reales a los microservicios a traves del API Gateway.

## Objetivos Completados

- Agregar funciones helper `apiPut` y `apiPatch` al modulo de API
- Conectar la pagina de Pedidos (`orders.jsx`) con el Order Service
- Conectar la pagina de Catalogo (`catalog.jsx`) con el Catalog Service
- Implementar estados de carga y manejo de errores

---

## Archivos Modificados

### 1. `frontend/src/api.js`

**Cambios:** Se agregaron las funciones `apiPut` y `apiPatch` para soportar operaciones de actualizacion.

```javascript
export async function apiPut(path, body, { signal } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPatch(path, body, { signal } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json();
}
```

---

### 2. `frontend/src/pages/orders.jsx`

**Cambios:** 
- Se reemplazo el array `mockOrders` por llamadas reales a `/api/orders`
- Se implemento `useEffect` y `useCallback` para fetch inicial
- Se agrego funcionalidad de creacion de pedidos via `apiPost`
- Se agregaron estados de carga (`loading`) y error (`error`)
- Se agrego campo de "Total" al formulario de creacion

**Endpoints utilizados:**
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/orders` | Obtener lista de pedidos |
| POST | `/api/orders` | Crear un nuevo pedido |

**Flujo de datos:**
```
Frontend (orders.jsx)
    |
    | GET /api/orders
    v
API Gateway (:8080)
    |
    | /api/orders/** -> StripPrefix -> /orders/**
    v
Order Service (:8081)
    |
    v
PostgreSQL (tabla: orders)
```

---

### 3. `frontend/src/pages/catalog.jsx`

**Cambios:**
- Se reemplazo el array `mockProducts` por llamadas reales a `/api/catalog/products`
- Se implemento funcionalidad de edicion de stock inline
- Se agrego filtrado local por nombre de producto
- Se agregaron estados de carga y manejo de errores
- Se agrego columna de "Precio" a la tabla

**Endpoints utilizados:**
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/catalog/products` | Obtener lista de productos |
| PUT | `/api/catalog/products/{id}/stock` | Actualizar stock de un producto |

**Flujo de datos:**
```
Frontend (catalog.jsx)
    |
    | GET /api/catalog/products
    v
API Gateway (:8080)
    |
    | /api/catalog/** -> StripPrefix -> /catalog/**
    v
Catalog Service (:8082)
    |
    v
PostgreSQL (tabla: products)
```

---

## Configuracion Requerida

### Variables de Entorno

Asegurate de tener el archivo `frontend/.env` con:

```env
VITE_API_URL=http://localhost:8080
```

### Servicios que deben estar corriendo

1. **Docker Compose** (infraestructura):
   ```bash
   docker compose --env-file .env -f infra/docker-compose.yml up -d
   ```

2. **API Gateway** (puerto 8080):
   ```bash
   cd gateway
   mvn spring-boot:run
   ```

3. **Order Service** (puerto 8081):
   ```bash
   cd services/order-service
   mvn spring-boot:run
   ```

4. **Catalog Service** (puerto 8082):
   ```bash
   cd services/catalog-service
   mvn spring-boot:run
   ```

5. **Frontend** (puerto 5173):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## Verificacion

### Prueba de Pedidos

1. Abrir http://localhost:5173
2. Navegar a "Pedidos"
3. Ingresar nombre de cliente y total
4. Click en "Crear pedido"
5. Verificar que el pedido aparece en la tabla con estado "CREATED"

### Prueba de Catalogo

1. Navegar a "Catalogo"
2. Verificar que se cargan los productos desde la base de datos
3. Click en "Editar Stock" en cualquier producto
4. Cambiar el valor y guardar
5. Verificar que el stock se actualizo

---

## Diagrama de Arquitectura (Fase 1)

```
+------------------+
|    Frontend      |
|  React + Vite    |
|     :5173        |
+--------+---------+
         |
         | HTTP (VITE_API_URL)
         v
+------------------+
|   API Gateway    |
| Spring Cloud GW  |
|     :8080        |
+--------+---------+
         |
    +----+----+
    |         |
    v         v
+-------+  +--------+
| Order |  |Catalog |
|Service|  |Service |
| :8081 |  | :8082  |
+---+---+  +---+----+
    |          |
    +----+-----+
         |
         v
+------------------+
|   PostgreSQL     |
|     :5432        |
+------------------+
```

---

## Estado del Sprint

| Componente | Estado |
|------------|--------|
| Frontend conectado a APIs | Completado |
| Order Service | Funcional (CRUD basico) |
| Catalog Service | Funcional (CRUD basico) |
| API Gateway | Funcional (routing + CORS) |

---

## Proximos Pasos (Fase 2)

- Configurar cola SQS en LocalStack
- Publicar evento `OrderCreated` desde Order Service
- Crear Lambda Java para consumir SQS
- Actualizar estado de orden a `NOTIFIED`
