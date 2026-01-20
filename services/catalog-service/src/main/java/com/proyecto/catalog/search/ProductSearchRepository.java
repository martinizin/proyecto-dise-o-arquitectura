package com.proyecto.catalog.search;

import com.proyecto.catalog.document.ProductDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio Elasticsearch para busqueda de productos.
 */
@Repository
public interface ProductSearchRepository extends ElasticsearchRepository<ProductDocument, String> {

    /**
     * Busca productos por nombre (coincidencia parcial).
     */
    List<ProductDocument> findByNameContainingIgnoreCase(String name);

    /**
     * Busca productos por estado de stock.
     */
    List<ProductDocument> findByStockStatus(String stockStatus);

    /**
     * Busca productos con precio menor o igual a un valor.
     */
    List<ProductDocument> findByPriceLessThanEqual(Double maxPrice);

    /**
     * Busca productos con stock mayor a cero.
     */
    List<ProductDocument> findByStockGreaterThan(Integer minStock);
}
