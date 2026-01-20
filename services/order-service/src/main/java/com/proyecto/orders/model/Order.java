package com.proyecto.orders.model;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
@Data
@Schema(description = "Entidad que representa una orden de compra")
public class Order {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(description = "ID unico de la orden", example = "1", accessMode = Schema.AccessMode.READ_ONLY)
    private Long id;

    @Schema(description = "Nombre del cliente", example = "Juan Perez", required = true)
    private String customerName;
    
    @Schema(description = "Fecha y hora de creacion de la orden", example = "2024-01-15T10:30:00", accessMode = Schema.AccessMode.READ_ONLY)
    private LocalDateTime createdAt;
    
    @Schema(description = "Estado actual de la orden", example = "CREATED", allowableValues = {"CREATED", "NOTIFIED", "PROCESSING", "COMPLETED"})
    private String status;
    
    @Schema(description = "Total de la orden en dolares", example = "150.50", minimum = "0")
    private Double total;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = "CREATED";
        }
    }
}
