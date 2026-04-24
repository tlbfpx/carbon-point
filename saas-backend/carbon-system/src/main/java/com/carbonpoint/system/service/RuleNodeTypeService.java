package com.carbonpoint.system.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.system.entity.RuleNodeTypeEntity;
import com.carbonpoint.system.mapper.RuleNodeTypeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RuleNodeTypeService {
    private final RuleNodeTypeMapper mapper;

    public List<RuleNodeTypeEntity> list() {
        return mapper.selectList(new LambdaQueryWrapper<RuleNodeTypeEntity>()
                .orderByAsc(RuleNodeTypeEntity::getSortOrder));
    }

    public RuleNodeTypeEntity getById(String id) {
        return mapper.selectById(id);
    }

    @Transactional
    public RuleNodeTypeEntity create(RuleNodeTypeEntity entity) {
        mapper.insert(entity);
        return entity;
    }

    @Transactional
    public RuleNodeTypeEntity update(String id, RuleNodeTypeEntity updates) {
        RuleNodeTypeEntity existing = mapper.selectById(id);
        if (existing == null) throw new IllegalArgumentException("规则节点类型不存在: " + id);
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getDescription() != null) existing.setDescription(updates.getDescription());
        if (updates.getBeanName() != null) existing.setBeanName(updates.getBeanName());
        if (updates.getSortOrder() != null) existing.setSortOrder(updates.getSortOrder());
        mapper.updateById(existing);
        return existing;
    }

    @Transactional
    public void delete(String id) {
        mapper.deleteById(id);
    }
}
