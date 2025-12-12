
export const openNativeEmailClient = (to: string, subject: string, body: string) => {
  const params = new URLSearchParams({
    subject: subject,
    body: body
  });

  // We use window.open to trigger the mailto link
  // This opens the default mail app (Outlook, Apple Mail) or Gmail web if configured
  window.location.href = `mailto:${to}?${params.toString()}`;
};

export const constructEmailSubject = (brand: string, model: string) => {
  return `Inquiry regarding availability: ${brand} ${model}`;
};

/**
 * Simulates sending a welcome confirmation email upon registration.
 * In a production environment, this would call a backend API (e.g. SendGrid/AWS SES).
 */
export const sendWelcomeEmail = async (email: string, dealerName: string): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      console.log(`[SMTP] Connecting to mail server...`);
      console.log(`[SMTP] Sending 'Welcome & Confirmation' email to: ${email || 'unknown@example.com'}`);
      console.log(`[SMTP] Subject: Welcome to AutoLead SA, ${dealerName || 'Partner'}!`);
      
      setTimeout(() => {
        console.log(`[SMTP] Status: 250 OK - Message accepted for delivery`);
        resolve(true);
      }, 1500); // Simulate network delay
    } catch (e) {
      console.warn("SMTP Simulation Warning:", e);
      resolve(false);
    }
  });
};

/**
 * Simulates sending a password reset link.
 */
export const sendPasswordResetEmail = async (email: string): Promise<boolean> => {
  return new Promise((resolve) => {
    console.log(`[System] Sending Password Reset Link to ${email}...`);
    setTimeout(() => {
      console.log(`[System] Reset Link Sent.`);
      resolve(true);
    }, 1500);
  });
};
