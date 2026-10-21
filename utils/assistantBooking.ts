/**
 * The AI emits a booking directive as a fenced ```booking block holding JSON so
 * the chat can render an inline appointment picker. We parse it out of the
 * assistant text and render the card separately.
 */
export interface BookingDirective {
  doctorEntityId: string;
  doctorUserId: string;
  doctorName?: string;
  price?: number;
  /** Optional YYYY-MM-DD the patient asked for; preselects the slot list. */
  date?: string;
  /** Patient's stated reason for the visit (for the doctor). */
  reason?: string;
  /** AI-written, doctor-facing insight sent with the booking. */
  patientInsight?: string;
}

const BOOKING_FENCE = /```booking\s*([\s\S]*?)```/i;

/** Extract the booking directive (if any) and return the text without the block. */
export function parseBookingDirective(content: string): {
  directive: BookingDirective | null;
  text: string;
} {
  const match = BOOKING_FENCE.exec(content);
  if (!match) {
    // Mid-stream: opening fence arrived but not the closing one yet — hide the
    // half-written block instead of showing raw JSON.
    const open = content.search(/```booking/i);
    return { directive: null, text: open === -1 ? content : content.slice(0, open).trim() };
  }

  const text = content.replace(match[0], "").trim();
  try {
    const raw = JSON.parse(match[1].trim()) as Record<string, unknown>;
    const doctorEntityId = String(raw.doctorEntityId ?? "").trim();
    const doctorUserId = String(raw.doctorUserId ?? "").trim();
    if (!doctorEntityId || !doctorUserId) return { directive: null, text };
    const date =
      typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)
        ? raw.date
        : undefined;
    const priceNum = Number(raw.price);
    return {
      directive: {
        doctorEntityId,
        doctorUserId,
        doctorName: typeof raw.doctorName === "string" ? raw.doctorName : undefined,
        price: Number.isFinite(priceNum) && priceNum > 0 ? priceNum : undefined,
        date,
        reason: typeof raw.reason === "string" ? raw.reason.trim() || undefined : undefined,
        patientInsight:
          typeof raw.patientInsight === "string"
            ? raw.patientInsight.trim() || undefined
            : undefined,
      },
      text,
    };
  } catch {
    // Malformed/partial JSON (e.g. mid-stream) — drop the block, keep the text.
    return { directive: null, text };
  }
}

// ponytail: one runnable check for the parser. Run with `npx tsx utils/assistantBooking.ts`.
if (require.main === module) {
  const ok = parseBookingDirective(
    'Sure!\n```booking\n{"doctorEntityId":"e1","doctorUserId":"u1","doctorName":"Dr X","price":50,"date":"2026-07-12"}\n```',
  );
  if (ok.directive?.doctorEntityId !== "e1" || ok.directive?.date !== "2026-07-12")
    throw new Error("parse failed");
  if (ok.text !== "Sure!") throw new Error("text not stripped");
  const none = parseBookingDirective("no block here");
  if (none.directive !== null || none.text !== "no block here")
    throw new Error("false positive");
  const partial = parseBookingDirective("Hi\n```booking\n{oops");
  if (partial.directive !== null) throw new Error("partial should be null");
  // eslint-disable-next-line no-console
  console.log("assistantBooking self-check passed");
}
