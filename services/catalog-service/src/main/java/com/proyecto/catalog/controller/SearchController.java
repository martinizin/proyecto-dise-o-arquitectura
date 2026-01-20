package com.proyecto.catalog.controller;

import com.proyecto.catalog.document.ProductDocument;
import com.proyecto.catalog.search.ProductSearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controlador para busqueda de productos usando Elasticsearch.
 */
@RestController
@RequestMapping("/catalog/search")
public class SearchController {

    private final ProductSearchService searchService;

    public SearchController(ProductSearchService searchService) {
        this.searchService = searchService;
    }

    /**
     * Busqueda de productos por nombre.
     * GET /catalog/search?q=texto
     */
    @GetMapping
    public List<ProductDocument> search(@RequestParam(name = "q", required = false) String query,
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
        
        // Si no hay parametros, retornar todos los indexados
        return searchService.getAllIndexed();
    }

    /**
     * Sincroniza todos los productos de PostgreSQL a Elasticsearch.
     * POST /catalog/search/sync
     */
    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> syncProducts() {
        int count = searchService.syncAllProducts();
        return ResponseEntity.ok(Map.of(
            "message", "Sincronizacion completada",
            "productsIndexed", count
        ));
    }

    /**
     * Obtiene estadisticas del indice.
     * GET /catalog/search/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        List<ProductDocument> all = searchService.getAllIndexed();
        
        long inStock = all.stream().filter(p -> "OK".equals(p.getStockStatus())).count();
        long lowStock = all.stream().filter(p -> "LOW".equals(p.getStockStatus())).count();
        long outOfStock = all.stream().filter(p -> "OUT_OF_STOCK".equals(p.getStockStatus())).count();
        
        return ResponseEntity.ok(Map.of(
            "totalIndexed", all.size(),
            "inStock", inStock,
            "lowStock", lowStock,
            "outOfStock", outOfStock
        ));
    }

    /**
     * Limpia el indice de Elasticsearch.
     * DELETE /catalog/search/index
     */
    @DeleteMapping("/index")
    public ResponseEntity<Map<String, String>> clearIndex() {
        searchService.clearIndex();
        return ResponseEntity.ok(Map.of("message", "Indice limpiado"));
    }
}
