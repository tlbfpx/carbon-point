package com.carbonpoint.system.dto.req;

import lombok.Data;

@Data
public class RegisterReq {
    private String phone;
    private String password;
    private String nickname;
    private String inviteCode;
}
