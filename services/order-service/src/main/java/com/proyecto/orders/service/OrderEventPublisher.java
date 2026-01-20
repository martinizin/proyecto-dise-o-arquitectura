package com.proyecto.orders.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.proyecto.orders.event.OrderCreatedEvent;
import com.proyecto.orders.model.Order;
import io.awspring.cloud.sqs.operations.SqsTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Servicio para publicar eventos de ordenes a SQS.
 */
@Service
public class OrderEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(OrderEventPublisher.class);

    private final SqsTemplate sqsTemplate;
    private final ObjectMapper objectMapper;
    private final String queueName;

    public OrderEventPublisher(SqsTemplate sqsTemplate,
                               @Value("${app.sqs.queue-name}") String queueName) {
        this.sqsTemplate = sqsTemplate;
        this.queueName = queueName;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    /**
     * Publica un evento OrderCreated a la cola SQS.
     * 
     * @param order La orden creada
     */
    public void publishOrderCreated(Order order) {
        try {
            OrderCreatedEvent event = OrderCreatedEvent.fromOrder(
                order.getId(),
                order.getCustomerName(),
                order.getTotal(),
                order.getStatus(),
                order.getCreatedAt()
            );

            String messageBody = objectMapper.writeValueAsString(event);
            
            sqsTemplate.send(queueName, messageBody);
            
            log.info("Evento OrderCreated publicado exitosamente para orderId={}", order.getId());
            
        } catch (JsonProcessingException e) {
            log.error("Error serializando evento OrderCreated para orderId={}: {}", 
                      order.getId(), e.getMessage());
            throw new RuntimeException("Error publicando evento a SQS", e);
        } catch (Exception e) {
            log.error("Error publicando a SQS para orderId={}: {}", 
                      order.getId(), e.getMessage());
            // No lanzamos excepcion para no afectar la creacion de la orden
            // En produccion podriamos usar un mecanismo de retry o dead letter queue
        }
    }
}
