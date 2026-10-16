import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../supabaseAdmin.js";

export interface AuthedRequest extends Request {
  userId?: string;
}

/**
 * Every protected route expects `Authorization: Bearer <supabase access token>`.
 * We verify it against Supabase (not just decode it) so a tampered or expired
 * token is rejected before touching the database or the AI provider.
 */
export async function verifyAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.userId = data.user.id;
  next();
}
