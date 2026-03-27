import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    redirect("/?error=github_no_code");
  }

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    redirect("/?error=github_token_failed");
  }

  // Get GitHub user profile
  const [profileRes, emailsRes] = await Promise.all([
    fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ]);

  const githubUser = await profileRes.json();
  const emails: { email: string; primary: boolean; verified: boolean }[] =
    await emailsRes.json();

  const primaryEmail =
    githubUser.email ||
    emails.find((e) => e.primary && e.verified)?.email ||
    emails[0]?.email;

  if (!primaryEmail) {
    redirect("/?error=github_no_email");
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { githubId: String(githubUser.id) },
  });

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({
      where: { email: primaryEmail },
    });

    if (existingByEmail) {
      // Link GitHub to existing email account
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          githubId: String(githubUser.id),
          name: githubUser.name ?? existingByEmail.name,
          avatarUrl: githubUser.avatar_url ?? existingByEmail.avatarUrl,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: primaryEmail,
          githubId: String(githubUser.id),
          name: githubUser.name ?? githubUser.login,
          avatarUrl: githubUser.avatar_url,
        },
      });
    }
  }

  await createSession(user.id, user.email);

  redirect("/");
}
