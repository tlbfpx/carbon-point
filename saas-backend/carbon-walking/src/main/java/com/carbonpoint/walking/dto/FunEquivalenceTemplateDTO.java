package com.carbonpoint.walking.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Fun equivalence template DTO.
 * Represents an item that can be equated to steps (e.g., "1 bowl of rice = 3000 steps").
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FunEquivalenceTemplateDTO {

    /**
     * Template name (e.g., "一碗米饭", "一根香蕉").
     */
    @NotBlank(message = "名称不能为空")
    private String name;

    /**
     * Steps required for this equivalence.
     */
    @NotNull(message = "步数不能为空")
    @Min(value = 1, message = "步数必须大于0")
    private Integer stepsPer;

    /**
     * Icon emoji or icon class name.
     */
    private String icon;
}
