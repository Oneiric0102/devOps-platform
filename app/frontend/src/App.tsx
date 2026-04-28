import { useEffect, useState } from 'react';
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

  async function loadTodos() {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await fetchTodos();
      setTodos(result.data);
      setCacheSource(result.source);
    } catch (error) {
      setErrorMessage('Todo 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadHealth() {
    try {
      const result = await fetchHealth();
      setHealthStatus(result.status);
    } catch (error) {
      setHealthStatus('unavailable');
    }
  }

  async function handleCreateTodo(payload: {
    title: string;
    description?: string;
  }) {
    try {
      await createTodo(payload);
      await loadTodos();
    } catch (error) {
      setErrorMessage('Todo 생성에 실패했습니다.');
    }
  }

  async function handleToggleTodo(todo: Todo) {
    try {
      await updateTodo(todo.id, {
        completed: !todo.completed,
      });

      await loadTodos();
    } catch (error) {
      setErrorMessage('Todo 상태 변경에 실패했습니다.');
    }
  }

  async function handleDeleteTodo(id: number) {
    try {
      await deleteTodo(id);
      await loadTodos();
    } catch (error) {
      setErrorMessage('Todo 삭제에 실패했습니다.');
    }
  }

  async function handleRefresh() {
    await Promise.all([loadTodos(), loadHealth()]);
  }

  useEffect(() => {
    void handleRefresh();
  }, []);

  return (
    <main className="page">
      <section className="hero">
        <div className="hero__content">
          <p className="eyebrow">DevOps Project</p>
          <h1>DevOps Todo Dashboard</h1>
          <p className="hero__description">
            React + TypeScript frontend와 Node.js + Express backend를 연결한
            운영형 Todo 서비스입니다.
          </p>
        </div>

        <div className="hero__status">
          <HealthStatus status={healthStatus} />
        </div>
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <span className="summary-card__label">전체 Todo</span>
          <strong className="summary-card__value">{totalCount}</strong>
          <span className="summary-card__hint">등록된 전체 작업</span>
        </article>

        <article className="summary-card">
          <span className="summary-card__label">완료</span>
          <strong className="summary-card__value">{completedCount}</strong>
          <span className="summary-card__hint">완료 처리된 작업</span>
        </article>

        <article className="summary-card">
          <span className="summary-card__label">진행중</span>
          <strong className="summary-card__value">{pendingCount}</strong>
          <span className="summary-card__hint">아직 남은 작업</span>
        </article>

        <article className="summary-card">
          <span className="summary-card__label">완료율</span>
          <strong className="summary-card__value">{completionRate}%</strong>
          <span className="summary-card__hint">현재 진행률</span>
        </article>
      </section>

      <section className="toolbar">
        <div className="toolbar__left">
          <span className="section-title">서비스 상태</span>
          <span className="toolbar__hint">
            Backend, PostgreSQL, Redis 연동 구조를 확인할 수 있습니다.
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
        <div className="alert alert--info">데이터를 불러오는 중입니다.</div>
      )}

      <section className="content-grid">
        <div className="panel">
          <div className="panel__header">
            <div>
              <h2>Todo 생성</h2>
              <p>새로운 작업을 등록합니다.</p>
            </div>
          </div>

          <TodoForm onSubmit={handleCreateTodo} />
        </div>

        <div className="panel">
          <div className="panel__header">
            <div>
              <h2>Todo 목록</h2>
              <p>등록된 작업과 완료 상태를 확인합니다.</p>
            </div>
            <span className="panel__count">{totalCount}개</span>
          </div>

          {todos.length === 0 && !isLoading ? (
            <div className="empty-state">
              <strong>등록된 Todo가 없습니다.</strong>
              <p>왼쪽 폼에서 첫 번째 Todo를 생성해 보세요.</p>
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