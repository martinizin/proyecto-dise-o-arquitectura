package com.proyecto.catalog.model;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "products")
@Data
@Schema(description = "Producto del catalogo")
public class Product {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(description = "ID unico del producto", example = "1", accessMode = Schema.AccessMode.READ_ONLY)
    private Long id;

    @Schema(description = "Nombre del producto", example = "Laptop HP Pavilion", required = true)
    private String name;
    
    @Schema(description = "Precio del producto en dolares", example = "999.99", minimum = "0")
    private Double price;
    
    @Schema(description = "Cantidad disponible en stock", example = "50", minimum = "0")
    private Integer stock;

    public Product() {}

    public Product(String name, Double price, Integer stock) {
        this.name = name;
        this.price = price;
        this.stock = stock;
    }
}
