package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.req.*;
import com.carbonpoint.system.dto.res.*;

public interface TenantService {
    TenantDetailRes create(TenantCreateReq req);
    TenantDetailRes update(Long id, TenantUpdateReq req);
    void suspend(Long id);
    void activate(Long id);
    TenantDetailRes getById(Long id);
    PageRes<TenantDetailRes> list(PageReq req);
}
