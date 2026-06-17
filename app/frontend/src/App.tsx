import { useCallback, useEffect, useState } from 'react';
import {
  createTodo,
  deleteTodo,
  fetchHealth,
  fetchTodos,
  updateTodo,
  type Todo,
} from './api/todos';
import { TodoForm } from './components/TodoForm';
import { TodoList } from './components/TodoList';
import { HealthStatus } from './components/HealthStatus';
import './style.css';

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [cacheSource, setCacheSource] = useState<string>('unknown');
  const [healthStatus, setHealthStatus] = useState<string>('unknown');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const totalCount = todos.length;
  const completedCount = todos.filter((todo) => todo.completed).length;
  const pendingCount = totalCount - completedCount;
  const completionRate =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const loadTodos = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await fetchTodos();
      setTodos(result.data);
      setCacheSource(result.source);
    } catch {
      setErrorMessage('Todo 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadHealth = useCallback(async () => {
    try {
      const result = await fetchHealth();
      setHealthStatus(result.status);
    } catch {
      setHealthStatus('unavailable');
    }
  }, []);

  async function handleCreateTodo(payload: {
    title: string;
    description?: string;
  }) {
    try {
      await createTodo(payload);
      await loadTodos();
    } catch {
      setErrorMessage('Todo 생성에 실패했습니다.');
    }
  }

  async function handleToggleTodo(todo: Todo) {
    try {
      await updateTodo(todo.id, {
        completed: !todo.completed,
      });

      await loadTodos();
    } catch {
      setErrorMessage('Todo 상태 변경에 실패했습니다.');
    }
  }

  async function handleDeleteTodo(id: number) {
    try {
      await deleteTodo(id);
      await loadTodos();
    } catch {
      setErrorMessage('Todo 삭제에 실패했습니다.');
    }
  }

  const handleRefresh = useCallback(async () => {
    await Promise.all([loadTodos(), loadHealth()]);
  }, [loadHealth, loadTodos]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void handleRefresh();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [handleRefresh]);

  return (
    <main className="page">
      <section className="hero">
        <div className="hero__content">
          <p className="eyebrow">DevOps Platform</p>
          <h1>Todo Operations</h1>
          <p className="hero__description">
            React, Express, PostgreSQL, Redis로 구성한 Todo 관리 화면
          </p>
        </div>

        <div className="hero__status">
          <HealthStatus status={healthStatus} />
        </div>
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <span className="summary-card__label">전체</span>
          <strong className="summary-card__value">{totalCount}</strong>
          <span className="summary-card__hint">등록됨</span>
        </article>

        <article className="summary-card">
          <span className="summary-card__label">완료</span>
          <strong className="summary-card__value">{completedCount}</strong>
          <span className="summary-card__hint">완료됨</span>
        </article>

        <article className="summary-card">
          <span className="summary-card__label">진행 중</span>
          <strong className="summary-card__value">{pendingCount}</strong>
          <span className="summary-card__hint">미완료</span>
        </article>

        <article className="summary-card">
          <span className="summary-card__label">완료율</span>
          <strong className="summary-card__value">{completionRate}%</strong>
          <span className="summary-card__hint">완료 비율</span>
        </article>
      </section>

      <section className="toolbar">
        <div className="toolbar__left">
          <span className="section-title">상태</span>
          <span className="toolbar__hint">
            Backend readiness와 Todo 목록 캐시 기준
          </span>
        </div>

        <div className="toolbar__right">
          <span className="cache-badge">
            Cache Source: <strong>{cacheSource}</strong>
          </span>
          <button type="button" onClick={handleRefresh}>
            새로고침
          </button>
        </div>
      </section>

      {errorMessage && (
        <div className="alert alert--error" role="alert">
          {errorMessage}
        </div>
      )}

      {isLoading && (
        <div className="alert alert--info">로딩 중</div>
      )}

      <section className="content-grid">
        <div className="panel">
          <div className="panel__header">
            <div>
              <h2>Todo 생성</h2>
              <p>작업 등록</p>
            </div>
          </div>

          <TodoForm onSubmit={handleCreateTodo} />
        </div>

        <div className="panel">
          <div className="panel__header">
            <div>
              <h2>Todo 목록</h2>
              <p>작업 상태</p>
            </div>
            <span className="panel__count">{totalCount}개</span>
          </div>

          {todos.length === 0 && !isLoading ? (
            <div className="empty-state">
              <strong>등록된 Todo가 없습니다.</strong>
              <p>작업을 추가하면 이 영역에 표시됩니다.</p>
            </div>
          ) : (
            <TodoList
              todos={todos}
              onToggle={handleToggleTodo}
              onDelete={handleDeleteTodo}
            />
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
