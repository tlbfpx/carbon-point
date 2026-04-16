import React, { useState, useEffect } from 'react';
import { Animated } from 'react-native-web';

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
  const [animation] = useState(() => new Animated.Value(0));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    animation.addListener(({ value }) => {
      setDisplayValue(Math.floor(value));
    });

    Animated.timing(animation, {
      toValue: targetValue,
      duration,
      useNativeDriver: false,
    }).start();

    return () => animation.removeAllListeners();
  }, [animation, targetValue, duration]);

  return (
    <span className={className} style={style}>
      {formatter(displayValue)}
    </span>
  );
};

export default PointsAnimated;
