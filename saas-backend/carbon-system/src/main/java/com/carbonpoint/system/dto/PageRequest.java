package com.carbonpoint.system.dto;

import lombok.Data;

/**
 * Pagination request DTO.
 */
@Data
public class PageRequest {
    private Integer page = 1;
    private Integer pageSize = 20;

    public long offset() {
        return (long) (page - 1) * pageSize;
    }
}
