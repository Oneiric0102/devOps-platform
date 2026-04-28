import { pool } from '../db/postgres';
import type { CreateTodoInput, Todo, UpdateTodoInput } from '../types/todo';

type TodoRow = {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function findAll(): Promise<Todo[]> {
  const result = await pool.query<TodoRow>(
    `SELECT 
       id,
       title,
       description,
       completed,
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM todos
     ORDER BY id DESC`
  );

  return result.rows;
}

export async function findById(id: number): Promise<Todo | null> {
  const result = await pool.query<TodoRow>(
    `SELECT 
       id,
       title,
       description,
       completed,
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM todos
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function create(input: CreateTodoInput): Promise<Todo> {
  const result = await pool.query<TodoRow>(
    `INSERT INTO todos (title, description)
     VALUES ($1, $2)
     RETURNING 
       id,
       title,
       description,
       completed,
       created_at AS "createdAt",
       updated_at AS "updatedAt"`,
    [input.title, input.description ?? null]
  );

  return result.rows[0];
}

export async function update(
  id: number,
  input: UpdateTodoInput
): Promise<Todo | null> {
  const current = await findById(id);

  if (!current) {
    return null;
  }

  const result = await pool.query<TodoRow>(
    `UPDATE todos
     SET 
       title = $1,
       description = $2,
       completed = $3,
       updated_at = NOW()
     WHERE id = $4
     RETURNING 
       id,
       title,
       description,
       completed,
       created_at AS "createdAt",
       updated_at AS "updatedAt"`,
    [
      input.title ?? current.title,
      input.description ?? current.description,
      input.completed ?? current.completed,
      id,
    ]
  );

  return result.rows[0] ?? null;
}

export async function remove(id: number): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM todos
     WHERE id = $1
     RETURNING id`,
    [id]
  );

  return result.rowCount !== null && result.rowCount > 0;
}
