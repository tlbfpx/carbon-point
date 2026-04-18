package com.carbonpoint.mall;

import org.mockito.Mockito;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.connection.BitFieldSubCommands;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.RedisOperations;

import java.time.Duration;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Test configuration providing mock Redis and Redisson beans.
 * Used by integration tests to avoid needing a real Redis instance.
 * Uses @Configuration (not @TestConfiguration) to ensure it is processed like
 * a regular @Configuration class, allowing @Primary to take precedence.
 */
@Configuration
public class TestRedisConfig {

    private final ConcurrentHashMap<String, String> storage = new ConcurrentHashMap<>();

    @Bean
    @Primary
    public RedisConnectionFactory redisConnectionFactory() {
        RedisConnectionFactory mockFactory = Mockito.mock(RedisConnectionFactory.class);
        RedisConnection mockConn = Mockito.mock(RedisConnection.class);
        Mockito.when(mockFactory.getConnection()).thenReturn(mockConn);
        return mockFactory;
    }

    @Bean
    @Primary
    @SuppressWarnings({"unchecked", "rawtypes"})
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory connectionFactory) {
        StringRedisTemplate realTemplate = new StringRedisTemplate(connectionFactory);
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
        Mockito.doReturn(true).when(spyTemplate).expire(Mockito.anyString(), Mockito.any(Duration.class));
        Mockito.doAnswer(inv -> storage.containsKey(inv.getArgument(0)) ? 1800L : -1L)
                .when(spyTemplate).getExpire(Mockito.anyString());
        Mockito.doAnswer(inv -> storage.containsKey(inv.getArgument(0)) ? 1800L : -1L)
                .when(spyTemplate).getExpire(Mockito.anyString(), Mockito.any(TimeUnit.class));

        return spyTemplate;
    }

    @Bean
    @Primary
    public RedissonClient redissonClient() {
        RedissonClient mock = Mockito.mock(RedissonClient.class);

        // Mock RLock
        RLock mockLock = Mockito.mock(RLock.class);
        try {
            Mockito.when(mockLock.tryLock(Mockito.anyLong(), Mockito.anyLong(), Mockito.any())).thenReturn(true);
            Mockito.when(mockLock.isHeldByCurrentThread()).thenReturn(true);
            Mockito.doNothing().when(mockLock).unlock();
        } catch (Exception e) {
            // ignore
        }
        Mockito.when(mock.getLock(Mockito.anyString())).thenReturn(mockLock);

        // Mock RSet backed by ConcurrentHashMap
        final ConcurrentHashMap<String, String> setStorage = new ConcurrentHashMap<>();
        org.redisson.api.RSet<Object> mockSet = Mockito.mock(org.redisson.api.RSet.class);
        Mockito.when(mockSet.add(Mockito.any())).thenAnswer(inv -> setStorage.putIfAbsent(inv.getArgument(0).toString(), "1") == null);
        Mockito.when(mockSet.contains(Mockito.any())).thenAnswer(inv -> setStorage.containsKey(inv.getArgument(0).toString()));
        Mockito.when(mockSet.isEmpty()).thenAnswer(inv -> setStorage.isEmpty());
        Mockito.when(mockSet.size()).thenAnswer(inv -> setStorage.size());
        Mockito.when(mockSet.remove(Mockito.any())).thenAnswer(inv -> setStorage.remove(inv.getArgument(0).toString()) != null);
        Mockito.doAnswer(inv -> { setStorage.clear(); return null; }).when(mockSet).clear();
        Mockito.when(mock.getSet(Mockito.anyString())).thenReturn((org.redisson.api.RSet) mockSet);

        return mock;
    }

    /**
     * In-memory ValueOperations for Spring Data Redis.
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
