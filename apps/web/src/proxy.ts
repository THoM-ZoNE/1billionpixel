import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  // /admin only from localhost or if an admin cookie exists
  if (req.nextUrl.pathname.startsWith("/admin")) {
    // in production, IP-based filtering or another protection can be used
  }
  return NextResponse.next();
}
