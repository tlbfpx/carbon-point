package com.carbonpoint.mall;

import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.TenantLineInnerInterceptor;
import com.carbonpoint.common.config.CustomTenantLineHandler;
import com.carbonpoint.common.security.SecurityProperties;
import com.carbonpoint.platform.rule.RuleChainExecutor;
import com.carbonpoint.points.service.PointEngineService;
import com.carbonpoint.system.service.EmailService;
import com.carbonpoint.system.service.NotificationTrigger;
import org.mockito.Mockito;
import org.mybatis.spring.annotation.MapperScan;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.beans.factory.support.BeanNameGenerator;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.concurrent.ConcurrentHashMap;

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
                "com.carbonpoint.points",
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
                        com.carbonpoint.system.service.impl.MockEmailServiceImpl.class,
                        PointEngineService.class
                }
        )
)
@MapperScan(value = {
        "com.carbonpoint.points.mapper",
        "com.carbonpoint.mall.mapper",
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

    @Bean
    public EmailService emailService() {
        return Mockito.mock(EmailService.class);
    }

    @Bean
    @Primary
    public NotificationTrigger notificationTrigger() {
        return Mockito.mock(NotificationTrigger.class);
    }

    @Bean
    @Primary
    public RedissonClient redissonClient() {
        return Mockito.mock(RedissonClient.class);
    }
}
