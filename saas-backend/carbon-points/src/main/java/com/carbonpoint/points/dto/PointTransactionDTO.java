package com.carbonpoint.points.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class PointTransactionDTO {
    private Long id;
    private Integer amount;
    private String type;
    private String typeDesc;
    private Integer balanceAfter;
    private String remark;
    private String referenceId;
    private String productCode;
    private String sourceType;
    private LocalDateTime createdAt;
}
