import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Toast, DotLoading, Badge, TabBar } from 'antd-mobile';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doCheckIn, getTimeSlots, TimeSlotResponse } from '@/api/checkin';
import { isInWeChat, configureWeChat, getWeChatLocation } from '@/utils/wechat';
import { getWeChatConfig, verifyLocation } from '@/api/wechat';

const CheckInPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [countdown, setCountdown] = useState(3);

  // Auto-return after successful check-in
  useEffect(() => {
    if (!checkInSuccess) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [checkInSuccess, navigate]);

  const { data: timeSlotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['timeSlots'],
    queryFn: getTimeSlots,
  });

  const checkInMutation = useMutation({
    mutationFn: doCheckIn,
    onSuccess: (res) => {
      if (res.code === 200) {
        setCheckInSuccess(true);
        setEarnedPoints(res.data?.pointsEarned || 0);
        queryClient.invalidateQueries({ queryKey: ['checkInStatus'] });
        queryClient.invalidateQueries({ queryKey: ['pointsAccount'] });
        queryClient.invalidateQueries({ queryKey: ['timeSlots'] });
        Toast.show('打卡成功！');
      } else {
        Toast.show(res.message || '打卡失败');
      }
    },
    onError: () => {
      Toast.show('网络错误，请重试');
    },
  });

  const handleCheckIn = async (ruleId: number) => {
    // Location verification for WeChat browser
    if (isInWeChat()) {
      try {
        Toast.show('正在验证位置...');
        const configRes = await getWeChatConfig(window.location.href.split('#')[0]);
        await configureWeChat(configRes.data);
        const location = await getWeChatLocation();
        const verifyRes = await verifyLocation({
          latitude: location.latitude,
          longitude: location.longitude,
          ruleId,
        });

        if (!verifyRes.data.allowed) {
          Toast.show(verifyRes.data.message || '位置验证失败，请在指定范围内打卡');
          return;
        }
      } catch (err) {
        // Location verification failed - still allow check-in (graceful degradation)
        const msg = err instanceof Error ? err.message : '位置获取失败';
        Toast.show(`位置验证跳过: ${msg}`);
      }
    }

    checkInMutation.mutate({ ruleId });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    // timeStr format: "HH:mm:ss" or "HH:mm"
    const parts = timeStr.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  const getSlotStatusBadge = (status: TimeSlotResponse['status']) => {
    switch (status) {
      case 'checked_in':
        return <Badge content="已打卡" color="#52c41a" />;
      case 'available':
        return <Badge content="可打卡" color="#1890ff" />;
      case 'not_started':
        return <Badge content="未开始" color="#999" />;
      case 'ended':
        return <Badge content="已结束" color="#999" />;
      default:
        return null;
    }
  };

  const getSlotActionButton = (slot: TimeSlotResponse) => {
    if (slot.status === 'checked_in') {
      return <Button size="small" disabled style={{ opacity: 0.5 }}>已完成</Button>;
    }
    if (slot.status === 'available') {
      return (
        <Button
          size="small"
          color="primary"
          loading={checkInMutation.isPending}
          onClick={() => handleCheckIn(slot.ruleId)}
        >
          打卡
        </Button>
      );
    }
    return <Button size="small" disabled style={{ opacity: 0.5 }}>暂不可打卡</Button>;
  };

  if (checkInSuccess) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}>
        <style>{`
          @keyframes float-up {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-80px) scale(1.5); }
          }
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(24, 144, 255, 0.3); }
            50% { box-shadow: 0 0 40px rgba(24, 144, 255, 0.6); }
          }
          @keyframes pop-in {
            0% { transform: scale(0.5); opacity: 0; }
            70% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
          .points-anim { animation: float-up 1.5s ease-out forwards; }
          .points-badge { animation: pulse-glow 2s ease-in-out infinite, pop-in 0.5s ease-out forwards; }
        `}</style>

        <div className="points-badge" style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 32, color: '#fff' }}>✓</div>
          <div style={{ fontSize: 12, color: '#fff', fontWeight: 'bold' }}>打卡成功</div>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 16, color: '#333' }}>恭喜完成打卡！</h2>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: 200,
          height: 200,
          position: 'relative',
        }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="points-anim"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                fontSize: 20,
                fontWeight: 'bold',
                color: i % 2 === 0 ? '#1890ff' : '#52c41a',
                opacity: 0,
                animationDelay: `${i * 0.15}s`,
                animationFillMode: 'forwards',
              }}
            >
              +{Math.max(1, Math.floor(earnedPoints / 5))}
            </div>
          ))}
          <div style={{
            fontSize: 48,
            fontWeight: 'bold',
            color: '#1890ff',
          }}>
            +{earnedPoints}
          </div>
          <div style={{ fontSize: 14, color: '#999', marginTop: 4 }}>积分</div>
        </div>

        <p style={{ color: '#999', fontSize: 14, marginBottom: 16 }}>
          {countdown > 0 ? `${countdown} 秒后自动返回首页` : '正在返回...'}
        </p>
        <Button onClick={() => navigate('/')}>立即返回</Button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: 16 }}>
      <Card style={{ marginBottom: 16 }} title="今日打卡时段">
        {slotsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <DotLoading />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(timeSlotsData?.data || []).length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', padding: '16px 0' }}>
                暂无可用打卡时段
              </p>
            ) : (
              (timeSlotsData?.data || []).map((slot) => (
                <div
                  key={slot.ruleId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: slot.status === 'checked_in' ? '#f6ffed'
                      : slot.status === 'available' ? '#e6f7ff'
                      : '#f5f5f5',
                    borderRadius: 8,
                    border: `1px solid ${slot.status === 'available' ? '#1890ff' : '#f0f0f0'}`,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 500, fontSize: 15 }}>{slot.name}</span>
                      {getSlotStatusBadge(slot.status)}
                    </div>
                    <span style={{ fontSize: 12, color: '#666' }}>
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </span>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {getSlotActionButton(slot)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      <Card title="打卡须知">
        <ul style={{ paddingLeft: 20, fontSize: 14, color: '#666', lineHeight: 1.8, margin: 0 }}>
          <li>请确保已完成爬楼梯运动</li>
          <li>每个时间段只能打卡一次</li>
          <li>积分根据规则引擎自动计算</li>
          <li>连续打卡可获得额外奖励</li>
        </ul>
      </Card>

      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <span
          style={{ color: '#1677ff', fontSize: 14, cursor: 'pointer' }}
          onClick={() => navigate('/checkin/history')}
        >
          查看打卡历史 →
        </span>
      </div>

      <TabBar activeKey="checkin" onChange={(key) => {
        if (key === 'home') navigate('/');
        else if (key === 'mall') navigate('/mall');
        else if (key === 'coupons') navigate('/my-coupons');
        else if (key === 'profile') navigate('/profile');
      }}>
        <TabBar.Item key="home" title="首页" />
        <TabBar.Item key="checkin" title="打卡" />
        <TabBar.Item key="mall" title="商城" />
        <TabBar.Item key="coupons" title="卡券" />
        <TabBar.Item key="profile" title="我的" />
      </TabBar>
    </div>
  );
};

export default CheckInPage;
