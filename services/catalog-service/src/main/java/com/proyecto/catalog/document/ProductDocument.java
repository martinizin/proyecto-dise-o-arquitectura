package com.proyecto.catalog.document;

import io.swagger.v3.oas.annotations.media.Schema;
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
@Schema(description = "Documento de producto indexado en Elasticsearch")
public class ProductDocument {

    @Id
    @Schema(description = "ID del producto", example = "1")
    private String id;

    @Field(type = FieldType.Text, analyzer = "standard")
    @Schema(description = "Nombre del producto", example = "Laptop HP Pavilion")
    private String name;

    @Field(type = FieldType.Double)
    @Schema(description = "Precio del producto", example = "999.99")
    private Double price;

    @Field(type = FieldType.Integer)
    @Schema(description = "Cantidad en stock", example = "50")
    private Integer stock;

    @Field(type = FieldType.Keyword)
    @Schema(description = "Estado del stock", example = "OK", allowableValues = {"OK", "LOW", "OUT_OF_STOCK"})
    private String stockStatus;

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
