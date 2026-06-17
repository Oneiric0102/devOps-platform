import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import request from 'supertest';
import app from '../src/app';
import * as todosController from '../src/controllers/todos.controller';
import type { Todo } from '../src/types/todo';

const todosControllerModule =
  todosController as typeof import('../src/controllers/todos.controller');
const originalService = todosControllerModule.todosControllerDependencies.service;

const todo: Todo = {
  id: 1,
  title: 'Write tests',
  description: 'Cover todo routes',
  completed: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('Todo API', () => {
  afterEach(() => {
    todosControllerModule.todosControllerDependencies.service = originalService;
  });

  test('GET /api/todos should return todos with cache source', async () => {
    todosControllerModule.todosControllerDependencies.service = {
      ...originalService,
      getTodos: async () => ({
        source: 'database' as const,
        data: [todo],
      }),
    };

    const response = await request(app).get('/api/todos');

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.source, 'database');
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].title, todo.title);
  });

  test('POST /api/todos should reject empty titles', async () => {
    const response = await request(app)
      .post('/api/todos')
      .send({ title: '   ' });

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.message, 'title is required');
  });

  test('PATCH /api/todos/:id should update completion state', async () => {
    todosControllerModule.todosControllerDependencies.service = {
      ...originalService,
      updateTodo: async () => ({
        ...todo,
        completed: true,
      }),
    };

    const response = await request(app)
      .patch('/api/todos/1')
      .send({ completed: true });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.completed, true);
  });

  test('DELETE /api/todos/:id should return 404 for missing todo', async () => {
    todosControllerModule.todosControllerDependencies.service = {
      ...originalService,
      deleteTodo: async () => false,
    };

    const response = await request(app).delete('/api/todos/404');

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.message, 'Todo not found');
  });
});
