import React, { useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  TimePicker,
  Button,
  Space,
  message,
  Spin,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTimeSlotRules,
  batchSaveTimeSlots,
  TimeSlotRule,
} from '@/api/rules';
import { useBranding } from '@/components/BrandingProvider';
import { GlassCard } from '@carbon-point/design-system';
import dayjs from 'dayjs';

interface TimeSlotTabProps {
  tenantId: string;
}

interface SlotFormValues {
  slots: {
    name: string;
    startTime: dayjs.Dayjs | null;
    endTime: dayjs.Dayjs | null;
    basePointsMin: number;
    basePointsMax: number;
    pointsPerFloor?: number;
  }[];
}

const TimeSlotTab: React.FC<TimeSlotTabProps> = ({ tenantId }) => {
  const { primaryColor } = useBranding();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<SlotFormValues>();

  const { data, isLoading } = useQuery({
    queryKey: ['rules-timeslots', tenantId],
    queryFn: () => getTimeSlotRules(tenantId),
    enabled: !!tenantId,
  });

  // Populate form when data arrives
  useEffect(() => {
    if (data) {
      const records = (data as any)?.records || data || [];
      if (records.length > 0) {
        form.setFieldsValue({
          slots: records.map((r: TimeSlotRule & { config?: string }) => {
            let minPoints = r.basePoints || 1;
            let maxPoints = r.basePoints || 10;
            let pointsPerFloor = 0;
            try {
              const config = typeof r.config === 'string' ? JSON.parse(r.config) : r.config || {};
              minPoints = config.minPoints ?? minPoints;
              maxPoints = config.maxPoints ?? maxPoints;
              pointsPerFloor = config.pointsPerFloor ?? 0;
            } catch {}
            return {
              name: r.name || '',
              startTime: r.startTime ? dayjs(r.startTime, 'HH:mm') : null,
              endTime: r.endTime ? dayjs(r.endTime, 'HH:mm') : null,
              basePointsMin: minPoints,
              basePointsMax: maxPoints,
              pointsPerFloor,
            };
          }),
        });
      }
    }
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: SlotFormValues) => {
      // Validate time overlap
      const slots = values.slots || [];
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (!slot.startTime || !slot.endTime) {
          throw new Error(`第 ${i + 1} 个时间段未填写完整`);
        }
        if (slot.startTime.isSameOrAfter(slot.endTime)) {
          throw new Error(`第 ${i + 1} 个时间段：开始时间必须早于结束时间`);
        }
        // Check overlap with subsequent slots
        for (let j = i + 1; j < slots.length; j++) {
          const other = slots[j];
          if (!other.startTime || !other.endTime) continue;
          const s1 = slot.startTime.format('HH:mm');
          const e1 = slot.endTime.format('HH:mm');
          const s2 = other.startTime.format('HH:mm');
          const e2 = other.endTime.format('HH:mm');
          if (s1 < e2 && s2 < e1) {
            throw new Error(
              `时间段"${slot.name || i + 1}"与"${other.name || j + 1}"存在时间重叠`
            );
          }
        }
      }

      const payload = slots.map((slot) => ({
        name: slot.name || '',
        startTime: slot.startTime ? slot.startTime.format('HH:mm') : '',
        endTime: slot.endTime ? slot.endTime.format('HH:mm') : '',
        basePointsMin: slot.basePointsMin || 1,
        basePointsMax: slot.basePointsMax || 10,
        pointsPerFloor: slot.pointsPerFloor || 0,
        enabled: true,
      }));

      return batchSaveTimeSlots(payload);
    },
    onSuccess: () => {
      message.success('时间段规则已保存');
      queryClient.invalidateQueries({ queryKey: ['rules-timeslots'] });
    },
    onError: (err: Error) => {
      message.error(err.message || '保存失败，请重试');
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
        时间段规则配置
      </h3>

      <Form form={form} layout="vertical" onFinish={(values) => saveMutation.mutate(values)}>
        <Form.List name="slots">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...rest }, index) => (
                <div
                  key={key}
                  style={{
                    background: index % 2 === 0
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(255,255,255,0.06)',
                    padding: '20px',
                    borderRadius: 12,
                    marginBottom: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {/* Row 1: Name */}
                  <Form.Item
                    {...rest}
                    name={[name, 'name']}
                    label={<span style={labelStyle}>时段名称</span>}
                    rules={[{ required: true, message: '请输入时段名称' }]}
                    style={{ marginBottom: 16 }}
                  >
                    <Input
                      placeholder="如：早高峰"
                      style={{
                        borderRadius: 12,
                        borderColor: 'rgba(255,255,255,0.1)',
                        padding: '8px 16px',
                      }}
                    />
                  </Form.Item>

                  {/* Row 2: Time pickers */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    <Form.Item
                      {...rest}
                      name={[name, 'startTime']}
                      label={<span style={labelStyle}>开始时间</span>}
                      rules={[{ required: true, message: '请选择开始时间' }]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <TimePicker
                        format="HH:mm"
                        placeholder="如：07:00"
                        style={{ width: '100%', borderRadius: 12 }}
                      />
                    </Form.Item>
                    <Form.Item
                      {...rest}
                      name={[name, 'endTime']}
                      label={<span style={labelStyle}>结束时间</span>}
                      rules={[{ required: true, message: '请选择结束时间' }]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <TimePicker
                        format="HH:mm"
                        placeholder="如：09:00"
                        style={{ width: '100%', borderRadius: 12 }}
                      />
                    </Form.Item>
                  </div>

                  {/* Row 3: Points config */}
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <Form.Item
                      {...rest}
                      name={[name, 'basePointsMin']}
                      label={<span style={labelStyle}>最低积分</span>}
                      rules={[{ required: true, message: '请输入最低积分' }]}
                      style={{ flex: 1, minWidth: 120, marginBottom: 0 }}
                    >
                      <InputNumber
                        min={0}
                        style={{ width: '100%', borderRadius: 12 }}
                        placeholder="最低"
                      />
                    </Form.Item>
                    <Form.Item
                      {...rest}
                      name={[name, 'basePointsMax']}
                      label={<span style={labelStyle}>最高积分</span>}
                      rules={[{ required: true, message: '请输入最高积分' }]}
                      style={{ flex: 1, minWidth: 120, marginBottom: 0 }}
                    >
                      <InputNumber
                        min={0}
                        style={{ width: '100%', borderRadius: 12 }}
                        placeholder="最高"
                      />
                    </Form.Item>
                    <Form.Item
                      {...rest}
                      name={[name, 'pointsPerFloor']}
                      label={<span style={labelStyle}>每层积分(可选)</span>}
                      style={{ flex: 1, minWidth: 120, marginBottom: 0 }}
                    >
                      <InputNumber
                        min={0}
                        style={{ width: '100%', borderRadius: 12 }}
                        placeholder="每层"
                      />
                    </Form.Item>
                    <Button
                      onClick={() => remove(name)}
                      danger
                      icon={<DeleteOutlined />}
                      style={{ borderRadius: 20, height: 36, marginBottom: 0 }}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                type="dashed"
                onClick={() =>
                  add({
                    name: '',
                    startTime: null,
                    endTime: null,
                    basePointsMin: 1,
                    basePointsMax: 10,
                    pointsPerFloor: 0,
                  })
                }
                icon={<PlusOutlined />}
                style={{
                  borderRadius: 12,
                  borderColor: 'rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.65)',
                  marginTop: 8,
                }}
              >
                添加时间段
              </Button>
            </>
          )}
        </Form.List>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
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
            保存全部
          </Button>
        </Form.Item>
      </Form>
    </GlassCard>
  );
};

export default TimeSlotTab;
