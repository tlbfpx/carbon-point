package com.carbonpoint.system.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchImportRes {
    private Long importId;
    private Integer totalCount;
    private Integer successCount;
    private Integer failCount;
}
