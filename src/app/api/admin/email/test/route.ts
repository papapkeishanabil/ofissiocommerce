import { POST as emailTestPost } from "@/app/api/email/test/route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return emailTestPost(request);
}
