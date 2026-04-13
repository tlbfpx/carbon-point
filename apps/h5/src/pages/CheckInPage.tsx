import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Toast } from 'antd-mobile';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doCheckIn } from '@/api/checkin';
import { useAuthStore } from '@/store/authStore';

const CheckInPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  const checkInMutation = useMutation({
    mutationFn: doCheckIn,
    onSuccess: (res) => {
      if (res.code === 200) {
        setCheckInSuccess(true);
        setEarnedPoints(res.data?.pointsEarned || 0);
        queryClient.invalidateQueries({ queryKey: ['checkInStatus'] });
        queryClient.invalidateQueries({ queryKey: ['pointsAccount'] });
        Toast.show('打卡成功！');
      } else {
        Toast.show(res.message || '打卡失败');
      }
    },
    onError: () => {
      Toast.show('网络错误，请重试');
    },
  });

  const handleCheckIn = () => {
    if (!user?.tenantId) {
      Toast.show('租户信息缺失');
      return;
    }
    checkInMutation.mutate({ tenantId: user.tenantId });
  };

  if (checkInSuccess) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>打卡成功！</h2>
        <p style={{ fontSize: 32, color: '#1890ff', fontWeight: 'bold', margin: '16px 0' }}>
          +{earnedPoints} 积分
        </p>
        <Button onClick={() => navigate('/')}>返回首页</Button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: 16 }}>
      <Card style={{ marginBottom: 16 }} title="今日打卡">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 80, marginBottom: 16 }}>🏃</div>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 24, textAlign: 'center' }}>
            完成爬楼梯运动后点击下方按钮完成打卡
          </p>
          <Button
            color="primary"
            size="large"
            loading={checkInMutation.isPending}
            onClick={handleCheckIn}
            style={{ width: '80%' }}
          >
            {checkInMutation.isPending ? '打卡中...' : '确认打卡'}
          </Button>
        </div>
      </Card>

      <Card title="打卡须知">
        <ul style={{ paddingLeft: 20, fontSize: 14, color: '#666', lineHeight: 1.8, margin: 0 }}>
          <li>请确保已完成爬楼梯运动</li>
          <li>每个时间段只能打卡一次</li>
          <li>积分根据规则引擎自动计算</li>
          <li>连续打卡可获得额外奖励</li>
        </ul>
      </Card>
    </div>
  );
};

export default CheckInPage;
