import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '@carbon-point/design-system';
import { Button, Toast, DotLoading, TabBar, ProgressBar } from 'antd-mobile';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getWalkingStatus, claimWalkingPoints } from '@/api/walking';

const WalkingPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['walkingStatus'],
    queryFn: getWalkingStatus,
  });

  const claimMutation = useMutation({
    mutationFn: () => claimWalkingPoints('manual'),
    onSuccess: (res) => {
      if (res.success) {
        Toast.show(`领取成功！获得 ${res.pointsEarned || 0} 积分`);
        queryClient.invalidateQueries({ queryKey: ['walkingStatus'] });
        queryClient.invalidateQueries({ queryKey: ['pointsAccount'] });
      } else {
        Toast.show(res.message || '领取失败');
      }
    },
    onError: () => {
      Toast.show('网络错误，请重试');
    },
  });

  const todaySteps = status?.todaySteps || 0;
  const threshold = status?.stepsThreshold || 1000;
  const progress = Math.min(100, Math.round((todaySteps / threshold) * 100));
  const canClaim = status ? !status.claimed && todaySteps >= threshold : false;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
        padding: '24px 16px',
        color: '#fff',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 14, opacity: 0.8, margin: 0 }}>今日步数</p>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            <DotLoading color="white" />
          </div>
        ) : (
          <>
            <p style={{ fontSize: 56, fontWeight: 'bold', margin: '8px 0', fontFamily: 'Outfit, sans-serif' }}>
              {todaySteps.toLocaleString()}
            </p>
            <p style={{ fontSize: 13, opacity: 0.8, margin: 0 }}>
              目标 {threshold.toLocaleString()} 步
            </p>
          </>
        )}
      </div>

      <div style={{ padding: 16 }}>
        {/* Progress */}
        <GlassCard style={{ marginBottom: 16 }} title="进度">
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
              <DotLoading />
            </div>
          ) : (
            <>
              <ProgressBar
                percent={progress}
                style={{ '--fill-color': '#52c41a' } as React.CSSProperties}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 12, color: '#999' }}>{todaySteps.toLocaleString()} 步</span>
                <span style={{ fontSize: 12, color: '#999' }}>{threshold.toLocaleString()} 步</span>
              </div>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Button
                  color="primary"
                  disabled={!canClaim}
                  loading={claimMutation.isPending}
                  onClick={() => claimMutation.mutate()}
                  style={{
                    borderRadius: 24,
                    padding: '8px 48px',
                    fontSize: 16,
                    fontWeight: 600,
                    ...(canClaim ? {} : { opacity: 0.5 }),
                  }}
                >
                  {status?.claimed ? '今日已领取' : todaySteps < threshold ? `还差 ${(threshold - todaySteps).toLocaleString()} 步` : `领取 ${status?.claimablePoints || 0} 积分`}
                </Button>
              </div>
            </>
          )}
        </GlassCard>

        {/* Fun Equivalence */}
        <GlassCard style={{ marginBottom: 16 }} title="趣味换算">
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
              <DotLoading />
            </div>
          ) : (status?.funEquivalences || []).length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '8px 0' }}>暂无换算数据</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              {(status?.funEquivalences || []).map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: '#f6ffed',
                    borderRadius: 12,
                    padding: '12px 16px',
                    minWidth: 80,
                  }}
                >
                  <span style={{ fontSize: 28 }}>{item.icon}</span>
                  <span style={{ fontSize: 18, fontWeight: 'bold', color: '#52c41a', fontFamily: 'Outfit, sans-serif' }}>
                    {item.quantity}
                  </span>
                  <span style={{ fontSize: 12, color: '#666' }}>{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* History Link */}
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <span
            style={{ color: '#1677ff', fontSize: 14, cursor: 'pointer' }}
            onClick={() => navigate('/walking/history')}
          >
            查看走路历史 →
          </span>
        </div>
      </div>

      <TabBar activeKey="walking" onChange={(key) => {
        if (key === 'home') navigate('/');
        else if (key === 'checkin') navigate('/checkin');
        else if (key === 'mall') navigate('/mall');
        else if (key === 'profile') navigate('/profile');
      }}>
        <TabBar.Item key="home" title="首页" />
        <TabBar.Item key="checkin" title="打卡" />
        <TabBar.Item key="walking" title="走路" />
        <TabBar.Item key="mall" title="商城" />
        <TabBar.Item key="profile" title="我的" />
      </TabBar>
    </div>
  );
};

export default WalkingPage;
