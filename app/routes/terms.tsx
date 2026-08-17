import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { getSettings } from "~/lib/db.server";

export const meta: MetaFunction = () => [{ title: "Terms of Service — Drea Online Fashion" }];

export async function loader({ context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const settings = await getSettings(env);
  return json({ settings });
}

export default function Terms() {
  const { settings } = useLoaderData<typeof loader>();
  return (
    <div className="container-page py-14 max-w-2xl">
      <h1 className="text-3xl mb-6">Terms of Service</h1>
      <div className="space-y-4 text-charcoal/80 leading-relaxed text-sm">
        <p>
          By placing an order with {settings.business_name}, you agree that some items may be sourced from our
          suppliers after your order is received. We will contact you to confirm availability, delivery
          details, and payment arrangements.
        </p>
        <p>Prices are listed in Trinidad & Tobago dollars (TTD) and are subject to change without notice.</p>
        <p>
          Delivery fees and timelines vary by area and are confirmed at checkout or by our team after your
          order is placed.
        </p>
        <p className="text-taupe italic">
          This is placeholder terms text. Replace it with wording reviewed for your business before launch.
        </p>
      </div>
    </div>
  );
}
