package com.carbonpoint.system.service;

import com.carbonpoint.system.entity.NotificationTemplate;
import com.carbonpoint.system.mapper.NotificationTemplateMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * NotificationTemplateService 单元测试。
 *
 * 测试场景：
 * 1. 模板变量替换（单变量、多变量、未匹配变量）
 * 2. 模板查找
 * 3. 边界情况（null 模板、空模板）
 */
@ExtendWith(MockitoExtension.class)
class NotificationTemplateServiceTest {

    @Mock
    private NotificationTemplateMapper templateMapper;

    @InjectMocks
    private NotificationTemplateService templateService;

    @Test
    @DisplayName("应正确替换单个变量")
    void shouldReplaceSingleVariable() {
        String template = "恭喜升级为{level_name}等级";
        Map<String, Object> vars = Map.of("level_name", "白银");

        String result = templateService.render(template, vars);

        assertEquals("恭喜升级为白银等级", result);
    }

    @Test
    @DisplayName("应正确替换多个变量")
    void shouldReplaceMultipleVariables() {
        String template = "您已连续打卡{streak_days}天，获得{bonus_points}积分奖励";
        Map<String, Object> vars = Map.of(
                "streak_days", 7,
                "bonus_points", 50
        );

        String result = templateService.render(template, vars);

        assertEquals("您已连续打卡7天，获得50积分奖励", result);
    }

    @Test
    @DisplayName("未匹配的变量应保持原样")
    void shouldKeepUnmatchedVariablesAsIs() {
        String template = "您的{unknown_var}已更新";
        Map<String, Object> vars = Map.of("other_var", "value");

        String result = templateService.render(template, vars);

        assertEquals("您的{unknown_var}已更新", result);
    }

    @Test
    @DisplayName("null 模板应返回 null")
    void shouldReturnNullForNullTemplate() {
        String result = templateService.render(null, Map.of());

        assertNull(result);
    }

    @Test
    @DisplayName("空模板应返回空字符串")
    void shouldReturnEmptyForEmptyTemplate() {
        String result = templateService.render("", Map.of());

        assertEquals("", result);
    }

    @Test
    @DisplayName("模板不存在时 renderTemplate 应返回 null")
    void shouldReturnNullWhenTemplateNotFound() {
        when(templateMapper.findByTypeAndChannel("unknown_type", "in_app")).thenReturn(null);

        var result = templateService.renderTemplate("unknown_type", "in_app", Map.of());

        assertNull(result);
    }

    @Test
    @DisplayName("模板存在时应正确渲染标题和内容")
    void shouldRenderTitleAndContent() {
        NotificationTemplate template = new NotificationTemplate();
        template.setTitleTemplate("升级通知");
        template.setContentTemplate("您已升级为{level_name}，系数{coefficient}x");

        when(templateMapper.findByTypeAndChannel("level_up", "in_app"))
                .thenReturn(template);

        var result = templateService.renderTemplate(
                "level_up", "in_app",
                Map.of("level_name", "黄金", "coefficient", "1.5")
        );

        assertNotNull(result);
        assertEquals("升级通知", result.title());
        assertEquals("您已升级为黄金，系数1.5x", result.content());
    }

    @Test
    @DisplayName("变量值为 null 时应替换为空字符串")
    void shouldReplaceNullValueWithEmptyString() {
        String template = "等级: {level_name}, 系数: {coefficient}";
        Map<String, Object> vars = new java.util.HashMap<>();
        vars.put("level_name", "白银");
        vars.put("coefficient", null);

        String result = templateService.render(template, vars);

        assertEquals("等级: 白银, 系数: ", result);
    }
}
