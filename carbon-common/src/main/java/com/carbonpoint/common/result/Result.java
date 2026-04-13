package com.carbonpoint.common.result;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Unified API response wrapper.
 *
 * @param <T> the type of the response data
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Result<T> {

    private T data;
    private int code;
    private String message;

    public static <T> Result<T> success() {
        return new Result<>(null, 200, "操作成功");
    }

    public static <T> Result<T> success(T data) {
        return new Result<>(data, 200, "操作成功");
    }

    public static <T> Result<T> success(T data, String message) {
        return new Result<>(data, 200, message);
    }

    public static <T> Result<T> error(int code, String message) {
        return new Result<>(null, code, message);
    }

    public static <T> Result<T> error(com.carbonpoint.common.result.ErrorCode errorCode) {
        return new Result<>(null, errorCode.getCode(), errorCode.getMessage());
    }

    public static <T> Result<T> error(com.carbonpoint.common.result.ErrorCode errorCode, String message) {
        return new Result<>(null, errorCode.getCode(), message);
    }
}
