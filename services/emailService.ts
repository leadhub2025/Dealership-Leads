/**
 * ============================================
 * Email Service - Professional Implementation
 * ============================================
 * Handles all email operations using EmailJS (free tier)
 * Alternative: Can be replaced with SendGrid, Resend, AWS SES
 * ============================================
 */

// EmailJS Configuration
// Sign up at: https://www.emailjs.com/
const getEnvVar = (key: string) => {
  try {
    return (import.meta as any).env?.[key] || '';
  } catch {
    return '';
  }
};

const EMAILJS_SERVICE_ID = getEnvVar('VITE_EMAILJS_SERVICE_ID');
const EMAILJS_TEMPLATE_WELCOME = getEnvVar('VITE_EMAILJS_TEMPLATE_WELCOME');
const EMAILJS_TEMPLATE_RESET = getEnvVar('VITE_EMAILJS_TEMPLATE_RESET');
const EMAILJS_PUBLIC_KEY = getEnvVar('VITE_EMAILJS_PUBLIC_KEY');

// Debug: Log configuration status
console.log('📧 EmailJS Configuration:');
console.log('Service ID:', EMAILJS_SERVICE_ID ? '✅ Configured' : '❌ Missing');
console.log('Template Welcome:', EMAILJS_TEMPLATE_WELCOME ? '✅ Configured' : '❌ Missing');
console.log('Template Reset:', EMAILJS_TEMPLATE_RESET ? '✅ Configured' : '❌ Missing');
console.log('Public Key:', EMAILJS_PUBLIC_KEY ? '✅ Configured' : '❌ Missing');

// Demo mode check
const isEmailConfigured = EMAILJS_SERVICE_ID && EMAILJS_PUBLIC_KEY;
console.log('Email Service Status:', isEmailConfigured ? '✅ ENABLED' : '⚠️ SIMULATION MODE');

/**
 * Initialize EmailJS
 */
const initEmailJS = async () => {
  if (!isEmailConfigured) {
    console.warn('⚠️ Email service not configured. Set VITE_EMAILJS_* variables in .env');
    return null;
  }

  try {
    // Dynamically import EmailJS only when needed
    const emailjs = await import('@emailjs/browser');
    return emailjs;
  } catch (error) {
    console.error('EmailJS not installed. Run: npm install @emailjs/browser');
    return null;
  }
};

/**
 * Send welcome email to new user
 * @param email - User's email address
 * @param userName - User's full name
 * @param dealershipName - Name of the dealership
 */
export const sendWelcomeEmail = async (
  email: string,
  userName: string,
  dealershipName?: string
): Promise<boolean> => {

  // If email service is not configured, simulate sending
  if (!isEmailConfigured) {
    console.log(`[SIMULATION] Sending welcome email to: ${email}`);
    console.log(`Subject: Welcome to AutoLead SA, ${userName}!`);
    console.log(`Dealership: ${dealershipName || 'N/A'}`);
    return simulateEmailDelay();
  }

  try {
    const emailjs = await initEmailJS();
    if (!emailjs) {
      return simulateEmailDelay();
    }

    const templateParams = {
      to_email: email,
      to_name: userName,
      dealership_name: dealershipName || 'Your Dealership',
      platform_name: 'AutoLead SA',
      dashboard_url: window.location.origin,
      support_email: 'support@autoleadsa.co.za'
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_WELCOME,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('✅ Welcome email sent successfully:', response.status);
    return true;

  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    // Don't throw - email failure shouldn't block registration
    return false;
  }
};

/**
 * Send password reset email
 * @param email - User's email address
 * @param resetToken - Password reset token
 * @param userName - User's full name
 */
export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  userName?: string
): Promise<boolean> => {

  // If email service is not configured, simulate sending
  if (!isEmailConfigured) {
    console.log(`[SIMULATION] Sending password reset email to: ${email}`);
    console.log(`Reset token: ${resetToken}`);
    return simulateEmailDelay();
  }

  try {
    const emailjs = await initEmailJS();
    if (!emailjs) {
      return simulateEmailDelay();
    }

    const resetUrl = `${window.location.origin}/reset-password?token=${resetToken}`;

    const templateParams = {
      to_email: email,
      to_name: userName || 'User',
      reset_url: resetUrl,
      reset_token: resetToken,
      platform_name: 'AutoLead SA',
      support_email: 'support@autoleadsa.co.za',
      expires_in: '1 hour'
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_RESET,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('✅ Password reset email sent successfully:', response.status);
    return true;

  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    return false;
  }
};

/**
 * Simulate email sending delay (for demo mode)
 */
const simulateEmailDelay = (): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('[SIMULATION] Email sent successfully (simulated)');
      resolve(true);
    }, 1000);
  });
};

/**
 * Open native email client (fallback for mailto links)
 */
export const openNativeEmailClient = (to: string, subject: string, body: string) => {
  const params = new URLSearchParams({
    subject: subject,
    body: body
  });

  window.location.href = `mailto:${to}?${params.toString()}`;
};

/**
 * Construct email subject for lead inquiries
 */
export const constructEmailSubject = (brand: string, model: string) => {
  return `Inquiry regarding availability: ${brand} ${model}`;
};

/**
 * Send notification email to admin
 * @param subject - Email subject
 * @param message - Email message
 */
export const sendAdminNotification = async (
  subject: string,
  message: string
): Promise<boolean> => {

  const adminEmail = 'admin@autoleadsa.co.za';

  if (!isEmailConfigured) {
    console.log(`[SIMULATION] Admin notification: ${subject}`);
    console.log(message);
    return simulateEmailDelay();
  }

  try {
    const emailjs = await initEmailJS();
    if (!emailjs) {
      return simulateEmailDelay();
    }

    const templateParams = {
      to_email: adminEmail,
      subject: subject,
      message: message,
      platform_name: 'AutoLead SA'
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_WELCOME, // Reuse welcome template or create admin template
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('✅ Admin notification sent:', response.status);
    return true;

  } catch (error) {
    console.error('❌ Failed to send admin notification:', error);
    return false;
  }
};
