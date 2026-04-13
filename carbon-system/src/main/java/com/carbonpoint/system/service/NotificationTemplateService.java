package com.carbonpoint.system.service;

import com.carbonpoint.system.entity.NotificationTemplate;
import com.carbonpoint.system.mapper.NotificationTemplateMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 通知模板引擎：管理模板、变量替换。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationTemplateService {

    private final NotificationTemplateMapper templateMapper;

    private static final Pattern VARIABLE_PATTERN = Pattern.compile("\\{(\\w+)}");

    /**
     * 根据类型和渠道查找模板。
     */
    public NotificationTemplate findByTypeAndChannel(String type, String channel) {
        return templateMapper.findByTypeAndChannel(type, channel);
    }

    /**
     * 渲染模板：将 {var_name} 占位符替换为实际值。
     *
     * @param template 模板字符串，如 "恭喜升级！您已升级为{level_name}"
     * @param variables 变量名→值的映射
     * @return 渲染后的字符串，未匹配的占位符保持原样
     */
    public String render(String template, Map<String, Object> variables) {
        if (template == null || template.isEmpty()) {
            return template;
        }
        String result = template;
        var matcher = VARIABLE_PATTERN.matcher(template);
        while (matcher.find()) {
            String varName = matcher.group(1);
            Object value = variables.get(varName);
            if (value != null) {
                result = result.replace("{" + varName + "}", String.valueOf(value));
            } else if (variables.containsKey(varName)) {
                // Key present but value is null → replace with empty string
                result = result.replace("{" + varName + "}", "");
            }
            // If key is not in map at all, keep placeholder as-is
        }
        return result;
    }

    /**
     * 根据模板生成通知标题和内容。
     */
    public RenderedTemplate renderTemplate(String type, String channel, Map<String, Object> variables) {
        NotificationTemplate template = findByTypeAndChannel(type, channel);
        if (template == null) {
            log.warn("通知模板不存在: type={}, channel={}", type, channel);
            return null;
        }
        String title = render(template.getTitleTemplate(), variables);
        String content = render(template.getContentTemplate(), variables);
        return new RenderedTemplate(title, content);
    }

    public record RenderedTemplate(String title, String content) {}
}
