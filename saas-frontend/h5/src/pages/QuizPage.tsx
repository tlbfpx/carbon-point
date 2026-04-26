import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '@carbon-point/design-system';
import { Button, Toast, DotLoading, TabBar, ProgressBar } from 'antd-mobile';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDailyQuiz, submitAnswer, DailyQuizQuestion, SubmitAnswerResult } from '@/api/quiz';

const typeLabels: Record<string, string> = {
  true_false: '判断题',
  single_choice: '单选题',
  multi_choice: '多选题',
};

const typeColors: Record<string, string> = {
  true_false: '#c41d7f',
  single_choice: '#0958d9',
  multi_choice: '#389e0d',
};

const QuizPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string[]>([]);
  const [results, setResults] = useState<(SubmitAnswerResult | null)[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [currentResult, setCurrentResult] = useState<SubmitAnswerResult | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);

  const { data: quizData, isLoading } = useQuery({
    queryKey: ['dailyQuiz'],
    queryFn: fetchDailyQuiz,
  });

  const questions: DailyQuizQuestion[] = quizData?.data || [];

  const submitMutation = useMutation({
    mutationFn: ({ questionId, answer }: { questionId: number; answer: string[] }) =>
      submitAnswer(questionId, answer),
    onSuccess: (res) => {
      if (res.code === 200 && res.data) {
        setCurrentResult(res.data);
        setShowResult(true);
        const newResults = [...results];
        newResults[currentIndex] = res.data;
        setResults(newResults);
      } else {
        Toast.show(res.message || '提交失败');
      }
    },
    onError: () => {
      Toast.show('网络错误，请重试');
    },
  });

  const handleOptionSelect = (label: string) => {
    if (showResult) return;
    const current = questions[currentIndex];
    if (!current) return;

    if (current.type === 'multi_choice') {
      setSelectedAnswer((prev) =>
        prev.includes(label) ? prev.filter((a) => a !== label) : [...prev, label].sort(),
      );
    } else {
      setSelectedAnswer([label]);
    }
  };

  const handleSubmit = () => {
    if (selectedAnswer.length === 0) {
      Toast.show('请先选择答案');
      return;
    }
    const current = questions[currentIndex];
    if (current) {
      submitMutation.mutate({ questionId: current.id, answer: selectedAnswer });
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer([]);
      setShowResult(false);
      setCurrentResult(null);
    } else {
      setQuizFinished(true);
      queryClient.invalidateQueries({ queryKey: ['pointsAccount'] });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: 16, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <DotLoading />
      </div>
    );
  }

  // No questions available
  if (questions.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: 16 }}>
        <GlassCard style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
          <h3 style={{ fontSize: 18, marginBottom: 8, color: '#333' }}>今日答题已完成</h3>
          <p style={{ color: '#999', fontSize: 14, marginBottom: 24 }}>明天再来挑战吧！</p>
          <Button color="primary" onClick={() => navigate('/')}>返回首页</Button>
        </GlassCard>
        <TabBar activeKey="quiz" onChange={(key) => {
          if (key === 'home') navigate('/');
          else if (key === 'checkin') navigate('/checkin');
          else if (key === 'walking') navigate('/walking');
          else if (key === 'mall') navigate('/mall');
          else if (key === 'profile') navigate('/profile');
        }}>
          <TabBar.Item key="home" title="首页" />
          <TabBar.Item key="checkin" title="打卡" />
          <TabBar.Item key="walking" title="走路" />
          <TabBar.Item key="quiz" title="答题" />
          <TabBar.Item key="profile" title="我的" />
        </TabBar>
      </div>
    );
  }

  // Quiz finished - summary
  if (quizFinished) {
    const correctCount = results.filter((r) => r?.isCorrect).length;
    const totalPoints = results.reduce((sum, r) => sum + (r?.pointsEarned || 0), 0);

    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%)', padding: 16 }}>
        <GlassCard style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 24, color: '#333' }}>答题完成！</h2>
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginBottom: 32,
            padding: '16px 0',
          }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1890ff' }}>
                {correctCount}/{questions.length}
              </div>
              <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>答对题数</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#52c41a' }}>
                +{totalPoints}
              </div>
              <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>获得积分</div>
            </div>
          </div>
          <Button color="primary" size="large" onClick={() => navigate('/')} style={{ width: '100%' }}>
            返回首页
          </Button>
        </GlassCard>
        <TabBar activeKey="quiz" onChange={(key) => {
          if (key === 'home') navigate('/');
          else if (key === 'checkin') navigate('/checkin');
          else if (key === 'walking') navigate('/walking');
          else if (key === 'mall') navigate('/mall');
          else if (key === 'profile') navigate('/profile');
        }}>
          <TabBar.Item key="home" title="首页" />
          <TabBar.Item key="checkin" title="打卡" />
          <TabBar.Item key="walking" title="走路" />
          <TabBar.Item key="quiz" title="答题" />
          <TabBar.Item key="profile" title="我的" />
        </TabBar>
      </div>
    );
  }

  const current = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: 16 }}>
      {/* Progress */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: '#666' }}>
            第 {currentIndex + 1} 题 / 共 {questions.length} 题
          </span>
          <span style={{ fontSize: 14, color: '#1890ff', fontWeight: 600 }}>
            {Math.round(progress)}%
          </span>
        </div>
        <ProgressBar percent={progress} style={{ '--height': '6px', borderRadius: 3 }} />
      </div>

      {/* Question Card */}
      <GlassCard style={{ marginBottom: 16 }}>
        {/* Type Badge */}
        <div style={{ marginBottom: 12 }}>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 16,
              fontSize: 12,
              fontWeight: 600,
              color: typeColors[current.type] || '#666',
              background: `${typeColors[current.type] || '#666'}15`,
            }}
          >
            {typeLabels[current.type] || current.type}
          </span>
          {current.category && (
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 16,
                fontSize: 12,
                color: '#999',
                background: '#f5f5f5',
                marginLeft: 8,
              }}
            >
              {current.category}
            </span>
          )}
        </div>

        {/* Content */}
        <h3 style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.6, marginBottom: 20, color: '#333' }}>
          {current.content}
        </h3>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {current.options.map((option) => {
            const isSelected = selectedAnswer.includes(option.label);
            const isCorrectOption = showResult && currentResult?.correctAnswer?.includes(option.label);
            const isWrongSelection = showResult && isSelected && !currentResult?.isCorrect;

            let bg = '#fff';
            let border = '1px solid #e8e8e8';
            let color = '#333';

            if (isSelected && !showResult) {
              bg = '#e6f7ff';
              border = `1px solid #1890ff`;
              color = '#1890ff';
            }
            if (isCorrectOption) {
              bg = '#f6ffed';
              border = '1px solid #52c41a';
              color = '#389e0d';
            }
            if (isWrongSelection) {
              bg = '#fff2f0';
              border = '1px solid #ff4d4f';
              color = '#ff4d4f';
            }

            return (
              <div
                key={option.label}
                onClick={() => handleOptionSelect(option.label)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: bg,
                  border,
                  color,
                  cursor: showResult ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: isSelected ? `${color}20` : '#f5f5f5',
                    color: isSelected ? color : '#999',
                    fontSize: 14,
                    fontWeight: 600,
                    marginRight: 12,
                    flexShrink: 0,
                  }}
                >
                  {option.label}
                </span>
                <span style={{ fontSize: 15 }}>{option.text}</span>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Result Feedback */}
      {showResult && currentResult && (
        <GlassCard style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: currentResult.analysis ? 12 : 0,
            }}
          >
            <span style={{ fontSize: 20 }}>
              {currentResult.isCorrect ? '✅' : '❌'}
            </span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: currentResult.isCorrect ? '#52c41a' : '#ff4d4f',
              }}
            >
              {currentResult.isCorrect ? '回答正确！' : '回答错误'}
            </span>
            {currentResult.pointsEarned > 0 && (
              <span style={{ marginLeft: 'auto', color: '#1890ff', fontWeight: 600 }}>
                +{currentResult.pointsEarned} 积分
              </span>
            )}
          </div>
          {currentResult.analysis && (
            <div
              style={{
                padding: '12px 16px',
                background: '#fafafa',
                borderRadius: 8,
                fontSize: 14,
                color: '#666',
                lineHeight: 1.6,
              }}
            >
              <strong>解析：</strong>
              {currentResult.analysis}
            </div>
          )}
        </GlassCard>
      )}

      {/* Action Button */}
      <Button
        block
        color="primary"
        size="large"
        loading={submitMutation.isPending}
        onClick={showResult ? handleNext : handleSubmit}
        style={{
          borderRadius: 12,
          height: 48,
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        {showResult
          ? currentIndex < questions.length - 1
            ? '下一题'
            : '查看结果'
          : '提交答案'}
      </Button>

      <TabBar activeKey="quiz" onChange={(key) => {
        if (key === 'home') navigate('/');
        else if (key === 'checkin') navigate('/checkin');
        else if (key === 'walking') navigate('/walking');
        else if (key === 'mall') navigate('/mall');
        else if (key === 'profile') navigate('/profile');
      }}>
        <TabBar.Item key="home" title="首页" />
        <TabBar.Item key="checkin" title="打卡" />
        <TabBar.Item key="walking" title="走路" />
        <TabBar.Item key="quiz" title="答题" />
        <TabBar.Item key="profile" title="我的" />
      </TabBar>
    </div>
  );
};

export default QuizPage;
