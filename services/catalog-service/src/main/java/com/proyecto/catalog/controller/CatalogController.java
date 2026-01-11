package com.proyecto.catalog.controller;

import com.proyecto.catalog.model.Product;
import com.proyecto.catalog.repository.ProductRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/catalog")
public class CatalogController {

    private final ProductRepository repository;

    public CatalogController(ProductRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/products")
    public List<Product> getAll() {
        return repository.findAll();
    }

    @PutMapping("/products/{id}/stock")
    public Product updateStock(@PathVariable Long id, @RequestBody Integer newStock) {
        return repository.findById(id)
            .map(product -> {
                product.setStock(newStock);
                return repository.save(product);
            })
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
    }
}