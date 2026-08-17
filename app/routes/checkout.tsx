import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { useMemo, useState } from "react";
import { Form, Link, useLoaderData, useActionData, useNavigation } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { getCart, serializeCart } from "~/lib/cart.server";
import { resolveCart } from "~/lib/cart-resolve.server";
import { getSettings } from "~/lib/db.server";
import { createOrder, type CheckoutInput } from "~/lib/orders.server";
import { quoteDelivery } from "~/lib/delivery.server";
import { notifyNewOrder } from "~/lib/notifications.server";
import { formatMoney } from "~/lib/money";
import { LOCATION_TIER_LABELS, SHIPMENT_SIZE_LABELS, type LocationTier, type ShipmentSize } from "~/lib/types";

export const meta: MetaFunction = () => [{ title: "Checkout — Drea Online Fashion" }];

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash on Delivery / Pickup",
  card: "Card (we'll send you a secure payment link)",
  bank_transfer: "Bank Transfer",
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const cart = await getCart(request);
  const [resolved, settings] = await Promise.all([resolveCart(env, cart), getSettings(env)]);

  if (resolved.lines.length === 0 || resolved.hasUnavailableItems) {
    throw redirect("/cart");
  }

  return json({ resolved, settings });
}

type FieldErrors = Partial<Record<keyof CheckoutInput, string>>;

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const cart = await getCart(request);
  const resolved = await resolveCart(env, cart);

  if (resolved.lines.length === 0 || resolved.hasUnavailableItems) {
    throw redirect("/cart");
  }

  const form = await request.formData();
  const input: CheckoutInput = {
    customerName: String(form.get("customerName") || "").trim(),
    phone: String(form.get("phone") || "").trim(),
    email: String(form.get("email") || "").trim(),
    whatsapp: String(form.get("whatsapp") || "").trim(),
    deliveryMethod: (form.get("deliveryMethod") as CheckoutInput["deliveryMethod"]) || "local_delivery",
    address: String(form.get("address") || "").trim(),
    communityArea: String(form.get("communityArea") || "").trim(),
    cityTown: String(form.get("cityTown") || "").trim(),
    deliveryInstructions: String(form.get("deliveryInstructions") || "").trim(),
    locationTier: (form.get("locationTier") as LocationTier) || undefined,
    shipmentSize: (form.get("shipmentSize") as ShipmentSize) || undefined,
    paymentMethod: String(form.get("paymentMethod") || "cash"),
    customerNotes: String(form.get("customerNotes") || "").trim(),
  };

  const errors: FieldErrors = {};
  if (!input.customerName) errors.customerName = "Please enter your full name.";
  if (!input.phone) errors.phone = "Please enter a phone number.";
  if (!input.deliveryMethod) errors.deliveryMethod = "Please choose a delivery method.";

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

  const quote = quoteDelivery(settings, {
    deliveryMethod: input.deliveryMethod,
    locationTier: input.locationTier,
    shipmentSize: input.shipmentSize,
    paymentMethod: input.paymentMethod,
    subtotalCents: resolved.subtotalCents,
  });

  const { orderNumber } = await createOrder(env, input, resolved.lines, quote.deliveryFeeCents, quote.codSurchargeCents);

  const itemsSummary = resolved.lines
    .map((l) => `${l.name} (${l.size}${l.colour ? `/${l.colour}` : ""}) x${l.quantity}${l.isPreorder ? " [PRE-ORDER]" : ""}`)
    .join("\n");

  await notifyNewOrder(
    env,
    {
      order_number: orderNumber,
      customer_name: input.customerName,
      phone: input.phone,
      delivery_method: input.deliveryMethod,
      address: input.address,
      community_area: input.communityArea,
      city_town: input.cityTown,
      total_cents: quote.totalWithDeliveryCents,
      payment_method: input.paymentMethod,
      status: "new",
    },
    itemsSummary,
    settings.currency_symbol,
    env.SITE_URL || "https://dreaonlinefashion.com",
    settings.contact_email
  );

  return redirect(`/order-confirmation/${orderNumber}`, {
    headers: { "Set-Cookie": await serializeCart([]) },
  });
}

export default function Checkout() {
  const { resolved, settings } = useLoaderData<typeof loader>();
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

  const quote = useMemo(
    () =>
      quoteDelivery(settings, {
        deliveryMethod,
        locationTier: (locationTier || undefined) as LocationTier | undefined,
        shipmentSize: (shipmentSize || undefined) as ShipmentSize | undefined,
        paymentMethod,
        subtotalCents: resolved.subtotalCents,
      }),
    [settings, deliveryMethod, locationTier, shipmentSize, paymentMethod, resolved.subtotalCents]
  );

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl sm:text-4xl mb-8">Checkout</h1>

      <Form method="post" className="grid lg:grid-cols-[1fr_360px] gap-10">
        <div className="space-y-10">
          <section>
            <p className="eyebrow mb-4">Customer Information</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full Name" name="customerName" required error={errors.customerName} defaultValue={values?.customerName} autoComplete="name" />
              <Field label="Phone Number" name="phone" required error={errors.phone} defaultValue={values?.phone} type="tel" autoComplete="tel" />
              <Field label="Email (optional)" name="email" error={errors.email} defaultValue={values?.email} type="email" autoComplete="email" />
              <Field label="WhatsApp Number (optional)" name="whatsapp" error={errors.whatsapp} defaultValue={values?.whatsapp} type="tel" />
            </div>
          </section>

          <section>
            <p className="eyebrow mb-4">Delivery Information</p>
            <fieldset className="mb-4">
              <legend className="text-sm mb-2">Delivery Method</legend>
              <div className="flex gap-3">
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
            </fieldset>

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
                  <p className="text-xs text-taupe mt-1.5">Not sure which area? We'll confirm and adjust if needed.</p>
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
                  <p className="text-xs text-taupe mt-1.5">Small fits most single items; choose Medium for bulkier or multi-item orders.</p>
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Address" name="address" error={errors.address} defaultValue={values?.address} className="sm:col-span-2" />
              <Field label="Community / Area" name="communityArea" error={errors.communityArea} defaultValue={values?.communityArea} />
              <Field label="City / Town" name="cityTown" error={errors.cityTown} defaultValue={values?.cityTown} />
              <div className="sm:col-span-2">
                <label className="block text-sm mb-1.5" htmlFor="deliveryInstructions">
                  Additional Instructions (optional)
                </label>
                <textarea
                  id="deliveryInstructions"
                  name="deliveryInstructions"
                  rows={3}
                  defaultValue={values?.deliveryInstructions}
                  className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest"
                />
              </div>
            </div>
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
            {paymentMethod === "cash" && deliveryMethod === "local_delivery" && quote.codSurchargeCents > 0 && (
              <p className="text-xs text-taupe mt-2">
                A {settings.cod_surcharge_percent}% cash-on-delivery service charge applies to Standard-account
                oDeliver deliveries paid in cash.
              </p>
            )}
            {paymentMethod === "card" && (
              <p className="text-xs text-taupe mt-2">
                We don't collect card details on this site. After you place your order, we'll send you a secure
                payment link to complete payment by card.
              </p>
            )}
          </section>

          <section>
            <label className="block text-sm mb-1.5" htmlFor="customerNotes">
              Order Notes (optional)
            </label>
            <textarea
              id="customerNotes"
              name="customerNotes"
              rows={3}
              defaultValue={values?.customerNotes}
              placeholder="Anything else we should know about your order?"
              className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest"
            />
          </section>
        </div>

        <div className="lg:sticky lg:top-24 h-fit border border-line p-6">
          <p className="eyebrow mb-4">Order Summary</p>
          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {resolved.lines.map((line) => (
              <div key={`${line.productId}-${line.size}-${line.colour}`} className="flex justify-between text-sm">
                <span className="text-charcoal/80">
                  {line.name} ({line.size}{line.colour ? `/${line.colour}` : ""}) &times;{line.quantity}
                  {line.isPreorder && <span className="text-brass-dark"> · Pre-Order</span>}
                </span>
                <span className="whitespace-nowrap ml-2">{formatMoney(line.lineTotalCents, settings.currency_symbol)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-line pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-taupe">Subtotal</span>
              <span>{formatMoney(resolved.subtotalCents, settings.currency_symbol)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-taupe">Delivery Fee (oDeliver)</span>
              <span>{formatMoney(quote.deliveryFeeCents, settings.currency_symbol)}</span>
            </div>
            {quote.codSurchargeCents > 0 && (
              <div className="flex justify-between">
                <span className="text-taupe">COD Service Charge ({settings.cod_surcharge_percent}%)</span>
                <span>{formatMoney(quote.codSurchargeCents, settings.currency_symbol)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold border-t border-line pt-3 mt-1">
              <span>Total</span>
              <span>{formatMoney(quote.totalWithDeliveryCents, settings.currency_symbol)}</span>
            </div>
          </div>

          <p className="text-xs text-charcoal/70 border-t border-line mt-4 pt-4 mb-4">{settings.checkout_notice}</p>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:opacity-60">
            {isSubmitting ? "Placing Order..." : "Place Order"}
          </button>
          <Link to="/cart" className="block text-center text-xs text-taupe mt-3 hover:text-forest">
            Back to cart
          </Link>
        </div>
      </Form>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  error,
  defaultValue,
  type = "text",
  autoComplete,
  className = "",
}: {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  defaultValue?: string;
  type?: string;
  autoComplete?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm mb-1.5" htmlFor={name}>
        {label} {required && <span className="text-error">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        className={`w-full border px-3 py-2.5 text-sm focus:border-forest ${error ? "border-error" : "border-line"}`}
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
}
