import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Table, Button, DatePicker, Space, message } from 'antd';
import { DownloadOutlined, TeamOutlined, TrophyOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { getDashboardStats, getCheckInTrend, getPointsTrend, exportReport, DashboardStats, CheckInTrend, PointsTrend } from '@/api/reports';

const { RangePicker } = DatePicker;

const Reports: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId || '';
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);

  const startDate = dateRange?.[0]?.format('YYYY-MM-DD') || dayjs().subtract(30, 'day').format('YYYY-MM-DD');
  const endDate = dateRange?.[1]?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD');

  const { data: statsData } = useQuery({
    queryKey: ['report-stats', tenantId, startDate, endDate],
    queryFn: () => getDashboardStats(tenantId),
    enabled: !!tenantId,
  });

  const { data: checkInTrendData } = useQuery({
    queryKey: ['report-checkin', tenantId, startDate, endDate],
    queryFn: () => getCheckInTrend(tenantId, 30),
    enabled: !!tenantId,
  });

  const { data: pointsTrendData } = useQuery({
    queryKey: ['report-points', tenantId, startDate, endDate],
    queryFn: () => getPointsTrend(tenantId, 30),
    enabled: !!tenantId,
  });

  const stats: DashboardStats = statsData?.data || {
    todayCheckInCount: 0,
    todayPointsGranted: 0,
    activeUsers: 0,
    monthExchangeCount: 0,
  };
  const checkInTrend: CheckInTrend[] = checkInTrendData?.data || [];
  const pointsTrend: PointsTrend[] = pointsTrendData?.data || [];

  const handleExport = (type: string) => {
    exportReport(tenantId, type, startDate, endDate).then((blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${type}-${startDate}-${endDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    }).catch(() => {
      message.error('导出失败，请重试');
    });
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>数据报表</h2>

      <Space style={{ marginBottom: 16 }}>
        <RangePicker value={dateRange} onChange={(dates) => { if (dates) setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs]); }} />
        <Button icon={<DownloadOutlined />} onClick={() => handleExport('checkin')}>
          导出打卡报表
        </Button>
        <Button icon={<DownloadOutlined />} onClick={() => handleExport('points')}>
          导出积分报表
        </Button>
        <Button icon={<DownloadOutlined />} onClick={() => handleExport('orders')}>
          导出订单报表
        </Button>
      </Space>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card><Statistic title="今日打卡人数" value={stats.todayCheckInCount} prefix={<TeamOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="今日积分发放" value={stats.todayPointsGranted} prefix={<TrophyOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="活跃用户" value={stats.activeUsers} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="本月兑换量" value={stats.monthExchangeCount} prefix={<ShoppingOutlined />} /></Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="打卡趋势">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={checkInTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#1890ff" name="打卡人数" />
                <Line type="monotone" dataKey="totalPoints" stroke="#52c41a" name="发放积分" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="积分趋势">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pointsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="granted" fill="#52c41a" name="发放积分" />
                <Bar dataKey="consumed" fill="#ff4d4f" name="消耗积分" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="打卡数据明细">
            <Table
              dataSource={checkInTrend}
              rowKey="date"
              pagination={false}
              size="small"
              columns={[
                { title: '日期', dataIndex: 'date' },
                { title: '打卡人数', dataIndex: 'count' },
                { title: '发放积分', dataIndex: 'totalPoints' },
              ]}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="积分数据明细">
            <Table
              dataSource={pointsTrend}
              rowKey="date"
              pagination={false}
              size="small"
              columns={[
                { title: '日期', dataIndex: 'date' },
                { title: '发放积分', dataIndex: 'granted' },
                { title: '消耗积分', dataIndex: 'consumed' },
                {
                  title: '净增',
                  render: (_: unknown, record: PointsTrend) => (
                    <span style={{ color: record.granted - record.consumed >= 0 ? '#52c41a' : '#ff4d4f' }}>
                      {record.granted - record.consumed}
                    </span>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Reports;
