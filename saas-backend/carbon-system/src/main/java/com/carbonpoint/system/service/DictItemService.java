package com.carbonpoint.system.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.carbonpoint.system.entity.DictItemEntity;

public interface DictItemService {

    IPage<DictItemEntity> getDictItems(int page, int size, String dictType, Integer status, String keyword);

    DictItemEntity getDictItem(String id);

    void createDictItem(DictItemEntity entity);

    void updateDictItem(String id, DictItemEntity entity);

    void deleteDictItem(String id);
}
