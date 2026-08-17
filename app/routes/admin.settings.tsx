import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { requireAdmin } from "~/lib/auth.server";
import { upsertSettings } from "~/lib/admin-db.server";
import { getSettings } from "~/lib/db.server";
import { LOCATION_TIER_LABELS, SHIPMENT_SIZE_LABELS, type LocationTier, type ShipmentSize, type CourierAccountType } from "~/lib/types";

export const meta: MetaFunction = () => [{ title: "Settings — Drea Admin" }];

const ALL_PAYMENT_METHODS = [
  { value: "cash", label: "Cash (on delivery / pickup)" },
  { value: "card", label: "Card (secure payment link sent after ordering)" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);
  const settings = await getSettings(env);
  return json({ settings });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);
  const form = await request.formData();

  const paymentMethods = form.getAll("paymentMethods").map(String);

  const deliveryRates: Record<string, Record<string, Record<string, number>>> = { standard: {}, corporate: {} };
  for (const account of ["standard", "corporate"] as CourierAccountType[]) {
    deliveryRates[account] = {};
    for (const tier of Object.keys(LOCATION_TIER_LABELS)) {
      deliveryRates[account][tier] = {};
      for (const size of Object.keys(SHIPMENT_SIZE_LABELS)) {
        const raw = form.get(`rate__${account}__${tier}__${size}`);
        deliveryRates[account][tier][size] = Math.round(Number(raw || 0) * 100);
      }
    }
  }

  await upsertSettings(env, {
    business_name: String(form.get("business_name") || "").trim(),
    instagram_handle: String(form.get("instagram_handle") || "").trim(),
    whatsapp_number: String(form.get("whatsapp_number") || "").trim(),
    contact_email: String(form.get("contact_email") || "").trim(),
    business_description: String(form.get("business_description") || "").trim(),
    checkout_notice: String(form.get("checkout_notice") || "").trim(),
    delivery_fee_pickup: String(Math.round(Number(form.get("delivery_fee_pickup") || 0) * 100)),
    payment_methods_enabled: paymentMethods.join(","),
    courier_account_type: String(form.get("courier_account_type") || "standard"),
    cod_surcharge_percent: String(form.get("cod_surcharge_percent") || "3"),
    delivery_rates_json: JSON.stringify(deliveryRates),
  });

  return json({ saved: true });
}

export default function AdminSettings() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl mb-6">Settings</h1>

      {actionData?.saved && (
        <p className="mb-6 text-sm bg-forest/10 text-forest-dark px-4 py-2.5 max-w-2xl">Settings saved.</p>
      )}

      <Form method="post" className="space-y-12 max-w-3xl">
        <section>
          <p className="eyebrow mb-4">Business Info</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <FieldText label="Business Name" name="business_name" defaultValue={settings.business_name} />
            <FieldText label="Instagram Handle" name="instagram_handle" defaultValue={settings.instagram_handle} />
            <FieldText label="WhatsApp Number" name="whatsapp_number" defaultValue={settings.whatsapp_number} placeholder="e.g. 18681234567" />
            <FieldText label="Contact Email" name="contact_email" defaultValue={settings.contact_email} type="email" />
          </div>
          <div className="mt-4">
            <label className="block text-sm mb-1.5" htmlFor="business_description">Tagline / Description</label>
            <textarea
              id="business_description"
              name="business_description"
              rows={2}
              defaultValue={settings.business_description}
              className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest"
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm mb-1.5" htmlFor="checkout_notice">Checkout Notice</label>
            <textarea
              id="checkout_notice"
              name="checkout_notice"
              rows={2}
              defaultValue={settings.checkout_notice}
              className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest"
            />
            <p className="text-xs text-taupe mt-1.5">Shown on the product page and at checkout.</p>
          </div>
        </section>

        <section>
          <p className="eyebrow mb-4">Payment Methods</p>
          <div className="space-y-2">
            {ALL_PAYMENT_METHODS.map((method) => (
              <label key={method.value} className="flex items-center gap-3 border border-line px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="paymentMethods"
                  value={method.value}
                  defaultChecked={settings.payment_methods_enabled.includes(method.value)}
                />
                <span className="text-sm">{method.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-taupe mt-2">
            Card payments never collect card details on this site — customers are sent a secure payment link
            after ordering.
          </p>
        </section>

        <section>
          <p className="eyebrow mb-4">oDeliver Courier Settings</p>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm mb-1.5" htmlFor="courier_account_type">Account Type</label>
              <select
                id="courier_account_type"
                name="courier_account_type"
                defaultValue={settings.courier_account_type}
                className="w-full border border-line px-3 py-2.5 text-sm bg-surface focus:border-forest"
              >
                <option value="standard">Standard</option>
                <option value="corporate">Corporate</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1.5" htmlFor="cod_surcharge_percent">
                Cash-on-Delivery Service Charge (%)
              </label>
              <input
                id="cod_surcharge_percent"
                name="cod_surcharge_percent"
                type="number"
                step="0.1"
                min="0"
                defaultValue={settings.cod_surcharge_percent}
                className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest"
              />
              <p className="text-xs text-taupe mt-1.5">Only applied on Standard-account cash orders, per oDeliver's terms.</p>
            </div>
            <div>
              <label className="block text-sm mb-1.5" htmlFor="delivery_fee_pickup">Pickup Fee ({settings.currency_symbol})</label>
              <input
                id="delivery_fee_pickup"
                name="delivery_fee_pickup"
                type="number"
                step="0.01"
                min="0"
                defaultValue={(settings.delivery_fee_pickup / 100).toFixed(2)}
                className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest"
              />
            </div>
          </div>

          <p className="text-sm mb-3">Base Delivery Rates ({settings.currency_symbol})</p>
          {(["standard", "corporate"] as CourierAccountType[]).map((account) => (
            <div key={account} className="mb-6">
              <p className="text-xs uppercase tracking-wide text-taupe mb-2">{account}</p>
              <div className="overflow-x-auto border border-line">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-line/40">
                      <th className="text-left px-3 py-2 font-medium">Location Tier</th>
                      {Object.entries(SHIPMENT_SIZE_LABELS).map(([size, label]) => (
                        <th key={size} className="text-left px-3 py-2 font-medium">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {Object.entries(LOCATION_TIER_LABELS).map(([tier, tierLabel]) => (
                      <tr key={tier}>
                        <td className="px-3 py-2">{tierLabel}</td>
                        {Object.keys(SHIPMENT_SIZE_LABELS).map((size) => (
                          <td key={size} className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              name={`rate__${account}__${tier}__${size}`}
                              defaultValue={(
                                (settings.delivery_rates[account]?.[tier as LocationTier]?.[size as ShipmentSize] ?? 0) / 100
                              ).toFixed(2)}
                              className="w-20 border border-line px-2 py-1.5 text-xs"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>

        <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">
          {isSubmitting ? "Saving..." : "Save Settings"}
        </button>
      </Form>
    </div>
  );
}

function FieldText({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm mb-1.5" htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest"
      />
    </div>
  );
}
