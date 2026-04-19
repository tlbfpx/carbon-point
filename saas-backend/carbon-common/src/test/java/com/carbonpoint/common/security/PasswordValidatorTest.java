package com.carbonpoint.common.security;

import com.carbonpoint.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for PasswordValidator.
 */
class PasswordValidatorTest {

    private PasswordValidator validator;
    private SecurityProperties properties;

    @BeforeEach
    void setUp() {
        properties = new SecurityProperties();
        properties.getPassword().setMinLength(8);
        properties.getPassword().setMaxLength(32);
        properties.getPassword().setMinTypes(3);
        validator = new PasswordValidator(properties);
    }

    @Nested
    @DisplayName("Password Strength Validation")
    class ValidateTests {

        @Test
        @DisplayName("Should accept strong password")
        void shouldAcceptStrongPassword() {
            assertDoesNotThrow(() -> validator.validate("MyP@ssw0rd!"));
        }

        @Test
        @DisplayName("Should accept password with exactly 3 types")
        void shouldAcceptMinTypes() {
            // Lower + Upper + Digit = 3 types; avoid "pas" (p->a->s) and "123" sequential
            assertDoesNotThrow(() -> validator.validate("MxyPzswd12"));
        }

        @Test
        @DisplayName("Should reject null password")
        void shouldRejectNullPassword() {
            assertThrows(BusinessException.class, () -> validator.validate(null));
        }

        @Test
        @DisplayName("Should reject empty password")
        void shouldRejectEmptyPassword() {
            assertThrows(BusinessException.class, () -> validator.validate(""));
        }

        @Test
        @DisplayName("Should reject password too short")
        void shouldRejectTooShort() {
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> validator.validate("Ab1!"));
            assertTrue(ex.getMessage().contains("至少 8 位"));
        }

        @Test
        @DisplayName("Should reject password too long")
        void shouldRejectTooLong() {
            String longPwd = "A".repeat(33) + "b1!";
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> validator.validate(longPwd));
            assertTrue(ex.getMessage().contains("不能超过 32 位"));
        }

        @Test
        @DisplayName("Should reject password with only 2 character types")
        void shouldRejectTwoCharacterTypes() {
            // Only lower + upper (2 types, needs 3)
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> validator.validate("MyPassword"));
            assertTrue(ex.getMessage().contains("3 种"));
        }

        @Test
        @DisplayName("Should reject weak password from dictionary")
        void shouldRejectWeakPassword() {
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> validator.validate("password123"));
            assertTrue(ex.getMessage().contains("过于简单"));
        }

        @Test
        @DisplayName("Should reject sequential characters")
        void shouldRejectSequential() {
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> validator.validate("Abc123456!"));
            assertTrue(ex.getMessage().contains("连续字符"));
        }

        @Test
        @DisplayName("Should reject keyboard sequence")
        void shouldRejectKeyboardSequence() {
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> validator.validate("Qwerty123!Ab"));
            assertTrue(ex.getMessage().contains("键盘序列"));
        }
    }

    @Nested
    @DisplayName("Password Strength Calculation")
    class StrengthTests {

        @Test
        @DisplayName("Should calculate weak strength")
        void shouldCalculateWeak() {
            assertEquals(PasswordValidator.StrengthLevel.WEAK,
                    validator.calculateStrength("abc"));
        }

        @Test
        @DisplayName("Should calculate fair strength")
        void shouldCalculateFair() {
            assertEquals(PasswordValidator.StrengthLevel.FAIR,
                    validator.calculateStrength("MyPass123"));
        }

        @Test
        @DisplayName("Should calculate strong strength")
        void shouldCalculateStrong() {
            assertEquals(PasswordValidator.StrengthLevel.STRONG,
                    validator.calculateStrength("MyStr0ng!P@ssw0rd2024"));
        }

        @Test
        @DisplayName("Should handle null password")
        void shouldHandleNull() {
            assertEquals(PasswordValidator.StrengthLevel.WEAK, validator.calculateStrength(null));
        }
    }
}
