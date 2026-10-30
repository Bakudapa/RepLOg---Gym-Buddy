import { handleWriteRequest } from "@/lib/api/write-request";
import { errorResponse, jsonResponse } from "@/lib/http";
import { feedbackSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const result = await handleWriteRequest(request, {
    action: "feedback",
    schema: feedbackSchema,
  });
  if (!result.ok) return result.response;

  const { category, message, email, website } = result.data;

  // Honeypot filled: pretend it worked, store nothing.
  if (website) return jsonResponse({ ok: true }, 201);

  const { error } = await result.db
    .from("feedback")
    .insert({ category, message, email: email ?? null });
  if (error) {
    console.error("[feedback] insert failed:", error.code);
    return errorResponse("INTERNAL_ERROR");
  }

  return jsonResponse({ ok: true }, 201);
}
