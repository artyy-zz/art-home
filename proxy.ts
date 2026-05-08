import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const startedAt = performance.now();
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/(sq|en)\/admin(?:\/.*)?$/);

  if (!match) {
    console.log(
      `[PERF] proxy ${Math.round((performance.now() - startedAt) * 10) / 10}ms path=${pathname} matched=false`,
    );
    return NextResponse.next();
  }

  const locale = match[1];
  const hasSession = Boolean(request.cookies.get("arthome_session")?.value);

  if (!hasSession) {
    console.log(
      `[PERF] proxy ${Math.round((performance.now() - startedAt) * 10) / 10}ms path=${pathname} matched=true redirect=true`,
    );
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  console.log(
    `[PERF] proxy ${Math.round((performance.now() - startedAt) * 10) / 10}ms path=${pathname} matched=true redirect=false`,
  );
  return NextResponse.next();
}

export const config = {
  matcher: ["/(sq|en)/admin/:path*"],
};
