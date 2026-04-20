package com.carbonpoint.mall;

import com.carbonpoint.common.security.SecurityProperties;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.beans.factory.support.BeanNameGenerator;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Spring Boot application entry point for integration tests.
 */
@EnableAspectJAutoProxy(proxyTargetClass = true)
@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(SecurityProperties.class)
@ComponentScan(
        basePackages = {
                "com.carbonpoint.mall",
                "com.carbonpoint.common",
                "com.carbonpoint.checkin",
                "com.carbonpoint.points",
                "com.carbonpoint.report",
                "com.carbonpoint.honor",
                "com.carbonpoint.system.controller",
                "com.carbonpoint.system.service",
                "com.carbonpoint.system.security"
        },
        nameGenerator = TestApplication.FqcnBeanNameGenerator.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = {
                        com.carbonpoint.system.controller.ProductController.class,
                        com.carbonpoint.system.controller.PlatformRegistryController.class,
                        com.carbonpoint.system.service.impl.MockEmailServiceImpl.class
                }
        )
)
@MapperScan(value = {
        "com.carbonpoint.checkin.mapper",
        "com.carbonpoint.points.mapper",
        "com.carbonpoint.mall.mapper",
        "com.carbonpoint.report.mapper",
        "com.carbonpoint.honor.mapper",
        "com.carbonpoint.common.mapper",
        "com.carbonpoint.system.mapper"
}, nameGenerator = TestApplication.FqcnBeanNameGenerator.class)
@Import({TestRedisConfig.class})
public class TestApplication {

    public static void main(String[] args) {
        SpringApplication.run(TestApplication.class, args);
    }

    /**
     * BeanNameGenerator that uses fully-qualified class names as bean names.
     * This ensures no naming conflicts between components from different packages
     * (e.g., system.ProductController vs mall.ProductController).
     */
    public static class FqcnBeanNameGenerator implements BeanNameGenerator {
        @Override
        public String generateBeanName(BeanDefinition definition, BeanDefinitionRegistry registry) {
            String beanClassName = definition.getBeanClassName();
            return beanClassName != null ? beanClassName : "";
        }
    }
}
