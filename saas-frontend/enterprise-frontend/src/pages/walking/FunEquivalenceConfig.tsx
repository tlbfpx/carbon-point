import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Button, Space, message, Spin, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/request';
import { useBranding } from '@/components/BrandingProvider';
import { GlassCard } from '@carbon-point/design-system';

interface FunEquivItem {
  name: string;
  stepsPer: number;
  icon: string;
}

const FunEquivalenceConfig: React.FC = () => {
  const { primaryColor } = useBranding();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  // Fetch existing walking_fun_equiv rule
  const { data, isLoading } = useQuery({
    queryKey: ['walking-fun-equiv'],
    queryFn: async (): Promise<FunEquivItem[]> => {
      const res = await apiClient.get('/point-rules/list', { params: { type: 'walking_fun_equiv' } });
      const rules = (res as any)?.data || (res as any) || [];
      const rule = Array.isArray(rules) ? rules.find((r: any) => r.type === 'walking_fun_equiv') : null;
      if (rule) {
        let config: any = {};
        try { config = JSON.parse(rule.config || '{}'); } catch {}
        return config.items || [];
      }
      return [];
    },
  });

  // Populate form when data arrives
  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        items: data.length > 0 ? data : [{ name: '', stepsPer: 0, icon: '' }],
      });
    }
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: { items: FunEquivItem[] }) => {
      // Filter out empty items
      const items = values.items.filter((item) => item.name && item.stepsPer > 0);

      // Try to find existing rule to update
      const listRes = await apiClient.get('/point-rules/list', { params: { type: 'walking_fun_equiv' } });
      const rules = (listRes as any)?.data || (listRes as any) || [];
      const existing = Array.isArray(rules) ? rules.find((r: any) => r.type === 'walking_fun_equiv') : null;

      const payload = {
        type: 'walking_fun_equiv',
        name: '趣味换算配置',
        config: JSON.stringify({ items }),
        enabled: true,
        sortOrder: 0,
      };

      if (existing) {
        return apiClient.put('/point-rules', { id: Number(existing.id), ...payload });
      }
      return apiClient.post('/point-rules', payload);
    },
    onSuccess: () => {
      message.success('趣味换算配置已保存');
      queryClient.invalidateQueries({ queryKey: ['walking-fun-equiv'] });
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

  return (
    <GlassCard hoverable style={{ padding: 24 }}>
      <p
        style={{
          color: 'rgba(255,255,255,0.65)',
          fontSize: 14,
          fontFamily: 'var(--font-body)',
          marginBottom: 24,
        }}
      >
        配置步数换算趣味等价物，让用户直观感受运动效果
      </p>

      <Form
        form={form}
        onFinish={(values) => saveMutation.mutate(values)}
        initialValues={{
          items: [{ name: '', stepsPer: 0, icon: '' }],
        }}
      >
        <Form.List name="items">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space
                  key={key}
                  style={{ display: 'flex', marginBottom: 12, width: '100%' }}
                  align="baseline"
                >
                  <Form.Item
                    {...restField}
                    name={[name, 'icon']}
                    style={{ marginBottom: 0 }}
                  >
                    <Input
                      placeholder="图标"
                      style={{
                        width: 60,
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.1)',
                        textAlign: 'center',
                      }}
                    />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'name']}
                    rules={[{ required: true, message: '请输入名称' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input
                      placeholder="例如: 一碗米饭"
                      style={{
                        width: 160,
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'stepsPer']}
                    rules={[{ required: true, message: '请输入步数' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={1}
                      placeholder="对应步数"
                      style={{
                        width: 120,
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    />
                  </Form.Item>
                  {fields.length > 1 && (
                    <Popconfirm title="确认删除？" onConfirm={() => remove(name)}>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        style={{ borderRadius: 8 }}
                      />
                    </Popconfirm>
                  )}
                </Space>
              ))}
              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="dashed"
                  onClick={() => add({ name: '', stepsPer: 0, icon: '' })}
                  icon={<PlusOutlined />}
                  style={{
                    borderRadius: 20,
                    border: `1px dashed rgba(255,255,255,0.2)`,
                    color: 'rgba(255,255,255,0.65)',
                    fontFamily: 'var(--font-body)',
                    width: '100%',
                  }}
                >
                  添加换算项
                </Button>
              </Form.Item>
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
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
              border: 'none',
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              padding: '4px 32px',
              height: 40,
            }}
          >
            保存配置
          </Button>
        </Form.Item>
      </Form>
    </GlassCard>
  );
};

export default FunEquivalenceConfig;
