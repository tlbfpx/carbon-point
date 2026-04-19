package com.carbonpoint.platform.registry;

import com.carbonpoint.platform.ProductModule;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registry that auto-discovers all {@link ProductModule} beans at startup.
 * Duplicate module codes cause an {@link IllegalStateException}.
 */
@Slf4j
@Component
public class ProductRegistry {

    private final Map<String, ProductModule> moduleMap = new ConcurrentHashMap<>();

    public ProductRegistry(Optional<List<ProductModule>> modules) {
        this.modules = modules;
    }

    private final Optional<List<ProductModule>> modules;

    @PostConstruct
    public void init() {
        List<ProductModule> moduleList = modules.orElse(Collections.emptyList());
        for (ProductModule module : moduleList) {
            String code = module.getCode();
            ProductModule existing = moduleMap.putIfAbsent(code, module);
            if (existing != null) {
                throw new IllegalStateException(
                        "Duplicate ProductModule code '" + code + "': "
                                + existing.getClass().getName() + " and " + module.getClass().getName());
            }
            log.info("Registered ProductModule: code={}, name={}, class={}",
                    code, module.getName(), module.getClass().getSimpleName());
        }
        log.info("ProductRegistry initialized with {} module(s)", moduleMap.size());
    }

    /**
     * Get all registered modules.
     */
    public List<ProductModule> getAllModules() {
        return List.copyOf(moduleMap.values());
    }

    /**
     * Look up a module by code.
     *
     * @return the module, or empty if not found
     */
    public Optional<ProductModule> getModule(String code) {
        return Optional.ofNullable(moduleMap.get(code));
    }

    /**
     * Check if a module with the given code is registered.
     */
    public boolean hasModule(String code) {
        return moduleMap.containsKey(code);
    }
}
