package com.carbonpoint.system.dto.req;

import lombok.Data;

@Data
public class RefreshTokenReq {
    private String refreshToken;
    private String deviceFingerprint;
    private String ip;
}
