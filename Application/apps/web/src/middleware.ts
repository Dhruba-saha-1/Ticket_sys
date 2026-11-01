import { NextResponse } from 'next/server';

// Pass-through for now. The anonymous → /login redirect lands with the web screens.
export function middleware() {
  return NextResponse.next();
}
