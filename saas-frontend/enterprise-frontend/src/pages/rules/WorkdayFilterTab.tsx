import React, { useEffect } from 'react';
import {
  Radio,
  Checkbox,
  DatePicker,
  Button,
  Form,
  message,
  Spin,
  Space,
} from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWorkdayFilter,
  saveWorkdayFilter,
  WorkdayFilterConfig,
} from '@/api/rules';
import { useBranding } from '@/components/BrandingProvider';
import { GlassCard } from '@carbon-point/design-system';
import dayjs from 'dayjs';

interface WorkdayFilterTabProps {
  tenantId: string;
}

const WorkdayFilterTab: React.FC<WorkdayFilterTabProps> = ({ tenantId }) => {
  const { primaryColor } = useBranding();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['rules-workday-filter', tenantId],
    queryFn: () => getWorkdayFilter(tenantId),
    enabled: !!tenantId,
  });

  // Populate form when data arrives
  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        mode: data.mode || 'all',
        includeWeekend: data.includeWeekend || false,
        includeHoliday: data.includeHoliday || false,
        customDates: data.customDates
          ? data.customDates.map((d: string) => dayjs(d))
          : [],
      });
    }
  }, [data, form]);

  const currentMode = Form.useWatch('mode', form);

  const saveMutation = useMutation({
    mutationFn: async (values: {
      mode: WorkdayFilterConfig['mode'];
      includeWeekend: boolean;
      includeHoliday: boolean;
      customDates: dayjs.Dayjs[];
    }) => {
      const payload: WorkdayFilterConfig = {
        mode: values.mode,
        includeWeekend: values.includeWeekend,
        includeHoliday: values.includeHoliday,
        customDates: values.customDates
          ? values.customDates.map((d: dayjs.Dayjs) => d.format('YYYY-MM-DD'))
          : [],
      };
      return saveWorkdayFilter(tenantId, payload);
    },
    onSuccess: () => {
      message.success('有效日期配置已保存');
      queryClient.invalidateQueries({ queryKey: ['rules-workday-filter'] });
    },
    onError: () => {
      message.error('保存失败，请重试');
    },
  });

  if (isLoading) {
    return (
      <GlassCard hoverable style={{ padding: 40, textAlign: 'center' }}>
        <Spin />
      </GlassCard>
    );
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    color: 'rgba(255,255,255,0.85)',
  };

  return (
    <GlassCard hoverable style={{ padding: 24 }}>
      <h3
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 24,
          color: '#fff',
        }}
      >
        有效日期配置
      </h3>

      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => saveMutation.mutate(values)}
        initialValues={{
          mode: 'all',
          includeWeekend: false,
          includeHoliday: false,
          customDates: [],
        }}
      >
        <Form.Item
          name="mode"
          label={<span style={labelStyle}>日期范围</span>}
        >
          <Radio.Group
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <Radio
              value="all"
              style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-body)' }}
            >
              全部日期
            </Radio>
            <Radio
              value="workday_only"
              style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-body)' }}
            >
              仅工作日
            </Radio>
            <Radio
              value="custom"
              style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-body)' }}
            >
              自定义日期
            </Radio>
          </Radio.Group>
        </Form.Item>

        {currentMode === 'workday_only' && (
          <div
            style={{
              padding: '16px 20px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              marginBottom: 24,
            }}
          >
            <Space direction="vertical" size={8}>
              <Form.Item name="includeWeekend" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Checkbox style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'var(--font-body)' }}>
                  包含周末
                </Checkbox>
              </Form.Item>
              <Form.Item name="includeHoliday" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Checkbox style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'var(--font-body)' }}>
                  包含节假日
                </Checkbox>
              </Form.Item>
            </Space>
          </div>
        )}

        {currentMode === 'custom' && (
          <Form.Item
            name="customDates"
            label={<span style={labelStyle}>选择有效日期</span>}
            style={{ marginBottom: 24 }}
          >
            <DatePicker
              multiple
              format="YYYY-MM-DD"
              placeholder="点击选择日期"
              style={{
                width: '100%',
                borderRadius: 12,
              }}
              cellRender={(current) => {
                // Highlight selected dates
                const style: React.CSSProperties = {
                  borderRadius: 4,
                };
                return (
                  <div className="ant-picker-cell-inner" style={style}>
                    {current.date()}
                  </div>
                );
              }}
            />
          </Form.Item>
        )}

        <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={saveMutation.isPending}
            style={{
              borderRadius: 20,
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
              border: 'none',
              boxShadow: `0 4px 12px ${primaryColor}30`,
              fontWeight: 500,
              minWidth: 100,
              height: 40,
              padding: '4px 32px',
            }}
          >
            保存配置
          </Button>
        </Form.Item>
      </Form>
    </GlassCard>
  );
};

export default WorkdayFilterTab;
