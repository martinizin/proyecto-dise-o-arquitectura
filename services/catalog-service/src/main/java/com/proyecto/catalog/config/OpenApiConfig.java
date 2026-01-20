package com.proyecto.catalog.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Configuracion OpenAPI/Swagger para Catalog Service.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI catalogServiceOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Catalog Service API")
                .description("Microservicio para gestion de catalogo de productos. " +
                    "Incluye operaciones CRUD con cache Redis y busqueda full-text con Elasticsearch.")
                .version("1.0.0")
                .contact(new Contact()
                    .name("Equipo de Desarrollo")
                    .email("dev@proyecto.com"))
                .license(new License()
                    .name("MIT License")
                    .url("https://opensource.org/licenses/MIT")))
            .servers(List.of(
                new Server()
                    .url("http://localhost:8082")
                    .description("Servidor de desarrollo"),
                new Server()
                    .url("http://localhost:8080/api")
                    .description("API Gateway")
            ));
    }
}
