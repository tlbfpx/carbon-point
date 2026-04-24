package com.carbonpoint.system.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.system.entity.TriggerTypeEntity;
import com.carbonpoint.system.mapper.TriggerTypeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TriggerTypeService {
    private final TriggerTypeMapper mapper;

    public List<TriggerTypeEntity> list() {
        return mapper.selectList(new LambdaQueryWrapper<TriggerTypeEntity>()
                .orderByAsc(TriggerTypeEntity::getSortOrder));
    }

    public TriggerTypeEntity getById(String id) {
        return mapper.selectById(id);
    }

    public TriggerTypeEntity getByCode(String code) {
        return mapper.selectOne(new LambdaQueryWrapper<TriggerTypeEntity>()
                .eq(TriggerTypeEntity::getCode, code));
    }

    @Transactional
    public TriggerTypeEntity create(TriggerTypeEntity entity) {
        mapper.insert(entity);
        return entity;
    }

    @Transactional
    public TriggerTypeEntity update(String id, TriggerTypeEntity updates) {
        TriggerTypeEntity existing = mapper.selectById(id);
        if (existing == null) throw new IllegalArgumentException("触发器类型不存在: " + id);
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getDescription() != null) existing.setDescription(updates.getDescription());
        if (updates.getSortOrder() != null) existing.setSortOrder(updates.getSortOrder());
        mapper.updateById(existing);
        return existing;
    }

    @Transactional
    public void delete(String id) {
        mapper.deleteById(id);
    }
}
