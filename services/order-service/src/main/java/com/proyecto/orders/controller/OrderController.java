package com.proyecto.orders.controller;

import com.proyecto.orders.model.Order;
import com.proyecto.orders.repository.OrderRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/orders") // Ojo: El gateway redirige /api/orders/** a aquí
public class OrderController {

    private final OrderRepository repository;

    public OrderController(OrderRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Order> getAll() {
        return repository.findAll();
    }

    @PostMapping
    public Order create(@RequestBody Order order) {
        return repository.save(order);
    }
    
    @GetMapping("/{id}")
    public Order getOne(@PathVariable Long id) {
        return repository.findById(id).orElse(null);
    }
}