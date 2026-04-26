package com.carbonpoint.system.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.entity.HolidayCalendarEntity;
import com.carbonpoint.system.mapper.HolidayCalendarMapper;
import com.carbonpoint.system.security.RequirePerm;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Platform admin CRUD controller for holiday calendar management.
 * All endpoints under /api/platform/holidays.
 */
@RestController
@RequestMapping("/api/platform/holidays")
@RequiredArgsConstructor
public class HolidayCalendarController {

    private final HolidayCalendarMapper holidayCalendarMapper;

    /**
     * List holidays by year.
     * GET /api/platform/holidays?year=2026
     */
    @GetMapping
    public Result<List<HolidayCalendarEntity>> list(@RequestParam(required = false) Integer year) {
        LambdaQueryWrapper<HolidayCalendarEntity> wrapper = new LambdaQueryWrapper<>();
        if (year != null) {
            wrapper.eq(HolidayCalendarEntity::getYear, year);
        }
        wrapper.orderByAsc(HolidayCalendarEntity::getHolidayDate);
        return Result.success(holidayCalendarMapper.selectList(wrapper));
    }

    /**
     * Create a new holiday entry.
     * POST /api/platform/holidays
     */
    @PostMapping
    @RequirePerm("platform:config:manage")
    public Result<HolidayCalendarEntity> create(@RequestBody HolidayCalendarEntity entity) {
        // Derive year from date if not set
        if (entity.getYear() == null && entity.getHolidayDate() != null) {
            entity.setYear(entity.getHolidayDate().getYear());
        }
        holidayCalendarMapper.insert(entity);
        return Result.success(entity);
    }

    /**
     * Update an existing holiday entry.
     * PUT /api/platform/holidays/{id}
     */
    @PutMapping("/{id}")
    @RequirePerm("platform:config:manage")
    public Result<HolidayCalendarEntity> update(@PathVariable Long id,
                                                 @RequestBody HolidayCalendarEntity updates) {
        HolidayCalendarEntity existing = holidayCalendarMapper.selectById(id);
        if (existing == null) {
            return Result.error("404", "节假日记录不存在");
        }
        if (updates.getHolidayDate() != null) {
            existing.setHolidayDate(updates.getHolidayDate());
            existing.setYear(updates.getHolidayDate().getYear());
        }
        if (updates.getHolidayName() != null) {
            existing.setHolidayName(updates.getHolidayName());
        }
        if (updates.getHolidayType() != null) {
            existing.setHolidayType(updates.getHolidayType());
        }
        holidayCalendarMapper.updateById(existing);
        return Result.success(existing);
    }

    /**
     * Delete a holiday entry (soft delete).
     * DELETE /api/platform/holidays/{id}
     */
    @DeleteMapping("/{id}")
    @RequirePerm("platform:config:manage")
    public Result<Void> delete(@PathVariable Long id) {
        holidayCalendarMapper.deleteById(id);
        return Result.success();
    }
}
