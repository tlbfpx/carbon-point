package com.carbonpoint.system.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * DTO for consistency validation report between old and new resource tables.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsistencyReport {

    /**
     * Whether all resources are consistent between old and new tables.
     */
    private boolean consistent;

    /**
     * List of mismatch descriptions.
     */
    @Builder.Default
    private List<String> mismatches = new ArrayList<>();

    /**
     * Total number of resources in the old table.
     */
    private int totalResources;

    /**
     * Number of resources that match between old and new tables.
     */
    private int matchingCount;
}
