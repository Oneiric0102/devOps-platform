export type Todo = {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTodoInput = {
  title: string;
  description?: string;
};

export type UpdateTodoInput = {
  title?: string;
  description?: string | null;
  completed?: boolean;
};
