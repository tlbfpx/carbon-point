package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.req.*;
import com.carbonpoint.system.dto.res.*;
import org.springframework.web.multipart.MultipartFile;

public interface UserService {
    UserDetailRes createUser(UserCreateReq req);
    BatchImportRes batchImport(MultipartFile file);
    UserDetailRes updateProfile(Long userId, ProfileUpdateReq req);
    void enable(Long userId);
    void disable(Long userId);
    UserDetailRes getById(Long userId);
    PageRes<UserDetailRes> list(PageReq req);
}
