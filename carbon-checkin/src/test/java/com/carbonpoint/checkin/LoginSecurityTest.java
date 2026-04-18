package com.carbonpoint.checkin;

import com.carbonpoint.common.entity.LoginSecurityLogEntity;
import com.carbonpoint.common.mapper.LoginSecurityLogMapper;
import com.carbonpoint.common.security.PasswordValidator;
import com.carbonpoint.common.service.LoginRateLimitService;
import com.carbonpoint.common.service.AccountLockService;
import com.carbonpoint.system.entity.User;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for login security features.
 *
 * <p>Tests Phase 13 security enhancements:
 * <ul>
 *   <li>Captcha required after 3 failed attempts (failureThreshold = 3)</li>
 *   <li>Account locked after 5 failed attempts (lock.durationMinutes = 30)</li>
 *   <li>Password strength validation</li>
 *   <li>Login security logging</li>
 * </ul>
 */
class LoginSecurityTest extends BaseIntegrationTest {

    @Autowired
    private LoginSecurityLogMapper loginSecurityLogMapper;

    @Autowired
    private LoginRateLimitService loginRateLimitService;

    @Autowired
    private AccountLockService accountLockService;

    @Autowired
    private PasswordValidator passwordValidator;

    private static final String TEST_IP = "192.168.1.100";

    // ─────────────────────────────────────────
    // 15.4.1 — Captcha required after failures
    // ─────────────────────────────────────────

    @Test
    void testCaptchaRequiredAfterFailures() {
        String testPhone = "13900000010";

        // Simulate 3 failed login attempts
        for (int i = 0; i < 3; i++) {
            loginRateLimitService.recordFailure(TEST_IP, testPhone);
        }

        // After 3 failures, captcha should be required
        boolean needCaptcha = loginRateLimitService.needCaptcha(TEST_IP, testPhone);
        assertTrue(needCaptcha,
                "Captcha should be required after 3 failed attempts");

        // Remaining attempts should be 2 (5 - 3 = 2 before lock)
        int remaining = loginRateLimitService.getRemainingAttempts(testPhone);
        assertEquals(2, remaining,
                "Should have 2 remaining attempts before lock");
    }

    // ─────────────────────────────────────────
    // 15.4.2 — Account locked after excessive failures
    // ─────────────────────────────────────────

    @Test
    void testAccountLockedAfterExcessiveFailures() {
        String testPhone = "13900000011";
        String testIp = "192.168.1.101";

        // Simulate 5 failed login attempts (triggers lock)
        for (int i = 0; i < 5; i++) {
            loginRateLimitService.recordFailure(testIp, testPhone);
        }

        // Account should now be locked
        boolean isLocked = loginRateLimitService.isLocked(testIp, testPhone);
        assertTrue(isLocked,
                "Account should be locked after 5 failed attempts");

        // Remaining attempts should be -1 (locked)
        int remaining = loginRateLimitService.getRemainingAttempts(testPhone);
        assertEquals(-1, remaining,
                "Remaining attempts should be -1 when account is locked");
    }

    // ─────────────────────────────────────────
    // 15.4.3 — Successful login clears failure count
    // ─────────────────────────────────────────

    @Test
    void testSuccessfulLoginClearsFailureCount() {
        String testPhone = "13900000012";
        String testIp = "192.168.1.102";

        // Record 3 failures (captcha threshold)
        loginRateLimitService.recordFailure(testIp, testPhone);
        loginRateLimitService.recordFailure(testIp, testPhone);
        loginRateLimitService.recordFailure(testIp, testPhone);

        // Verify captcha is required after 3 failures
        assertTrue(loginRateLimitService.needCaptcha(testIp, testPhone),
                "Should need captcha after 3 failures");

        // Clear failures (simulating successful login)
        loginRateLimitService.clearFailure(testIp, testPhone);

        // Verify failures are cleared
        assertFalse(loginRateLimitService.needCaptcha(testIp, testPhone),
                "Captcha should NOT be required after clearing failures");

        // Remaining attempts should be restored
        int remaining = loginRateLimitService.getRemainingAttempts(testPhone);
        assertEquals(5, remaining,
                "Should have full 5 attempts restored");
    }

    // ─────────────────────────────────────────
    // 15.4.4 — Password strength validation
    // ─────────────────────────────────────────

    @Test
    void testPasswordStrength() {
        // Weak passwords should be rejected
        assertRejected("12345678");
        assertRejected("abcdefgh");
        assertRejected("PASSWORD1");
        assertRejected("qwerty12");
        assertRejected("pass");  // Too short
        assertRejected("Pass1"); // Too short

        // Strong passwords should be accepted (no sequential chars, no keyboard sequences)
        assertAccepted("Secure#Pass99");
        assertAccepted("Str0ng!Pwd");
        assertAccepted("My$ecure2024");
        assertAccepted("Str0ng!Pwd9");
    }

    private void assertRejected(String password) {
        var result = passwordValidator.validateWithResult(password);
        assertFalse(result.passed(),
                "Password '" + password + "' should be rejected as weak");
    }

    private void assertAccepted(String password) {
        var result = passwordValidator.validateWithResult(password);
        assertTrue(result.passed(),
                "Password '" + password + "' should be accepted: " + result.errors());
    }

    // ─────────────────────────────────────────
    // 15.4.5 — Login attempts are logged
    // ─────────────────────────────────────────

    @Test
    void testLoginAttemptsAreLogged() throws Exception {
        // Create a user for login testing
        testDataHelper.tenant("登录日志测试租户").id(901L).save();
        User user = testDataHelper.user(901L, "13900000901", "Test@123")
                .id(901L)
                .status("active")
                .save();

        // Attempt login with wrong password
        String wrongLoginJson = """
            {
                "phone": "13900000901",
                "password": "WrongPassword"
            }
            """;

        setTenantContext(901L);
        MvcResult result = postJson("/api/auth/login", wrongLoginJson);

        // Should fail with auth error
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();
        assertTrue(
                content.contains("\"code\":\"USER001\"") || content.contains("\"code\": \"USER001\""),
                "Wrong password should return auth error, got: " + content
        );

        // Verify login failure was logged
        LambdaQueryWrapper<LoginSecurityLogEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LoginSecurityLogEntity::getUsername, "13900000901")
               .orderByDesc(LoginSecurityLogEntity::getCreatedAt)
               .last("LIMIT 1");
        List<LoginSecurityLogEntity> logs = loginSecurityLogMapper.selectList(wrapper);

        assertFalse(logs.isEmpty(), "Login attempt should be logged");
        LoginSecurityLogEntity lastLog = logs.get(0);
        assertEquals("FAILED", lastLog.getStatus(),
                "Log status should be FAILED");
        assertNotNull(lastLog.getIp(),
                "IP should be captured in login log");
    }

    // ─────────────────────────────────────────
    // 15.4.6 — Account lock/unlock by admin
    // ─────────────────────────────────────────

    @Test
    void testManualAccountLock() {
        String testPhone = "13900000013";

        // Lock account manually
        accountLockService.lock(testPhone);

        // Verify account is locked
        assertTrue(accountLockService.isLocked(testPhone),
                "Account should be locked");

        // Remaining seconds should be positive
        long remaining = accountLockService.getRemainingSeconds(testPhone);
        assertTrue(remaining > 0,
                "Remaining lock time should be positive");

        // Unlock account
        accountLockService.unlock(testPhone);

        // Verify account is unlocked
        assertFalse(accountLockService.isLocked(testPhone),
                "Account should be unlocked");
    }

    // ─────────────────────────────────────────
    // 15.4.7 — Login with locked account rejected
    // ─────────────────────────────────────────

    @Test
    void testLoginWithLockedAccountRejected() throws Exception {
        testDataHelper.tenant("锁定账户测试租户").id(902L).save();
        User user = testDataHelper.user(902L, "13900000902", "Test@123")
                .id(902L)
                .status("active")
                .save();

        // Lock the account by recording failures
        String testIp = "192.168.1.202";
        for (int i = 0; i < 5; i++) {
            loginRateLimitService.recordFailure(testIp, user.getPhone());
        }

        // Try to login
        String loginJson = """
            {
                "phone": "13900000902",
                "password": "Test@123"
            }
            """;

        setTenantContext(902L);
        MvcResult result = postJson("/api/auth/login", loginJson);
        result.getResponse().setCharacterEncoding("UTF-8");
        String content = result.getResponse().getContentAsString();

        // Should be rejected because account has too many failures
        // With failureThreshold=2, captcha may be required (3005) before lock (3002) triggers
        assertTrue(
                content.contains("\"code\":\"USER002\"") || content.contains("\"code\": \"USER002\"") ||
                content.contains("\"code\":\"USER005\"") || content.contains("\"code\": \"USER005\"") ||
                content.contains("锁定") || content.contains("图形验证码"),
                "Login with excessive failures should be rejected, got: " + content
        );
    }

    @Autowired
    private TestDataHelper testDataHelper;
}
