package com.proyecto.orders.model;

import jakarta.persistence.*;
import lombok.Data; // O genera Getters/Setters si no usas Lombok
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
@Data
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String customerName; // Útil para mostrar en el frontend
    private LocalDateTime createdAt;
    private String status; // CREATED, NOTIFIED
    private Double total;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = "CREATED"; // Estado inicial requerido por HU-S1-04
        }
    }
}