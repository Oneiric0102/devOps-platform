import type { NextFunction, Request, Response } from 'express';

export function errorMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(error);

  res.status(500).json({
    message: 'Internal Server Error',
  });
}
