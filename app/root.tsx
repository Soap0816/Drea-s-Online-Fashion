import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useNavigation,
  useRouteError,
  isRouteErrorResponse,
} from "@remix-run/react";
import type { LoaderFunctionArgs, LinksFunction, MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import type { Env } from "~/lib/env.server";
import { getSettings } from "~/lib/db.server";
import { getCart, cartItemCount } from "~/lib/cart.server";
import { SiteHeader } from "~/components/SiteHeader";
import { SiteFooter } from "~/components/SiteFooter";
import { WhatsAppButton } from "~/components/WhatsAppButton";
import { ToastHost } from "~/components/Toast";
import stylesheet from "~/styles/tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
];

export const meta: MetaFunction = () => [
  { title: "Drea Online Fashion — Trinidad & Tobago Women's Fashion" },
  {
    name: "description",
    content:
      "Shop dresses, jumpsuits, matching sets and more from Drea Online Fashion. Trinidad & Tobago delivery, easy ordering, trendy styles.",
  },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const [settings, cart] = await Promise.all([getSettings(env), getCart(request)]);
  return json({ settings, cartCount: cartItemCount(cart) });
}

function NavigationProgressBar() {
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle";

  return (
    <div
      aria-hidden="true"
      className={`fixed top-0 left-0 right-0 z-[70] h-0.5 bg-brass origin-left transition-transform duration-300 ${
        isLoading ? "scale-x-100" : "scale-x-0"
      }`}
      style={{ transitionTimingFunction: isLoading ? "cubic-bezier(0.4,0,0.2,1)" : "ease-in" }}
    />
  );
}

export default function App() {
  const { settings, cartCount } = useLoaderData<typeof loader>();

  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full flex flex-col min-h-screen">
        <NavigationProgressBar />
        <SiteHeader businessName={settings.business_name} cartCount={cartCount} />
        <main className="flex-1">
          <Outlet context={{ settings }} />
        </main>
        <SiteFooter settings={settings} />
        <WhatsAppButton whatsappNumber={settings.whatsapp_number} />
        <ToastHost />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "Something went wrong";

  return (
    <html lang="en" className="h-full">
      <head>
        <title>Drea Online Fashion</title>
        <Meta />
        <Links />
      </head>
      <body className="h-full flex items-center justify-center bg-ivory text-charcoal">
        <div className="text-center px-6">
          <p className="eyebrow mb-3">Drea Online Fashion</p>
          <h1 className="text-3xl mb-3">{message}</h1>
          <p className="text-taupe mb-6">
            We couldn&apos;t load that page. Please try again or head back home.
          </p>
          <a href="/" className="btn-primary">
            Back to Home
          </a>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
