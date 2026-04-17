package com.carbonpoint.system.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.entity.DictItemEntity;
import com.carbonpoint.system.service.DictItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/platform/dict-items")
@RequiredArgsConstructor
public class DictItemController {

    private final DictItemService dictItemService;

    @GetMapping
    public Result<IPage<DictItemEntity>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String dictType,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) String keyword) {
        return Result.success(dictItemService.getDictItems(page, size, dictType, status, keyword));
    }

    @GetMapping("/{id}")
    public Result<DictItemEntity> get(@PathVariable String id) {
        return Result.success(dictItemService.getDictItem(id));
    }

    @PostMapping
    public Result<Void> create(@RequestBody DictItemEntity entity) {
        dictItemService.createDictItem(entity);
        return Result.success();
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable String id, @RequestBody DictItemEntity entity) {
        dictItemService.updateDictItem(id, entity);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String id) {
        dictItemService.deleteDictItem(id);
        return Result.success();
    }
}
