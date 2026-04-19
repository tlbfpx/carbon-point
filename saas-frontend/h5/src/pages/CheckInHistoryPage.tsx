import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Empty, DotLoading, TabBar, Button } from 'antd-mobile';
import { useQuery } from '@tanstack/react-query';
import { getCheckInHistory } from '@/api/checkin';
import { useAuthStore } from '@/store/authStore';

const CheckInHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['checkInHistory', page],
    queryFn: () => getCheckInHistory({ page, size: pageSize }),
    enabled: !!user?.userId,
  });

  const records = data?.data?.records || [];
  const total = data?.data?.total || 0;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'checked_in': return '打卡成功';
      case 'failed': return '打卡失败';
      default: return status;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: '#fff', padding: '12px 16px', borderBottom: '1px solid #eee' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>打卡历史</h2>
      </div>

      <div style={{ padding: 16 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <DotLoading />
          </div>
        ) : records.length === 0 ? (
          <Empty description="暂无打卡记录" />
        ) : (
          <>
            <List>
              {records.map((record: Record<string, unknown>) => (
                <List.Item key={record.id as string}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 500 }}>
                        {record.timeSlotName ? String(record.timeSlotName) : '打卡记录'}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#999' }}>
                        {formatDate(record.checkInTime as string)} {formatTime(record.checkInTime as string)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                        +{record.pointsEarned as number}
                      </span>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#52c41a' }}>
                        {getStatusLabel(record.status as string)}
                      </p>
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

      <TabBar activeKey="checkin" onChange={(key) => {
        if (key === 'home') navigate('/');
        else if (key === 'walking') navigate('/walking');
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

export default CheckInHistoryPage;
