package com.carbonpoint.system.service.impl;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.system.dto.req.InvitationCreateReq;
import com.carbonpoint.system.dto.res.InvitationRes;
import com.carbonpoint.system.entity.TenantInvitation;
import com.carbonpoint.system.entity.User;
import com.carbonpoint.system.mapper.TenantInvitationMapper;
import com.carbonpoint.system.mapper.UserMapper;
import com.carbonpoint.system.security.JwtUtils;
import com.carbonpoint.system.service.InvitationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class InvitationServiceImpl implements InvitationService {

    @Autowired
    private TenantInvitationMapper invitationMapper;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private JwtUtils jwtUtils;

    @Override
    public InvitationRes createInviteCode(InvitationCreateReq req, Long creatorId) {
        Long tenantId = TenantContext.getTenantId();
        String code = jwtUtils.generateInviteCode();

        TenantInvitation invitation = new TenantInvitation();
        invitation.setTenantId(tenantId);
        invitation.setInviteCode(code);
        invitation.setMaxUses(req.getMaxUses());
        invitation.setUsedCount(0);
        invitation.setExpiresAt(req.getExpiresAt() != null ? req.getExpiresAt() : LocalDateTime.now().plusDays(30));
        invitation.setCreatedBy(creatorId);
        invitationMapper.insert(invitation);

        return InvitationRes.builder()
                .inviteCode(code)
                .inviteLink("/register?code=" + code)
                .maxUses(invitation.getMaxUses())
                .usedCount(invitation.getUsedCount())
                .expiresAt(invitation.getExpiresAt())
                .createdAt(invitation.getCreatedAt())
                .build();
    }

    @Override
    public boolean validateCode(String code) {
        TenantInvitation invitation = invitationMapper.selectByInviteCode(code);

        if (invitation == null) return false;
        if (invitation.getExpiresAt().isBefore(LocalDateTime.now())) return false;
        if (invitation.getMaxUses() != null && invitation.getUsedCount() >= invitation.getMaxUses()) return false;

        return true;
    }

    @Override
    @Transactional
    public void bindByInviteCode(Long userId, String code) {
        TenantInvitation invitation = invitationMapper.selectByInviteCode(code);

        if (invitation == null) {
            throw new BusinessException(ErrorCode.INVITE_CODE_INVALID);
        }

        // Use bypass update since user has tenant_id=0 during registration
        // and tenant context is null
        userMapper.updateTenantIdById(userId, invitation.getTenantId());

        // Increment used count using bypass update
        invitationMapper.incrementUsedCount(invitation.getId());
    }
}
