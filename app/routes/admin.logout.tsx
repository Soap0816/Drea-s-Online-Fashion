import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import type { Env } from "~/lib/env.server";
import { destroyAdminSession } from "~/lib/auth.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  return destroyAdminSession(request, env);
}
