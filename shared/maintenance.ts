export type ComplaintStatus = "open" | "in_progress" | "resolved";

export function isComplaintOverdue(status: ComplaintStatus, createdAt: Date, thresholdDays: number, now = new Date()) {
  return status !== "resolved" && now.getTime() - createdAt.getTime() > thresholdDays * 86400000;
}

export function canUpdateComplaint(status: ComplaintStatus) {
  return status !== "resolved";
}

export function statusLabel(status: ComplaintStatus) {
  return status === "in_progress" ? "in progress" : status;
}
