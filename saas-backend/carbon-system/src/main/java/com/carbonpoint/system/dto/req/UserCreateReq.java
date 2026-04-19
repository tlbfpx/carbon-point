package com.carbonpoint.system.dto.req;

import lombok.Data;

@Data
public class UserCreateReq {
    private String phone;
    private String password;
    private String nickname;
    private Long departmentId;
}
