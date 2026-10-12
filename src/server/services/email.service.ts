import { env } from "@/config/env";

type PasswordResetEmail = {
  email: string;
  resetUrl: string;
};

export const EmailService = {
  isConfigured(): boolean {
    return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
  },

  async sendPasswordResetEmail({ email, resetUrl }: PasswordResetEmail): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("Password reset email delivery is not configured.");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [email],
        subject: "Reset your TrustDNA password",
        text: `We received a request to reset your TrustDNA password. Use this link within 30 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
        html: `<p>We received a request to reset your TrustDNA password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>`,
        ...(env.EMAIL_REPLY_TO ? { reply_to: env.EMAIL_REPLY_TO } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Password reset email provider returned HTTP ${response.status}.`);
    }
  },
};
