package com.carbonpoint.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import com.carbonpoint.common.security.AppPasswordEncoder;
import com.carbonpoint.common.tenant.TenantContext;
import com.carbonpoint.system.dto.req.*;
import com.carbonpoint.system.dto.res.*;
import com.carbonpoint.system.entity.*;
import com.carbonpoint.system.mapper.*;
import com.carbonpoint.system.service.UserService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserMapper userMapper;
    private final TenantMapper tenantMapper;
    private final UserRoleMapper userRoleMapper;
    private final BatchImportMapper batchImportMapper;
    private final AppPasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    @Value("${app.default-password:carbon123}")
    private String defaultPassword;

    @Override
    @Transactional
    public UserDetailRes createUser(UserCreateReq req) {
        Long tenantId = TenantContext.getTenantId();

        // Check user limit
        Tenant tenant = tenantMapper.selectById(tenantId);
        if (tenant == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND);
        }
        long currentCount = userMapper.selectCount(new LambdaQueryWrapper<User>().eq(User::getTenantId, tenantId));
        if (currentCount >= tenant.getMaxUsers()) {
            throw new BusinessException(ErrorCode.BATCH_IMPORT_FAILED);
        }

        // Check phone uniqueness
        LambdaQueryWrapper<User> phoneWrapper = new LambdaQueryWrapper<>();
        phoneWrapper.eq(User::getPhone, req.getPhone());
        if (userMapper.selectCount(phoneWrapper) > 0) {
            throw new BusinessException(ErrorCode.USER_PHONE_DUPLICATE);
        }

        User user = new User();
        user.setTenantId(tenantId);
        user.setPhone(req.getPhone());
        user.setPasswordHash(passwordEncoder.encode(req.getPassword() != null ? req.getPassword() : defaultPassword));
        user.setNickname(req.getNickname() != null ? req.getNickname() : "用户" + req.getPhone().substring(7));
        user.setDepartmentId(req.getDepartmentId());
        user.setStatus("active");
        user.setLevel(1);
        user.setTotalPoints(0);
        user.setAvailablePoints(0);
        user.setFrozenPoints(0);
        user.setConsecutiveDays(0);
        userMapper.insert(user);

        return toDetailRes(user);
    }

    @Override
    @Transactional
    public BatchImportRes batchImport(MultipartFile file) {
        Long tenantId = TenantContext.getTenantId();
        Long operatorId = 1L; // from CurrentUser

        // Check user limit
        Tenant tenant = tenantMapper.selectById(tenantId);
        if (tenant == null) throw new BusinessException(ErrorCode.NOT_FOUND);
        long currentCount = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getTenantId, tenantId));

        List<Map<String, String>> failDetails = new ArrayList<>();
        int successCount = 0;
        int totalCount = 0;

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                totalCount++;

                String phone = getCellString(row.getCell(0));
                String nickname = getCellString(row.getCell(1));

                if (phone == null || phone.isBlank()) {
                    failDetails.add(Map.of("row", String.valueOf(i + 1), "reason", "手机号为空"));
                    continue;
                }

                // Check user limit before each insert
                if (currentCount + successCount >= tenant.getMaxUsers()) {
                    failDetails.add(Map.of("row", String.valueOf(i + 1), "phone", phone,
                            "reason", "租户用户数已达上限"));
                    continue;
                }

                try {
                    LambdaQueryWrapper<User> w = new LambdaQueryWrapper<>();
                    w.eq(User::getPhone, phone);
                    if (userMapper.selectCount(w) > 0) {
                        failDetails.add(Map.of("row", String.valueOf(i + 1), "phone", phone, "reason", "手机号已存在"));
                        continue;
                    }

                    User user = new User();
                    user.setTenantId(tenantId);
                    user.setPhone(phone);
                    user.setPasswordHash(passwordEncoder.encode(defaultPassword));
                    user.setNickname(nickname != null ? nickname : "用户" + phone.substring(7));
                    user.setStatus("active");
                    user.setLevel(1);
                    user.setTotalPoints(0);
                    user.setAvailablePoints(0);
                    user.setFrozenPoints(0);
                    user.setConsecutiveDays(0);
                    userMapper.insert(user);
                    successCount++;
                } catch (Exception e) {
                    failDetails.add(Map.of("row", String.valueOf(i + 1), "phone", phone, "reason", e.getMessage()));
                }
            }
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.BATCH_IMPORT_FAILED);
        }

        // Save batch import record
        BatchImport record = new BatchImport();
        record.setTenantId(tenantId);
        record.setOperatorId(operatorId);
        record.setTotalCount(totalCount);
        record.setSuccessCount(successCount);
        record.setFailCount(failDetails.size());
        record.setFailDetail(toJson(failDetails));
        batchImportMapper.insert(record);

        return BatchImportRes.builder()
                .importId(record.getId())
                .totalCount(totalCount)
                .successCount(successCount)
                .failCount(failDetails.size())
                .build();
    }

    private String getCellString(Cell cell) {
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            default -> null;
        };
    }

    private String toJson(List<Map<String, String>> data) {
        try {
            return objectMapper.writeValueAsString(data);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    @Override
    @Transactional
    public UserDetailRes updateProfile(Long userId, ProfileUpdateReq req) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException(ErrorCode.NOT_FOUND);
        if (req.getNickname() != null) user.setNickname(req.getNickname());
        if (req.getAvatar() != null) user.setAvatar(req.getAvatar());
        userMapper.updateById(user);
        return toDetailRes(user);
    }

    @Override
    @Transactional
    public void enable(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException(ErrorCode.NOT_FOUND);
        user.setStatus("active");
        userMapper.updateById(user);
    }

    @Override
    @Transactional
    public void disable(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException(ErrorCode.NOT_FOUND);
        user.setStatus("disabled");
        userMapper.updateById(user);
    }

    @Override
    public UserDetailRes getById(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException(ErrorCode.NOT_FOUND);
        return toDetailRes(user);
    }

    @Override
    public PageRes<UserDetailRes> list(PageReq req) {
        Long tenantId = TenantContext.getTenantId();
        IPage<User> page = new Page<>(req.getPage(), req.getPageSize());
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getTenantId, tenantId);
        if (req.getKeyword() != null && !req.getKeyword().isBlank()) {
            wrapper.and(w -> w.eq(User::getPhone, req.getKeyword())
                    .or().like(User::getNickname, req.getKeyword()));
        }
        wrapper.orderByDesc(User::getCreatedAt);
        IPage<User> result = userMapper.selectPage(page, wrapper);

        return PageRes.<UserDetailRes>builder()
                .total(result.getTotal())
                .records(result.getRecords().stream().map(this::toDetailRes).toList())
                .build();
    }

    private UserDetailRes toDetailRes(User user) {
        return UserDetailRes.builder()
                .id(user.getId())
                .tenantId(user.getTenantId())
                .phone(maskPhone(user.getPhone()))
                .nickname(user.getNickname())
                .avatar(user.getAvatar())
                .status(user.getStatus())
                .level(user.getLevel())
                .totalPoints(user.getTotalPoints())
                .availablePoints(user.getAvailablePoints())
                .consecutiveDays(user.getConsecutiveDays())
                .departmentId(user.getDepartmentId())
                .createdAt(user.getCreatedAt())
                .build();
    }

    /**
     * Mask phone number for privacy: 138****8888
     */
    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) return phone;
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }
}
