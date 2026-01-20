package com.proyecto.orders.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Evento que se publica cuando se crea una nueva orden.
 * Este evento es enviado a la cola SQS para ser procesado por la Lambda.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderCreatedEvent {
    private Long orderId;
    private String customerName;
    private Double total;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime eventTimestamp;

    public static OrderCreatedEvent fromOrder(Long orderId, String customerName, 
                                               Double total, String status, 
                                               LocalDateTime createdAt) {
        return new OrderCreatedEvent(
            orderId,
            customerName,
            total,
            status,
            createdAt,
            LocalDateTime.now()
        );
    }
}
