package com.carbonpoint.checkin.util;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

/**
 * Distributed lock utility using Redisson.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DistributedLock {

    private final RedissonClient redissonClient;

    private static final long LOCK_WAIT_TIME = 3L;    // max seconds to wait for lock
    private static final long LOCK_LEASE_TIME = 10L;  // auto-release after 10 seconds

    /**
     * Try to acquire a lock and execute the action.
     * Returns the result, or throws RuntimeException if lock couldn't be acquired.
     */
    public <T> T executeWithLock(String lockKey, Supplier<T> action) {
        RLock lock = redissonClient.getLock(lockKey);
        boolean acquired = false;
        try {
            acquired = lock.tryLock(LOCK_WAIT_TIME, LOCK_LEASE_TIME, TimeUnit.SECONDS);
            if (!acquired) {
                throw new RuntimeException("无法获取分布式锁，请稍后重试");
            }
            return action.get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("操作被中断，请稍后重试");
        } finally {
            if (acquired && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    /**
     * Try to acquire a lock and execute the action.
     * Returns null if lock could not be acquired (graceful fallback path).
     * This enables DB-only fallback when Redis lock fails.
     */
    public <T> T tryExecuteWithLock(String lockKey, Supplier<T> action) {
        RLock lock = redissonClient.getLock(lockKey);
        boolean acquired = false;
        try {
            acquired = lock.tryLock(LOCK_WAIT_TIME, LOCK_LEASE_TIME, TimeUnit.SECONDS);
            if (!acquired) {
                // Graceful fallback — Redis unavailable, rely on DB unique index
                log.warn("Redis lock unavailable for key={}, falling back to DB path", lockKey);
                return null;
            }
            return action.get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Redis lock interrupted for key={}, falling back to DB path", lockKey);
            return null;
        } finally {
            if (acquired && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    /**
     * Execute action with lock, no return value.
     */
    public void executeWithLock(String lockKey, Runnable action) {
        executeWithLock(lockKey, () -> {
            action.run();
            return null;
        });
    }

    /**
     * Build the standard check-in lock key.
     */
    public static String checkInLockKey(Long userId, String date, Long ruleId) {
        return String.format("lock:checkin:%d:%s:%d", userId, date, ruleId);
    }
}
