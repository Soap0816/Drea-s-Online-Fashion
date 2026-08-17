import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { getSettings } from "~/lib/db.server";

export const meta: MetaFunction = () => [{ title: "Privacy Policy — Drea Online Fashion" }];

export async function loader({ context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const settings = await getSettings(env);
  return json({ settings });
}

export default function Privacy() {
  const { settings } = useLoaderData<typeof loader>();
  return (
    <div className="container-page py-14 max-w-2xl">
      <h1 className="text-3xl mb-6">Privacy Policy</h1>
      <div className="space-y-4 text-charcoal/80 leading-relaxed text-sm">
        <p>
          {settings.business_name} collects the information you provide at checkout — your name, phone
          number, email, WhatsApp number, and delivery address — solely to process and deliver your order.
        </p>
        <p>
          We do not sell or share your personal information with third parties, other than services strictly
          necessary to fulfil your order (such as delivery).
        </p>
        <p>
          Order details are retained so we can assist with questions about past orders. If you would like your
          information removed, contact us using the details in the footer.
        </p>
        <p className="text-taupe italic">
          This is placeholder policy text. Replace it with wording reviewed for your business before launch.
        </p>
      </div>
    </div>
  );
}
