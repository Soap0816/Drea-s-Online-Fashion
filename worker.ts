import { createRequestHandler } from "@remix-run/cloudflare";
import * as build from "./build/server";
import type { Env } from "./app/lib/env.server";

const handleRequest = createRequestHandler(build, "production");

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return handleRequest(request, {
      cloudflare: {
        env,
        ctx,
        cf: request.cf,
      },
    });
  },
};
