package com.proyecto.catalog.search;

import com.proyecto.catalog.document.ProductDocument;
import com.proyecto.catalog.model.Product;
import com.proyecto.catalog.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

/**
 * Servicio de busqueda con Elasticsearch.
 * Proporciona busqueda full-text y sincronizacion de datos.
 */
@Service
public class ProductSearchService {

    private static final Logger log = LoggerFactory.getLogger(ProductSearchService.class);

    private final ProductSearchRepository searchRepository;
    private final ProductRepository productRepository;

    public ProductSearchService(ProductSearchRepository searchRepository,
                                 ProductRepository productRepository) {
        this.searchRepository = searchRepository;
        this.productRepository = productRepository;
    }

    /**
     * Busca productos por texto en el nombre.
     */
    public List<ProductDocument> searchByName(String query) {
        log.info("Buscando productos con query: {}", query);
        return searchRepository.findByNameContainingIgnoreCase(query);
    }

    /**
     * Busca productos por estado de stock.
     */
    public List<ProductDocument> searchByStockStatus(String status) {
        log.info("Buscando productos con stockStatus: {}", status);
        return searchRepository.findByStockStatus(status.toUpperCase());
    }

    /**
     * Busca productos con precio menor o igual a un valor.
     */
    public List<ProductDocument> searchByMaxPrice(Double maxPrice) {
        log.info("Buscando productos con precio <= {}", maxPrice);
        return searchRepository.findByPriceLessThanEqual(maxPrice);
    }

    /**
     * Obtiene todos los productos indexados.
     */
    public List<ProductDocument> getAllIndexed() {
        return StreamSupport.stream(searchRepository.findAll().spliterator(), false)
            .collect(Collectors.toList());
    }

    /**
     * Indexa un producto individual en Elasticsearch.
     */
    public void indexProduct(Product product) {
        log.info("Indexando producto: {}", product.getId());
        ProductDocument doc = ProductDocument.fromProduct(
            product.getId(),
            product.getName(),
            product.getPrice(),
            product.getStock()
        );
        searchRepository.save(doc);
    }

    /**
     * Elimina un producto del indice.
     */
    public void removeFromIndex(Long productId) {
        log.info("Eliminando producto del indice: {}", productId);
        searchRepository.deleteById(String.valueOf(productId));
    }

    /**
     * Sincroniza todos los productos de PostgreSQL a Elasticsearch.
     * Util para inicializacion o reindexacion.
     */
    public int syncAllProducts() {
        log.info("Iniciando sincronizacion completa de productos a Elasticsearch");
        
        List<Product> products = productRepository.findAll();
        
        List<ProductDocument> documents = products.stream()
            .map(p -> ProductDocument.fromProduct(
                p.getId(),
                p.getName(),
                p.getPrice(),
                p.getStock()
            ))
            .collect(Collectors.toList());

        searchRepository.saveAll(documents);
        
        log.info("Sincronizados {} productos a Elasticsearch", documents.size());
        return documents.size();
    }

    /**
     * Limpia todo el indice de productos.
     */
    public void clearIndex() {
        log.info("Limpiando indice de productos");
        searchRepository.deleteAll();
    }
}
