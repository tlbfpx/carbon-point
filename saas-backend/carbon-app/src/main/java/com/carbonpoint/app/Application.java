package com.carbonpoint.app;

import com.carbonpoint.common.security.SecurityProperties;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication(scanBasePackages = "com.carbonpoint")
@EnableAsync
@EnableScheduling
@EnableConfigurationProperties(SecurityProperties.class)
@MapperScan({"com.carbonpoint.system.mapper", "com.carbonpoint.stair.mapper", "com.carbonpoint.walking.mapper", "com.carbonpoint.points.mapper", "com.carbonpoint.mall.mapper", "com.carbonpoint.report.mapper", "com.carbonpoint.honor.mapper", "com.carbonpoint.quiz.mapper", "com.carbonpoint.common.mapper"})
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
