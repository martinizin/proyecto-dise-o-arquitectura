package com.proyecto.orders.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Configuracion OpenAPI/Swagger para Order Service.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI orderServiceOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Order Service API")
                .description("Microservicio para gestion de ordenes de compra. " +
                    "Permite crear, consultar y actualizar el estado de las ordenes.")
                .version("1.0.0")
                .contact(new Contact()
                    .name("Equipo de Desarrollo")
                    .email("dev@proyecto.com"))
                .license(new License()
                    .name("MIT License")
                    .url("https://opensource.org/licenses/MIT")))
            .servers(List.of(
                new Server()
                    .url("http://localhost:8081")
                    .description("Servidor de desarrollo"),
                new Server()
                    .url("http://localhost:8080/api")
                    .description("API Gateway")
            ));
    }
}
