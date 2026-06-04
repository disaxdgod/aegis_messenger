import type { User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      authUser?: User;
      /** После middleware `upload.single(...)`. */
      file?: Express.Multer.File;
      requestId?: string;
    }
  }
}

export {};
