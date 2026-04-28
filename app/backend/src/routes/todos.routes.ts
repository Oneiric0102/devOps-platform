import { Router } from 'express';
import * as todosController from '../controllers/todos.controller';

const router = Router();

router.get('/', todosController.getTodos);
router.post('/', todosController.createTodo);
router.get('/:id', todosController.getTodoById);
router.patch('/:id', todosController.updateTodo);
router.delete('/:id', todosController.deleteTodo);

export default router;
