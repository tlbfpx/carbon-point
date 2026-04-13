package com.carbonpoint.common.security;

/**
 * Thread-local holder for platform admin context during request processing.
 * Populated by PlatformAuthenticationFilter from JWT claims.
 */
public class PlatformAdminContext {

    private static final ThreadLocal<PlatformAdminInfo> CONTEXT = new ThreadLocal<>();

    public static void set(PlatformAdminInfo info) {
        CONTEXT.set(info);
    }

    public static PlatformAdminInfo get() {
        return CONTEXT.get();
    }

    public static void clear() {
        CONTEXT.remove();
    }
}
