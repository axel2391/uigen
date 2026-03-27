import { redirect } from "next/navigation";

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`,
    scope: "user:email",
  });

  redirect(`https://github.com/login/oauth/authorize?${params}`);
}
