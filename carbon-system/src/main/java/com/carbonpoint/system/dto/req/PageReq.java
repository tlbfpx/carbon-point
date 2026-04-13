package com.carbonpoint.system.dto.req;

import lombok.Data;

@Data
public class PageReq {
    private Integer page = 1;
    private Integer pageSize = 20;
    private String keyword;
}
