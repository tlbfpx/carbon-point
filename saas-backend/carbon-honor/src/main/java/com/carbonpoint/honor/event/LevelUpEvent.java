package com.carbonpoint.honor.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 等级升级事件 — 用户等级提升时发布。
 */
@Getter
public class LevelUpEvent extends ApplicationEvent {

    private final Long userId;
    private final Long tenantId;
    private final int newLevel;

    public LevelUpEvent(Object source, Long userId, Long tenantId, int newLevel) {
        super(source);
        this.userId = userId;
        this.tenantId = tenantId;
        this.newLevel = newLevel;
    }
}
