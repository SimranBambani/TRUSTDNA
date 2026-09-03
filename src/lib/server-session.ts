import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_ACCESS_TOKEN } from "@/config/constants";
import { verifyAccessToken } from "@/lib/jwt";

export async function requireServerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_ACCESS_TOKEN)?.value;
  const session = token ? await verifyAccessToken(token) : null;
  if (!session) redirect("/login");
  return session;
}