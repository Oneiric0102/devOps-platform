import type { NextFunction, Request, Response } from 'express';
import * as todosService from '../services/todos.service';

export const todosControllerDependencies = {
  service: todosService,
};

export async function getTodos(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await todosControllerDependencies.service.getTodos();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTodoById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({ message: 'Invalid todo id' });
      return;
    }

    const todo = await todosControllerDependencies.service.getTodoById(id);

    if (!todo) {
      res.status(404).json({ message: 'Todo not found' });
      return;
    }

    res.json(todo);
  } catch (error) {
    next(error);
  }
}

export async function createTodo(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { title, description } = req.body as {
      title?: string;
      description?: string;
    };

    if (!title || title.trim().length === 0) {
      res.status(400).json({ message: 'title is required' });
      return;
    }

    const todo = await todosControllerDependencies.service.createTodo({
      title,
      description,
    });

    res.status(201).json(todo);
  } catch (error) {
    next(error);
  }
}

export async function updateTodo(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({ message: 'Invalid todo id' });
      return;
    }

    const { title, description, completed } = req.body as {
      title?: string;
      description?: string | null;
      completed?: boolean;
    };

    const todo = await todosControllerDependencies.service.updateTodo(id, {
      title,
      description,
      completed,
    });

    if (!todo) {
      res.status(404).json({ message: 'Todo not found' });
      return;
    }

    res.json(todo);
  } catch (error) {
    next(error);
  }
}

export async function deleteTodo(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({ message: 'Invalid todo id' });
      return;
    }

    const deleted = await todosControllerDependencies.service.deleteTodo(id);

    if (!deleted) {
      res.status(404).json({ message: 'Todo not found' });
      return;
    }

    res.json({ message: 'Todo deleted' });
  } catch (error) {
    next(error);
  }
}
