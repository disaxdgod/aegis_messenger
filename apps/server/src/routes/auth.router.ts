import type {
  AuthResponseDTO,
  LogoutRequestDTO,
  RefreshTokensRequestDTO,
  SignInRequestDTO,
  SignUpRequestDTO,
} from "@aegis/shared";
import { Router } from "express";

import { requireAuthMiddleware } from "../middleware/require-auth.js";
import {
  logoutAllSessionsService,
  logoutSessionService,
  refreshTokensService,
  signInService,
  signUpService,
} from "../services/auth.service.js";

/** `${API_PREFIX}/auth`. */
export function createAuthRouter(): Router {
  const r = Router();

  r.post("/sign-up", async (req, res, next) => {
    try {
      const body = req.body as SignUpRequestDTO;
      const out: AuthResponseDTO = await signUpService(body);
      res.status(201).json(out);
    } catch (e) {
      next(e);
    }
  });

  r.post("/sign-in", async (req, res, next) => {
    try {
      const body = req.body as SignInRequestDTO;
      const out: AuthResponseDTO = await signInService(body);
      res.json(out);
    } catch (e) {
      next(e);
    }
  });

  r.post("/refresh", async (req, res, next) => {
    try {
      const raw = (req.body as RefreshTokensRequestDTO).refreshToken;
      const out: AuthResponseDTO = await refreshTokensService(
        typeof raw === "string" ? raw : "",
      );
      res.json(out);
    } catch (e) {
      next(e);
    }
  });

  r.post("/logout", async (req, res, next) => {
    try {
      const raw = (req.body as LogoutRequestDTO).refreshToken;
      await logoutSessionService(typeof raw === "string" ? raw : "");
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

  r.delete("/sessions", requireAuthMiddleware, async (req, res, next) => {
    try {
      await logoutAllSessionsService(req.userId!);
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

  return r;
}
