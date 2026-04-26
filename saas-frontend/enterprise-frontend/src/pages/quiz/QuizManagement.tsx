import React, { useState, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Switch,
  InputNumber,
  message,
  Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined, BookOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchQuestions,
  deleteQuestion,
  fetchQuizConfig,
  updateQuizConfig,
  QuizQuestion,
  UpdateQuizConfigParams,
} from '@/api/quiz';
import { useBranding } from '@/components/BrandingProvider';
import { GlassCard } from '@carbon-point/design-system';
import FeatureGuard from '@/components/FeatureGuard';
import QuestionEditor from './QuestionEditor';

const typeLabels: Record<string, string> = {
  true_false: '判断题',
  single_choice: '单选题',
  multi_choice: '多选题',
};

const typeTagColors: Record<string, { bg: string; color: string }> = {
  true_false: { bg: '#fff0f6', color: '#c41d7f' },
  single_choice: { bg: '#e6f7ff', color: '#0958d9' },
  multi_choice: { bg: '#f6ffed', color: '#389e0d' },
};

const difficultyLabels: Record<number, string> = {
  1: '简单',
  2: '中等',
  3: '困难',
};

const QuizManagement: React.FC = () => {
  const { primaryColor } = useBranding();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'questions' | 'config'>('questions');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);

  // ── Questions query ──────────────────────────────────────────────────
  const { data: questionsData, isLoading: questionsLoading } = useQuery({
    queryKey: ['quiz-questions', page],
    queryFn: () => fetchQuestions({ page, size: 10 }),
  });

  // ── Config query ─────────────────────────────────────────────────────
  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['quiz-config'],
    queryFn: fetchQuizConfig,
  });

  const [configForm, setConfigForm] = useState<{
    dailyLimit: number;
    pointsPerCorrect: number;
    showAnalysis: boolean;
  }>({ dailyLimit: 3, pointsPerCorrect: 10, showAnalysis: true });

  // Sync config data to local form state when loaded
  React.useEffect(() => {
    if (configData) {
      setConfigForm({
        dailyLimit: configData.dailyLimit ?? 3,
        pointsPerCorrect: configData.pointsPerCorrect ?? 10,
        showAnalysis: configData.showAnalysis ?? true,
      });
    }
  }, [configData]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteQuestion(id),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
    },
  });

  const configMutation = useMutation({
    mutationFn: (data: UpdateQuizConfigParams) => updateQuizConfig(data),
    onSuccess: () => {
      message.success('配置已保存');
      queryClient.invalidateQueries({ queryKey: ['quiz-config'] });
    },
  });

  const handleSaveConfig = () => {
    configMutation.mutate({
      dailyLimit: configForm.dailyLimit,
      pointsPerCorrect: configForm.pointsPerCorrect,
      showAnalysis: configForm.showAnalysis,
    });
  };

  const openCreate = () => {
    setEditingQuestion(null);
    setEditorOpen(true);
  };

  const openEdit = (record: QuizQuestion) => {
    setEditingQuestion(record);
    setEditorOpen(true);
  };

  const columns = useMemo(
    () => [
      {
        title: '类型',
        dataIndex: 'type',
        width: 100,
        render: (type: string) => {
          const colors = typeTagColors[type] || { bg: '#f5f5f5', color: '#666' };
          return (
            <Tag
              style={{
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: 13,
                border: 'none',
                background: colors.bg,
                color: colors.color,
              }}
            >
              {typeLabels[type] || type}
            </Tag>
          );
        },
      },
      {
        title: '题目内容',
        dataIndex: 'content',
        ellipsis: true,
        render: (content: string) => (
          <span style={{ fontWeight: 500 }}>
            {content.length > 40 ? content.substring(0, 40) + '...' : content}
          </span>
        ),
      },
      {
        title: '分类',
        dataIndex: 'category',
        width: 120,
        render: (category: string) => category || '-',
      },
      {
        title: '难度',
        dataIndex: 'difficulty',
        width: 80,
        render: (d: number) => difficultyLabels[d] || '简单',
      },
      {
        title: '状态',
        dataIndex: 'enabled',
        width: 80,
        render: (enabled: boolean) => (
          <Tag color={enabled ? 'success' : 'default'}>
            {enabled ? '启用' : '禁用'}
          </Tag>
        ),
      },
      {
        title: '操作',
        width: 160,
        render: (_: unknown, record: QuizQuestion) => (
          <Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
              style={{
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.12)',
                color: primaryColor,
              }}
            >
              编辑
            </Button>
            <Popconfirm
              title="确认删除此题目？"
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="删除"
              cancelText="取消"
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                style={{ borderRadius: 20 }}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [primaryColor, deleteMutation],
  );

  return (
    <FeatureGuard feature="quiz.enabled" fallback={null}>
      <div style={{ padding: '0 0 24px', fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)' }}>
        {/* Page Header */}
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 24,
              fontWeight: 700,
              marginBottom: 4,
              color: '#fff',
            }}
          >
            答题管理
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: 0 }}>
            管理题库与答题配置
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button
            onClick={() => setActiveTab('questions')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              borderRadius: 20,
              border: 'none',
              background:
                activeTab === 'questions'
                  ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`
                  : 'rgba(255,255,255,0.04)',
              color: activeTab === 'questions' ? '#fff' : 'rgba(255,255,255,0.65)',
              fontSize: 14,
              fontWeight: activeTab === 'questions' ? 600 : 500,
              cursor: 'pointer',
              boxShadow:
                activeTab === 'questions'
                  ? `0 4px 12px ${primaryColor}40`
                  : '0 2px 8px rgba(0,0,0,0.06)',
              transition: 'all 0.2s ease',
            }}
          >
            <BookOutlined />
            题库管理
          </button>
          <button
            onClick={() => setActiveTab('config')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              borderRadius: 20,
              border: 'none',
              background:
                activeTab === 'config'
                  ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`
                  : 'rgba(255,255,255,0.04)',
              color: activeTab === 'config' ? '#fff' : 'rgba(255,255,255,0.65)',
              fontSize: 14,
              fontWeight: activeTab === 'config' ? 600 : 500,
              cursor: 'pointer',
              boxShadow:
                activeTab === 'config'
                  ? `0 4px 12px ${primaryColor}40`
                  : '0 2px 8px rgba(0,0,0,0.06)',
              transition: 'all 0.2s ease',
            }}
          >
            <SettingOutlined />
            答题配置
          </button>
        </div>

        {/* Tab: Question Bank */}
        {activeTab === 'questions' && (
          <>
            <GlassCard hoverable style={{ marginBottom: 20, padding: '16px 20px', display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreate}
                style={{
                  borderRadius: 20,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                  border: 'none',
                  fontWeight: 500,
                  padding: '4px 20px',
                  height: 36,
                }}
              >
                添加题目
              </Button>
            </GlassCard>

            <GlassCard hoverable style={{ overflow: 'hidden' }}>
              <Table
                columns={columns}
                dataSource={questionsData?.data?.records || []}
                rowKey="id"
                loading={questionsLoading}
                pagination={{
                  current: page,
                  pageSize: 10,
                  total: questionsData?.data?.total || 0,
                  onChange: (p) => setPage(p),
                  showSizeChanger: false,
                }}
                style={{ fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)' }}
                className="digital-garden-table"
                rowClassName={(_, index) => (index % 2 === 0 ? '' : 'odd-row')}
              />
            </GlassCard>
          </>
        )}

        {/* Tab: Quiz Config */}
        {activeTab === 'config' && (
          <GlassCard hoverable style={{ padding: 28 }}>
            {configLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.45)' }}>
                加载中...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 480 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                    每日答题上限
                  </label>
                  <InputNumber
                    min={1}
                    max={50}
                    value={configForm.dailyLimit}
                    onChange={(v) => setConfigForm((prev) => ({ ...prev, dailyLimit: v ?? 3 }))}
                    style={{ width: '100%', borderRadius: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                    答对奖励积分
                  </label>
                  <InputNumber
                    min={0}
                    max={1000}
                    value={configForm.pointsPerCorrect}
                    onChange={(v) => setConfigForm((prev) => ({ ...prev, pointsPerCorrect: v ?? 10 }))}
                    style={{ width: '100%', borderRadius: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                    答题后显示解析
                  </label>
                  <Switch
                    checked={configForm.showAnalysis}
                    onChange={(checked) => setConfigForm((prev) => ({ ...prev, showAnalysis: checked }))}
                    style={{ backgroundColor: configForm.showAnalysis ? primaryColor : undefined }}
                  />
                </div>
                <div style={{ marginTop: 8 }}>
                  <Button
                    type="primary"
                    onClick={handleSaveConfig}
                    loading={configMutation.isPending}
                    style={{
                      borderRadius: 20,
                      background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                      border: 'none',
                      fontWeight: 500,
                      padding: '4px 28px',
                      height: 40,
                    }}
                  >
                    保存配置
                  </Button>
                </div>
              </div>
            )}
          </GlassCard>
        )}

        {/* Question Editor Modal */}
        <QuestionEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['quiz-questions'] })}
          editingQuestion={editingQuestion}
        />

        <style>{`
          .digital-garden-table .ant-table-thead > tr > th {
            background: rgba(255,255,255,0.04) !important;
            border-bottom: 1px solid rgba(255,255,255,0.06) !important;
            font-family: 'Outfit', sans-serif !important;
            font-weight: 600 !important;
            color: rgba(255,255,255,0.65) !important;
            padding: 16px !important;
          }
          .digital-garden-table .ant-table-tbody > tr > td {
            padding: 16px !important;
            border-bottom: 1px solid rgba(255,255,255,0.06) !important;
            color: rgba(255,255,255,0.85) !important;
          }
          .digital-garden-table .ant-table-tbody > tr:hover > td {
            background: rgba(255,255,255,0.04) !important;
          }
          .digital-garden-table .ant-table-tbody > tr > td:first-child {
            border-top-left-radius: 12px;
            border-bottom-left-radius: 12px;
          }
          .digital-garden-table .ant-table-tbody > tr > td:last-child {
            border-top-right-radius: 12px;
            border-bottom-right-radius: 12px;
          }
          .digital-garden-table .ant-table-tbody > tr.odd-row > td {
            background: rgba(255,255,255,0.02) !important;
          }
          .digital-garden-table .ant-pagination-item {
            border-radius: 8px !important;
            border: 1px solid rgba(255,255,255,0.12) !important;
          }
          .digital-garden-table .ant-pagination-item-active {
            background: ${primaryColor}15 !important;
            border-color: ${primaryColor} !important;
          }
          .digital-garden-table .ant-pagination-item-active a {
            color: ${primaryColor} !important;
          }
        `}</style>
      </div>
    </FeatureGuard>
  );
};

export default QuizManagement;
