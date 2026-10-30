import "server-only";
import { headers } from "next/headers";
import { getClientIp } from "@/lib/rate-limit";

/** Client IP for Server Actions, where there is no Request object. */
export async function getRequestIp(): Promise<string> {
  return getClientIp(await headers());
}
