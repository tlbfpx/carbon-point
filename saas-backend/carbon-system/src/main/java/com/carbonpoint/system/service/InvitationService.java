package com.carbonpoint.system.service;

import com.carbonpoint.system.dto.req.*;
import com.carbonpoint.system.dto.res.*;

public interface InvitationService {
    InvitationRes createInviteCode(InvitationCreateReq req, Long creatorId);
    boolean validateCode(String code);
    void bindByInviteCode(Long userId, String code);
}
