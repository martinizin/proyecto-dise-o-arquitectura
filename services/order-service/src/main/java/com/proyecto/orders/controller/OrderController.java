package com.proyecto.orders.controller;

import com.proyecto.orders.model.Order;
import com.proyecto.orders.repository.OrderRepository;
import com.proyecto.orders.service.OrderEventPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/orders") // Ojo: El gateway redirige /api/orders/** a aqui
public class OrderController {

    private static final Logger log = LoggerFactory.getLogger(OrderController.class);

    private final OrderRepository repository;
    private final OrderEventPublisher eventPublisher;

    public OrderController(OrderRepository repository, OrderEventPublisher eventPublisher) {
        this.repository = repository;
        this.eventPublisher = eventPublisher;
    }

    @GetMapping
    public List<Order> getAll() {
        return repository.findAll();
    }

    @PostMapping
    public Order create(@RequestBody Order order) {
        // Guardar la orden en la base de datos
        Order savedOrder = repository.save(order);
        
        log.info("Orden creada: id={}, customerName={}, status={}", 
                 savedOrder.getId(), savedOrder.getCustomerName(), savedOrder.getStatus());
        
        // Publicar evento a SQS (asincrono, no bloquea la respuesta)
        try {
            eventPublisher.publishOrderCreated(savedOrder);
        } catch (Exception e) {
            log.warn("No se pudo publicar evento SQS para orderId={}: {}", 
                     savedOrder.getId(), e.getMessage());
            // No fallamos la creacion de la orden si SQS no esta disponible
        }
        
        return savedOrder;
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Order> getOne(@PathVariable Long id) {
        return repository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Endpoint para actualizar el estado de una orden.
     * Usado por la Lambda para marcar ordenes como NOTIFIED.
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<Order> updateStatus(@PathVariable Long id, 
                                               @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        
        if (newStatus == null || newStatus.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        
        return repository.findById(id)
            .map(order -> {
                String oldStatus = order.getStatus();
                order.setStatus(newStatus);
                Order updated = repository.save(order);
                log.info("Orden actualizada: id={}, status={} -> {}", 
                         id, oldStatus, newStatus);
                return ResponseEntity.ok(updated);
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
