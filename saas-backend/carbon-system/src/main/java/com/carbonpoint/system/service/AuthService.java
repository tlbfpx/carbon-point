package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.req.*;
import com.carbonpoint.system.dto.res.AuthRes;

public interface AuthService {
    AuthRes login(LoginReq req, String clientIp);
    AuthRes register(RegisterReq req);
    AuthRes refreshToken(String refreshToken, String deviceFingerprint, String clientIp);
    void logout(String refreshToken);
    void sendSmsCode(String phone);
}
