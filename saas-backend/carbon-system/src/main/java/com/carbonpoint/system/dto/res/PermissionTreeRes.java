package com.carbonpoint.system.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionTreeRes {
    private String code;
    private String name;
    private String type;
    private String path;
    private Integer sortOrder;
    private List<PermissionTreeRes> children;

    // Frontend compatibility fields - direct fields for JSON serialization
    private String key;
    private String label;

    // Builder customizations
    public static class PermissionTreeResBuilder {
        public PermissionTreeResBuilder code(String code) {
            this.code = code;
            this.key = code;
            return this;
        }

        public PermissionTreeResBuilder name(String name) {
            this.name = name;
            this.label = name;
            return this;
        }
    }

    // Setters that also update the compatibility fields
    public void setCode(String code) {
        this.code = code;
        this.key = code;
    }

    public void setName(String name) {
        this.name = name;
        this.label = name;
    }
}
