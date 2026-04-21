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
  Select,
  DatePicker,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  weight: number;
}

interface SpecialDate {
  id: string;
  date: string;
  multiplier: number;
  name: string;
}

interface RuleNodeConfigModalProps {
  open: boolean;
  nodeName: string;
  initialConfig?: string;
  onCancel: () => void;
  onSave: (configJson: string) => void;
}

// Rule node display names
const RULE_NODE_LABELS: Record<string, string> = {
  timeSlotMatch: '时段匹配',
  randomBase: '随机基数',
  specialDateMultiplier: '特殊日期倍率',
  levelCoefficient: '等级系数',
  round: '数值取整',
  dailyCap: '每日上限',
  thresholdFilter: '步数阈值过滤',
  formulaCalc: '步数公式换算',
};

const RuleNodeConfigModal: React.FC<RuleNodeConfigModalProps> = ({
  open,
  nodeName,
  initialConfig,
  onCancel,
  onSave,
}) => {
  const [form] = Form.useForm();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([]);

  useEffect(() => {
    if (open && initialConfig) {
      try {
        const config = JSON.parse(initialConfig);
        if (config.slots) {
          setTimeSlots(config.slots.map((s: any, i: number) => ({ ...s, id: `slot-${i}` })));
        }
        if (config.specialDates) {
          setSpecialDates(config.specialDates.map((d: any, i: number) => ({ ...d, id: `date-${i}` })));
        }
        form.setFieldsValue(config);
      } catch {
        form.resetFields();
        setTimeSlots([]);
        setSpecialDates([]);
      }
    } else if (open) {
      form.resetFields();
      setTimeSlots([]);
      setSpecialDates([]);
      // Set default values based on node type
      setDefaultValues();
    }
  }, [open, initialConfig, form, nodeName]);

  const setDefaultValues = () => {
    switch (nodeName) {
      case 'timeSlotMatch':
        setTimeSlots([
          { id: 'slot-1', name: '上午', startTime: '07:00', endTime: '10:00', weight: 1.0 },
          { id: 'slot-2', name: '中午', startTime: '12:00', endTime: '14:00', weight: 1.0 },
          { id: 'slot-3', name: '晚上', startTime: '18:00', endTime: '22:00', weight: 1.2 },
        ]);
        break;
      case 'randomBase':
        form.setFieldsValue({ minPoints: 80, maxPoints: 120 });
        break;
      case 'specialDateMultiplier':
        form.setFieldsValue({ defaultMultiplier: 1.0 });
        setSpecialDates([
          { id: 'date-1', date: '2026-01-01', multiplier: 2.0, name: '元旦' },
          { id: 'date-2', date: '2026-02-12', multiplier: 2.0, name: '春节' },
        ]);
        break;
      case 'levelCoefficient':
        form.setFieldsValue({
          'Lv.1': 1.0,
          'Lv.2': 1.1,
          'Lv.3': 1.2,
          'Lv.4': 1.3,
          'Lv.5': 1.5,
        });
        break;
      case 'round':
        form.setFieldsValue({ strategy: 'round' });
        break;
      case 'dailyCap':
        form.setFieldsValue({ maxDailyPoints: 500 });
        break;
    }
  };

  const handleAddTimeSlot = () => {
    const newSlot: TimeSlot = {
      id: `slot-${Date.now()}`,
      name: '',
      startTime: '09:00',
      endTime: '18:00',
      weight: 1.0,
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

  const handleAddSpecialDate = () => {
    const newDate: SpecialDate = {
      id: `date-${Date.now()}`,
      date: '',
      multiplier: 2.0,
      name: '',
    };
    setSpecialDates([...specialDates, newDate]);
  };

  const handleRemoveSpecialDate = (id: string) => {
    setSpecialDates(specialDates.filter((d) => d.id !== id));
  };

  const handleSpecialDateChange = (id: string, field: keyof SpecialDate, value: any) => {
    setSpecialDates(
      specialDates.map((date) =>
        date.id === id ? { ...date, [field]: value } : date
      )
    );
  };

  const handleSave = () => {
    form.validateFields().then((values) => {
      let config: any = { ...values };

      switch (nodeName) {
        case 'timeSlotMatch':
          config = {
            slots: timeSlots.map(({ id, ...slot }) => slot),
          };
          break;
        case 'specialDateMultiplier':
          config = {
            defaultMultiplier: values.defaultMultiplier || 1.0,
            specialDates: specialDates.map(({ id, ...date }) => date),
          };
          break;
        case 'levelCoefficient':
          config = {
            'Lv.1': values['Lv.1'] || 1.0,
            'Lv.2': values['Lv.2'] || 1.1,
            'Lv.3': values['Lv.3'] || 1.2,
            'Lv.4': values['Lv.4'] || 1.3,
            'Lv.5': values['Lv.5'] || 1.5,
          };
          break;
        case 'round':
          config = {
            strategy: values.strategy || 'round',
          };
          break;
        case 'dailyCap':
          config = {
            maxDailyPoints: values.maxDailyPoints || 500,
          };
          break;
        case 'randomBase':
          config = {
            minPoints: values.minPoints || 80,
            maxPoints: values.maxPoints || 120,
          };
          break;
      }

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
              <Col span={5}>
                <Form.Item label="时段名称">
                  <Input
                    value={slot.name}
                    onChange={(e) =>
                      handleTimeSlotChange(slot.id, 'name', e.target.value)
                    }
                    placeholder="如：上午"
                  />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="开始时间">
                  <TimePicker
                    value={slot.startTime ? dayjs(`2024-01-01 ${slot.startTime}`) : undefined}
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
                    value={slot.endTime ? dayjs(`2024-01-01 ${slot.endTime}`) : undefined}
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
              <Col span={5}>
                <Form.Item label="权重">
                  <InputNumber
                    value={slot.weight}
                    onChange={(value) =>
                      handleTimeSlotChange(slot.id, 'weight', value || 1.0)
                    }
                    min={0.1}
                    step={0.1}
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

  const renderRandomBaseConfig = () => (
    <div>
      <Title level={5}>随机基数配置</Title>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="最小积分" name="minPoints">
              <InputNumber min={0} style={{ width: '100%' }} placeholder="80" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="最大积分" name="maxPoints">
              <InputNumber min={0} style={{ width: '100%' }} placeholder="120" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );

  const renderSpecialDateConfig = () => (
    <div>
      <Title level={5}>特殊日期倍率配置</Title>
      <Form form={form} layout="vertical">
        <Form.Item label="默认倍率" name="defaultMultiplier">
          <InputNumber min={0.1} step={0.1} style={{ width: 200 }} placeholder="1.0" />
        </Form.Item>
      </Form>
      <Title level={5} style={{ marginTop: 16 }}>特殊日期列表</Title>
      <Space direction="vertical" style={{ width: '100%' }}>
        {specialDates.map((date) => (
          <Card
            key={date.id}
            size="small"
            extra={
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRemoveSpecialDate(date.id)}
              />
            }
          >
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item label="日期名称">
                  <Input
                    value={date.name}
                    onChange={(e) =>
                      handleSpecialDateChange(date.id, 'name', e.target.value)
                    }
                    placeholder="如：元旦"
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="日期">
                  <DatePicker
                    value={date.date ? dayjs(date.date) : undefined}
                    onChange={(d) =>
                      handleSpecialDateChange(date.id, 'date', d?.format('YYYY-MM-DD') || '')
                    }
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="倍率">
                  <InputNumber
                    value={date.multiplier}
                    onChange={(value) =>
                      handleSpecialDateChange(date.id, 'multiplier', value || 2.0)
                    }
                    min={0.1}
                    step={0.1}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddSpecialDate} block>
          添加特殊日期
        </Button>
      </Space>
    </div>
  );

  const renderLevelCoefficientConfig = () => (
    <div>
      <Title level={5}>等级系数配置</Title>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Lv.1 系数" name="Lv.1">
              <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} placeholder="1.0" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Lv.2 系数" name="Lv.2">
              <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} placeholder="1.1" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Lv.3 系数" name="Lv.3">
              <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} placeholder="1.2" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Lv.4 系数" name="Lv.4">
              <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} placeholder="1.3" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Lv.5 系数" name="Lv.5">
              <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} placeholder="1.5" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );

  const renderRoundConfig = () => (
    <div>
      <Title level={5}>数值取整配置</Title>
      <Form form={form} layout="vertical">
        <Form.Item label="取整策略" name="strategy">
          <Select style={{ width: 200 }} placeholder="选择取整策略">
            <Option value="round">四舍五入</Option>
            <Option value="floor">向下取整</Option>
            <Option value="ceil">向上取整</Option>
          </Select>
        </Form.Item>
      </Form>
    </div>
  );

  const renderDailyCapConfig = () => (
    <div>
      <Title level={5}>每日上限配置</Title>
      <Form form={form} layout="vertical">
        <Form.Item label="每日最高积分" name="maxDailyPoints">
          <InputNumber min={0} style={{ width: 200 }} placeholder="500" />
        </Form.Item>
      </Form>
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
      case 'randomBase':
        return renderRandomBaseConfig();
      case 'specialDateMultiplier':
        return renderSpecialDateConfig();
      case 'levelCoefficient':
        return renderLevelCoefficientConfig();
      case 'round':
        return renderRoundConfig();
      case 'dailyCap':
        return renderDailyCapConfig();
      default:
        return renderGenericConfig();
    }
  };

  const displayName = RULE_NODE_LABELS[nodeName] || nodeName;

  return (
    <Modal
      title={`配置规则节点: ${displayName}`}
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
