package com.carbonpoint.system.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.security.EnhancedPasswordEncoder;
import com.carbonpoint.system.entity.PasswordHistory;
import com.carbonpoint.system.mapper.PasswordHistoryMapper;
import com.carbonpoint.common.security.SecurityProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 密码历史记录服务。
 * <p>
 * 功能：记录历史密码哈希，禁止最近 N 次密码重复使用。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordHistoryService {

    private final PasswordHistoryMapper passwordHistoryMapper;
    private final EnhancedPasswordEncoder passwordEncoder;
    private final SecurityProperties securityProperties;

    /**
     * 检查新密码是否与最近 N 次密码重复。
     *
     * @param userId      用户 ID
     * @param tenantId    租户 ID
     * @param newPassword 新密码明文
     * @throws BusinessException 如果重复抛出异常
     */
    @Transactional
    public void checkAndRecord(Long userId, Long tenantId, String newPassword) {
        int maxHistory = securityProperties.getPassword().getHistoryCount();

        // 获取最近 N 条历史记录
        LambdaQueryWrapper<PasswordHistory> qw = new LambdaQueryWrapper<>();
        qw.eq(PasswordHistory::getUserId, userId)
                .eq(PasswordHistory::getTenantId, tenantId)
                .orderByDesc(PasswordHistory::getCreatedAt)
                .last("LIMIT " + maxHistory);
        List<PasswordHistory> history = passwordHistoryMapper.selectList(qw);

        // 检查是否重复
        for (PasswordHistory entry : history) {
            if (passwordEncoder.matches(newPassword, entry.getPasswordHash())) {
                throw new BusinessException(ErrorCode.AUTH_PASSWORD_HISTORY_REUSE,
                        "新密码不能与最近 " + maxHistory + " 次密码重复，请使用不同密码");
            }
        }

        // 记录新密码
        PasswordHistory entry = new PasswordHistory();
        entry.setUserId(userId);
        entry.setTenantId(tenantId);
        entry.setPasswordHash(passwordEncoder.encode(newPassword));
        passwordHistoryMapper.insert(entry);

        // 如果超过最大历史条数，删除最早的记录（保持数据库干净）
        if (history.size() >= maxHistory) {
            LambdaQueryWrapper<PasswordHistory> deleteQw = new LambdaQueryWrapper<>();
            deleteQw.eq(PasswordHistory::getUserId, userId)
                    .eq(PasswordHistory::getTenantId, tenantId)
                    .orderByAsc(PasswordHistory::getCreatedAt)
                    .last("LIMIT 1");
            PasswordHistory oldest = passwordHistoryMapper.selectOne(deleteQw);
            if (oldest != null) {
                passwordHistoryMapper.deleteById(oldest.getId());
            }
        }

        log.debug("Password history updated: userId={}, history size={}", userId, history.size() + 1);
    }
}
