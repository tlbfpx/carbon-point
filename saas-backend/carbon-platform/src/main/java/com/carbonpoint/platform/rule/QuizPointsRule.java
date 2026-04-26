package com.carbonpoint.platform.rule;

import com.carbonpoint.platform.RuleNode;
import com.carbonpoint.platform.model.RuleContext;
import com.carbonpoint.platform.model.RuleResult;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Awards points for quiz answers based on correctness.
 *
 * Trigger data inputs:
 * - isCorrect (boolean): whether the user's answer was correct
 * - pointsPerCorrect (int): points to award for a correct answer
 *
 * If isCorrect is true, returns pointsPerCorrect as the new point value.
 * If isCorrect is false, returns 0 points.
 */
@Component
public class QuizPointsRule implements RuleNode {

    @Override
    public RuleResult apply(RuleContext context) {
        Object isCorrectObj = context.getTriggerData().get("isCorrect");
        Object pointsPerCorrectObj = context.getTriggerData().get("pointsPerCorrect");

        boolean isCorrect = Boolean.TRUE.equals(isCorrectObj);
        int pointsPerCorrect = pointsPerCorrectObj != null ? ((Number) pointsPerCorrectObj).intValue() : 0;

        if (isCorrect) {
            return RuleResult.of(pointsPerCorrect, Map.of(
                    "isCorrect", true,
                    "basePoints", pointsPerCorrect,
                    "calculationMethod", "quiz_points"
            ));
        }

        return RuleResult.of(0, Map.of(
                "isCorrect", false,
                "basePoints", 0,
                "calculationMethod", "quiz_points"
        ));
    }

    @Override
    public String getName() {
        return "quizPoints";
    }
}
