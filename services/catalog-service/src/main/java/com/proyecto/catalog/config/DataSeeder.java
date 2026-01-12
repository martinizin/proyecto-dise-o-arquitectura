package com.proyecto.catalog.config;

import com.proyecto.catalog.model.Product;
import com.proyecto.catalog.repository.ProductRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.Arrays;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner initDatabase(ProductRepository repository) {
        return args -> {
            if (repository.count() == 0) {
                repository.saveAll(Arrays.asList(
                    new Product("Laptop Gamer", 1200.0, 10),
                    new Product("Mouse Óptico", 25.0, 50),
                    new Product("Teclado Mecánico", 80.0, 30),
                    new Product("Monitor 24 pulg", 200.0, 15),
                    new Product("Silla Ergonómica", 150.0, 5)
                ));
                System.out.println("--- Datos de prueba cargados en Catálogo ---");
            }
        };
    }
}