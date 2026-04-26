package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Checks daily quiz answer count limit.
 * If the user has already answered the maximum number of questions today,
 * short-circuits the chain (returns 0 points).
 *
 * Trigger data inputs:
 * - todayAnswered (int): number of questions already answered today
 * - dailyLimit (int): maximum questions per day
 */
@Component
public class QuizCheckRule implements RuleNode {

    @Override
    public RuleResult apply(RuleContext context) {
        Object todayAnsweredObj = context.getTriggerData().get("todayAnswered");
        Object dailyLimitObj = context.getTriggerData().get("dailyLimit");

        if (todayAnsweredObj == null || dailyLimitObj == null) {
            // No limit data available, pass through
            return RuleResult.passthrough(context.getCurrentPoints());
        }

        int todayAnswered = ((Number) todayAnsweredObj).intValue();
        int dailyLimit = ((Number) dailyLimitObj).intValue();

        if (todayAnswered >= dailyLimit) {
            return RuleResult.of(0, Map.of(
                    "shortCircuit", true,
                    "reason", "daily_limit_reached",
                    "todayAnswered", todayAnswered,
                    "dailyLimit", dailyLimit
            ));
        }

        return RuleResult.passthrough(context.getCurrentPoints());
    }

    @Override
    public String getName() {
        return "quizCheck";
    }
}
