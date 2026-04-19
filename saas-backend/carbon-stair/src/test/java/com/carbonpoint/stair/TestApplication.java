package com.carbonpoint.stair;

import com.carbonpoint.common.security.SecurityProperties;
import com.carbonpoint.system.service.EmailService;
import org.mockito.Mockito;
import org.mybatis.spring.annotation.MapperScan;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.ServletContextInitializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.RedisOperations;
import org.springframework.data.redis.connection.BitFieldSubCommands;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

import java.time.Duration;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Test application entry point for integration tests.
 */
@SpringBootApplication(scanBasePackages = "com.carbonpoint")
@EnableScheduling
@EnableConfigurationProperties(SecurityProperties.class)
@MapperScan({"com.carbonpoint.system.mapper", "com.carbonpoint.stair.mapper", "com.carbonpoint.points.mapper", "com.carbonpoint.mall.mapper", "com.carbonpoint.report.mapper", "com.carbonpoint.honor.mapper", "com.carbonpoint.common.mapper"})
public class TestApplication {

    public static void main(String[] args) {
        SpringApplication.run(TestApplication.class, args);
    }

    /**
     * Register a mock servlet with an empty name so that Spring Security's
     * DispatcherServletRequestMatcher (used internally by Spring Security 6.2+)
     * can find it in the MockMvc servlet context during integration tests.
     */
    @Bean
    public ServletContextInitializer mockDispatcherServletInitializer() {
        return servletContext -> {
            servletContext.addServlet("", new jakarta.servlet.http.HttpServlet() {
            });
        };
    }

    @Bean
    public EmailService emailService() {
        return Mockito.mock(EmailService.class);
    }

    @Bean
    @Primary
    public RedissonClient redissonClient() {
        RedissonClient mock = Mockito.mock(RedissonClient.class);

        // ── RLock mock ──────────────────────────────────
        RLock mockLock = Mockito.mock(RLock.class);
        try {
            when(mockLock.tryLock(Mockito.anyLong(), Mockito.anyLong(), Mockito.any())).thenReturn(true);
            when(mockLock.isHeldByCurrentThread()).thenReturn(true);
            Mockito.doNothing().when(mockLock).unlock();
        } catch (Exception e) {
            // ignore
        }
        when(mock.getLock(Mockito.anyString())).thenReturn(mockLock);

        // ── RSet mock backed by real ConcurrentHashMap ──
        final ConcurrentHashMap<String, String> setStorage = new ConcurrentHashMap<>();
        org.redisson.api.RSet<Object> mockSet = Mockito.mock(org.redisson.api.RSet.class);
        when(mockSet.add(Mockito.any())).thenAnswer(inv -> setStorage.putIfAbsent(inv.getArgument(0).toString(), "1") == null);
        when(mockSet.contains(Mockito.any())).thenAnswer(inv -> setStorage.containsKey(inv.getArgument(0).toString()));
        when(mockSet.isEmpty()).thenAnswer(inv -> setStorage.isEmpty());
        when(mockSet.size()).thenAnswer(inv -> setStorage.size());
        when(mockSet.remove(Mockito.any())).thenAnswer(inv -> setStorage.remove(inv.getArgument(0).toString()) != null);
        Mockito.doAnswer(inv -> { setStorage.clear(); return null; }).when(mockSet).clear();
        when(mock.getSet(Mockito.anyString())).thenReturn((org.redisson.api.RSet) mockSet);

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
        Mockito.doAnswer(inv -> storage.containsKey(inv.getArgument(0)) ? 1800L : -1L)
                .when(spyTemplate).getExpire(Mockito.anyString());
        Mockito.doAnswer(inv -> storage.containsKey(inv.getArgument(0)) ? 1800L : -1L)
                .when(spyTemplate).getExpire(Mockito.anyString(), Mockito.any(TimeUnit.class));

        return spyTemplate;
    }

    /**
     * In-memory ValueOperations for Spring Data Redis 3.2.0.
     */
    public static class InMemoryValueOperations implements ValueOperations<String, String> {
        private final ConcurrentHashMap<String, String> storage;

        public InMemoryValueOperations(ConcurrentHashMap<String, String> storage) {
            this.storage = storage;
        }

        @Override
        public void set(String key, String value) { storage.put(key, value); }

        @Override
        public void set(String key, String value, long timeout, TimeUnit unit) { storage.put(key, value); }

        @Override
        public void set(String key, String value, Duration timeout) { storage.put(key, value); }

        @Override
        public Boolean setIfAbsent(String key, String value) {
            return storage.putIfAbsent(key, value) == null;
        }

        @Override
        public Boolean setIfAbsent(String key, String value, long timeout, TimeUnit unit) {
            return setIfAbsent(key, value);
        }

        @Override
        public Boolean setIfAbsent(String key, String value, Duration timeout) {
            return setIfAbsent(key, value);
        }

        @Override
        public Boolean setIfPresent(String key, String value) {
            return storage.replace(key, value) != null;
        }

        @Override
        public Boolean setIfPresent(String key, String value, long timeout, TimeUnit unit) {
            return setIfPresent(key, value);
        }

        @Override
        public Boolean setIfPresent(String key, String value, Duration timeout) {
            return setIfPresent(key, value);
        }

        @Override
        public void multiSet(Map<? extends String, ? extends String> map) {
            map.forEach(storage::put);
        }

        @Override
        public Boolean multiSetIfAbsent(Map<? extends String, ? extends String> map) {
            boolean allAbsent = map.keySet().stream().allMatch(k -> storage.putIfAbsent(k, map.get(k)) == null);
            return allAbsent ? Boolean.TRUE : Boolean.FALSE;
        }

        @Override
        public String get(Object key) { return storage.get(key); }

        @Override
        public String getAndDelete(String key) { return storage.remove(key); }

        @Override
        public String getAndExpire(String key, long timeout, TimeUnit unit) { return storage.get(key); }

        @Override
        public String getAndExpire(String key, Duration timeout) { return storage.get(key); }

        @Override
        public String getAndPersist(String key) { return storage.get(key); }

        @Override
        public String getAndSet(String key, String value) {
            String prev = storage.get(key);
            storage.put(key, value);
            return prev;
        }

        @Override
        public List<String> multiGet(Collection<String> keys) {
            return keys.stream().map(storage::get).toList();
        }

        @Override
        public Long increment(String key) { return increment(key, 1L); }

        @Override
        public Long increment(String key, long delta) {
            return storage.compute(key, (k, v) -> {
                long cur = (v == null) ? 0 : Long.parseLong(v);
                return Long.toString(cur + delta);
            }) != null ? Long.parseLong(storage.get(key)) : delta;
        }

        @Override
        public Double increment(String key, double delta) {
            return storage.compute(key, (k, v) -> {
                double cur = (v == null) ? 0.0 : Double.parseDouble(v);
                return Double.toString(cur + delta);
            }) != null ? Double.parseDouble(storage.get(key)) : delta;
        }

        @Override
        public Long decrement(String key) { return decrement(key, 1L); }

        @Override
        public Long decrement(String key, long delta) {
            return storage.compute(key, (k, v) -> {
                long cur = (v == null) ? 0 : Long.parseLong(v);
                return Long.toString(cur - delta);
            }) != null ? Long.parseLong(storage.get(key)) : -delta;
        }

        @Override
        public Integer append(String key, String value) {
            String existing = storage.get(key);
            String newVal = (existing == null ? "" : existing) + value;
            storage.put(key, newVal);
            return newVal.length();
        }

        @Override
        public String get(String key, long start, long end) {
            String val = storage.get(key);
            if (val == null) return "";
            int s = (int) Math.max(0, start);
            int e = (int) Math.min(val.length() - 1, end);
            if (s > e) return "";
            return val.substring(s, e + 1);
        }

        @Override
        public void set(String key, String value, long offset) { storage.put(key, value); }

        @Override
        public Long size(String key) {
            String val = storage.get(key);
            return val != null ? (long) val.length() : 0L;
        }

        @Override
        public Boolean setBit(String key, long offset, boolean value) {
            String val = storage.get(key);
            if (val == null) val = "";
            if (offset >= val.length()) val = val + "\0".repeat((int) (offset - val.length() + 1));
            char[] chars = val.toCharArray();
            boolean old = (chars[(int) offset] & 1) != 0;
            chars[(int) offset] = value ? (char) (chars[(int) offset] | 1) : (char) (chars[(int) offset] & 0xFE);
            storage.put(key, new String(chars));
            return old;
        }

        @Override
        public Boolean getBit(String key, long offset) {
            String val = storage.get(key);
            if (val == null || offset >= val.length()) return false;
            return (val.charAt((int) offset) & 1) != 0;
        }

        @Override
        public List<Long> bitField(String key, BitFieldSubCommands subCommands) {
            return List.of();
        }

        @Override
        public RedisOperations<String, String> getOperations() { return null; }
    }
}
