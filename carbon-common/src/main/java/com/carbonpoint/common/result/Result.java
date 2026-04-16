package com.carbonpoint.common.result;

import lombok.AllArgsConstructor;
import lombok.Builder;
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
@Builder
public class Result<T> {

    private T data;
    private String code;
    private String message;
    private String traceId;

    public static <T> Result<T> success() {
        return Result.<T>builder().data(null).code("0000").message("success").build();
    }

    public static <T> Result<T> success(T data) {
        return Result.<T>builder().data(data).code("0000").message("success").build();
    }

    public static <T> Result<T> success(T data, String message) {
        return Result.<T>builder().data(data).code("0000").message(message).build();
    }

    public static <T> Result<T> error(String code, String message) {
        return Result.<T>builder().data(null).code(code).message(message).build();
    }

    public static <T> Result<T> error(com.carbonpoint.common.result.ErrorCode errorCode) {
        return Result.<T>builder().data(null).code(errorCode.getCode()).message(errorCode.getMessage()).build();
    }

    public static <T> Result<T> error(com.carbonpoint.common.result.ErrorCode errorCode, String message) {
        return Result.<T>builder().data(null).code(errorCode.getCode()).message(message).build();
    }

    /**
     * Set traceId on this Result and return this for chaining.
     */
    public Result<T> withTraceId(String traceId) {
        this.traceId = traceId;
        return this;
    }
}
