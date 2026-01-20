package com.proyecto.catalog.controller;

import com.proyecto.catalog.model.Product;
import com.proyecto.catalog.service.CatalogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/catalog")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    /**
     * Obtener todos los productos.
     * Los resultados se cachean en Redis.
     */
    @GetMapping("/products")
    public List<Product> getAll() {
        return catalogService.getAllProducts();
    }

    /**
     * Obtener un producto por ID.
     * El resultado se cachea en Redis.
     */
    @GetMapping("/products/{id}")
    public ResponseEntity<Product> getOne(@PathVariable Long id) {
        return catalogService.getProductById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Actualizar el stock de un producto.
     * Invalida el cache de productos.
     */
    @PutMapping("/products/{id}/stock")
    public ResponseEntity<Product> updateStock(@PathVariable Long id, 
                                                @RequestBody Integer newStock) {
        try {
            Product updated = catalogService.updateStock(id, newStock);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Crear un nuevo producto.
     * Invalida el cache de productos.
     */
    @PostMapping("/products")
    public Product create(@RequestBody Product product) {
        return catalogService.createProduct(product);
    }

    /**
     * Eliminar un producto.
     * Invalida el cache de productos.
     */
    @DeleteMapping("/products/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        try {
            catalogService.deleteProduct(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
