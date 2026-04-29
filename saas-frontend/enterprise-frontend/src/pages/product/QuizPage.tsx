import React from 'react';
import QuizManagement from '../quiz/QuizManagement';

const QuizPage: React.FC = () => {
  return (
    <div style={{ padding: '0 0 24px', fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)' }}>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 4,
            color: '#2c2825',
          }}
        >
          答题管理
        </h1>
        <p style={{ color: '#8a857f', fontSize: 14, margin: 0 }}>
          管理题库与答题配置
        </p>
      </div>

      <QuizManagement hideHeader />
    </div>
  );
};

export default QuizPage;
