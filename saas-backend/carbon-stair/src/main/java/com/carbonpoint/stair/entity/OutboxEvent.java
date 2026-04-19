package com.carbonpoint.stair.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * Outbox event entity for the Outbox pattern.
 * Ensures atomicity between check-in record creation and points awarding.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("outbox_events")
public class OutboxEvent {

    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * Aggregate type: check_in
     */
    private String aggregateType;

    /**
     * Aggregate ID: check_in_record_id
     */
    private Long aggregateId;

    /**
     * Event type: points_awarded
     */
    private String eventType;

    /**
     * Event payload JSON: {userId, points, checkInRecordId}
     */
    private String payload;

    /**
     * Trace ID for logging
     */
    private String traceId;

    /**
     * Creation timestamp (milliseconds precision)
     */
    private LocalDateTime createdAt;

    /**
     * 0 = pending, 1 = processed
     */
    private Integer processed;

    /**
     * Processing timestamp
     */
    private LocalDateTime processedAt;
}
