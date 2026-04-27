package com.carbonpoint.honor.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 积分里程碑事件 — 用户累计积分达到指定阈值时发布。
 */
@Getter
public class PointsMilestoneEvent extends ApplicationEvent {

    private final Long userId;
    private final Long tenantId;
    private final int totalPoints;

    public PointsMilestoneEvent(Object source, Long userId, Long tenantId, int totalPoints) {
        super(source);
        this.userId = userId;
        this.tenantId = tenantId;
        this.totalPoints = totalPoints;
    }
}
