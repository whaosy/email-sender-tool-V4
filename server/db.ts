import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, emailTasks, emailTemplates, smtpConfigs, emailLogs, scheduledJobs, InsertEmailTask, InsertEmailTemplate, InsertSmtpConfig, InsertEmailLog, InsertScheduledJob } from "../drizzle/schema";
import { createHash } from "crypto";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * MD5 密码哈希函数
 */
export function hashPasswordMD5(password: string): string {
  return createHash('md5').update(password).digest('hex');
}

/**
 * 根据用户名获取用户
 */
export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * 根据用户 ID 获取用户
 */
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * 验证用户密码
 */
export async function verifyUserPassword(username: string, password: string): Promise<boolean> {
  const user = await getUserByUsername(username);
  if (!user) {
    return false;
  }

  const passwordHash = hashPasswordMD5(password);
  return user.password === passwordHash;
}

/**
 * 更新用户最后登录时间
 */
export async function updateUserLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user: database not available");
    return;
  }

  try {
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
  } catch (error) {
    console.error("[Database] Failed to update lastSignedIn:", error);
  }
}

// Email system queries
export async function createEmailTask(task: InsertEmailTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(emailTasks).values(task);
  // Drizzle with MySQL2 returns result[0] which has insertId
  return { insertId: (result as any)[0]?.insertId || 0 };
}

export async function getEmailTask(taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(emailTasks).where(eq(emailTasks.id, taskId)).limit(1);
  return result[0];
}

export async function updateEmailTask(taskId: number, updates: Partial<InsertEmailTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(emailTasks).set(updates).where(eq(emailTasks.id, taskId));
}

export async function getUserEmailTasks(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(emailTasks).where(eq(emailTasks.userId, userId)).orderBy(desc(emailTasks.createdAt));
}

export async function createEmailTemplate(template: InsertEmailTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(emailTemplates).values(template);
  return result;
}

export async function getUserEmailTemplates(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(emailTemplates).where(eq(emailTemplates.userId, userId));
}

export async function getEmailTemplate(templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(emailTemplates).where(eq(emailTemplates.id, templateId)).limit(1);
  return result[0];
}

export async function createSmtpConfig(config: InsertSmtpConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(smtpConfigs).values(config);
  return result;
}

export async function getUserSmtpConfigs(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(smtpConfigs).where(eq(smtpConfigs.userId, userId));
}

export async function getSmtpConfig(configId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(smtpConfigs).where(eq(smtpConfigs.id, configId)).limit(1);
  return result[0];
}

export async function deleteSmtpConfig(configId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(smtpConfigs).where(eq(smtpConfigs.id, configId));
}

export async function deleteEmailTemplate(templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(emailTemplates).where(eq(emailTemplates.id, templateId));
}

export async function createEmailLog(log: InsertEmailLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!log.taskId) {
    throw new Error("taskId is required for email log");
  }
  const result = await db.insert(emailLogs).values(log);
  return result;
}

export async function getTaskEmailLogs(taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(emailLogs).where(eq(emailLogs.taskId, taskId)).orderBy(desc(emailLogs.createdAt));
}

export async function updateEmailLog(logId: number, updates: Partial<InsertEmailLog>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(emailLogs).set(updates).where(eq(emailLogs.id, logId));
}

export async function createScheduledJob(job: InsertScheduledJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(scheduledJobs).values(job);
}

export async function getPendingScheduledJobs() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(scheduledJobs).where(eq(scheduledJobs.status, "pending"));
}

export async function updateScheduledJob(jobId: string, updates: Partial<InsertScheduledJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scheduledJobs).set(updates).where(eq(scheduledJobs.jobId, jobId));
}

export async function getScheduledJob(jobId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(scheduledJobs).where(eq(scheduledJobs.jobId, jobId)).limit(1);
  return result[0];
}
