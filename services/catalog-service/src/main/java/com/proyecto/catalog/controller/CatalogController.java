package com.proyecto.catalog.controller;

import com.proyecto.catalog.model.Product;
import com.proyecto.catalog.service.CatalogService;
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

@RestController
@RequestMapping("/catalog")
@Tag(name = "Catalog", description = "API para gestion de productos del catalogo")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @Operation(
        summary = "Obtener todos los productos",
        description = "Retorna la lista completa de productos. Los resultados se cachean en Redis."
    )
    @ApiResponse(
        responseCode = "200",
        description = "Lista de productos obtenida exitosamente",
        content = @Content(mediaType = "application/json", schema = @Schema(implementation = Product.class))
    )
    @GetMapping("/products")
    public List<Product> getAll() {
        return catalogService.getAllProducts();
    }

    @Operation(
        summary = "Obtener producto por ID",
        description = "Busca y retorna un producto especifico. El resultado se cachea en Redis."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Producto encontrado",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Product.class))
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Producto no encontrado",
            content = @Content
        )
    })
    @GetMapping("/products/{id}")
    public ResponseEntity<Product> getOne(
        @Parameter(description = "ID del producto", required = true, example = "1")
        @PathVariable Long id
    ) {
        return catalogService.getProductById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @Operation(
        summary = "Actualizar stock de producto",
        description = "Actualiza la cantidad de stock de un producto. Invalida el cache de productos."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Stock actualizado exitosamente",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Product.class))
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Producto no encontrado",
            content = @Content
        )
    })
    @PutMapping("/products/{id}/stock")
    public ResponseEntity<Product> updateStock(
        @Parameter(description = "ID del producto", required = true, example = "1")
        @PathVariable Long id,
        @Parameter(description = "Nueva cantidad de stock", required = true, example = "100")
        @RequestBody Integer newStock
    ) {
        try {
            Product updated = catalogService.updateStock(id, newStock);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(
        summary = "Crear nuevo producto",
        description = "Crea un nuevo producto en el catalogo. Invalida el cache de productos."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Producto creado exitosamente",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Product.class))
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Datos de producto invalidos",
            content = @Content
        )
    })
    @PostMapping("/products")
    public Product create(
        @Parameter(description = "Datos del producto a crear", required = true)
        @RequestBody Product product
    ) {
        return catalogService.createProduct(product);
    }

    @Operation(
        summary = "Eliminar producto",
        description = "Elimina un producto del catalogo. Invalida el cache de productos."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "204",
            description = "Producto eliminado exitosamente"
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Producto no encontrado",
            content = @Content
        )
    })
    @DeleteMapping("/products/{id}")
    public ResponseEntity<Void> delete(
        @Parameter(description = "ID del producto a eliminar", required = true, example = "1")
        @PathVariable Long id
    ) {
        try {
            catalogService.deleteProduct(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
