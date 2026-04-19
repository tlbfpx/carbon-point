package com.carbonpoint.system.controller;

import com.carbonpoint.common.result.Result;
import com.carbonpoint.system.dto.req.InvitationCreateReq;
import com.carbonpoint.system.dto.res.InvitationRes;
import com.carbonpoint.system.security.CurrentUser;
import com.carbonpoint.system.service.InvitationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/invitations")
public class InvitationController {

    @Autowired
    private InvitationService invitationService;

    @Autowired
    private CurrentUser currentUser;

    @PostMapping("/code")
    public Result<InvitationRes> createCode(@RequestBody InvitationCreateReq req) {
        currentUser.initFromSecurityContext();
        return Result.success(invitationService.createInviteCode(req, currentUser.getUserId()));
    }

    @GetMapping("/validate/{code}")
    public Result<Boolean> validate(@PathVariable String code) {
        return Result.success(invitationService.validateCode(code));
    }
}
