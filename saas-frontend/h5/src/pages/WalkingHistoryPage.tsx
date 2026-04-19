import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Empty, DotLoading, Button } from 'antd-mobile';
import { useQuery } from '@tanstack/react-query';
import { getWalkingHistory } from '@/api/walking';
import { useAuthStore } from '@/store/authStore';

const WalkingHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['walkingHistory', page],
    queryFn: () => getWalkingHistory(page, pageSize),
    enabled: !!user?.userId,
  });

  const records = data?.records || [];
  const total = data?.total || 0;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        padding: '12px 16px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span
          style={{ fontSize: 18, cursor: 'pointer', color: '#1677ff' }}
          onClick={() => navigate('/walking')}
        >
          ← 返回
        </span>
        <h2 style={{ margin: 0, fontSize: 18 }}>走路历史</h2>
      </div>

      <div style={{ padding: 16 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <DotLoading />
          </div>
        ) : records.length === 0 ? (
          <Empty description="暂无走路记录" />
        ) : (
          <>
            <List>
              {records.map((record) => (
                <List.Item key={record.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 500 }}>
                        {record.source === 'manual' ? '手动领取' : '自动领取'}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#999' }}>
                        {formatDate(record.date)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 13, color: '#666' }}>{record.steps.toLocaleString()} 步</span>
                      </div>
                      <span style={{ color: '#52c41a', fontWeight: 'bold', fontSize: 15 }}>
                        +{record.pointsEarned}
                      </span>
                    </div>
                  </div>
                </List.Item>
              ))}
            </List>

            {total > pageSize && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16 }}>
                <Button
                  size="small"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  上一页
                </Button>
                <span style={{ lineHeight: '28px', fontSize: 14, color: '#666' }}>
                  {page} / {Math.ceil(total / pageSize)}
                </span>
                <Button
                  size="small"
                  disabled={page >= Math.ceil(total / pageSize)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WalkingHistoryPage;
