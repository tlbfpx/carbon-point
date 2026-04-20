import React from 'react';
import { GlassCard } from '@carbon-point/design-system';
import { Button, Dialog, DotLoading } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExpirationStatus, extendExpiration, ExpirationStatus } from '@/api/points';
import dayjs from 'dayjs';

const PointExpirationPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['expirationStatus'],
    queryFn: getExpirationStatus,
  });

  const extendMutation = useMutation({
    mutationFn: extendExpiration,
    onSuccess: () => {
      Dialog.alert({ content: '延期成功！积分有效期已延长。' });
      queryClient.invalidateQueries({ queryKey: ['expirationStatus'] });
    },
    onError: () => {
      Dialog.alert({ content: '延期失败，请稍后重试。' });
    },
  });

  const status = data?.data;

  const handleExtend = async () => {
    const confirmed = await Dialog.confirm({
      content: '确认延期？每位用户仅可延期一次。',
    });
    if (confirmed) {
      extendMutation.mutate();
    }
  };

  const getDaysUntilExpiry = (expirationDate: string | null) => {
    if (!expirationDate) return null;
    const diff = dayjs(expirationDate).diff(dayjs(), 'day');
    return diff;
  };

  const daysLeft = getDaysUntilExpiry(status?.expirationDate || null);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
        padding: '24px 16px',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span
            style={{ fontSize: 20, cursor: 'pointer' }}
            onClick={() => navigate(-1)}
          >
            &larr;
          </span>
          <span style={{ fontSize: 18, fontWeight: 600 }}>积分过期状态</span>
        </div>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <DotLoading color="white" />
          </div>
        ) : !status?.enabled ? (
          <div>
            <p style={{ fontSize: 20, fontWeight: 'bold', margin: '8px 0' }}>未启用</p>
            <p style={{ fontSize: 14, opacity: 0.8 }}>您的企业暂未启用积分过期策略</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 14, opacity: 0.8 }}>可用积分</p>
            <p style={{ fontSize: 48, fontWeight: 'bold', margin: '4px 0' }}>
              {status.availablePoints.toLocaleString()}
            </p>
            {daysLeft !== null && (
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '4px 12px',
                borderRadius: 4,
                display: 'inline-block',
                fontSize: 13,
                marginTop: 4,
              }}>
                {daysLeft > 0
                  ? `${daysLeft} 天后过期`
                  : daysLeft === 0
                    ? '今日过期'
                    : '已过期'}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ padding: 16 }}>
        {status?.enabled && (
          <>
            {/* Expiration Details */}
            <GlassCard style={{ marginBottom: 16 }} title="过期详情">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666', fontSize: 14 }}>过期周期</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {status.expirationMonths} 个月
                  </span>
                </div>
                {status.lastActivityDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#666', fontSize: 14 }}>最近活跃</span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {dayjs(status.lastActivityDate).format('YYYY-MM-DD')}
                    </span>
                  </div>
                )}
                {status.expirationDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#666', fontSize: 14 }}>过期日期</span>
                    <span style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: daysLeft !== null && daysLeft <= 30 ? '#ff4d4f' : '#333',
                    }}>
                      {dayjs(status.expirationDate).format('YYYY-MM-DD')}
                    </span>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Warning Card */}
            {daysLeft !== null && daysLeft > 0 && daysLeft <= 30 && (
              <GlassCard style={{ marginBottom: 16 }}>
                <div style={{
                  padding: 16,
                  background: '#fff7e6',
                  borderRadius: 12,
                  border: '1px solid #ffd591',
                }}>
                  <p style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#d46b08',
                    margin: '0 0 4px 0',
                  }}>
                    您的积分即将过期！
                  </p>
                  <p style={{ fontSize: 13, color: '#ad6800', margin: 0 }}>
                    {status.availablePoints} 积分将在 {daysLeft} 天后清零，
                    {status.canExtend && !status.alreadyExtended
                      ? '您可以申请延期。'
                      : '请尽快使用。'}
                  </p>
                </div>
              </GlassCard>
            )}

            {/* Extend Button */}
            {status.canExtend && !status.alreadyExtended && (
              <GlassCard style={{ marginBottom: 16 }}>
                <Button
                  block
                  color="primary"
                  size="large"
                  loading={extendMutation.isPending}
                  onClick={handleExtend}
                  style={{ borderRadius: 12, fontWeight: 600 }}
                >
                  申请积分延期（仅限一次）
                </Button>
              </GlassCard>
            )}

            {/* Already Extended Notice */}
            {status.alreadyExtended && (
              <GlassCard style={{ marginBottom: 16 }}>
                <div style={{
                  padding: 16,
                  background: '#e6f7ff',
                  borderRadius: 12,
                  border: '1px solid #91d5ff',
                }}>
                  <p style={{ fontSize: 14, color: '#096dd9', margin: 0 }}>
                    您已使用过延期机会。
                  </p>
                </div>
              </GlassCard>
            )}
          </>
        )}

        {/* Disabled State */}
        {status && !status.enabled && (
          <GlassCard>
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: 16, color: '#666' }}>您的企业暂未启用积分过期策略。</p>
              <p style={{ fontSize: 13, color: '#999', marginTop: 8 }}>
                积分不会过期，可放心使用。
              </p>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default PointExpirationPage;
