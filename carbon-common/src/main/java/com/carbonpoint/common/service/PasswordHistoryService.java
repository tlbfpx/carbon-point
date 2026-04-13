package com.carbonpoint.common.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.carbonpoint.common.entity.PasswordHistoryEntity;
import com.carbonpoint.common.mapper.PasswordHistoryMapper;
import com.carbonpoint.common.security.EnhancedPasswordEncoder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Password history service.
 * Prevents password reuse within configured history window.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordHistoryService extends ServiceImpl<PasswordHistoryMapper, PasswordHistoryEntity> {

    private final EnhancedPasswordEncoder passwordEncoder;

    /**
     * Add a password hash to history for a user.
     *
     * @param userId        the user ID
     * @param passwordHash  the password hash to record
     */
    public void addHistory(Long userId, String passwordHash) {
        PasswordHistoryEntity history = new PasswordHistoryEntity();
        history.setUserId(userId);
        history.setPasswordHash(passwordHash);
        history.setCreatedAt(java.time.LocalDateTime.now());
        save(history);
    }

    /**
     * Check if a raw password matches any of the user's recent passwords.
     *
     * @param userId        the user ID
     * @param rawPassword   the raw password to check
     * @param historyCount  number of recent passwords to check
     * @return true if the password was recently used
     */
    public boolean isRecentlyUsed(Long userId, String rawPassword, int historyCount) {
        LambdaQueryWrapper<PasswordHistoryEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PasswordHistoryEntity::getUserId, userId)
                .orderByDesc(PasswordHistoryEntity::getCreatedAt)
                .last("LIMIT " + historyCount);

        List<PasswordHistoryEntity> histories = list(wrapper);

        for (PasswordHistoryEntity history : histories) {
            if (passwordEncoder.matches(rawPassword, history.getPasswordHash())) {
                log.debug("Password reuse detected for userId={}", userId);
                return true;
            }
        }
        return false;
    }

    /**
     * Prune old password history records beyond the history window.
     *
     * @param userId       the user ID
     * @param keepCount    how many records to keep
     */
    public void pruneOldRecords(Long userId, int keepCount) {
        // This is called after adding a new record to keep the table from growing unbounded
        LambdaQueryWrapper<PasswordHistoryEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PasswordHistoryEntity::getUserId, userId)
                .orderByDesc(PasswordHistoryEntity::getCreatedAt)
                .last("LIMIT 1 OFFSET " + keepCount);

        List<PasswordHistoryEntity> toDelete = list(wrapper);
        if (!toDelete.isEmpty()) {
            removeByIds(toDelete.stream().map(PasswordHistoryEntity::getId).toList());
        }
    }
}
