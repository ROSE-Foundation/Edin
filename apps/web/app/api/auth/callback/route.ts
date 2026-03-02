import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Frontend will exchange refresh cookie for access token via /auth/refresh.
  const dashboardUrl = new URL('/dashboard', request.url);

  return NextResponse.redirect(dashboardUrl);
}
