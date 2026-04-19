import React, { useState, useEffect } from 'react';

interface PointsAnimatedProps {
  targetValue: number;
  duration?: number;
  formatter?: (value: number) => string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 积分数字滚动动画组件。
 * 从 0 滚动到目标值，带动画过渡效果。
 */
const PointsAnimated: React.FC<PointsAnimatedProps> = ({
  targetValue,
  duration = 1000,
  formatter = (val) => `+${val}`,
  className,
  style,
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [targetValue, duration]);

  return (
    <span className={className} style={style}>
      {formatter(displayValue)}
    </span>
  );
};

export default PointsAnimated;
