package com.proyecto.catalog.document;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

/**
 * Documento Elasticsearch para productos.
 * Representa un producto indexado para busqueda full-text.
 */
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

    /**
     * Crea un ProductDocument desde un Product de JPA.
     */
    public static ProductDocument fromProduct(Long id, String name, Double price, Integer stock) {
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
