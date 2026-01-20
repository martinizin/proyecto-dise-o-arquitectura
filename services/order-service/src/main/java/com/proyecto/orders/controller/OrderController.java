package com.proyecto.orders.controller;

import com.proyecto.orders.model.Order;
import com.proyecto.orders.repository.OrderRepository;
import com.proyecto.orders.service.OrderEventPublisher;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/orders")
@Tag(name = "Orders", description = "API para gestion de ordenes de compra")
public class OrderController {

    private static final Logger log = LoggerFactory.getLogger(OrderController.class);

    private final OrderRepository repository;
    private final OrderEventPublisher eventPublisher;

    public OrderController(OrderRepository repository, OrderEventPublisher eventPublisher) {
        this.repository = repository;
        this.eventPublisher = eventPublisher;
    }

    @Operation(
        summary = "Obtener todas las ordenes",
        description = "Retorna una lista con todas las ordenes registradas en el sistema"
    )
    @ApiResponse(
        responseCode = "200",
        description = "Lista de ordenes obtenida exitosamente",
        content = @Content(mediaType = "application/json", schema = @Schema(implementation = Order.class))
    )
    @GetMapping
    public List<Order> getAll() {
        return repository.findAll();
    }

    @Operation(
        summary = "Crear nueva orden",
        description = "Crea una nueva orden y publica un evento a la cola SQS para notificacion"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Orden creada exitosamente",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Order.class))
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Datos de orden invalidos",
            content = @Content
        )
    })
    @PostMapping
    public Order create(
        @Parameter(description = "Datos de la orden a crear", required = true)
        @RequestBody Order order
    ) {
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
    
    @Operation(
        summary = "Obtener orden por ID",
        description = "Busca y retorna una orden especifica por su identificador"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Orden encontrada",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Order.class))
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Orden no encontrada",
            content = @Content
        )
    })
    @GetMapping("/{id}")
    public ResponseEntity<Order> getOne(
        @Parameter(description = "ID de la orden", required = true, example = "1")
        @PathVariable Long id
    ) {
        return repository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @Operation(
        summary = "Actualizar estado de orden",
        description = "Actualiza el estado de una orden existente. Usado por Lambda para marcar como NOTIFIED."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Estado actualizado exitosamente",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Order.class))
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Estado invalido o no proporcionado",
            content = @Content
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Orden no encontrada",
            content = @Content
        )
    })
    @PatchMapping("/{id}/status")
    public ResponseEntity<Order> updateStatus(
        @Parameter(description = "ID de la orden", required = true, example = "1")
        @PathVariable Long id,
        @Parameter(description = "Nuevo estado de la orden", required = true)
        @RequestBody Map<String, String> body
    ) {
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
