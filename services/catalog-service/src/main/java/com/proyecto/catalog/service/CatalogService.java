package com.proyecto.catalog.service;

import com.proyecto.catalog.model.Product;
import com.proyecto.catalog.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Servicio de Catalogo con cache Redis.
 * 
 * Implementa el patron Cache-Aside:
 * - @Cacheable: Lee del cache si existe, sino consulta DB y guarda en cache
 * - @CacheEvict: Invalida el cache cuando se modifican datos
 */
@Service
public class CatalogService {

    private static final Logger log = LoggerFactory.getLogger(CatalogService.class);

    private final ProductRepository repository;

    public CatalogService(ProductRepository repository) {
        this.repository = repository;
    }

    /**
     * Obtiene todos los productos.
     * El resultado se cachea con key "products::all"
     */
    @Cacheable(value = "products", key = "'all'")
    public List<Product> getAllProducts() {
        log.info("Cache MISS - Consultando productos desde la base de datos");
        return repository.findAll();
    }

    /**
     * Obtiene un producto por ID.
     * El resultado se cachea con key "products::{id}"
     */
    @Cacheable(value = "products", key = "#id")
    public Optional<Product> getProductById(Long id) {
        log.info("Cache MISS - Consultando producto {} desde la base de datos", id);
        return repository.findById(id);
    }

    /**
     * Actualiza el stock de un producto.
     * Invalida todo el cache de productos para mantener consistencia.
     */
    @CacheEvict(value = "products", allEntries = true)
    public Product updateStock(Long id, Integer newStock) {
        log.info("Actualizando stock del producto {} a {}. Invalidando cache.", id, newStock);
        
        return repository.findById(id)
            .map(product -> {
                product.setStock(newStock);
                return repository.save(product);
            })
            .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + id));
    }

    /**
     * Crea un nuevo producto.
     * Invalida todo el cache de productos.
     */
    @CacheEvict(value = "products", allEntries = true)
    public Product createProduct(Product product) {
        log.info("Creando nuevo producto: {}. Invalidando cache.", product.getName());
        return repository.save(product);
    }

    /**
     * Elimina un producto.
     * Invalida todo el cache de productos.
     */
    @CacheEvict(value = "products", allEntries = true)
    public void deleteProduct(Long id) {
        log.info("Eliminando producto {}. Invalidando cache.", id);
        repository.deleteById(id);
    }
}
