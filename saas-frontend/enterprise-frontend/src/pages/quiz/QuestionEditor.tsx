import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Radio,
  Checkbox,
  Button,
  Space,
  Rate,
  message,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useBranding } from '@/components/BrandingProvider';
import {
  createQuestion,
  updateQuestion,
  CreateQuestionParams,
  QuizQuestion,
  QuizOption,
} from '@/api/quiz';

interface QuestionEditorProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingQuestion?: QuizQuestion | null;
}

const TYPE_OPTIONS = [
  { label: '判断题', value: 'true_false' },
  { label: '单选题', value: 'single_choice' },
  { label: '多选题', value: 'multi_choice' },
];

const TRUE_FALSE_OPTIONS: QuizOption[] = [
  { label: 'A', text: '正确' },
  { label: 'B', text: '错误' },
];

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  open,
  onClose,
  onSuccess,
  editingQuestion,
}) => {
  const { primaryColor } = useBranding();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const questionType = Form.useWatch('type', form) || 'true_false';

  // Populate form when editing
  useEffect(() => {
    if (open && editingQuestion) {
      let parsedOptions: QuizOption[] = [];
      let parsedAnswer: string[] = [];
      try {
        parsedOptions = JSON.parse(editingQuestion.options || '[]');
      } catch { /* ignore */ }
      try {
        parsedAnswer = JSON.parse(editingQuestion.answer || '[]');
      } catch { /* ignore */ }

      form.setFieldsValue({
        type: editingQuestion.type,
        content: editingQuestion.content,
        options: parsedOptions.map((o) => o.text),
        answer: parsedAnswer,
        analysis: editingQuestion.analysis,
        category: editingQuestion.category,
        difficulty: editingQuestion.difficulty || 1,
      });
    } else if (open) {
      form.resetFields();
      form.setFieldsValue({
        type: 'true_false',
        options: ['正确', '错误'],
        difficulty: 1,
      });
    }
  }, [open, editingQuestion, form]);

  const buildOptionsJson = (type: string, optionTexts: string[]): string => {
    if (type === 'true_false') {
      return JSON.stringify(TRUE_FALSE_OPTIONS);
    }
    const options: QuizOption[] = optionTexts
      .filter((t) => t && t.trim())
      .map((text, i) => ({ label: OPTION_LABELS[i] || String(i + 1), text }));
    return JSON.stringify(options);
  };

  const buildAnswerJson = (answer: string[]): string => {
    return JSON.stringify(answer || []);
  };

  const handleSubmit = async (values: {
    type: string;
    content: string;
    options: string[];
    answer: string[];
    analysis?: string;
    category?: string;
    difficulty?: number;
  }) => {
    setSubmitting(true);
    try {
      const payload: CreateQuestionParams = {
        type: values.type as CreateQuestionParams['type'],
        content: values.content,
        options: buildOptionsJson(values.type, values.options),
        answer: buildAnswerJson(values.answer),
        analysis: values.analysis,
        category: values.category,
        difficulty: values.difficulty,
        enabled: true,
      };

      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, payload);
        message.success('更新成功');
      } else {
        await createQuestion(payload);
        message.success('创建成功');
      }
      onSuccess();
      onClose();
    } catch (err) {
      message.error(editingQuestion ? '更新失败' : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const renderAnswerField = () => {
    if (questionType === 'true_false') {
      return (
        <Form.Item name="answer" label="正确答案" rules={[{ required: true, message: '请选择答案' }]}>
          <Radio.Group>
            <Radio value="A">正确</Radio>
            <Radio value="B">错误</Radio>
          </Radio.Group>
        </Form.Item>
      );
    }
    if (questionType === 'single_choice') {
      return (
        <Form.Item name="answer" label="正确答案" rules={[{ required: true, message: '请选择答案' }]}>
          <Radio.Group>
            {(form.getFieldValue('options') || []).map((_: string, i: number) => (
              <Radio key={i} value={OPTION_LABELS[i]}>
                {OPTION_LABELS[i]}
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>
      );
    }
    // multi_choice
    return (
      <Form.Item name="answer" label="正确答案" rules={[{ required: true, message: '请选择答案' }]}>
        <Checkbox.Group>
          {(form.getFieldValue('options') || []).map((_: string, i: number) => (
            <Checkbox key={i} value={OPTION_LABELS[i]}>
              {OPTION_LABELS[i]}
            </Checkbox>
          ))}
        </Checkbox.Group>
      </Form.Item>
    );
  };

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      closeIcon={null}
      styles={{
        content: {
          borderRadius: 24,
          padding: 0,
          overflow: 'hidden',
        },
      }}
    >
      <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 600, margin: 0, color: '#fff' }}>
          {editingQuestion ? '编辑题目' : '添加题目'}
        </h2>
      </div>
      <div style={{ padding: '28px' }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="type" label="题目类型" rules={[{ required: true }]}>
            <Radio.Group optionType="button" buttonStyle="solid">
              {TYPE_OPTIONS.map((opt) => (
                <Radio.Button key={opt.value} value={opt.value}>
                  {opt.label}
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>

          <Form.Item name="content" label="题目内容" rules={[{ required: true, message: '请输入题目内容' }]}>
            <Input.TextArea
              rows={3}
              placeholder="请输入题目内容"
              style={{
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
              }}
            />
          </Form.Item>

          {questionType === 'true_false' ? (
            <Form.Item label="选项">
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>
                A. 正确 &nbsp;&nbsp; B. 错误
              </div>
            </Form.Item>
          ) : (
            <Form.Item label="选项列表">
              <Form.List name="options" rules={[{ required: true }]}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field, index) => (
                      <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                        <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600, width: 24 }}>
                          {OPTION_LABELS[index]}.
                        </span>
                        <Form.Item
                          {...field}
                          rules={[{ required: true, message: '请输入选项内容' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input
                            placeholder={`选项 ${OPTION_LABELS[index]}`}
                            style={{
                              borderRadius: 12,
                              border: '1px solid rgba(255,255,255,0.1)',
                              width: 380,
                            }}
                          />
                        </Form.Item>
                        {fields.length > 2 && (
                          <MinusCircleOutlined
                            onClick={() => remove(field.name)}
                            style={{ color: '#ff4d4f', fontSize: 16 }}
                          />
                        )}
                      </Space>
                    ))}
                    {fields.length < 8 && (
                      <Button
                        type="dashed"
                        onClick={() => add('')}
                        icon={<PlusOutlined />}
                        style={{
                          borderRadius: 12,
                          borderStyle: 'dashed',
                          borderColor: primaryColor,
                          color: primaryColor,
                          width: '100%',
                        }}
                      >
                        添加选项
                      </Button>
                    )}
                  </>
                )}
              </Form.List>
            </Form.Item>
          )}

          {renderAnswerField()}

          <Form.Item name="analysis" label="解析">
            <Input.TextArea
              rows={2}
              placeholder="请输入答案解析（可选）"
              style={{
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
              }}
            />
          </Form.Item>

          <Space size={16}>
            <Form.Item name="category" label="分类">
              <Input
                placeholder="如：环保知识"
                style={{
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)',
                  width: 200,
                }}
              />
            </Form.Item>
            <Form.Item name="difficulty" label="难度">
              <Rate count={3} />
            </Form.Item>
          </Space>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button
                onClick={onClose}
                style={{
                  borderRadius: 20,
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.65)',
                  fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
                }}
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{
                  borderRadius: 20,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                  border: 'none',
                  fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
                }}
              >
                确定
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default QuestionEditor;
