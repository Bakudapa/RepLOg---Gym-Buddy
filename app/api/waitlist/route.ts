import { handleWriteRequest } from "@/lib/api/write-request";
import { errorResponse, jsonResponse } from "@/lib/http";
import { waitlistSchema } from "@/lib/validation/schemas";

const UNIQUE_VIOLATION = "23505";

export async function POST(request: Request) {
  const result = await handleWriteRequest(request, {
    action: "waitlist",
    schema: waitlistSchema,
  });
  if (!result.ok) return result.response;

  const { email, website } = result.data;

  // Honeypot filled: pretend it worked, store nothing.
  if (website) return jsonResponse({ ok: true }, 201);

  const { error } = await result.db.from("waitlist").insert({ email });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return errorResponse("ALREADY_REGISTERED");
    console.error("[waitlist] insert failed:", error.code);
    return errorResponse("INTERNAL_ERROR");
  }

  return jsonResponse({ ok: true }, 201);
}
