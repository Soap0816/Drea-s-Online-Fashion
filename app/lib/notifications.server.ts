import type { Env } from "./env.server";
import { formatMoney } from "./money";

/**
 * Sends order notifications to Discord via an incoming webhook.
 * Nothing fails the checkout if this errors — a Discord outage should
 * never block a customer from placing an order. Set the webhook with:
 *   wrangler pages secret put DISCORD_WEBHOOK_URL
 * (Never hard-code it — a webhook URL in source lets anyone post to your
 * channel.) The architecture here is deliberately pluggable so email or
 * WhatsApp notifications (Part 4) can be added as siblings to this
 * function without touching call sites.
 */

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

async function postToDiscord(env: Env, embedTitle: string, color: number, fields: DiscordEmbedField[], description?: string) {
  if (!env.DISCORD_WEBHOOK_URL) return; // notifications are optional until configured

  try {
    await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: embedTitle,
            description,
            color,
            fields,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (err) {
    console.error("Discord notification failed:", err);
  }
}

/**
 * Sends the same new-order notification by email via Resend, if
 * RESEND_API_KEY and a contact_email are configured. Uses the raw REST
 * API (no SDK) since this project avoids adding dependencies that
 * aren't already installed. Requires a domain verified with Resend —
 * see README "Setting up email notifications".
 */
async function sendResendEmail(env: Env, to: string, subject: string, html: string) {
  if (!env.RESEND_API_KEY || !to) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL || "orders@dreaonlinefashion.com",
        to: [to],
        subject,
        html,
      }),
    });
  } catch (err) {
    console.error("Resend email notification failed:", err);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export async function notifyNewOrder(
  env: Env,
  order: {
    order_number: string;
    customer_name: string;
    phone: string;
    delivery_method: string;
    address?: string | null;
    community_area?: string | null;
    city_town?: string | null;
    total_cents: number;
    payment_method: string;
    status: string;
  },
  itemsSummary: string,
  currencySymbol: string,
  siteUrl: string,
  contactEmail?: string
) {
  const deliveryLine =
    order.delivery_method === "pickup"
      ? "Pickup"
      : [order.address, order.community_area, order.city_town].filter(Boolean).join(", ") || "Local delivery";

  await Promise.all([
    postToDiscord(
      env,
      `New Order — ${order.order_number}`,
      0x243b2e,
      [
        { name: "Customer", value: order.customer_name, inline: true },
        { name: "Phone", value: order.phone, inline: true },
        { name: "Payment", value: order.payment_method === "card" ? "Card (send payment link)" : "Cash", inline: true },
        { name: "Items", value: itemsSummary || "—" },
        { name: "Delivery", value: deliveryLine },
        { name: "Total", value: formatMoney(order.total_cents, currencySymbol), inline: true },
        { name: "Status", value: order.status, inline: true },
        { name: "Admin Link", value: `${siteUrl}/admin/orders` },
      ]
    ),
    contactEmail
      ? sendResendEmail(
          env,
          contactEmail,
          `New Order — ${order.order_number}`,
          `<h2>New order: ${escapeHtml(order.order_number)}</h2>
           <p><strong>Customer:</strong> ${escapeHtml(order.customer_name)} (${escapeHtml(order.phone)})</p>
           <p><strong>Items:</strong><br>${escapeHtml(itemsSummary).replace(/\n/g, "<br>")}</p>
           <p><strong>Delivery:</strong> ${escapeHtml(deliveryLine)}</p>
           <p><strong>Total:</strong> ${formatMoney(order.total_cents, currencySymbol)}</p>
           <p><a href="${siteUrl}/admin/orders">View in admin</a></p>`
        )
      : Promise.resolve(),
  ]);
}

export async function notifyNewCustomOrder(
  env: Env,
  order: {
    order_number: string;
    customer_name: string;
    phone: string;
    item_description: string;
    item_link?: string | null;
    quantity: number;
    estimated_budget_cents?: number | null;
    payment_method: string;
  },
  currencySymbol: string,
  siteUrl: string,
  contactEmail?: string
) {
  await Promise.all([
    postToDiscord(
      env,
      `New "Order What You Want" Request — ${order.order_number}`,
      0xb8863f,
      [
        { name: "Customer", value: order.customer_name, inline: true },
        { name: "Phone", value: order.phone, inline: true },
        { name: "Quantity", value: String(order.quantity), inline: true },
        { name: "Item", value: order.item_description },
        ...(order.item_link ? [{ name: "Link", value: order.item_link }] : []),
        {
          name: "Estimated Budget",
          value: order.estimated_budget_cents ? formatMoney(order.estimated_budget_cents, currencySymbol) : "Not specified",
          inline: true,
        },
        { name: "Payment", value: order.payment_method === "card" ? "Card (send payment link)" : "Cash", inline: true },
        { name: "Admin Link", value: `${siteUrl}/admin/custom-orders` },
      ]
    ),
    contactEmail
      ? sendResendEmail(
          env,
          contactEmail,
          `New "Order What You Want" Request — ${order.order_number}`,
          `<h2>New custom order request: ${escapeHtml(order.order_number)}</h2>
           <p><strong>Customer:</strong> ${escapeHtml(order.customer_name)} (${escapeHtml(order.phone)})</p>
           <p><strong>Item:</strong> ${escapeHtml(order.item_description)}</p>
           ${order.item_link ? `<p><strong>Link:</strong> ${escapeHtml(order.item_link)}</p>` : ""}
           <p><strong>Quantity:</strong> ${order.quantity}</p>
           <p><a href="${siteUrl}/admin/custom-orders">View in admin</a></p>`
        )
      : Promise.resolve(),
  ]);
}
