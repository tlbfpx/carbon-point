package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.system.entity.PlatformConfigEntity;
import com.carbonpoint.system.mapper.PlatformConfigMapper;
import com.carbonpoint.system.service.PlatformConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Platform configuration service implementation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PlatformConfigServiceImpl implements PlatformConfigService {

    private final PlatformConfigMapper configMapper;

    @Override
    public String getConfig(String key) {
        PlatformConfigEntity config = configMapper.selectOne(
                new LambdaQueryWrapper<PlatformConfigEntity>()
                        .eq(PlatformConfigEntity::getConfigKey, key)
        );
        return config != null ? config.getConfigValue() : null;
    }

    @Override
    @Transactional
    public void setConfig(String key, String value, String description) {
        PlatformConfigEntity config = configMapper.selectOne(
                new LambdaQueryWrapper<PlatformConfigEntity>()
                        .eq(PlatformConfigEntity::getConfigKey, key)
        );

        if (config != null) {
            config.setConfigValue(value);
            if (description != null) {
                config.setDescription(description);
            }
            configMapper.updateById(config);
        } else {
            config = new PlatformConfigEntity();
            config.setConfigKey(key);
            config.setConfigValue(value);
            config.setDescription(description);
            configMapper.insert(config);
        }

        log.info("Platform config updated: key={}", key);
    }

    @Override
    public List<PlatformConfigEntity> listAll() {
        return configMapper.selectList(new LambdaQueryWrapper<PlatformConfigEntity>());
    }

    @Override
    @Transactional
    public void batchUpdate(List<PlatformConfigEntity> configs) {
        for (PlatformConfigEntity cfg : configs) {
            PlatformConfigEntity existing = configMapper.selectOne(
                    new LambdaQueryWrapper<PlatformConfigEntity>()
                            .eq(PlatformConfigEntity::getConfigKey, cfg.getConfigKey())
            );
            if (existing != null) {
                existing.setConfigValue(cfg.getConfigValue());
                existing.setDescription(cfg.getDescription());
                existing.setUpdatedAt(LocalDateTime.now());
                configMapper.updateById(existing);
            } else {
                cfg.setCreatedAt(LocalDateTime.now());
                cfg.setUpdatedAt(LocalDateTime.now());
                configMapper.insert(cfg);
            }
            log.info("Platform config batch updated: key={}", cfg.getConfigKey());
        }
    }
}
