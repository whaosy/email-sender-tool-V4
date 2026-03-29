-- 迁移：从 OAuth 认证迁移到本地用户认证
-- 此迁移重建 users 表以支持本地用户名/密码认证

-- 1. 创建临时表备份原始数据
CREATE TABLE `users_backup` AS SELECT * FROM `users`;

-- 2. 删除依赖 users 表的外键约束
ALTER TABLE `emailTasks` DROP FOREIGN KEY `emailTasks_ibfk_1`;
ALTER TABLE `emailTemplates` DROP FOREIGN KEY `emailTemplates_ibfk_1`;
ALTER TABLE `smtpConfigs` DROP FOREIGN KEY `smtpConfigs_ibfk_1`;
ALTER TABLE `emailLogs` DROP FOREIGN KEY `emailLogs_ibfk_1`;
ALTER TABLE `scheduledJobs` DROP FOREIGN KEY `scheduledJobs_ibfk_1`;

-- 3. 删除原始 users 表
DROP TABLE `users`;

-- 4. 创建新的 users 表（支持本地认证）
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` varchar(64) NOT NULL UNIQUE COMMENT '用户名（唯一）',
  `email` varchar(320) UNIQUE COMMENT '用户邮箱（可选）',
  `passwordHash` text NOT NULL COMMENT '密码哈希值（bcrypt）',
  `displayName` text COMMENT '用户显示名称',
  `role` enum('user','admin') NOT NULL DEFAULT 'user' COMMENT '用户角色',
  `isActive` int NOT NULL DEFAULT 1 COMMENT '账户是否已激活',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `lastSignedIn` timestamp NULL COMMENT '最后登录时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_createdAt` (`createdAt`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 5. 重新创建外键约束
ALTER TABLE `emailTasks` ADD CONSTRAINT `emailTasks_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;
ALTER TABLE `emailTemplates` ADD CONSTRAINT `emailTemplates_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;
ALTER TABLE `smtpConfigs` ADD CONSTRAINT `smtpConfigs_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;
ALTER TABLE `emailLogs` ADD CONSTRAINT `emailLogs_ibfk_1` FOREIGN KEY (`taskId`) REFERENCES `emailTasks` (`id`) ON DELETE CASCADE;
ALTER TABLE `scheduledJobs` ADD CONSTRAINT `scheduledJobs_ibfk_1` FOREIGN KEY (`taskId`) REFERENCES `emailTasks` (`id`) ON DELETE CASCADE;

-- 6. 删除备份表
DROP TABLE `users_backup`;

-- 迁移完成
-- 注意：所有原始用户数据已丢失，需要重新创建用户账户
