import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  TimePicker,
  Button,
  Space,
  Row,
  Col,
  Card,
  Typography,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  basePoints: number;
}

interface RuleNodeConfigModalProps {
  open: boolean;
  nodeName: string;
  initialConfig?: string;
  onCancel: () => void;
  onSave: (configJson: string) => void;
}

const RuleNodeConfigModal: React.FC<RuleNodeConfigModalProps> = ({
  open,
  nodeName,
  initialConfig,
  onCancel,
  onSave,
}) => {
  const [form] = Form.useForm();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    if (open && initialConfig) {
      try {
        const config = JSON.parse(initialConfig);
        if (config.timeSlots) {
          setTimeSlots(config.timeSlots);
        }
        form.setFieldsValue(config);
      } catch {
        form.resetFields();
        setTimeSlots([]);
      }
    } else if (open) {
      form.resetFields();
      setTimeSlots([]);
    }
  }, [open, initialConfig, form]);

  const handleAddTimeSlot = () => {
    const newSlot: TimeSlot = {
      id: `slot-${Date.now()}`,
      name: '',
      startTime: '09:00',
      endTime: '18:00',
      basePoints: 10,
    };
    setTimeSlots([...timeSlots, newSlot]);
  };

  const handleRemoveTimeSlot = (id: string) => {
    setTimeSlots(timeSlots.filter((s) => s.id !== id));
  };

  const handleTimeSlotChange = (id: string, field: keyof TimeSlot, value: any) => {
    setTimeSlots(
      timeSlots.map((slot) =>
        slot.id === id ? { ...slot, [field]: value } : slot
      )
    );
  };

  const handleSave = () => {
    form.validateFields().then((values) => {
      const config = {
        ...values,
        timeSlots: timeSlots.map((slot) => ({
          name: slot.name,
          startTime: slot.startTime,
          endTime: slot.endTime,
          basePoints: slot.basePoints,
        })),
      };
      onSave(JSON.stringify(config, null, 2));
    });
  };

  const renderTimeSlotConfig = () => (
    <div>
      <Title level={5}>时段配置</Title>
      <Space direction="vertical" style={{ width: '100%' }}>
        {timeSlots.map((slot, index) => (
          <Card
            key={slot.id}
            size="small"
            extra={
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRemoveTimeSlot(slot.id)}
              />
            }
          >
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item label="时段名称">
                  <Input
                    value={slot.name}
                    onChange={(e) =>
                      handleTimeSlotChange(slot.id, 'name', e.target.value)
                    }
                    placeholder="如：早高峰"
                  />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="开始时间">
                  <TimePicker
                    value={dayjs(`2024-01-01 ${slot.startTime}`)}
                    format="HH:mm"
                    onChange={(time) =>
                      handleTimeSlotChange(
                        slot.id,
                        'startTime',
                        time?.format('HH:mm') || '00:00'
                      )
                    }
                  />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="结束时间">
                  <TimePicker
                    value={dayjs(`2024-01-01 ${slot.endTime}`)}
                    format="HH:mm"
                    onChange={(time) =>
                      handleTimeSlotChange(
                        slot.id,
                        'endTime',
                        time?.format('HH:mm') || '23:59'
                      )
                    }
                  />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="基础积分">
                  <InputNumber
                    value={slot.basePoints}
                    onChange={(value) =>
                      handleTimeSlotChange(slot.id, 'basePoints', value || 0)
                    }
                    min={0}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddTimeSlot} block>
          添加时段
        </Button>
      </Space>
    </div>
  );

  const renderGenericConfig = () => (
    <div>
      <Title level={5}>节点配置</Title>
      <Form form={form} layout="vertical">
        <Form.Item label="配置 JSON" name="configJson">
          <Input.TextArea
            rows={10}
            placeholder='{"key": "value"}'
            className="font-mono"
          />
        </Form.Item>
      </Form>
    </div>
  );

  const renderConfigByNodeType = () => {
    switch (nodeName) {
      case 'timeSlotMatch':
        return renderTimeSlotConfig();
      default:
        return renderGenericConfig();
    }
  };

  return (
    <Modal
      title={`配置规则节点: ${nodeName}`}
      open={open}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          保存
        </Button>,
      ]}
    >
      {renderConfigByNodeType()}
    </Modal>
  );
};

export default RuleNodeConfigModal;
