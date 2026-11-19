export type SupportTicket = {
  ticket_id: string;
  tsap_id: string;
  subject: string;
  status: string;
  category: string;
  messages: { sender: string; text: string }[];
};

export function supportTicketsFrom(value: unknown): SupportTicket[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (data.success === false || !Array.isArray(data.tickets)) return null;
  const valid = data.tickets.every((ticket: unknown) => {
    if (!ticket || typeof ticket !== "object" || Array.isArray(ticket)) return false;
    const row = ticket as Record<string, unknown>;
    return ["ticket_id", "tsap_id", "subject", "status", "category"].every(key => typeof row[key] === "string") &&
      Array.isArray(row.messages) && row.messages.every((message: unknown) => {
        if (!message || typeof message !== "object" || Array.isArray(message)) return false;
        const item = message as Record<string, unknown>;
        return typeof item.sender === "string" && typeof item.text === "string";
      });
  });
  return valid ? data.tickets as SupportTicket[] : null;
}
