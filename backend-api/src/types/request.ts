import type { Request } from 'express';

export interface RequestWithUser extends Request {
  user: {
    userId: number;
    role: string;
  };
}
