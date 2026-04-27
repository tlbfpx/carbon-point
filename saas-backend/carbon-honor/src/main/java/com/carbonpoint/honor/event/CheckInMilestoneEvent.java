package com.carbonpoint.honor.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 签到里程碑事件 — 连续打卡达到指定天数时发布。
 */
@Getter
public class CheckInMilestoneEvent extends ApplicationEvent {

    private final Long userId;
    private final Long tenantId;
    private final int streakDays;

    public CheckInMilestoneEvent(Object source, Long userId, Long tenantId, int streakDays) {
        super(source);
        this.userId = userId;
        this.tenantId = tenantId;
        this.streakDays = streakDays;
    }
}
