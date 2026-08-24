import { describe, expect, it } from "vitest";
import { canUpdateComplaint, isComplaintOverdue, statusLabel } from "../shared/maintenance";

describe("maintenance lifecycle rules", () => {
  const now = new Date("2026-08-23T00:00:00.000Z");

  it("flags unresolved tickets older than the configured threshold", () => {
    expect(isComplaintOverdue("open", new Date("2026-08-19T00:00:00.000Z"), 3, now)).toBe(true);
    expect(isComplaintOverdue("open", new Date("2026-08-22T00:00:00.000Z"), 3, now)).toBe(false);
    expect(isComplaintOverdue("resolved", new Date("2026-08-01T00:00:00.000Z"), 3, now)).toBe(false);
  });

  it("locks resolved complaints and formats statuses for the UI", () => {
    expect(canUpdateComplaint("open")).toBe(true);
    expect(canUpdateComplaint("in_progress")).toBe(true);
    expect(canUpdateComplaint("resolved")).toBe(false);
    expect(statusLabel("in_progress")).toBe("in progress");
  });
});
