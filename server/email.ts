export type EmailMessage = { to: string; subject: string; text: string };

export async function sendEmail(message: EmailMessage): Promise<"sent" | "fallback"> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "SocietyHub <notifications@example.com>";
  if (!apiKey) {
    console.info(`[Email fallback] ${message.to} · ${message.subject}`);
    return "fallback";
  }
  try {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text }) });
    if (!response.ok) return "fallback";
    return "sent";
  } catch { return "fallback"; }
}

export async function sendBroadcast(recipients: string[], subject: string, text: string) {
  const results = await Promise.all(recipients.map(to => sendEmail({ to, subject, text })));
  return results.every(result => result === "sent") ? "sent" as const : "fallback" as const;
}
