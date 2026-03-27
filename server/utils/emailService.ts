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
        minVersion: 'TLSv1.2',
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
    const info = await transporter.sendMail(mailOptions);
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
