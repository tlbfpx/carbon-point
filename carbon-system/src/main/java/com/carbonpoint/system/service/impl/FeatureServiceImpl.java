package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.system.dto.res.FeatureRes;
import com.carbonpoint.system.dto.res.PageRes;
import com.carbonpoint.system.entity.FeatureEntity;
import com.carbonpoint.system.entity.ProductFeatureEntity;
import com.carbonpoint.system.mapper.FeatureMapper;
import com.carbonpoint.system.mapper.ProductFeatureMapper;
import com.carbonpoint.system.service.FeatureService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Feature service implementation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FeatureServiceImpl implements FeatureService {

    private final FeatureMapper featureMapper;
    private final ProductFeatureMapper productFeatureMapper;

    @Override
    public PageRes<FeatureRes> getFeatures(int page, int size, String type, String group, String keyword) {
        LambdaQueryWrapper<FeatureEntity> query = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(type)) {
            query.eq(FeatureEntity::getType, type);
        }
        if (StringUtils.hasText(group)) {
            query.eq(FeatureEntity::getGroup, group);
        }
        if (StringUtils.hasText(keyword)) {
            query.and(w -> w
                    .like(FeatureEntity::getName, keyword)
                    .or().like(FeatureEntity::getCode, keyword)
                    .or().like(FeatureEntity::getDescription, keyword));
        }
        query.orderByDesc(FeatureEntity::getCreateTime);

        IPage<FeatureEntity> result = featureMapper.selectPage(new Page<>(page, size), query);
        return PageRes.<FeatureRes>builder()
                .total(result.getTotal())
                .records(result.getRecords().stream().map(this::toRes).toList())
                .build();
    }

    @Override
    public Optional<FeatureRes> getFeature(String id) {
        FeatureEntity entity = featureMapper.selectById(id);
        return Optional.ofNullable(entity).map(this::toRes);
    }

    @Override
    @Transactional
    public FeatureRes createFeature(FeatureEntity data) {
        // Check duplicate code
        long count = featureMapper.selectCount(new LambdaQueryWrapper<FeatureEntity>()
                .eq(FeatureEntity::getCode, data.getCode()));
        if (count > 0) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "功能点编码已存在");
        }

        data.setCreateTime(LocalDateTime.now());
        data.setUpdateTime(LocalDateTime.now());
        featureMapper.insert(data);
        log.info("Feature created: id={}, code={}", data.getId(), data.getCode());
        return toRes(data);
    }

    @Override
    @Transactional
    public FeatureRes updateFeature(String id, FeatureEntity data) {
        FeatureEntity existing = featureMapper.selectById(id);
        if (existing == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "功能点不存在");
        }

        // Check duplicate code if changed
        if (StringUtils.hasText(data.getCode()) && !data.getCode().equals(existing.getCode())) {
            long count = featureMapper.selectCount(new LambdaQueryWrapper<FeatureEntity>()
                    .eq(FeatureEntity::getCode, data.getCode())
                    .ne(FeatureEntity::getId, id));
            if (count > 0) {
                throw new BusinessException(ErrorCode.PARAM_INVALID, "功能点编码已存在");
            }
            existing.setCode(data.getCode());
        }

        if (StringUtils.hasText(data.getName())) {
            existing.setName(data.getName());
        }
        if (StringUtils.hasText(data.getType())) {
            existing.setType(data.getType());
        }
        if (StringUtils.hasText(data.getValueType())) {
            existing.setValueType(data.getValueType());
        }
        if (data.getDefaultValue() != null) {
            existing.setDefaultValue(data.getDefaultValue());
        }
        if (data.getDescription() != null) {
            existing.setDescription(data.getDescription());
        }
        if (StringUtils.hasText(data.getGroup())) {
            existing.setGroup(data.getGroup());
        }

        existing.setUpdateTime(LocalDateTime.now());
        featureMapper.updateById(existing);
        log.info("Feature updated: id={}", id);
        return toRes(existing);
    }

    @Override
    @Transactional
    public void deleteFeature(String id) {
        FeatureEntity existing = featureMapper.selectById(id);
        if (existing == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "功能点不存在");
        }

        // Check if feature is in use by any product
        long usageCount = productFeatureMapper.selectCount(
                new LambdaQueryWrapper<ProductFeatureEntity>()
                        .eq(ProductFeatureEntity::getFeatureId, id));
        if (usageCount > 0) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "该功能点已被产品使用，无法删除");
        }

        featureMapper.deleteById(id);
        log.info("Feature deleted: id={}", id);
    }

    private FeatureRes toRes(FeatureEntity entity) {
        return FeatureRes.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .type(entity.getType())
                .valueType(entity.getValueType())
                .defaultValue(entity.getDefaultValue())
                .description(entity.getDescription())
                .group(entity.getGroup())
                .createTime(entity.getCreateTime())
                .updateTime(entity.getUpdateTime())
                .build();
    }
}
