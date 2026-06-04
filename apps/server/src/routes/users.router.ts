import { Router } from "express";

import { requireAuthMiddleware } from "../middleware/require-auth.js";
import {
  getMe,
  getPublicKeyForUser,
  searchUsers,
} from "../services/user.service.js";

/** Монтируется на `${API_PREFIX}/users`. */
export function createUsersRouter(): Router {
  const r = Router();
  r.use(requireAuthMiddleware);

  r.get("/me", async (req, res, next) => {
    try {
      const userId = req.userId!;
      res.json(await getMe(userId));
    } catch (e) {
      next(e);
    }
  });

  r.get("/search", async (req, res, next) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q : "";
      res.json({ users: await searchUsers(req.userId!, q) });
    } catch (e) {
      next(e);
    }
  });

  r.get("/:peerId/public-key", async (req, res, next) => {
    try {
      const key = await getPublicKeyForUser(
        req.userId!,
        req.params.peerId,
      );
      res.json(key);
    } catch (e) {
      next(e);
    }
  });

  return r;
}
