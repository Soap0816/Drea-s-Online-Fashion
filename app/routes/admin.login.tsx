import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { Form, useActionData, useSearchParams } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { findAdminByEmail, verifyPassword, createAdminSession, getAdminId, touchLastLogin } from "~/lib/auth.server";

export const meta: MetaFunction = () => [{ title: "Admin Login — Drea Online Fashion" }];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const adminId = await getAdminId(request, env);
  if (adminId) {
    throw new Response(null, { status: 302, headers: { Location: "/admin" } });
  }
  return null;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const form = await request.formData();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const redirectTo = String(form.get("redirectTo") || "/admin");

  if (!email || !password) {
    return json({ error: "Please enter your email and password." }, { status: 400 });
  }

  const admin = await findAdminByEmail(env, email);
  if (!admin) {
    return json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const valid = await verifyPassword(password, admin.password_hash);
  if (!valid) {
    return json({ error: "Incorrect email or password." }, { status: 401 });
  }

  await touchLastLogin(env, admin.id);
  return createAdminSession(env, admin.id, redirectTo.startsWith("/admin") ? redirectTo : "/admin");
}

export default function AdminLogin() {
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/admin";

  return (
    <div className="min-h-screen bg-forest flex items-center justify-center px-5">
      <div className="w-full max-w-sm bg-ivory p-8">
        <p className="font-display text-2xl text-center mb-1">Drea Online Fashion</p>
        <p className="text-center text-taupe text-sm mb-8">Admin Login</p>

        <Form method="post" className="space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <div>
            <label htmlFor="email" className="block text-sm mb-1.5">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm mb-1.5">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest"
            />
          </div>

          {actionData?.error && <p className="text-sm text-error">{actionData.error}</p>}

          <button type="submit" className="btn-primary w-full">Log In</button>
        </Form>
      </div>
    </div>
  );
}
