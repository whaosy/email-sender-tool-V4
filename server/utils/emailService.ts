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
    
    const transporter = nodemailer.createTransport({
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
    });
    
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
    await transporter.verify();
    return {
      success: true,
      message: 'SMTP connection successful',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send email
 */
export async function sendEmail(
  transporter: ReturnType<typeof nodemailer.createTransport>,
  options: {
    from: string;
    to: string | string[];
    subject: string;
    html: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Add CSS styles to HTML for proper rendering in email clients
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          h1 { font-size: 32px; margin: 20px 0 10px 0; font-weight: bold; }
          h2 { font-size: 24px; margin: 16px 0 8px 0; font-weight: bold; }
          h3 { font-size: 20px; margin: 12px 0 6px 0; font-weight: bold; }
          h4 { font-size: 18px; margin: 10px 0 5px 0; font-weight: bold; }
          h5 { font-size: 16px; margin: 8px 0 4px 0; font-weight: bold; }
          h6 { font-size: 14px; margin: 6px 0 3px 0; font-weight: bold; }
          ul, ol { margin: 10px 0; padding-left: 20px; }
          li { margin: 5px 0; }
          a { color: #0066cc; text-decoration: none; }
          a:hover { text-decoration: underline; }
          code { background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 14px; }
          pre { background-color: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; border: 1px solid #ddd; }
          pre code { background-color: transparent; padding: 0; }
          table { border-collapse: collapse; width: 100%; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
        </style>
      </head>
      <body>
        ${options.html}
      </body>
      </html>
    `;
    
    const info = await transporter.sendMail({
      from: options.from,
      to: Array.isArray(options.to) ? options.to.join(',') : options.to,
      subject: options.subject,
      html: emailHtml,
    });
    
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch send emails with retry logic
 */
export async function batchSendEmails(
  transporter: ReturnType<typeof nodemailer.createTransport>,
  emails: Array<{
    to: string;
    subject: string;
    html: string;
  }>,
  options: {
    from: string;
    onProgress?: (current: number, total: number) => void;
    maxRetries?: number;
  }
): Promise<
  Array<{
    email: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>
> {
  const maxRetries = options.maxRetries || 3;
  const results = [];
  
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    let lastError: string | undefined;
    let success = false;
    let messageId: string | undefined;
    
    // Retry logic
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await sendEmail(transporter, {
          from: options.from,
          to: email.to,
          subject: email.subject,
          html: email.html,
        });
        
        if (result.success) {
          success = true;
          messageId = result.messageId;
          break;
        } else {
          lastError = result.error;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    results.push({
      email: email.to,
      success,
      messageId,
      error: lastError,
    });
    
    // Call progress callback
    if (options.onProgress) {
      options.onProgress(i + 1, emails.length);
    }
  }
  
  return results;
}
