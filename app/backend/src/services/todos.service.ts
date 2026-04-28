import { redisClient, connectRedis } from '../db/redis';
import * as todosRepository from '../repositories/todos.repository';
import type { CreateTodoInput, Todo, UpdateTodoInput } from '../types/todo';

const TODO_LIST_CACHE_KEY = 'todos:all';
const TODO_LIST_CACHE_TTL_SECONDS = 30;

export type TodoListResult = {
  source: 'cache' | 'database';
  data: Todo[];
};

export async function getTodos(): Promise<TodoListResult> {
  await connectRedis();

  const cached = await redisClient.get(TODO_LIST_CACHE_KEY);

  if (cached) {
    return {
      source: 'cache',
      data: JSON.parse(cached) as Todo[],
    };
  }

  const todos = await todosRepository.findAll();

  await redisClient.setEx(
    TODO_LIST_CACHE_KEY,
    TODO_LIST_CACHE_TTL_SECONDS,
    JSON.stringify(todos)
  );

  return {
    source: 'database',
    data: todos,
  };
}

export async function getTodoById(id: number): Promise<Todo | null> {
  return todosRepository.findById(id);
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const todo = await todosRepository.create(input);
  await invalidateTodoCache();
  return todo;
}

export async function updateTodo(
  id: number,
  input: UpdateTodoInput
): Promise<Todo | null> {
  const todo = await todosRepository.update(id, input);
  await invalidateTodoCache();
  return todo;
}

export async function deleteTodo(id: number): Promise<boolean> {
  const deleted = await todosRepository.remove(id);
  await invalidateTodoCache();
  return deleted;
}

async function invalidateTodoCache(): Promise<void> {
  await connectRedis();
  await redisClient.del(TODO_LIST_CACHE_KEY);
}
