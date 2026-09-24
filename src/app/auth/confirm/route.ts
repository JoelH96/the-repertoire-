import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sign-in links land here. The email template (see README) links with a token hash, which
// works in whichever browser opens the link. Links from the default template carry a code
// instead, which only works in the browser that requested it; both are accepted so the
// template and the app can be updated in either order.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const supabase = await createClient();

  let error: { message: string } | null = null;
  if (tokenHash) {
    const type = (searchParams.get("type") ?? "email") as EmailOtpType;
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    error = { message: searchParams.get("error_description") ?? "no token in link" };
  }

  if (!error) return NextResponse.redirect(`${origin}/`);
  console.error("Sign-in link failed:", error.message);
  return NextResponse.redirect(`${origin}/login?error=link`);
}
