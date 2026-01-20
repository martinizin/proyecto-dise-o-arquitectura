package com.proyecto.catalog.controller;

import com.proyecto.catalog.document.ProductDocument;
import com.proyecto.catalog.search.ProductSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controlador para busqueda de productos usando Elasticsearch.
 */
@RestController
@RequestMapping("/catalog/search")
@Tag(name = "Search", description = "API para busqueda de productos con Elasticsearch")
public class SearchController {

    private final ProductSearchService searchService;

    public SearchController(ProductSearchService searchService) {
        this.searchService = searchService;
    }

    @Operation(
        summary = "Buscar productos",
        description = "Busca productos por nombre, estado de stock o precio maximo. " +
            "Si no se proporcionan parametros, retorna todos los productos indexados."
    )
    @ApiResponse(
        responseCode = "200",
        description = "Busqueda realizada exitosamente",
        content = @Content(mediaType = "application/json", schema = @Schema(implementation = ProductDocument.class))
    )
    @GetMapping
    public List<ProductDocument> search(
        @Parameter(description = "Texto a buscar en el nombre del producto", example = "laptop")
        @RequestParam(name = "q", required = false) String query,
        @Parameter(description = "Estado de stock: OK, LOW, OUT_OF_STOCK", example = "OK")
        @RequestParam(name = "status", required = false) String status,
        @Parameter(description = "Precio maximo del producto", example = "500.00")
        @RequestParam(name = "maxPrice", required = false) Double maxPrice
    ) {
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

    @Operation(
        summary = "Sincronizar productos a Elasticsearch",
        description = "Sincroniza todos los productos de PostgreSQL al indice de Elasticsearch"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Sincronizacion completada exitosamente",
            content = @Content(mediaType = "application/json")
        )
    })
    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> syncProducts() {
        int count = searchService.syncAllProducts();
        return ResponseEntity.ok(Map.of(
            "message", "Sincronizacion completada",
            "productsIndexed", count
        ));
    }

    @Operation(
        summary = "Obtener estadisticas del indice",
        description = "Retorna estadisticas del indice de Elasticsearch: total indexado, por estado de stock"
    )
    @ApiResponse(
        responseCode = "200",
        description = "Estadisticas obtenidas exitosamente",
        content = @Content(mediaType = "application/json")
    )
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

    @Operation(
        summary = "Limpiar indice de Elasticsearch",
        description = "Elimina todos los documentos del indice de productos"
    )
    @ApiResponse(
        responseCode = "200",
        description = "Indice limpiado exitosamente",
        content = @Content(mediaType = "application/json")
    )
    @DeleteMapping("/index")
    public ResponseEntity<Map<String, String>> clearIndex() {
        searchService.clearIndex();
        return ResponseEntity.ok(Map.of("message", "Indice limpiado"));
    }
}
