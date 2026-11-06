import { supportRoute } from "@/features/ofistant-support/support.service";
export const runtime = "nodejs";
export const GET = (request: Request) => supportRoute(request, false);
export const POST = (request: Request) => supportRoute(request, false);
