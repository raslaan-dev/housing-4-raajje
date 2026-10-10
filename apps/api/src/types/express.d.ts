declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
        branchId?: string | null;
      };
    }
  }
}

export {};
