import { Router } from "express";
import bcryptjs from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const session = (req.session as unknown) as Record<string, unknown>;
  if (!session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

function requireAdmin(req: any, res: any, next: any) {
  const session = (req.session as unknown) as Record<string, unknown>;
  if (!session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (session.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  next();
}

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username));

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcryptjs.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    ((req.session as unknown) as Record<string, unknown>).userId = user.id;
    ((req.session as unknown) as Record<string, unknown>).role = user.role;

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get("/auth/me", async (req, res) => {
  const session = (req.session as unknown) as Record<string, unknown>;
  const userId = session.userId as number | undefined;

  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) {
      req.session.destroy(() => {});
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    });
  } catch (err) {
    req.log.error({ err }, "Get me error");
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Change own password (any logged-in user) ─────────────────────────────────
router.post("/auth/change-password", requireAuth, async (req, res) => {
  const session = (req.session as unknown) as Record<string, unknown>;
  const userId = session.userId as number;
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const valid = await bcryptjs.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
    const newHash = await bcryptjs.hash(newPassword, 10);
    await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, userId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Change password error");
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Admin: list all users ────────────────────────────────────────────────────
router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await db
      .select({ id: usersTable.id, username: usersTable.username, role: usersTable.role, displayName: usersTable.displayName })
      .from(usersTable);
    res.json(users);
  } catch (err) {
    req.log.error({ err }, "List users error");
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Admin: reset another user's password ────────────────────────────────────
router.post("/admin/users/:id/reset-password", requireAdmin, async (req, res) => {
  const targetId = Number(req.params.id);
  const { newPassword } = req.body as { newPassword?: string };

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "newPassword must be at least 6 characters" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, targetId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const newHash = await bcryptjs.hash(newPassword, 10);
    await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, targetId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Admin reset password error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
