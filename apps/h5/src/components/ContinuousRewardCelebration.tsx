import React, { useState, useEffect } from 'react';
import { Button } from 'antd-mobile';
import PointsAnimated from './PointsAnimated';

interface ContinuousRewardCelebrationProps {
  consecutiveDays: number;
  bonusPoints: number;
  onClose: () => void;
}

/**
 * 连续打卡奖励庆祝动画组件。
 * 弹出层展示连续打卡天数和额外奖励积分，带动画效果。
 */
const ContinuousRewardCelebration: React.FC<ContinuousRewardCelebrationProps> = ({
  consecutiveDays,
  bonusPoints,
  onClose,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Lock body scroll when visible
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: '32px 24px',
        textAlign: 'center',
        maxWidth: '80%',
        animation: 'scaleIn 0.3s ease-out',
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>
          连续打卡 {consecutiveDays} 天！
        </h2>
        <p style={{ margin: '0 0 24px', color: '#666' }}>
          获得额外奖励积分
        </p>
        <div style={{
          fontSize: 42,
          fontWeight: 'bold',
          color: '#faad14',
          marginBottom: 32,
        }}>
          <PointsAnimated
            targetValue={bonusPoints}
            formatter={(val) => `+${val}`}
          />
          <span style={{ fontSize: 18, color: '#999' }}> 积分</span>
        </div>
        <Button block color="primary" size="large" onClick={handleClose}>
          知道了
        </Button>
      </div>

      <style>{`
        @keyframes scaleIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ContinuousRewardCelebration;
