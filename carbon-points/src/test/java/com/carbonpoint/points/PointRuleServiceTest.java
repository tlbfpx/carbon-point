package com.carbonpoint.points;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.points.dto.PointRuleCreateDTO;
import com.carbonpoint.points.dto.PointRuleDTO;
import com.carbonpoint.points.dto.PointRuleUpdateDTO;
import com.carbonpoint.points.entity.PointRule;
import com.carbonpoint.points.mapper.PointRuleMapper;
import com.carbonpoint.points.service.PointRuleService;
import com.carbonpoint.system.entity.Tenant;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.TenantMapper;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.common.security.AppPasswordEncoder;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for PointRuleService.
 */
class PointRuleServiceTest extends BaseIntegrationTest {

    @Autowired
    private PointRuleService pointRuleService;

    @Autowired
    private PointRuleMapper pointRuleMapper;

    @Autowired
    private TenantMapper tenantMapper;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private AppPasswordEncoder passwordEncoder;

    // ─────────────────────────────────────────
    // createRule tests
    // ─────────────────────────────────────────

    @Test
    void createRule_timeSlot_succeeds() {
        Tenant tenant = createTestTenant("createRule_timeSlot_succeeds");
        PointRuleCreateDTO dto = new PointRuleCreateDTO();
        dto.setName("早高峰时段");
        dto.setType("time_slot");
        dto.setConfig("""
            {"startTime":"07:00","endTime":"09:00","minPoints":5,"maxPoints":15}
            """);
        dto.setEnabled(true);
        dto.setSortOrder(1);

        PointRuleDTO result = pointRuleService.createRule(dto);

        assertNotNull(result);
        assertNotNull(result.getId());
        assertEquals("早高峰时段", result.getName());
        assertEquals("time_slot", result.getType());
        assertTrue(result.getEnabled());
        assertEquals(1, result.getSortOrder());
    }

    @Test
    void createRule_streak_succeeds() {
        Tenant tenant = createTestTenant("createRule_streak_succeeds");
        PointRuleCreateDTO dto = new PointRuleCreateDTO();
        dto.setName("连续打卡7天");
        dto.setType("streak");
        dto.setConfig("{\"days\":7,\"bonusPoints\":10}");
        dto.setEnabled(true);

        PointRuleDTO result = pointRuleService.createRule(dto);

        assertNotNull(result.getId());
        assertEquals("streak", result.getType());
    }

    @Test
    void createRule_specialDate_succeeds() {
        Tenant tenant = createTestTenant("createRule_specialDate_succeeds");
        PointRuleCreateDTO dto = new PointRuleCreateDTO();
        dto.setName("节日双倍");
        dto.setType("special_date");
        dto.setConfig("{\"dates\":[\"2026-01-01\",\"2026-05-01\"],\"multiplier\":2.0}");
        dto.setEnabled(true);

        PointRuleDTO result = pointRuleService.createRule(dto);

        assertNotNull(result.getId());
        assertEquals("special_date", result.getType());
    }

    @Test
    void createRule_timeSlot_invalidJson_throws() {
        Tenant tenant = createTestTenant("createRule_timeSlot_invalidJson_throws");
        PointRuleCreateDTO dto = new PointRuleCreateDTO();
        dto.setName("无效配置");
        dto.setType("time_slot");
        dto.setConfig("not valid json");

        BusinessException ex = assertThrows(BusinessException.class, () ->
                pointRuleService.createRule(dto)
        );
        assertEquals("SYSTEM002", ex.getCode());
    }

    @Test
    void createRule_timeSlot_missingStartTime_throws() {
        Tenant tenant = createTestTenant("createRule_timeSlot_missingStartTime_throws");
        PointRuleCreateDTO dto = new PointRuleCreateDTO();
        dto.setName("缺少开始时间");
        dto.setType("time_slot");
        dto.setConfig("{\"endTime\":\"09:00\",\"minPoints\":5,\"maxPoints\":15}");

        BusinessException ex = assertThrows(BusinessException.class, () ->
                pointRuleService.createRule(dto)
        );
        assertTrue(ex.getMessage().contains("startTime") || ex.getMessage().contains("必填"));
    }

    @Test
    void createRule_timeSlot_invalidTimeOrder_throws() {
        Tenant tenant = createTestTenant("createRule_timeSlot_invalidTimeOrder_throws");
        PointRuleCreateDTO dto = new PointRuleCreateDTO();
        dto.setName("时间顺序错误");
        dto.setType("time_slot");
        dto.setConfig("{\"startTime\":\"10:00\",\"endTime\":\"07:00\",\"minPoints\":5,\"maxPoints\":15}");

        BusinessException ex = assertThrows(BusinessException.class, () ->
                pointRuleService.createRule(dto)
        );
        assertTrue(ex.getMessage().contains("开始时间") || ex.getMessage().contains("早于"));
    }

    @Test
    void createRule_streak_negativeValues_throws() {
        Tenant tenant = createTestTenant("createRule_streak_negativeValues_throws");
        PointRuleCreateDTO dto = new PointRuleCreateDTO();
        dto.setName("负数连续天数");
        dto.setType("streak");
        dto.setConfig("{\"days\":-5,\"bonusPoints\":10}");

        BusinessException ex = assertThrows(BusinessException.class, () ->
                pointRuleService.createRule(dto)
        );
        assertEquals("SYSTEM002", ex.getCode());
    }

    @Test
    void createRule_specialDate_invalidMultiplier_throws() {
        Tenant tenant = createTestTenant("createRule_specialDate_invalidMultiplier_throws");
        PointRuleCreateDTO dto = new PointRuleCreateDTO();
        dto.setName("倍率错误");
        dto.setType("special_date");
        dto.setConfig("{\"dates\":[\"2026-01-01\"],\"multiplier\":0}");

        BusinessException ex = assertThrows(BusinessException.class, () ->
                pointRuleService.createRule(dto)
        );
        assertEquals("SYSTEM002", ex.getCode());
    }

    @Test
    void createRule_dailyCap_succeeds() {
        Tenant tenant = createTestTenant("createRule_dailyCap_succeeds");
        PointRuleCreateDTO dto = new PointRuleCreateDTO();
        dto.setName("每日上限500");
        dto.setType("daily_cap");
        dto.setConfig("{\"dailyLimit\":500}");
        dto.setEnabled(true);

        PointRuleDTO result = pointRuleService.createRule(dto);

        assertNotNull(result.getId());
        assertEquals("daily_cap", result.getType());
    }

    @Test
    void createRule_dailyCap_zeroLimit_throws() {
        Tenant tenant = createTestTenant("createRule_dailyCap_zeroLimit_throws");
        PointRuleCreateDTO dto = new PointRuleCreateDTO();
        dto.setName("零限制");
        dto.setType("daily_cap");
        dto.setConfig("{\"dailyLimit\":0}");

        BusinessException ex = assertThrows(BusinessException.class, () ->
                pointRuleService.createRule(dto)
        );
        assertEquals("SYSTEM002", ex.getCode());
    }

    @Test
    void createRule_levelCoefficient_succeeds() {
        Tenant tenant = createTestTenant("createRule_levelCoefficient_succeeds");
        PointRuleCreateDTO dto = new PointRuleCreateDTO();
        dto.setName("等级系数");
        dto.setType("level_coefficient");
        dto.setConfig("{\"levels\":{\"1\":1.0,\"2\":1.2,\"3\":1.5}}");
        dto.setEnabled(true);

        PointRuleDTO result = pointRuleService.createRule(dto);

        assertNotNull(result.getId());
        assertEquals("level_coefficient", result.getType());
    }

    @Test
    void createRule_unknownType_throws() {
        Tenant tenant = createTestTenant("createRule_unknownType_throws");
        PointRuleCreateDTO dto = new PointRuleCreateDTO();
        dto.setName("未知类型");
        dto.setType("unknown_type");
        dto.setConfig("{}");

        BusinessException ex = assertThrows(BusinessException.class, () ->
                pointRuleService.createRule(dto)
        );
        assertEquals("SYSTEM002", ex.getCode());
    }

    // ─────────────────────────────────────────
    // getRule / listRules tests
    // ─────────────────────────────────────────

    @Test
    void getRule_ownedByTenant_succeeds() {
        Tenant tenant = createTestTenant("getRule_ownedByTenant_succeeds");
        PointRuleCreateDTO dto = new PointRuleCreateDTO();
        dto.setName("测试规则");
        dto.setType("streak");
        dto.setConfig("{\"days\":3,\"bonusPoints\":5}");
        dto.setEnabled(true);
        PointRuleDTO created = pointRuleService.createRule(dto);

        PointRuleDTO result = pointRuleService.getRule(created.getId());

        assertEquals(created.getId(), result.getId());
        assertEquals("测试规则", result.getName());
    }

    @Test
    void getRule_notFound_throws() {
        Tenant tenant = createTestTenant("getRule_notFound_throws");

        BusinessException ex = assertThrows(BusinessException.class, () ->
                pointRuleService.getRule(999999L)
        );
        assertEquals("POINT006", ex.getCode());
    }

    @Test
    void listRules_returnsTenantRules() {
        Tenant tenant = createTestTenant("listRules_returnsTenantRules");
        // Create multiple rules
        for (int i = 0; i < 3; i++) {
            PointRuleCreateDTO dto = new PointRuleCreateDTO();
            dto.setName("规则" + i);
            dto.setType("streak");
            dto.setConfig("{\"days\":" + (i + 1) + ",\"bonusPoints\":5}");
            dto.setSortOrder(i);
            pointRuleService.createRule(dto);
        }

        // Ensure tenant context is set before querying
        setTenantContext(tenant.getId());

        Page<PointRuleDTO> page = pointRuleService.listRules(null, 1, 10);

        assertNotNull(page);
        assertTrue(page.getTotal() >= 3, "Expected at least 3 rules, got: " + page.getTotal());
        assertTrue(page.getRecords().size() >= 3);
    }

    @Test
    void listRules_filterByType() {
        Tenant tenant = createTestTenant("listRules_filterByType");

        PointRuleCreateDTO streak = new PointRuleCreateDTO();
        streak.setName("连续规则");
        streak.setType("streak");
        streak.setConfig("{\"days\":3,\"bonusPoints\":5}");
        pointRuleService.createRule(streak);

        PointRuleCreateDTO timeSlot = new PointRuleCreateDTO();
        timeSlot.setName("时段规则");
        timeSlot.setType("time_slot");
        timeSlot.setConfig("{\"startTime\":\"08:00\",\"endTime\":\"09:00\",\"minPoints\":5,\"maxPoints\":15}");
        pointRuleService.createRule(timeSlot);

        Page<PointRuleDTO> streakRules = pointRuleService.listRules("streak", 1, 10);
        assertTrue(streakRules.getRecords().stream().allMatch(r -> "streak".equals(r.getType())));
    }

    @Test
    void getEnabledRules_returnsOnlyEnabled() {
        Tenant tenant = createTestTenant("getEnabledRules_returnsOnlyEnabled");

        PointRuleCreateDTO enabled = new PointRuleCreateDTO();
        enabled.setName("已启用规则");
        enabled.setType("streak");
        enabled.setConfig("{\"days\":3,\"bonusPoints\":5}");
        enabled.setEnabled(true);
        pointRuleService.createRule(enabled);

        PointRuleCreateDTO disabled = new PointRuleCreateDTO();
        disabled.setName("已禁用规则");
        disabled.setType("streak");
        disabled.setConfig("{\"days\":5,\"bonusPoints\":10}");
        disabled.setEnabled(false);
        pointRuleService.createRule(disabled);

        List<PointRule> enabledRules = pointRuleService.getEnabledRules(tenant.getId());
        assertTrue(enabledRules.stream().allMatch(PointRule::getEnabled));
    }

    // ─────────────────────────────────────────
    // updateRule tests
    // ─────────────────────────────────────────

    @Test
    void updateRule_succeeds() {
        Tenant tenant = createTestTenant("updateRule_succeeds");
        PointRuleCreateDTO create = new PointRuleCreateDTO();
        create.setName("原名称");
        create.setType("streak");
        create.setConfig("{\"days\":3,\"bonusPoints\":5}");
        create.setEnabled(true);
        PointRuleDTO created = pointRuleService.createRule(create);

        PointRuleUpdateDTO update = new PointRuleUpdateDTO();
        update.setId(created.getId());
        update.setName("新名称");
        update.setEnabled(false);

        PointRuleDTO result = pointRuleService.updateRule(update);

        assertEquals("新名称", result.getName());
        assertFalse(result.getEnabled());
        // Config should remain unchanged
        assertTrue(result.getConfig().contains("days"));
    }

    @Test
    void updateRule_notFound_throws() {
        Tenant tenant = createTestTenant("updateRule_notFound_throws");
        PointRuleUpdateDTO update = new PointRuleUpdateDTO();
        update.setId(999999L);
        update.setName("不存在");

        BusinessException ex = assertThrows(BusinessException.class, () ->
                pointRuleService.updateRule(update)
        );
        assertEquals("POINT006", ex.getCode());
    }

    // ─────────────────────────────────────────
    // deleteRule tests
    // ─────────────────────────────────────────

    @Test
    void deleteRule_succeeds() {
        Tenant tenant = createTestTenant("deleteRule_succeeds");
        PointRuleCreateDTO dto = new PointRuleCreateDTO();
        dto.setName("待删除规则");
        dto.setType("streak");
        dto.setConfig("{\"days\":3,\"bonusPoints\":5}");
        PointRuleDTO created = pointRuleService.createRule(dto);

        pointRuleService.deleteRule(created.getId());

        assertThrows(BusinessException.class, () ->
                pointRuleService.getRule(created.getId())
        );
    }

    @Test
    void deleteRule_notFound_throws() {
        Tenant tenant = createTestTenant("deleteRule_notFound_throws");

        BusinessException ex = assertThrows(BusinessException.class, () ->
                pointRuleService.deleteRule(999999L)
        );
        assertEquals("POINT006", ex.getCode());
    }

    // ─────────────────────────────────────────
    // validateNoOverlap tests
    // ─────────────────────────────────────────

    @Test
    void validateNoOverlap_noConflict_succeeds() {
        Tenant tenant = createTestTenant("validateNoOverlap_noConflict_succeeds");
        // Create existing time slot rule 08:00-09:00
        PointRuleCreateDTO existing = new PointRuleCreateDTO();
        existing.setName("已有规则");
        existing.setType("time_slot");
        existing.setConfig("{\"startTime\":\"08:00\",\"endTime\":\"09:00\",\"minPoints\":5,\"maxPoints\":15}");
        existing.setEnabled(true);
        pointRuleService.createRule(existing);

        // No conflict: 10:00-11:00
        assertDoesNotThrow(() ->
                pointRuleService.validateNoOverlap(tenant.getId(), "10:00", "11:00", null)
        );
    }

    @Test
    void validateNoOverlap_overlapping_throws() {
        Tenant tenant = createTestTenant("validateNoOverlap_overlapping_throws");
        // Create existing time slot rule 08:00-09:00
        PointRuleCreateDTO existing = new PointRuleCreateDTO();
        existing.setName("已有规则");
        existing.setType("time_slot");
        existing.setConfig("{\"startTime\":\"08:00\",\"endTime\":\"09:00\",\"minPoints\":5,\"maxPoints\":15}");
        existing.setEnabled(true);
        PointRuleDTO created = pointRuleService.createRule(existing);

        // Overlapping: 08:30-09:30
        BusinessException ex = assertThrows(BusinessException.class, () ->
                pointRuleService.validateNoOverlap(tenant.getId(), "08:30", "09:30", null)
        );
        assertEquals("POINT007", ex.getCode());
    }

    @Test
    void validateNoOverlap_excludeSelf_succeeds() {
        Tenant tenant = createTestTenant("validateNoOverlap_excludeSelf_succeeds");
        PointRuleCreateDTO existing = new PointRuleCreateDTO();
        existing.setName("已有规则");
        existing.setType("time_slot");
        existing.setConfig("{\"startTime\":\"08:00\",\"endTime\":\"09:00\",\"minPoints\":5,\"maxPoints\":15}");
        existing.setEnabled(true);
        PointRuleDTO created = pointRuleService.createRule(existing);

        // Same time, but exclude self (for update validation)
        assertDoesNotThrow(() ->
                pointRuleService.validateNoOverlap(tenant.getId(), "08:00", "09:00", created.getId())
        );
    }
}
