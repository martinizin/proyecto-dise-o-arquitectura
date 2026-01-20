# Fase 3: Cache Redis en Catalog Service

## Resumen

En esta fase se implemento un sistema de cache distribuido usando Redis para el Catalog Service. Esto reduce la carga en la base de datos y mejora los tiempos de respuesta para consultas frecuentes de productos.

## Objetivos Completados

- Agregar dependencias de Spring Data Redis y Spring Cache
- Configurar conexion a Redis
- Implementar configuracion personalizada de cache
- Crear capa de servicio con anotaciones de cache
- Actualizar controlador para usar el servicio

---

## Patron de Cache Implementado: Cache-Aside

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PATRON CACHE-ASIDE                               │
└─────────────────────────────────────────────────────────────────────────┘

                    LECTURA (Cache Hit)
                    ═══════════════════
  
  Cliente                  Cache (Redis)              Base de Datos
     │                          │                          │
     │  GET /products           │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │     Datos (cache hit)    │                          │
     │<─────────────────────────│                          │
     │                          │                          │


                    LECTURA (Cache Miss)
                    ════════════════════

  Cliente                  Cache (Redis)              Base de Datos
     │                          │                          │
     │  GET /products           │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │     (cache miss)         │                          │
     │                          │  SELECT * FROM products  │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │        Datos             │
     │                          │<─────────────────────────│
     │                          │                          │
     │                          │ (guardar en cache)       │
     │                          │                          │
     │      Datos               │                          │
     │<─────────────────────────│                          │


                    ESCRITURA (Invalidacion)
                    ════════════════════════

  Cliente                  Cache (Redis)              Base de Datos
     │                          │                          │
     │  PUT /products/{id}/stock│                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │                          │     UPDATE products      │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │        OK                │
     │                          │<─────────────────────────│
     │                          │                          │
     │                          │ (invalidar cache)        │
     │                          │ DEL catalog:products:*   │
     │                          │                          │
     │      OK                  │                          │
     │<─────────────────────────│                          │
```

---

## Archivos Creados/Modificados

### Nuevos Archivos

| Archivo | Descripcion |
|---------|-------------|
| `services/catalog-service/.../config/RedisConfig.java` | Configuracion del cache manager |
| `services/catalog-service/.../service/CatalogService.java` | Servicio con anotaciones de cache |

### Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `services/catalog-service/pom.xml` | Agregadas dependencias Redis y Cache |
| `services/catalog-service/.../application.properties` | Configuracion Redis |
| `services/catalog-service/.../CatalogServiceApplication.java` | Agregado `@EnableCaching` |
| `services/catalog-service/.../controller/CatalogController.java` | Usa CatalogService |

---

## Detalles de Implementacion

### 1. Dependencias (pom.xml)

```xml
<!-- Spring Data Redis -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>

<!-- Cache abstraction -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
```

### 2. Configuracion (application.properties)

```properties
# Redis Configuration
spring.data.redis.host=localhost
spring.data.redis.port=6379
spring.data.redis.timeout=2000ms

# Cache Configuration
spring.cache.type=redis
spring.cache.redis.time-to-live=300000  # 5 minutos
spring.cache.redis.cache-null-values=false
```

### 3. Habilitacion de Cache (CatalogServiceApplication.java)

```java
@SpringBootApplication
@EnableCaching  // <-- Habilita el sistema de cache
public class CatalogServiceApplication {
    // ...
}
```

### 4. Configuracion del Cache Manager (RedisConfig.java)

```java
@Configuration
public class RedisConfig {

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(5))           // TTL de 5 minutos
            .disableCachingNullValues()                 // No cachear nulls
            .prefixCacheNameWith("catalog:")            // Prefijo de keys
            .serializeKeysWith(...)                     // Keys como String
            .serializeValuesWith(...);                  // Valores como JSON

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(config)
            .build();
    }
}
```

### 5. Servicio con Cache (CatalogService.java)

```java
@Service
public class CatalogService {

    // Lee del cache, si no existe consulta DB y guarda resultado
    @Cacheable(value = "products", key = "'all'")
    public List<Product> getAllProducts() {
        log.info("Cache MISS - Consultando desde DB");
        return repository.findAll();
    }

    // Cache por ID individual
    @Cacheable(value = "products", key = "#id")
    public Optional<Product> getProductById(Long id) {
        return repository.findById(id);
    }

    // Invalida todo el cache al modificar
    @CacheEvict(value = "products", allEntries = true)
    public Product updateStock(Long id, Integer newStock) {
        // ... actualizar en DB
    }
}
```

---

## Estructura de Keys en Redis

| Key | Contenido | TTL |
|-----|-----------|-----|
| `catalog:products::all` | Lista de todos los productos | 5 min |
| `catalog:products::1` | Producto con ID 1 | 5 min |
| `catalog:products::2` | Producto con ID 2 | 5 min |

---

## Anotaciones de Cache Utilizadas

| Anotacion | Uso | Comportamiento |
|-----------|-----|----------------|
| `@Cacheable` | Metodos de lectura | Retorna del cache si existe, sino ejecuta y guarda |
| `@CacheEvict` | Metodos de escritura | Elimina entradas del cache |
| `@CachePut` | Actualizaciones (no usado) | Actualiza el cache con el resultado |

---

## Guia de Ejecucion

### Prerequisitos

- Docker y Docker Compose (para Redis)
- Catalog Service ejecutandose

### Paso 1: Verificar que Redis esta corriendo

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d

# Verificar
docker ps | grep redis
```

### Paso 2: Iniciar Catalog Service

```bash
cd services/catalog-service
mvn spring-boot:run
```

### Paso 3: Probar el Cache

```bash
# Primera llamada - Cache MISS (veras el log "Consultando desde DB")
curl http://localhost:8082/catalog/products

# Segunda llamada - Cache HIT (no hay log de DB)
curl http://localhost:8082/catalog/products

# Actualizar stock - Invalida cache
curl -X PUT http://localhost:8082/catalog/products/1/stock \
  -H "Content-Type: application/json" \
  -d '10'

# Siguiente llamada - Cache MISS (se reconstruye)
curl http://localhost:8082/catalog/products
```

---

## Verificacion en Redis

### Conectar a Redis CLI

```bash
docker exec -it app-redis redis-cli
```

### Comandos utiles

```bash
# Ver todas las keys del catalogo
KEYS catalog:*

# Ver contenido de una key
GET "catalog:products::all"

# Ver TTL restante
TTL "catalog:products::all"

# Limpiar cache manualmente
DEL "catalog:products::all"

# Ver estadisticas
INFO stats
```

---

## Logs del Servicio

Cuando el cache funciona correctamente, veras estos patrones en los logs:

**Cache MISS (primera consulta o despues de invalidacion):**
```
INFO  CatalogService : Cache MISS - Consultando productos desde la base de datos
Hibernate: select p1_0.id,p1_0.name,p1_0.price,p1_0.stock from products p1_0
```

**Cache HIT (consultas subsecuentes):**
```
(Sin logs de Hibernate - los datos vienen del cache)
```

**Invalidacion de cache:**
```
INFO  CatalogService : Actualizando stock del producto 1 a 15. Invalidando cache.
Hibernate: update products set name=?,price=?,stock=? where id=?
```

---

## Metricas de Rendimiento

### Sin Cache
- Tiempo de respuesta: ~50-100ms (depende de la DB)
- Carga en PostgreSQL: Alta para consultas frecuentes

### Con Cache (Redis)
- Tiempo de respuesta: ~1-5ms (cache hit)
- Carga en PostgreSQL: Reducida significativamente
- Memoria Redis: ~1KB por entrada cacheada

---

## Diagrama de Componentes

```
┌────────────────────────────────────────────────────────────────────────┐
│                       CATALOG SERVICE (:8082)                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────┐     ┌────────────────┐     ┌─────────────────┐   │
│  │CatalogController│────>│ CatalogService │────>│ProductRepository│   │
│  │                 │     │                │     │                 │   │
│  │ GET /products   │     │ @Cacheable     │     │ JPA Repository  │   │
│  │ PUT /stock      │     │ @CacheEvict    │     │                 │   │
│  └─────────────────┘     └───────┬────────┘     └────────┬────────┘   │
│                                  │                       │            │
└──────────────────────────────────┼───────────────────────┼────────────┘
                                   │                       │
                    ┌──────────────▼──────────┐           │
                    │                         │           │
                    │     REDIS (:6379)       │           │
                    │                         │           │
                    │  ┌───────────────────┐  │           │
                    │  │catalog:products:: │  │           │
                    │  │       all         │  │           │
                    │  │  [Product, ...]   │  │           │
                    │  └───────────────────┘  │           │
                    │                         │           │
                    └─────────────────────────┘           │
                                                          │
                                                          ▼
                                           ┌──────────────────────────┐
                                           │                          │
                                           │   POSTGRESQL (:5432)     │
                                           │                          │
                                           │  ┌────────────────────┐  │
                                           │  │  products          │  │
                                           │  │  ├─ id             │  │
                                           │  │  ├─ name           │  │
                                           │  │  ├─ price          │  │
                                           │  │  └─ stock          │  │
                                           │  └────────────────────┘  │
                                           │                          │
                                           └──────────────────────────┘
```

---

## Consideraciones de Produccion

### Estrategias de Invalidacion

1. **TTL (Time To Live):** 5 minutos por defecto
2. **Invalidacion explicita:** Al modificar datos
3. **Invalidacion total:** `allEntries = true` para simplicidad

### Posibles Mejoras

- Cache warming al iniciar la aplicacion
- Invalidacion granular por ID
- Metricas de hit/miss ratio
- Circuit breaker si Redis no esta disponible

---

## Proximos Pasos (Fase 4)

- Implementar busqueda con Elasticsearch
- Indexar productos para busqueda full-text
- Conectar pagina de busqueda del frontend
