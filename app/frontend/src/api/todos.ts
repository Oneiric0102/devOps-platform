export type Todo = {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

type TodoListResponse = {
  source: 'cache' | 'database';
  data: Todo[];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchTodos(): Promise<TodoListResponse> {
  const response = await fetch(`${API_BASE_URL}/api/todos`);

  if (!response.ok) {
    throw new Error('Failed to fetch todos');
  }

  return response.json();
}

export async function createTodo(payload: {
  title: string;
  description?: string;
}): Promise<Todo> {
  const response = await fetch(`${API_BASE_URL}/api/todos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to create todo');
  }

  return response.json();
}

export async function updateTodo(
  id: number,
  payload: Partial<Pick<Todo, 'title' | 'description' | 'completed'>>
): Promise<Todo> {
  const response = await fetch(`${API_BASE_URL}/api/todos/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to update todo');
  }

  return response.json();
}

export async function deleteTodo(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/todos/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete todo');
  }
}

export async function fetchHealth(): Promise<{
  status: string;
  service: string;
  timestamp: string;
}> {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error('Failed to fetch health');
  }

  return response.json();
}
