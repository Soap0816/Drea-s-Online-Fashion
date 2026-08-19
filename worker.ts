import { createRequestHandler } from "@remix-run/cloudflare";
import * as build from "./build/server";

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
