import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  TimePicker,
  Row,
  Col,
  Typography,
  Popconfirm,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  basePoints: number;
}

interface RuleTemplate {
  id: string;
  name: string;
  description?: string;
  timeSlots: TimeSlot[];
}

interface RuleTemplateTabProps {
  className?: string;
}

const RuleTemplateTab: React.FC<RuleTemplateTabProps> = () => {
  const [templates, setTemplates] = useState<RuleTemplate[]>([
    {
      id: '1',
      name: '标准工作时段',
      description: '默认工作时段积分规则',
      timeSlots: [
        { id: '1-1', name: '早高峰', startTime: '07:00', endTime: '09:00', basePoints: 15 },
        { id: '1-2', name: '工作时段', startTime: '09:00', endTime: '18:00', basePoints: 10 },
        { id: '1-3', name: '晚高峰', startTime: '18:00', endTime: '21:00', basePoints: 15 },
      ],
    },
    {
      id: '2',
      name: '全时段加倍',
      description: '所有时段积分加倍',
      timeSlots: [
        { id: '2-1', name: '全时段', startTime: '00:00', endTime: '23:59', basePoints: 20 },
      ],
    },
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RuleTemplate | null>(null);
  const [form] = Form.useForm();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  const handleCreate = () => {
    setEditingTemplate(null);
    setTimeSlots([]);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (template: RuleTemplate) => {
    setEditingTemplate(template);
    setTimeSlots([...template.timeSlots]);
    form.setFieldsValue({
      name: template.name,
      description: template.description,
    });
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setTemplates(templates.filter((t) => t.id !== id));
    message.success('模板已删除');
  };

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
      const template: RuleTemplate = {
        id: editingTemplate ? editingTemplate.id : `template-${Date.now()}`,
        name: values.name,
        description: values.description,
        timeSlots: timeSlots.map((slot) => ({
          id: slot.id,
          name: slot.name,
          startTime: slot.startTime,
          endTime: slot.endTime,
          basePoints: slot.basePoints,
        })),
      };

      if (editingTemplate) {
        setTemplates(templates.map((t) => (t.id === template.id ? template : t)));
        message.success('模板已更新');
      } else {
        setTemplates([...templates, template]);
        message.success('模板已创建');
      }

      setModalOpen(false);
    });
  };

  const columns = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: RuleTemplate) => (
        <div>
          <Text strong>{name}</Text>
          {record.description && (
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              {record.description}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: '时段数量',
      key: 'slotCount',
      render: (_: any, record: RuleTemplate) => (
        <Tag>{record.timeSlots.length} 个时段</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: RuleTemplate) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除此模板？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={5}>规则模板</Title>
          <Text type="secondary">管理时段规则模板，可在产品配置中快速应用</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建模板
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={templates}
        rowKey="id"
        pagination={false}
      />

      <Modal
        title={editingTemplate ? '编辑规则模板' : '新建规则模板'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>
            取消
          </Button>,
          <Button key="save" type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            保存
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="模板名称"
            name="name"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="如：标准工作时段" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} placeholder="模板用途说明" />
          </Form.Item>

          <div style={{ marginBottom: 16 }}>
            <Text strong>时段配置</Text>
          </div>

          <Space direction="vertical" style={{ width: '100%' }}>
            {timeSlots.map((slot, index) => (
              <Card
                key={slot.id}
                size="small"
                title={`时段 ${index + 1}`}
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
        </Form>
      </Modal>
    </div>
  );
};

export default RuleTemplateTab;
