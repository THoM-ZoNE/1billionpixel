import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // /admin csak localhost-ról vagy ha van admin cookie
  if (req.nextUrl.pathname.startsWith("/admin")) {
    // production-ban IP alapú szűrés vagy más védelem jöhet
  }
  return NextResponse.next();
}
