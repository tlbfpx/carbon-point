package com.carbonpoint.common.security;

import com.carbonpoint.common.exception.BusinessException;
import com.carbonpoint.common.result.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Password strength validator.
 *
 * <p>Validation rules:
 * <ul>
 *   <li>Length: 8-32 characters</li>
 *   <li>At least 3 character types: uppercase, lowercase, digit, special</li>
 *   <li>No weak password dictionary entries</li>
 *   <li>No sequential characters (e.g., 123, abc)</li>
 *   <li>No keyboard sequences (e.g., qwerty, asdf)</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PasswordValidator {

    private final SecurityProperties securityProperties;

    private static final Set<String> WEAK_PASSWORDS = Set.of(
            "123456", "12345678", "123456789", "1234567890",
            "password", "password123", "admin123", "admin",
            "123qwe", "qwe123", "asd123", "abc123",
            "qwerty", "qwerty123", "letmein", "welcome",
            "monkey", "dragon", "master", "login",
            "passw0rd", "P@ssword", "P@ssw0rd",
            "111111", "222222", "666666", "888888"
    );

    private static final String SEQUENTIAL_CHARS = "qwxyzabcdefghijklmnoprstuvw0123456789";
    private static final int SEQUENTIAL_MIN_LENGTH = 3;

    private static final List<String> KEYBOARD_SEQUENCES = List.of(
            "qwerty", "asdf", "zxcv", "qazwsx", "1qaz", "2wsx",
            "poiuy", "lkjh", "mnbv", "!@#$", "@#$%"
    );

    /**
     * Validate password strength.
     *
     * @param rawPassword the raw password to validate
     * @throws BusinessException if validation fails
     */
    public void validate(String rawPassword) {
        ValidationResult result = validateWithResult(rawPassword);
        if (!result.passed()) {
            throw new BusinessException(ErrorCode.USER_PASSWORD_WEAK, result.getFirstError());
        }
    }

    /**
     * Validate password and return detailed result.
     */
    public ValidationResult validateWithResult(String rawPassword) {
        List<String> errors = new ArrayList<>();

        if (rawPassword == null || rawPassword.isBlank()) {
            return new ValidationResult(false, List.of("密码不能为空"));
        }

        int minLen = securityProperties.getPassword().getMinLength();
        int maxLen = securityProperties.getPassword().getMaxLength();

        if (rawPassword.length() < minLen) {
            errors.add("密码长度至少 " + minLen + " 位");
        }
        if (rawPassword.length() > maxLen) {
            errors.add("密码长度不能超过 " + maxLen + " 位");
        }

        // Character type analysis
        boolean hasLower = rawPassword.chars().anyMatch(Character::isLowerCase);
        boolean hasUpper = rawPassword.chars().anyMatch(Character::isUpperCase);
        boolean hasDigit = rawPassword.chars().anyMatch(Character::isDigit);
        boolean hasSpecial = rawPassword.chars().anyMatch(c -> !Character.isLetterOrDigit(c));

        int typeCount = (hasLower ? 1 : 0) + (hasUpper ? 1 : 0) + (hasDigit ? 1 : 0) + (hasSpecial ? 1 : 0);
        int minTypes = securityProperties.getPassword().getMinTypes();

        // Weak password dictionary check (most important, check first for clear error messages)
        String lower = rawPassword.toLowerCase();
        if (WEAK_PASSWORDS.contains(lower)) {
            errors.add("密码过于简单，请使用更复杂的密码");
        }

        // Keyboard sequence check
        if (hasKeyboardSequence(lower)) {
            errors.add("密码不能包含键盘序列（如 qwerty）");
        }

        // Sequential character check
        if (hasSequentialChars(lower)) {
            errors.add("密码不能包含连续字符（如 abc、123）");
        }

        if (typeCount < minTypes) {
            errors.add("密码需包含至少 " + minTypes + " 种字符类型（大写字母/小写字母/数字/特殊字符）");
        }

        return new ValidationResult(errors.isEmpty(), errors);
    }

    /**
     * Calculate password strength level.
     *
     * @return 1=weak, 2=fair, 3=strong
     */
    public StrengthLevel calculateStrength(String rawPassword) {
        if (rawPassword == null || rawPassword.isBlank()) {
            return StrengthLevel.WEAK;
        }

        int score = 0;

        // Length score
        if (rawPassword.length() >= 12) score += 2;
        else if (rawPassword.length() >= 8) score += 1;

        // Character types
        if (rawPassword.chars().anyMatch(Character::isLowerCase)) score += 1;
        if (rawPassword.chars().anyMatch(Character::isUpperCase)) score += 1;
        if (rawPassword.chars().anyMatch(Character::isDigit)) score += 1;
        if (rawPassword.chars().anyMatch(c -> !Character.isLetterOrDigit(c))) score += 2;

        // Length bonus
        if (rawPassword.length() >= 16) score += 1;

        if (score >= 6) return StrengthLevel.STRONG;
        if (score >= 4) return StrengthLevel.FAIR;
        return StrengthLevel.WEAK;
    }

    private boolean hasSequentialChars(String s) {
        for (int i = 0; i <= s.length() - SEQUENTIAL_MIN_LENGTH; i++) {
            String sub = s.substring(i, i + SEQUENTIAL_MIN_LENGTH);
            if (isSequential(sub)) {
                return true;
            }
        }
        return false;
    }

    private boolean isSequential(String s) {
        // Check ascending
        for (int i = 1; i < s.length(); i++) {
            int prev = SEQUENTIAL_CHARS.indexOf(s.charAt(i - 1));
            int curr = SEQUENTIAL_CHARS.indexOf(s.charAt(i));
            if (prev == -1 || curr == -1) return false;
            if (curr != prev + 1) return false;
        }
        return true;
    }

    private boolean hasKeyboardSequence(String s) {
        for (String seq : KEYBOARD_SEQUENCES) {
            if (s.contains(seq)) {
                return true;
            }
        }
        return false;
    }

    // ─────────────────────────────────────────

    public record ValidationResult(boolean passed, List<String> errors) {
        public String getFirstError() {
            return errors.isEmpty() ? "验证通过" : errors.get(0);
        }
    }

    public enum StrengthLevel {
        WEAK, FAIR, STRONG
    }
}
