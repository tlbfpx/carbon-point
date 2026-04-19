package com.carbonpoint.walking;

import com.carbonpoint.common.security.SecurityProperties;
import com.carbonpoint.system.service.EmailService;
import org.mockito.Mockito;
import org.mybatis.spring.annotation.MapperScan;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.RedisOperations;
import org.springframework.data.redis.connection.BitFieldSubCommands;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.Duration;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Test application entry point for carbon-walking integration tests.
 */
@SpringBootApplication(scanBasePackages = "com.carbonpoint")
@EnableScheduling
@EnableConfigurationProperties(SecurityProperties.class)
@MapperScan({
        "com.carbonpoint.system.mapper",
        "com.carbonpoint.walking.mapper",
        "com.carbonpoint.points.mapper",
        "com.carbonpoint.common.mapper"
})
public class TestApplication {

    public static void main(String[] args) {
        SpringApplication.run(TestApplication.class, args);
    }

    @Bean
    public EmailService emailService() {
        return Mockito.mock(EmailService.class);
    }

    @Bean
    @Primary
    public RedissonClient redissonClient() {
        RedissonClient mock = Mockito.mock(RedissonClient.class);
        RLock mockLock = Mockito.mock(RLock.class);
        try {
            when(mockLock.tryLock(anyLong(), anyLong(), any())).thenReturn(true);
            when(mockLock.isHeldByCurrentThread()).thenReturn(true);
            Mockito.doNothing().when(mockLock).unlock();
        } catch (Exception e) {
            // ignore
        }
        when(mock.getLock(anyString())).thenReturn(mockLock);
        return mock;
    }

    @Bean
    @Primary
    public StringRedisTemplate stringRedisTemplate() {
        final ConcurrentHashMap<String, String> storage = new ConcurrentHashMap<>();

        org.springframework.data.redis.connection.RedisConnectionFactory mockFactory =
                Mockito.mock(org.springframework.data.redis.connection.RedisConnectionFactory.class);
        org.springframework.data.redis.connection.RedisConnection mockConn =
                Mockito.mock(org.springframework.data.redis.connection.RedisConnection.class);
        when(mockFactory.getConnection()).thenReturn(mockConn);

        StringRedisTemplate realTemplate = new StringRedisTemplate(mockFactory);
        realTemplate.setKeySerializer(new org.springframework.data.redis.serializer.StringRedisSerializer());
        realTemplate.setValueSerializer(new org.springframework.data.redis.serializer.StringRedisSerializer());
        realTemplate.afterPropertiesSet();

        StringRedisTemplate spyTemplate = Mockito.spy(realTemplate);

        InMemoryValueOperations inMemOps = new InMemoryValueOperations(storage);
        Mockito.doReturn(inMemOps).when(spyTemplate).opsForValue();

        Mockito.doAnswer(inv -> storage.remove(inv.getArgument(0)) != null)
                .when(spyTemplate).delete(Mockito.anyString());
        Mockito.doAnswer(inv -> storage.containsKey(inv.getArgument(0)))
                .when(spyTemplate).hasKey(Mockito.anyString());
        Mockito.doReturn(true).when(spyTemplate).expire(Mockito.anyString(), Mockito.anyLong(), Mockito.any(TimeUnit.class));

        return spyTemplate;
    }

    public static class InMemoryValueOperations implements ValueOperations<String, String> {
        private final ConcurrentHashMap<String, String> storage;

        public InMemoryValueOperations(ConcurrentHashMap<String, String> storage) {
            this.storage = storage;
        }

        @Override public void set(String key, String value) { storage.put(key, value); }
        @Override public void set(String key, String value, long timeout, TimeUnit unit) { storage.put(key, value); }
        @Override public void set(String key, String value, Duration timeout) { storage.put(key, value); }
        @Override public Boolean setIfAbsent(String key, String value) { return storage.putIfAbsent(key, value) == null; }
        @Override public Boolean setIfAbsent(String key, String value, long timeout, TimeUnit unit) { return setIfAbsent(key, value); }
        @Override public Boolean setIfAbsent(String key, String value, Duration timeout) { return setIfAbsent(key, value); }
        @Override public Boolean setIfPresent(String key, String value) { return storage.replace(key, value) != null; }
        @Override public Boolean setIfPresent(String key, String value, long timeout, TimeUnit unit) { return setIfPresent(key, value); }
        @Override public Boolean setIfPresent(String key, String value, Duration timeout) { return setIfPresent(key, value); }
        @Override public void multiSet(Map<? extends String, ? extends String> map) { map.forEach(storage::put); }
        @Override public Boolean multiSetIfAbsent(Map<? extends String, ? extends String> map) {
            boolean allAbsent = map.keySet().stream().allMatch(k -> storage.putIfAbsent(k, map.get(k).toString()) == null);
            return allAbsent;
        }
        @Override public String get(Object key) { return storage.get(key); }
        @Override public String getAndDelete(String key) { return storage.remove(key); }
        @Override public String getAndExpire(String key, long timeout, TimeUnit unit) { return storage.get(key); }
        @Override public String getAndExpire(String key, Duration timeout) { return storage.get(key); }
        @Override public String getAndPersist(String key) { return storage.get(key); }
        @Override public String getAndSet(String key, String value) { String prev = storage.get(key); storage.put(key, value); return prev; }
        @Override public List<String> multiGet(Collection<String> keys) { return keys.stream().map(storage::get).toList(); }
        @Override public Long increment(String key) { return increment(key, 1L); }
        @Override public Long increment(String key, long delta) {
            return Long.parseLong(storage.compute(key, (k, v) -> Long.toString((v == null ? 0 : Long.parseLong(v)) + delta)));
        }
        @Override public Double increment(String key, double delta) {
            return Double.parseDouble(storage.compute(key, (k, v) -> Double.toString((v == null ? 0 : Double.parseDouble(v)) + delta)));
        }
        @Override public Long decrement(String key) { return decrement(key, 1L); }
        @Override public Long decrement(String key, long delta) {
            return Long.parseLong(storage.compute(key, (k, v) -> Long.toString((v == null ? 0 : Long.parseLong(v)) - delta)));
        }
        @Override public Integer append(String key, String value) { String e = storage.get(key); String n = (e == null ? "" : e) + value; storage.put(key, n); return n.length(); }
        @Override public String get(String key, long start, long end) { String val = storage.get(key); if (val == null) return ""; return val.substring((int) Math.max(0, start), (int) Math.min(val.length(), end + 1)); }
        @Override public void set(String key, String value, long offset) { storage.put(key, value); }
        @Override public Long size(String key) { String val = storage.get(key); return val != null ? (long) val.length() : 0L; }
        @Override public Boolean setBit(String key, long offset, boolean value) { return false; }
        @Override public Boolean getBit(String key, long offset) { return false; }
        @Override public List<Long> bitField(String key, BitFieldSubCommands subCommands) { return List.of(); }
        @Override public RedisOperations<String, String> getOperations() { return null; }
    }
}
