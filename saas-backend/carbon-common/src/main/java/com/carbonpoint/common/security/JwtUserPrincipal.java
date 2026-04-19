package com.carbonpoint.common.security;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

/**
 * JWT user principal stored in SecurityContext.
 */
@Data
@AllArgsConstructor
public class JwtUserPrincipal {

    private Long userId;
    private Long tenantId;
    private List<String> roles;
}
