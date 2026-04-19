package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.system.entity.DictItemEntity;
import com.carbonpoint.system.mapper.DictItemMapper;
import com.carbonpoint.system.service.DictItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class DictItemServiceImpl implements DictItemService {

    private final DictItemMapper dictItemMapper;

    @Override
    public IPage<DictItemEntity> getDictItems(int page, int size, String dictType, Integer status, String keyword) {
        Page<DictItemEntity> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<DictItemEntity> query = new LambdaQueryWrapper<>();

        if (StringUtils.hasText(dictType)) {
            query.eq(DictItemEntity::getDictType, dictType);
        }
        if (status != null) {
            query.eq(DictItemEntity::getStatus, status);
        }
        if (StringUtils.hasText(keyword)) {
            query.and(w -> w
                    .like(DictItemEntity::getDictName, keyword)
                    .or()
                    .like(DictItemEntity::getDictCode, keyword));
        }

        query.orderByAsc(DictItemEntity::getSortOrder)
              .orderByDesc(DictItemEntity::getCreatedAt);

        return dictItemMapper.selectPage(pageParam, query);
    }

    @Override
    public DictItemEntity getDictItem(String id) {
        return dictItemMapper.selectById(id);
    }

    @Override
    public void createDictItem(DictItemEntity entity) {
        entity.setId(null);
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        dictItemMapper.insert(entity);
    }

    @Override
    public void updateDictItem(String id, DictItemEntity entity) {
        DictItemEntity existing = dictItemMapper.selectById(id);
        if (existing == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "字典项不存在");
        }
        entity.setId(id);
        entity.setUpdatedAt(LocalDateTime.now());
        dictItemMapper.updateById(entity);
    }

    @Override
    public void deleteDictItem(String id) {
        dictItemMapper.deleteById(id);
    }
}
