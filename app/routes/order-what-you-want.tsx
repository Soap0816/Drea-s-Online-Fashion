import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { useMemo, useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { getSettings } from "~/lib/db.server";
import { createCustomOrder, type CustomOrderInput } from "~/lib/custom-orders.server";
import { notifyNewCustomOrder } from "~/lib/notifications.server";
import { quoteDelivery } from "~/lib/delivery.server";
import { formatMoney, dollarsToCents } from "~/lib/money";
import { LOCATION_TIER_LABELS, SHIPMENT_SIZE_LABELS, type LocationTier, type ShipmentSize } from "~/lib/types";

export const meta: MetaFunction = () => [
  { title: "Order What You Want — Drea Online Fashion" },
  {
    name: "description",
    content: "Want something from Fashion Nova, Amazon, or another site? Send us the link and we'll order it for you.",
  },
];

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash on Delivery / Pickup",
  card: "Card (we'll send you a secure payment link)",
  bank_transfer: "Bank Transfer",
};

export async function loader({ context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const settings = await getSettings(env);
  return json({ settings });
}

interface CustomFieldErrors {
  itemDescription?: string;
  customerName?: string;
  phone?: string;
  address?: string;
  communityArea?: string;
  cityTown?: string;
  locationTier?: string;
  shipmentSize?: string;
  paymentMethod?: string;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const form = await request.formData();

  const input: CustomOrderInput = {
    itemDescription: String(form.get("itemDescription") || "").trim(),
    itemLink: String(form.get("itemLink") || "").trim(),
    referenceNotes: String(form.get("referenceNotes") || "").trim(),
    estimatedBudgetCents: form.get("estimatedBudget") ? dollarsToCents(Number(form.get("estimatedBudget"))) : undefined,
    quantity: Math.max(1, Number(form.get("quantity")) || 1),
    customerName: String(form.get("customerName") || "").trim(),
    phone: String(form.get("phone") || "").trim(),
    email: String(form.get("email") || "").trim(),
    whatsapp: String(form.get("whatsapp") || "").trim(),
    deliveryMethod: (form.get("deliveryMethod") as CustomOrderInput["deliveryMethod"]) || "local_delivery",
    address: String(form.get("address") || "").trim(),
    communityArea: String(form.get("communityArea") || "").trim(),
    cityTown: String(form.get("cityTown") || "").trim(),
    deliveryInstructions: String(form.get("deliveryInstructions") || "").trim(),
    locationTier: (form.get("locationTier") as LocationTier) || undefined,
    shipmentSize: (form.get("shipmentSize") as ShipmentSize) || undefined,
    paymentMethod: String(form.get("paymentMethod") || "cash"),
  };

  const errors: CustomFieldErrors = {};
  if (!input.itemDescription) errors.itemDescription = "Please describe what you'd like us to order.";
  if (!input.customerName) errors.customerName = "Please enter your full name.";
  if (!input.phone) errors.phone = "Please enter a phone number.";

  if (input.deliveryMethod === "local_delivery") {
    if (!input.address) errors.address = "Please enter your delivery address.";
    if (!input.communityArea) errors.communityArea = "Please enter your community or area.";
    if (!input.cityTown) errors.cityTown = "Please enter your city or town.";
    if (!input.locationTier) errors.locationTier = "Please select your delivery area.";
    if (!input.shipmentSize) errors.shipmentSize = "Please select a parcel size.";
  }

  const settings = await getSettings(env);
  if (!settings.payment_methods_enabled.includes(input.paymentMethod)) {
    errors.paymentMethod = "Please choose a valid payment method.";
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors, values: input }, { status: 400 });
  }

  const { orderNumber } = await createCustomOrder(env, input);

  await notifyNewCustomOrder(
    env,
    {
      order_number: orderNumber,
      customer_name: input.customerName,
      phone: input.phone,
      item_description: input.itemDescription,
      item_link: input.itemLink,
      quantity: input.quantity,
      estimated_budget_cents: input.estimatedBudgetCents,
      payment_method: input.paymentMethod,
    },
    settings.currency_symbol,
    env.SITE_URL || "https://dreaonlinefashion.com",
    settings.contact_email
  );

  return redirect(`/order-what-you-want/confirmation/${orderNumber}`);
}

export default function OrderWhatYouWant() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const errors = actionData?.errors ?? {};
  const values = actionData?.values;

  const [deliveryMethod, setDeliveryMethod] = useState<"local_delivery" | "pickup">(
    values?.deliveryMethod === "pickup" ? "pickup" : "local_delivery"
  );
  const [locationTier, setLocationTier] = useState<LocationTier | "">(values?.locationTier ?? "");
  const [shipmentSize, setShipmentSize] = useState<ShipmentSize | "">(values?.shipmentSize ?? "small");
  const [paymentMethod, setPaymentMethod] = useState(values?.paymentMethod || settings.payment_methods_enabled[0] || "cash");

  const estimatedDeliveryFee = useMemo(
    () =>
      quoteDelivery(settings, {
        deliveryMethod,
        locationTier: (locationTier || undefined) as LocationTier | undefined,
        shipmentSize: (shipmentSize || undefined) as ShipmentSize | undefined,
        paymentMethod,
        subtotalCents: 0,
      }),
    [settings, deliveryMethod, locationTier, shipmentSize, paymentMethod]
  );

  return (
    <div className="container-page py-10 max-w-3xl">
      <p className="eyebrow mb-3">Not Just Our Catalog</p>
      <h1 className="text-3xl sm:text-4xl mb-3">Order What You Want</h1>
      <p className="text-taupe mb-8 max-w-xl">
        Seen something on Fashion Nova, Amazon, or anywhere else you'd like us to pick up for you? Send us the
        details below and we'll take care of sourcing it.
      </p>

      <Form method="post" className="space-y-10">
        <section>
          <p className="eyebrow mb-4">What Do You Want?</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5" htmlFor="itemDescription">Item Description *</label>
              <textarea
                id="itemDescription"
                name="itemDescription"
                required
                rows={3}
                defaultValue={values?.itemDescription}
                placeholder="e.g. Fashion Nova 'Snatched' bodysuit, black, size M"
                className={`w-full border px-3 py-2.5 text-sm focus:border-forest ${errors.itemDescription ? "border-error" : "border-line"}`}
              />
              {errors.itemDescription && <p className="text-xs text-error mt-1">{errors.itemDescription}</p>}
            </div>
            <div>
              <label className="block text-sm mb-1.5" htmlFor="itemLink">Product Link (optional)</label>
              <input
                id="itemLink"
                name="itemLink"
                type="url"
                defaultValue={values?.itemLink}
                placeholder="https://..."
                className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1.5" htmlFor="quantity">Quantity</label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min={1}
                  defaultValue={1}
                  className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest"
                />
              </div>
              <div>
                <label className="block text-sm mb-1.5" htmlFor="estimatedBudget">
                  Estimated Price ({settings.currency_symbol}, optional)
                </label>
                <input
                  id="estimatedBudget"
                  name="estimatedBudget"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Not sure? Leave blank"
                  className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1.5" htmlFor="referenceNotes">Size / Colour / Other Notes</label>
              <textarea
                id="referenceNotes"
                name="referenceNotes"
                rows={2}
                defaultValue={values?.referenceNotes}
                className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest"
              />
            </div>
          </div>
        </section>

        <section>
          <p className="eyebrow mb-4">Your Information</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1.5" htmlFor="customerName">Full Name *</label>
              <input
                id="customerName"
                name="customerName"
                required
                defaultValue={values?.customerName}
                className={`w-full border px-3 py-2.5 text-sm focus:border-forest ${errors.customerName ? "border-error" : "border-line"}`}
              />
              {errors.customerName && <p className="text-xs text-error mt-1">{errors.customerName}</p>}
            </div>
            <div>
              <label className="block text-sm mb-1.5" htmlFor="phone">Phone Number *</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                defaultValue={values?.phone}
                className={`w-full border px-3 py-2.5 text-sm focus:border-forest ${errors.phone ? "border-error" : "border-line"}`}
              />
              {errors.phone && <p className="text-xs text-error mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-sm mb-1.5" htmlFor="email">Email (optional)</label>
              <input id="email" name="email" type="email" defaultValue={values?.email} className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest" />
            </div>
            <div>
              <label className="block text-sm mb-1.5" htmlFor="whatsapp">WhatsApp Number (optional)</label>
              <input id="whatsapp" name="whatsapp" type="tel" defaultValue={values?.whatsapp} className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest" />
            </div>
          </div>
        </section>

        <section>
          <p className="eyebrow mb-4">Delivery Information</p>
          <div className="flex gap-3 mb-4">
            <label className="flex-1 border border-line px-4 py-3 flex items-center gap-2 cursor-pointer has-[:checked]:border-forest">
              <input
                type="radio"
                name="deliveryMethod"
                value="local_delivery"
                checked={deliveryMethod === "local_delivery"}
                onChange={() => setDeliveryMethod("local_delivery")}
              />
              <span className="text-sm">Local Delivery (oDeliver)</span>
            </label>
            <label className="flex-1 border border-line px-4 py-3 flex items-center gap-2 cursor-pointer has-[:checked]:border-forest">
              <input
                type="radio"
                name="deliveryMethod"
                value="pickup"
                checked={deliveryMethod === "pickup"}
                onChange={() => setDeliveryMethod("pickup")}
              />
              <span className="text-sm">Pickup</span>
            </label>
          </div>

          {deliveryMethod === "local_delivery" && (
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-1.5" htmlFor="locationTier">Delivery Area *</label>
                <select
                  id="locationTier"
                  name="locationTier"
                  required
                  value={locationTier}
                  onChange={(e) => setLocationTier(e.target.value as LocationTier)}
                  className={`w-full border px-3 py-2.5 text-sm bg-surface focus:border-forest ${errors.locationTier ? "border-error" : "border-line"}`}
                >
                  <option value="">Select your area</option>
                  {Object.entries(LOCATION_TIER_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {errors.locationTier && <p className="text-xs text-error mt-1">{errors.locationTier}</p>}
              </div>
              <div>
                <label className="block text-sm mb-1.5" htmlFor="shipmentSize">Parcel Size *</label>
                <select
                  id="shipmentSize"
                  name="shipmentSize"
                  required
                  value={shipmentSize}
                  onChange={(e) => setShipmentSize(e.target.value as ShipmentSize)}
                  className={`w-full border px-3 py-2.5 text-sm bg-surface focus:border-forest ${errors.shipmentSize ? "border-error" : "border-line"}`}
                >
                  {Object.entries(SHIPMENT_SIZE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {errors.shipmentSize && <p className="text-xs text-error mt-1">{errors.shipmentSize}</p>}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1.5" htmlFor="address">Address</label>
              <input id="address" name="address" defaultValue={values?.address} className={`w-full border px-3 py-2.5 text-sm focus:border-forest ${errors.address ? "border-error" : "border-line"}`} />
              {errors.address && <p className="text-xs text-error mt-1">{errors.address}</p>}
            </div>
            <div>
              <label className="block text-sm mb-1.5" htmlFor="communityArea">Community / Area</label>
              <input id="communityArea" name="communityArea" defaultValue={values?.communityArea} className={`w-full border px-3 py-2.5 text-sm focus:border-forest ${errors.communityArea ? "border-error" : "border-line"}`} />
              {errors.communityArea && <p className="text-xs text-error mt-1">{errors.communityArea}</p>}
            </div>
            <div>
              <label className="block text-sm mb-1.5" htmlFor="cityTown">City / Town</label>
              <input id="cityTown" name="cityTown" defaultValue={values?.cityTown} className={`w-full border px-3 py-2.5 text-sm focus:border-forest ${errors.cityTown ? "border-error" : "border-line"}`} />
              {errors.cityTown && <p className="text-xs text-error mt-1">{errors.cityTown}</p>}
            </div>
          </div>

          {deliveryMethod === "local_delivery" && locationTier && (
            <p className="text-xs text-taupe mt-3">
              Estimated oDeliver fee for this area/size: {formatMoney(estimatedDeliveryFee.deliveryFeeCents, settings.currency_symbol)}.
              Final delivery cost depends on the item once we source it and will be confirmed with you.
            </p>
          )}
        </section>

        <section>
          <p className="eyebrow mb-4">Payment Method</p>
          <div className="space-y-2">
            {settings.payment_methods_enabled.map((method) => (
              <label key={method} className="flex items-center gap-3 border border-line px-4 py-3 cursor-pointer has-[:checked]:border-forest">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method}
                  checked={paymentMethod === method}
                  onChange={() => setPaymentMethod(method)}
                />
                <span className="text-sm">{PAYMENT_LABELS[method] ?? method}</span>
              </label>
            ))}
          </div>
          {errors.paymentMethod && <p className="text-xs text-error mt-2">{errors.paymentMethod}</p>}
          {paymentMethod === "card" && (
            <p className="text-xs text-taupe mt-2">
              We don't collect card details on this site. Once we've confirmed pricing for your item, we'll send
              you a secure payment link.
            </p>
          )}
        </section>

        <div>
          <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </button>
          <p className="text-xs text-taupe mt-3">
            We'll review your request, confirm pricing and availability, and follow up by phone or WhatsApp before
            ordering anything.
          </p>
        </div>
      </Form>
    </div>
  );
}
