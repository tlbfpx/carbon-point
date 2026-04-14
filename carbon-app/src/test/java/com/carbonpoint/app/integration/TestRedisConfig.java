package com.carbonpoint.app.integration;

import org.mockito.Mockito;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.ZSetOperations;

import java.time.Duration;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Test configuration providing mock Redis and Redisson beans.
 * Used by integration tests in carbon-app to avoid needing a real Redis instance.
 */
@TestConfiguration
public class TestRedisConfig {

    private final ConcurrentHashMap<String, String> storage = new ConcurrentHashMap<>();

    @Bean
    @Primary
    public RedisConnectionFactory redisConnectionFactory() {
        RedisConnectionFactory mockFactory = Mockito.mock(RedisConnectionFactory.class);
        RedisConnection mockConn = Mockito.mock(RedisConnection.class);

        // Make getConnection() return the mock connection
        Mockito.when(mockFactory.getConnection()).thenReturn(mockConn);

        // Mock key commands
        Mockito.when(mockConn.get(Mockito.any(byte[].class))).thenAnswer(inv -> storage.get(new String((byte[]) inv.getArgument(0))));
        Mockito.doAnswer(inv -> { storage.put(new String((byte[]) inv.getArgument(0)), new String((byte[]) inv.getArgument(1))); return null; }).when(mockConn).set(Mockito.any(byte[].class), Mockito.any(byte[].class));
        Mockito.doAnswer(inv -> storage.remove(new String((byte[]) inv.getArgument(0))) != null).when(mockConn).del(Mockito.any(byte[].class));
        Mockito.when(mockConn.expire(Mockito.any(byte[].class), Mockito.anyLong())).thenReturn(true);
        Mockito.when(mockConn.pExpire(Mockito.any(byte[].class), Mockito.anyLong())).thenReturn(true);
        Mockito.when(mockConn.ttl(Mockito.any(byte[].class))).thenReturn(1800L);
        Mockito.when(mockConn.pTtl(Mockito.any(byte[].class))).thenReturn(1800000L);
        Mockito.doAnswer(inv -> {
            storage.clear();
            return null;
        }).when(mockConn).flushAll();

        return mockFactory;
    }

    @Bean
    @Primary
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory connectionFactory) {
        StringRedisTemplate template = new StringRedisTemplate();
        template.setConnectionFactory(connectionFactory);
        template.afterPropertiesSet();

        StringRedisTemplate spy = Mockito.spy(template);

        InMemoryValueOperations inMemOps = new InMemoryValueOperations(storage);
        Mockito.doReturn(inMemOps).when(spy).opsForValue();

        Mockito.doAnswer(inv -> storage.remove(inv.getArgument(0)) != null)
                .when(spy).delete(Mockito.anyString());
        Mockito.doAnswer(inv -> storage.containsKey(inv.getArgument(0)))
                .when(spy).hasKey(Mockito.anyString());
        Mockito.doReturn(true).when(spy).expire(Mockito.anyString(), Mockito.anyLong(), Mockito.any(TimeUnit.class));
        Mockito.doReturn(true).when(spy).expire(Mockito.anyString(), Mockito.any(Duration.class));
        Mockito.doAnswer(inv -> storage.containsKey(inv.getArgument(0)) ? 1800L : -1L)
                .when(spy).getExpire(Mockito.anyString());
        Mockito.doAnswer(inv -> storage.containsKey(inv.getArgument(0)) ? 1800L : -1L)
                .when(spy).getExpire(Mockito.anyString(), Mockito.any(TimeUnit.class));
        Mockito.doAnswer(inv -> {
            String key = inv.getArgument(0);
            return storage.putIfAbsent(key, inv.getArgument(1)) == null;
        }).when(spy).opsForValue().setIfAbsent(Mockito.anyString(), Mockito.anyString());
        Mockito.doAnswer(inv -> {
            String key = inv.getArgument(0);
            storage.put(key, inv.getArgument(1));
            return true;
        }).when(spy).opsForValue().set(Mockito.anyString(), Mockito.anyString());

        return spy;
    }

    @Bean
    @Primary
    @SuppressWarnings({"unchecked", "rawtypes"})
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> mock = Mockito.mock(RedisTemplate.class);
        Mockito.when(mock.getConnectionFactory()).thenReturn(connectionFactory);

        HashOperations<String, Object, Object> mockHashOps = Mockito.mock(HashOperations.class);
        ZSetOperations<String, Object> mockZSetOps = Mockito.mock(ZSetOperations.class);
        ListOperations<String, Object> mockListOps = Mockito.mock(ListOperations.class);

        Mockito.when(mock.opsForHash()).thenReturn(mockHashOps);
        Mockito.when(mock.opsForZSet()).thenReturn(mockZSetOps);
        Mockito.when(mock.opsForList()).thenReturn(mockListOps);

        // Mock execute() to return Long (0) for delete operations
        Mockito.when(mock.execute(Mockito.any(org.springframework.data.redis.core.RedisCallback.class), Mockito.anyBoolean()))
                .thenReturn(0L);
        Mockito.when(mock.execute(Mockito.any(org.springframework.data.redis.core.RedisCallback.class)))
                .thenReturn(0L);

        return mock;
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

        // Mock RSet
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
        public Long increment(String key) {
            return storage.compute(key, (k, v) -> {
                long cur = (v == null) ? 0 : Long.parseLong(v);
                return Long.toString(cur + 1);
            }) != null ? Long.parseLong(storage.get(key)) : 1L;
        }

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
                return String.valueOf(cur + delta);
            }) != null ? Double.parseDouble(storage.get(key)) : delta;
        }

        @Override
        public Long decrement(String key) {
            return decrement(key, 1L);
        }

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
        public List<Long> bitField(String key, org.springframework.data.redis.connection.BitFieldSubCommands subCommands) {
            return List.of();
        }

        @Override
        public org.springframework.data.redis.core.RedisOperations<String, String> getOperations() { return null; }
    }
}
