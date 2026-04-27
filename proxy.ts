import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/(sq|en)\/admin(?:\/.*)?$/);

  if (!match) {
    return NextResponse.next();
  }

  const locale = match[1];
  const hasSession = Boolean(request.cookies.get("arthome_session")?.value);

  if (!hasSession) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/(sq|en)/admin/:path*"],
};
