import type { Todo } from '../api/todos';

type TodoListProps = {
  todos: Todo[];
  onToggle: (todo: Todo) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TodoList({ todos, onToggle, onDelete }: TodoListProps) {
  return (
    <div className="todo-list">
      {todos.map((todo) => (
        <article
          key={todo.id}
          className={`todo-item ${todo.completed ? 'todo-item--completed' : ''}`}
        >
          <div className="todo-item__main">
            <label className="todo-title">
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => onToggle(todo)}
              />
              <span>{todo.title}</span>
            </label>

            {todo.description && (
              <p className="todo-description">{todo.description}</p>
            )}

            <div className="todo-meta">
              <span>{todo.completed ? '완료됨' : '진행중'}</span>
              <span>생성일: {formatDate(todo.createdAt)}</span>
            </div>
          </div>

          <button
            type="button"
            className="button-danger"
            onClick={() => onDelete(todo.id)}
          >
            삭제
          </button>
        </article>
      ))}
    </div>
  );
}