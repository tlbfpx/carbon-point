package com.carbonpoint.points;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class LevelConstants {
    public static final int BRONZE = 1;    // 0-999
    public static final int SILVER = 2;    // 1000-4999
    public static final int GOLD = 3;      // 5000-19999
    public static final int PLATINUM = 4;  // 20000-49999
    public static final int DIAMOND = 5;   // 50000+

    private static final String[] NAMES = {"", "青铜", "白银", "黄金", "铂金", "钻石"};
    private static final int[] THRESHOLDS = {0, 0, 1000, 5000, 20000, 50000};

    public static String getName(int level) {
        if (level < 1 || level > 5) return "未知";
        return NAMES[level];
    }

    public static int getThreshold(int level) {
        if (level < 1 || level > 5) return 0;
        return THRESHOLDS[level];
    }

    /** Returns level for the given total points. */
    public static int getLevelByPoints(int totalPoints) {
        if (totalPoints >= THRESHOLDS[5]) return DIAMOND;
        if (totalPoints >= THRESHOLDS[4]) return PLATINUM;
        if (totalPoints >= THRESHOLDS[3]) return GOLD;
        if (totalPoints >= THRESHOLDS[2]) return SILVER;
        return BRONZE;
    }

    /** Coefficient multiplier for each level. */
    public static double getCoefficient(int level) {
        return switch (level) {
            case 1 -> 1.0;
            case 2 -> 1.2;
            case 3 -> 1.5;
            case 4 -> 2.0;
            case 5 -> 2.5;
            default -> 1.0;
        };
    }
}
