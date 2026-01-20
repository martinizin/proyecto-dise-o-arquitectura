package com.proyecto.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.SQSEvent;
import com.amazonaws.services.lambda.runtime.events.SQSEvent.SQSMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Lambda handler que procesa eventos OrderCreated desde SQS.
 * 
 * Cuando recibe un mensaje:
 * 1. Parsea el JSON del evento
 * 2. Extrae el orderId
 * 3. Llama al Order Service para actualizar el estado a NOTIFIED
 */
public class OrderNotificationHandler implements RequestHandler<SQSEvent, String> {

    private static final String ORDER_SERVICE_URL = System.getenv("ORDER_SERVICE_URL") != null 
        ? System.getenv("ORDER_SERVICE_URL") 
        : "http://host.docker.internal:8081";
    
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public OrderNotificationHandler() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    }

    @Override
    public String handleRequest(SQSEvent event, Context context) {
        context.getLogger().log("Recibidos " + event.getRecords().size() + " mensajes SQS");
        
        int successCount = 0;
        int errorCount = 0;

        for (SQSMessage message : event.getRecords()) {
            try {
                processMessage(message, context);
                successCount++;
            } catch (Exception e) {
                context.getLogger().log("Error procesando mensaje: " + e.getMessage());
                errorCount++;
            }
        }

        String result = String.format("Procesados: %d exitosos, %d errores", successCount, errorCount);
        context.getLogger().log(result);
        return result;
    }

    private void processMessage(SQSMessage message, Context context) throws Exception {
        String body = message.getBody();
        context.getLogger().log("Procesando mensaje: " + body);

        // Parsear el evento
        JsonNode eventNode = objectMapper.readTree(body);
        Long orderId = eventNode.get("orderId").asLong();
        
        context.getLogger().log("OrderId extraido: " + orderId);

        // Simular procesamiento de notificacion (envio de email, SMS, etc.)
        simulateNotificationProcessing(orderId, context);

        // Actualizar estado de la orden a NOTIFIED
        updateOrderStatus(orderId, "NOTIFIED", context);
        
        context.getLogger().log("Orden " + orderId + " marcada como NOTIFIED");
    }

    private void simulateNotificationProcessing(Long orderId, Context context) {
        // En un escenario real, aqui se enviaria un email, SMS, push notification, etc.
        context.getLogger().log("Simulando envio de notificacion para orden " + orderId);
        
        // Simular delay de procesamiento
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private void updateOrderStatus(Long orderId, String newStatus, Context context) throws Exception {
        String url = ORDER_SERVICE_URL + "/orders/" + orderId + "/status";
        String requestBody = "{\"status\":\"" + newStatus + "\"}";

        context.getLogger().log("Llamando a: " + url);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Content-Type", "application/json")
            .method("PATCH", HttpRequest.BodyPublishers.ofString(requestBody))
            .timeout(Duration.ofSeconds(10))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            context.getLogger().log("Orden actualizada exitosamente. Response: " + response.body());
        } else {
            throw new RuntimeException("Error actualizando orden. Status: " + response.statusCode() 
                + ", Body: " + response.body());
        }
    }
}
