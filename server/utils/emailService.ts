import nodemailer from 'nodemailer';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.JWT_SECRET || 'default-secret-key';

/**
 * Encrypt sensitive data (password/auth code)
 */
export function encryptAuthCode(authCode: string): string {
  return CryptoJS.AES.encrypt(authCode, ENCRYPTION_KEY).toString();
}

/**
 * Decrypt sensitive data
 */
export function decryptAuthCode(encryptedCode: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedCode, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Create SMTP transporter
 */
export async function createSmtpTransporter(config: {
  host: string;
  port: number;
  encryptionType: 'none' | 'ssl' | 'tls';
  email: string;
  authCode: string;
}) {
  try {
    const secure = config.encryptionType === 'ssl';
    const requireTLS = config.encryptionType === 'tls';
    
    // Build transporter config
    const transporterConfig: any = {
      host: config.host,
      port: config.port,
      secure,
      requireTLS,
      auth: {
        user: config.email,
        pass: config.authCode,
      },
      connectionTimeout: 10000,
      socketTimeout: 10000,
    };
    
    // For SSL/TLS connections, add TLS options to handle certificate issues
    if (config.encryptionType === 'ssl' || config.encryptionType === 'tls') {
      transporterConfig.tls = {
        rejectUnauthorized: false,
        // Remove minVersion restriction to support more SMTP servers
        // Some servers like QQ mail may have compatibility issues with strict TLS versions
      };
    }
    
    const transporter = nodemailer.createTransport(transporterConfig);
    
    return transporter;
  } catch (error) {
    throw new Error(`Failed to create SMTP transporter: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Test SMTP connection
 */
export async function testSmtpConnection(config: {
  host: string;
  port: number;
  encryptionType: 'none' | 'ssl' | 'tls';
  email: string;
  authCode: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = await createSmtpTransporter(config);
    
    // Try to verify connection with timeout
    const verifyPromise = transporter.verify();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout after 15 seconds')), 15000)
    );
    
    await Promise.race([verifyPromise, timeoutPromise]);
    
    return {
      success: true,
      message: 'SMTP connection successful',
    };
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Provide more helpful error messages
    if (errorMessage.includes('wrong version number') || errorMessage.includes('SSL')) {
      errorMessage = `SSL/TLS connection failed. Please check: 1) Port number (SSL usually 465, TLS usually 587); 2) Encryption type matches server configuration; 3) Server supports the encryption method`;
    } else if (errorMessage.includes('ECONNREFUSED')) {
      errorMessage = `Connection refused: Please verify host address and port number`;
    } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
      errorMessage = `Connection timeout: Please check network and server address`;
    } else if (errorMessage.includes('Invalid login') || errorMessage.includes('invalid credentials')) {
      errorMessage = `Authentication failed: Email or authorization code is incorrect`;
    }
    
    return {
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * Validate email address format
 */
export function validateEmailAddress(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email address is required and must be a string' };
  }

  // Trim whitespace
  const trimmedEmail = email.trim();

  // Check for empty string after trimming
  if (trimmedEmail.length === 0) {
    return { valid: false, error: 'Email address cannot be empty' };
  }

  // Basic email validation regex (RFC 5322 simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: `Invalid email format: ${trimmedEmail}` };
  }

  // Check for common issues
  if (trimmedEmail.includes('  ')) {
    return { valid: false, error: 'Email address contains multiple spaces' };
  }

  if (trimmedEmail.startsWith('@') || trimmedEmail.endsWith('@')) {
    return { valid: false, error: 'Email address cannot start or end with @' };
  }

  if (trimmedEmail.includes('@@')) {
    return { valid: false, error: 'Email address contains double @' };
  }

  return { valid: true };
}

/**
 * Validate email parameters
 */
export function validateEmailParameters(mailOptions: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): { valid: boolean; error?: string } {
  // Validate recipient email
  const emailValidation = validateEmailAddress(mailOptions.to);
  if (!emailValidation.valid) {
    return { valid: false, error: `Recipient email validation failed: ${emailValidation.error}` };
  }

  // Validate sender email if provided
  if (mailOptions.from) {
    const senderValidation = validateEmailAddress(mailOptions.from);
    if (!senderValidation.valid) {
      return { valid: false, error: `Sender email validation failed: ${senderValidation.error}` };
    }
  }

  // Validate subject
  if (!mailOptions.subject || typeof mailOptions.subject !== 'string') {
    return { valid: false, error: 'Email subject is required and must be a string' };
  }

  if (mailOptions.subject.trim().length === 0) {
    return { valid: false, error: 'Email subject cannot be empty' };
  }

  // Check subject length (SMTP limit is typically 998 characters per line)
  if (mailOptions.subject.length > 500) {
    return { valid: false, error: 'Email subject is too long (max 500 characters)' };
  }

  // Validate HTML content
  if (!mailOptions.html || typeof mailOptions.html !== 'string') {
    return { valid: false, error: 'Email content is required and must be a string' };
  }

  if (mailOptions.html.trim().length === 0) {
    return { valid: false, error: 'Email content cannot be empty' };
  }

  return { valid: true };
}

/**
 * Send single email
 */
export async function sendEmail(
  transporter: nodemailer.Transporter<any>,
  mailOptions: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Validate email parameters before sending
    const validation = validateEmailParameters(mailOptions);
    if (!validation.valid) {
      console.error(`[Email Validation Failed] To: ${mailOptions.to}, Error: ${validation.error}`);
      return {
        success: false,
        error: `Email validation failed: ${validation.error}`,
      };
    }

    // Trim email addresses to prevent whitespace issues
    const cleanMailOptions = {
      ...mailOptions,
      to: mailOptions.to.trim(),
      from: mailOptions.from?.trim(),
    };

    console.log(`[Sending Email] To: ${cleanMailOptions.to}, Subject: ${cleanMailOptions.subject.substring(0, 50)}...`);
    
    const info = await transporter.sendMail(cleanMailOptions);
    console.log(`[Email Sent Successfully] To: ${cleanMailOptions.to}, MessageId: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as any)?.code || 'UNKNOWN';
    
    console.error(`[Email Send Failed] To: ${mailOptions.to}`);
    console.error(`[Error Code] ${errorCode}`);
    console.error(`[Error Message] ${errorMessage}`);
    
    // Provide more helpful error messages for common SMTP errors
    let friendlyError = errorMessage;
    
    if (errorMessage.includes('502') || errorCode === '502') {
      friendlyError = `SMTP server error (502): Invalid parameters. Please verify: 1) Recipient email format is correct; 2) Email subject is not empty (max 500 chars); 3) Email content is not empty; 4) SMTP configuration is correct`;
    } else if (errorMessage.includes('Invalid parameters')) {
      friendlyError = `Invalid email parameters. Please verify recipient email, subject, and content.`;
    } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
      friendlyError = `SMTP server not found. Please check the SMTP host address.`;
    } else if (errorMessage.includes('ECONNREFUSED')) {
      friendlyError = `Connection refused. Please check SMTP host and port.`;
    } else if (errorMessage.includes('ETIMEDOUT')) {
      friendlyError = `Connection timeout. Please check network and SMTP server.`;
    } else if (errorMessage.includes('Authentication failed') || errorMessage.includes('Invalid login')) {
      friendlyError = `SMTP authentication failed. Please check email and authorization code.`;
    }
    
    return {
      success: false,
      error: friendlyError,
    };
  }
}

/**
 * Batch send emails - returns array of results for each email
 */
export async function batchSendEmails(
  transporter: nodemailer.Transporter<any>,
  emails: Array<{
    to: string;
    subject: string;
    html: string;
    from?: string;
  }>,
  onProgress?: (current: number, total: number) => void
): Promise<Array<{ success: boolean; messageId?: string; error?: string }>> {
  const results: Array<{ success: boolean; messageId?: string; error?: string }> = [];

  for (let i = 0; i < emails.length; i++) {
    const result = await sendEmail(transporter, emails[i]);
    results.push(result);
    onProgress?.(i + 1, emails.length);
  }

  return results;
}


/**
 * Generate preview emails HTML document
 * Combines all preview emails into a single HTML page with summary information
 */
export function generatePreviewEmailsHtml(
  emails: Array<{
    to: string;
    subject: string;
    html: string;
    from?: string;
  }>,
  options: {
    totalCount: number;
    merchantList: Array<{ name: string; email: string }>;
    sendTime: string;
    sendType: 'immediate' | 'scheduled';
  }
): string {
  const merchantListHtml = options.merchantList
    .map(
      (m) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${m.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${m.email}</td>
    </tr>
  `
    )
    .join('');

  const emailsHtml = emails
    .map(
      (email, index) => `
    <div style="page-break-inside: avoid; margin-bottom: 40px; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
      <div style="background-color: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #333;">邮件 ${index + 1}/${emails.length}</h3>
        <p style="margin: 5px 0;"><strong>发件人:</strong> ${email.from || '系统'}</p>
        <p style="margin: 5px 0;"><strong>收件人:</strong> ${email.to}</p>
        <p style="margin: 5px 0;"><strong>邮件主题:</strong> ${email.subject}</p>
        <p style="margin: 5px 0;"><strong>发送日期:</strong> ${options.sendTime}</p>
      </div>
      <div style="background-color: #fff; padding: 15px; border: 1px solid #eee; border-radius: 4px;">
        <h4 style="margin: 0 0 15px 0; color: #666;">邮件正文</h4>
        <div style="color: #333; line-height: 1.6;">
          ${email.html}
        </div>
      </div>
    </div>
    ${index < emails.length - 1 ? '<hr style="border: none; border-top: 2px dashed #ccc; margin: 40px 0;" />' : ''}
  `
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>邮件预览 - 批量邮件发送系统</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #333;
      background-color: #f9f9f9;
      line-height: 1.6;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .header {
      background-color: #fff;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .header h1 {
      margin-bottom: 15px;
      color: #222;
    }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .summary-item {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      border-left: 4px solid #1890ff;
    }
    
    .summary-item strong {
      display: block;
      color: #666;
      font-size: 12px;
      margin-bottom: 5px;
    }
    
    .summary-item span {
      display: block;
      font-size: 24px;
      font-weight: bold;
      color: #222;
    }
    
    .merchant-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      background-color: #fff;
    }
    
    .merchant-table th {
      background-color: #f5f5f5;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #ddd;
    }
    
    .merchant-table td {
      padding: 8px;
      border-bottom: 1px solid #ddd;
    }
    
    .emails-section {
      margin-top: 30px;
    }
    
    .email-item {
      background-color: #fff;
      margin-bottom: 30px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .email-header {
      background-color: #f5f5f5;
      padding: 15px;
      border-bottom: 1px solid #ddd;
    }
    
    .email-header h3 {
      margin-bottom: 10px;
      color: #222;
    }
    
    .email-header p {
      margin: 5px 0;
      font-size: 14px;
      color: #666;
    }
    
    .email-body {
      padding: 20px;
      background-color: #fff;
    }
    
    .email-body h4 {
      margin-bottom: 15px;
      color: #333;
      font-size: 14px;
    }
    
    .email-content {
      color: #333;
      line-height: 1.6;
      word-wrap: break-word;
    }
    
    @media print {
      body {
        background-color: #fff;
      }
      .email-item {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>邮件发送预览</h1>
      <div class="summary">
        <div class="summary-item">
          <strong>待发送邮件总数</strong>
          <span>${options.totalCount}</span>
        </div>
        <div class="summary-item">
          <strong>发送时间</strong>
          <span>${options.sendTime}</span>
        </div>
        <div class="summary-item">
          <strong>发送类型</strong>
          <span>${options.sendType === 'immediate' ? '立即发送' : '预约发送'}</span>
        </div>
      </div>
      
      <h3>商户-收件人列表</h3>
      <table class="merchant-table">
        <thead>
          <tr>
            <th>商户名称</th>
            <th>收件人邮箱</th>
          </tr>
        </thead>
        <tbody>
          ${merchantListHtml}
        </tbody>
      </table>
    </div>
    
    <div class="emails-section">
      <h2 style="margin-bottom: 20px;">邮件明细</h2>
      ${emailsHtml}
    </div>
  </div>
</body>
</html>
  `;

  return html;
}
