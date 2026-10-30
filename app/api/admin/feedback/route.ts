import { handleAdminListRequest, PAGE_SIZE, pageRange } from "@/lib/api/admin-list";
import { errorResponse, jsonResponse } from "@/lib/http";

export async function GET(request: Request) {
  const result = await handleAdminListRequest(request);
  if (!result.ok) return result.response;

  const { page, category } = result.query;
  const { from, to } = pageRange(page);

  // Session client (not service role): RLS only returns rows to admins.
  let query = result.admin.supabase
    .from("feedback")
    .select("id, category, message, email, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (category) query = query.eq("category", category);

  const { data, count, error } = await query;
  // PostgREST answers PGRST103 when the page is past the end: return an empty page.
  if (error?.code === "PGRST103") {
    let countQuery = result.admin.supabase
      .from("feedback")
      .select("id", { count: "exact", head: true });
    if (category) countQuery = countQuery.eq("category", category);
    const { count: total } = await countQuery;
    return jsonResponse({ data: [], page, pageSize: PAGE_SIZE, total: total ?? 0 });
  }
  if (error) {
    console.error("[admin/feedback] query failed:", error.code);
    return errorResponse("INTERNAL_ERROR");
  }

  return jsonResponse({ data: data ?? [], page, pageSize: PAGE_SIZE, total: count ?? 0 });
}
