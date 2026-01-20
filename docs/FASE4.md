# Fase 4: Busqueda con Elasticsearch en Catalog Service

## Resumen

En esta fase se implemento un sistema de busqueda full-text usando Elasticsearch para el Catalog Service. Esto permite buscar productos por nombre, filtrar por estado de stock y precio, mejorando significativamente la experiencia de busqueda para los usuarios.

## Objetivos Completados

- Agregar dependencia de Spring Data Elasticsearch
- Configurar conexion a Elasticsearch
- Crear documento de indexacion para productos
- Implementar repositorio y servicio de busqueda
- Crear controlador con endpoints de busqueda
- Conectar frontend con la API de busqueda

---

## Arquitectura de Busqueda Implementada

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FLUJO DE BUSQUEDA                                │
└─────────────────────────────────────────────────────────────────────────┘

                     INDEXACION (Sync desde PostgreSQL)
                     ═══════════════════════════════════

   Cliente                  Catalog Service              Elasticsearch
      │                          │                          │
      │  POST /search/sync       │                          │
      ├─────────────────────────>│                          │
      │                          │                          │
      │                          │  findAll() desde DB      │
      │                          ├─────────────────────────>│
      │                          │     (PostgreSQL)         │
      │                          │<─────────────────────────│
      │                          │                          │
      │                          │  saveAll(documents)      │
      │                          ├─────────────────────────>│
      │                          │                          │
      │                          │         OK               │
      │                          │<─────────────────────────│
      │                          │                          │
      │  {productsIndexed: N}    │                          │
      │<─────────────────────────│                          │


                     BUSQUEDA (Query a Elasticsearch)
                     ═════════════════════════════════

   Cliente                  Catalog Service              Elasticsearch
      │                          │                          │
      │  GET /search?q=laptop    │                          │
      ├─────────────────────────>│                          │
      │                          │                          │
      │                          │  findByNameContaining    │
      │                          ├─────────────────────────>│
      │                          │                          │
      │                          │    [ProductDocument...]  │
      │                          │<─────────────────────────│
      │                          │                          │
      │    [products...]         │                          │
      │<─────────────────────────│                          │
```

---

## Archivos Creados/Modificados

### Nuevos Archivos

| Archivo | Descripcion |
|---------|-------------|
| `services/catalog-service/.../document/ProductDocument.java` | Documento Elasticsearch para productos |
| `services/catalog-service/.../search/ProductSearchRepository.java` | Repositorio Elasticsearch |
| `services/catalog-service/.../search/ProductSearchService.java` | Servicio de busqueda |
| `services/catalog-service/.../controller/SearchController.java` | Controlador de busqueda |

### Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `services/catalog-service/pom.xml` | Agregada dependencia Elasticsearch |
| `services/catalog-service/.../application.properties` | Configuracion Elasticsearch |
| `frontend/src/pages/search.jsx` | Conectado a API de busqueda |

---

## Detalles de Implementacion

### 1. Dependencias (pom.xml)

```xml
<!-- Spring Data Elasticsearch -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-elasticsearch</artifactId>
</dependency>
```

### 2. Configuracion (application.properties)

```properties
# Elasticsearch Configuration
spring.elasticsearch.uris=http://localhost:9200
spring.elasticsearch.connection-timeout=5s
spring.elasticsearch.socket-timeout=30s
```

### 3. Documento de Indexacion (ProductDocument.java)

```java
@Document(indexName = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductDocument {

    @Id
    private String id;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String name;

    @Field(type = FieldType.Double)
    private Double price;

    @Field(type = FieldType.Integer)
    private Integer stock;

    @Field(type = FieldType.Keyword)
    private String stockStatus;  // OK, LOW, OUT_OF_STOCK

    public static ProductDocument fromProduct(Long id, String name, 
                                               Double price, Integer stock) {
        ProductDocument doc = new ProductDocument();
        doc.setId(String.valueOf(id));
        doc.setName(name);
        doc.setPrice(price);
        doc.setStock(stock);
        doc.setStockStatus(calculateStockStatus(stock));
        return doc;
    }

    private static String calculateStockStatus(Integer stock) {
        if (stock == null || stock == 0) return "OUT_OF_STOCK";
        if (stock <= 5) return "LOW";
        return "OK";
    }
}
```

### 4. Repositorio Elasticsearch (ProductSearchRepository.java)

```java
@Repository
public interface ProductSearchRepository 
    extends ElasticsearchRepository<ProductDocument, String> {

    // Busqueda por nombre (coincidencia parcial, case-insensitive)
    List<ProductDocument> findByNameContainingIgnoreCase(String name);

    // Busqueda por estado de stock
    List<ProductDocument> findByStockStatus(String stockStatus);

    // Busqueda por precio maximo
    List<ProductDocument> findByPriceLessThanEqual(Double maxPrice);

    // Busqueda por stock disponible
    List<ProductDocument> findByStockGreaterThan(Integer minStock);
}
```

### 5. Servicio de Busqueda (ProductSearchService.java)

```java
@Service
public class ProductSearchService {

    private final ProductSearchRepository searchRepository;
    private final ProductRepository productRepository;

    // Busqueda por texto en nombre
    public List<ProductDocument> searchByName(String query) {
        log.info("Buscando productos con query: {}", query);
        return searchRepository.findByNameContainingIgnoreCase(query);
    }

    // Busqueda por estado de stock
    public List<ProductDocument> searchByStockStatus(String status) {
        return searchRepository.findByStockStatus(status.toUpperCase());
    }

    // Busqueda por precio maximo
    public List<ProductDocument> searchByMaxPrice(Double maxPrice) {
        return searchRepository.findByPriceLessThanEqual(maxPrice);
    }

    // Sincronizacion completa desde PostgreSQL
    public int syncAllProducts() {
        List<Product> products = productRepository.findAll();
        
        List<ProductDocument> documents = products.stream()
            .map(p -> ProductDocument.fromProduct(
                p.getId(), p.getName(), p.getPrice(), p.getStock()))
            .collect(Collectors.toList());

        searchRepository.saveAll(documents);
        return documents.size();
    }
}
```

### 6. Controlador de Busqueda (SearchController.java)

```java
@RestController
@RequestMapping("/catalog/search")
public class SearchController {

    // Busqueda con multiples filtros
    @GetMapping
    public List<ProductDocument> search(
        @RequestParam(name = "q", required = false) String query,
        @RequestParam(name = "status", required = false) String status,
        @RequestParam(name = "maxPrice", required = false) Double maxPrice) {
        
        if (query != null && !query.isBlank()) {
            return searchService.searchByName(query);
        }
        if (status != null && !status.isBlank()) {
            return searchService.searchByStockStatus(status);
        }
        if (maxPrice != null) {
            return searchService.searchByMaxPrice(maxPrice);
        }
        return searchService.getAllIndexed();
    }

    // Sincronizacion desde PostgreSQL
    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> syncProducts() {
        int count = searchService.syncAllProducts();
        return ResponseEntity.ok(Map.of(
            "message", "Sincronizacion completada",
            "productsIndexed", count
        ));
    }

    // Estadisticas del indice
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        // ... retorna conteo por estado de stock
    }
}
```

---

## Tipos de Campo en Elasticsearch

| Tipo | Uso | Ejemplo |
|------|-----|---------|
| `Text` | Busqueda full-text con tokenizacion | name |
| `Keyword` | Valores exactos, agregaciones | stockStatus |
| `Double` | Numeros decimales, rangos | price |
| `Integer` | Numeros enteros, rangos | stock |

---

## Endpoints de la API

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/catalog/search` | GET | Busqueda sin filtros (todos) |
| `/catalog/search?q=laptop` | GET | Busqueda por nombre |
| `/catalog/search?status=LOW` | GET | Filtrar por estado de stock |
| `/catalog/search?maxPrice=50` | GET | Filtrar por precio maximo |
| `/catalog/search/sync` | POST | Sincronizar desde PostgreSQL |
| `/catalog/search/stats` | GET | Estadisticas del indice |
| `/catalog/search/index` | DELETE | Limpiar indice |

---

## Estados de Stock

| Estado | Condicion | Badge en Frontend |
|--------|-----------|-------------------|
| `OK` | stock > 5 | Verde |
| `LOW` | stock 1-5 | Amarillo |
| `OUT_OF_STOCK` | stock = 0 | Rojo |

---

## Guia de Ejecucion

### Prerequisitos

- Docker y Docker Compose (para Elasticsearch)
- Catalog Service ejecutandose
- Productos existentes en PostgreSQL

### Paso 1: Verificar que Elasticsearch esta corriendo

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d

# Verificar
docker ps | grep elasticsearch

# Comprobar salud del cluster
curl http://localhost:9200/_cluster/health?pretty
```

### Paso 2: Iniciar Catalog Service

```bash
cd services/catalog-service
mvn spring-boot:run
```

### Paso 3: Sincronizar productos al indice

```bash
# Sincronizar productos desde PostgreSQL a Elasticsearch
curl -X POST http://localhost:8082/catalog/search/sync

# Respuesta esperada:
# {"message":"Sincronizacion completada","productsIndexed":5}
```

### Paso 4: Probar la busqueda

```bash
# Buscar por nombre
curl "http://localhost:8082/catalog/search?q=laptop"

# Filtrar por estado de stock
curl "http://localhost:8082/catalog/search?status=OK"

# Filtrar por precio maximo
curl "http://localhost:8082/catalog/search?maxPrice=100"

# Ver estadisticas
curl http://localhost:8082/catalog/search/stats
```

---

## Frontend: Pagina de Busqueda

La pagina `search.jsx` proporciona una interfaz para:

1. **Busqueda por texto:** Campo de entrada con busqueda al presionar Enter o boton
2. **Filtro por estado:** Dropdown con opciones OK, LOW, OUT_OF_STOCK
3. **Filtro por precio:** Campo numerico para precio maximo
4. **Sincronizacion:** Boton para sincronizar desde PostgreSQL
5. **Estadisticas:** Visualizacion del conteo por estado

### Ejemplo de uso en el frontend:

```javascript
// Busqueda con parametros
const params = new URLSearchParams();
if (query.trim()) params.append("q", query.trim());
if (statusFilter) params.append("status", statusFilter);
if (maxPrice) params.append("maxPrice", maxPrice);

const data = await apiGet("/api/catalog/search?" + params.toString());
```

---

## Verificacion en Elasticsearch

### Conectar via curl

```bash
# Ver indices
curl http://localhost:9200/_cat/indices?v

# Ver mapping del indice products
curl http://localhost:9200/products/_mapping?pretty

# Buscar todos los documentos
curl http://localhost:9200/products/_search?pretty

# Buscar por nombre
curl "http://localhost:9200/products/_search?q=name:laptop&pretty"
```

### Comandos utiles de Elasticsearch

```bash
# Contar documentos
curl http://localhost:9200/products/_count

# Eliminar indice (reiniciar)
curl -X DELETE http://localhost:9200/products

# Ver configuracion del cluster
curl http://localhost:9200/_cluster/settings?pretty
```

---

## Logs del Servicio

Cuando la busqueda funciona correctamente, veras estos patrones en los logs:

**Sincronizacion:**
```
INFO  ProductSearchService : Iniciando sincronizacion completa de productos a Elasticsearch
INFO  ProductSearchService : Sincronizados 5 productos a Elasticsearch
```

**Busqueda:**
```
INFO  ProductSearchService : Buscando productos con query: laptop
INFO  ProductSearchService : Buscando productos con stockStatus: LOW
INFO  ProductSearchService : Buscando productos con precio <= 50.0
```

---

## Diagrama de Componentes

```
┌────────────────────────────────────────────────────────────────────────┐
│                       CATALOG SERVICE (:8082)                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────┐     ┌──────────────────┐                          │
│  │SearchController │────>│ProductSearchSvc  │                          │
│  │                 │     │                  │                          │
│  │ GET /search     │     │ searchByName()   │                          │
│  │ POST /sync      │     │ syncAllProducts()│                          │
│  │ GET /stats      │     │                  │                          │
│  └─────────────────┘     └────────┬─────────┘                          │
│                                   │                                    │
│                    ┌──────────────┼──────────────┐                     │
│                    │              │              │                     │
│                    ▼              │              ▼                     │
│         ┌──────────────────┐      │    ┌─────────────────┐             │
│         │ProductSearchRepo │      │    │ProductRepository│             │
│         │  (Elasticsearch) │      │    │    (JPA)        │             │
│         └────────┬─────────┘      │    └────────┬────────┘             │
│                  │                │             │                      │
└──────────────────┼────────────────┼─────────────┼──────────────────────┘
                   │                │             │
                   ▼                │             ▼
    ┌──────────────────────────┐    │  ┌──────────────────────────┐
    │                          │    │  │                          │
    │  ELASTICSEARCH (:9200)   │    │  │   POSTGRESQL (:5432)     │
    │                          │    │  │                          │
    │  ┌────────────────────┐  │    │  │  ┌────────────────────┐  │
    │  │  products (index)  │  │    │  │  │  products (table)  │  │
    │  │  ├─ id            │  │    │  │  │  ├─ id             │  │
    │  │  ├─ name (text)   │  │<───┼──│  │  ├─ name           │  │
    │  │  ├─ price         │  │ sync │  │  ├─ price          │  │
    │  │  ├─ stock         │  │    │  │  │  └─ stock          │  │
    │  │  └─ stockStatus   │  │    │  │  └────────────────────┘  │
    │  └────────────────────┘  │    │  │                          │
    │                          │    │  └──────────────────────────┘
    └──────────────────────────┘    │
                                    │
                    ┌───────────────┘
                    │
                    ▼
         ┌──────────────────┐
         │   REDIS (:6379)  │
         │   (Cache Layer)  │
         └──────────────────┘
```

---

## Diferencias: PostgreSQL vs Elasticsearch

| Aspecto | PostgreSQL | Elasticsearch |
|---------|------------|---------------|
| Tipo | Base de datos relacional | Motor de busqueda |
| Consultas | SQL exacto | Full-text search |
| Velocidad busqueda | Moderada | Muy rapida |
| Uso principal | Persistencia, transacciones | Busqueda, analytics |
| Escalabilidad | Vertical | Horizontal (clusters) |

---

## Consideraciones de Produccion

### Estrategia de Sincronizacion

1. **Manual:** Endpoint POST /sync para sincronizacion bajo demanda
2. **Al escribir:** Indexar automaticamente al crear/actualizar productos
3. **Programada:** Job periodico para sincronizacion completa

### Posibles Mejoras

- Indexacion automatica al crear/actualizar productos
- Busqueda con multiples campos combinados
- Paginacion de resultados
- Highlighting de coincidencias
- Sugerencias de autocompletado
- Faceted search (agregaciones)

---

## Proximos Pasos Sugeridos

- Configurar CI/CD con GitHub Actions
- Agregar monitoreo con Spring Boot Actuator
- Implementar tests de integracion
- Documentar API con OpenAPI/Swagger

