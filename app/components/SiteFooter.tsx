import { Link } from "@remix-run/react";
import type { Settings } from "~/lib/types";

export function SiteFooter({ settings }: { settings: Settings }) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-forest text-ivory mt-24">
      <div className="container-page py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <p className="font-display text-xl mb-3">{settings.business_name}</p>
          <p className="text-ivory/70 text-sm leading-relaxed">{settings.business_description}</p>
        </div>

        <div>
          <p className="eyebrow text-brass-light mb-4">Shop</p>
          <ul className="space-y-2 text-sm text-ivory/80">
            <li><Link to="/shop" className="hover:text-brass-light transition-colors">Shop All</Link></li>
            <li><Link to="/shop?category=dresses" className="hover:text-brass-light transition-colors">Dresses</Link></li>
            <li><Link to="/shop?category=jumpsuits" className="hover:text-brass-light transition-colors">Jumpsuits</Link></li>
            <li><Link to="/shop?category=sets" className="hover:text-brass-light transition-colors">Sets</Link></li>
            <li><Link to="/shop?new=1" className="hover:text-brass-light transition-colors">New Arrivals</Link></li>
          </ul>
        </div>

        <div>
          <p className="eyebrow text-brass-light mb-4">Contact</p>
          <ul className="space-y-2 text-sm text-ivory/80">
            <li>
              <a
                href={`https://instagram.com/${settings.instagram_handle}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-brass-light transition-colors"
              >
                @{settings.instagram_handle}
              </a>
            </li>
            {settings.whatsapp_number && (
              <li>
                <a
                  href={`https://wa.me/${settings.whatsapp_number}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-brass-light transition-colors"
                >
                  WhatsApp Us
                </a>
              </li>
            )}
            {settings.contact_email && (
              <li>
                <a href={`mailto:${settings.contact_email}`} className="hover:text-brass-light transition-colors">
                  {settings.contact_email}
                </a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <p className="eyebrow text-brass-light mb-4">Delivery & Policies</p>
          <ul className="space-y-2 text-sm text-ivory/80">
            <li>Local delivery across Trinidad & Tobago</li>
            <li>Pickup available on request</li>
            <li><Link to="/privacy" className="hover:text-brass-light transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-brass-light transition-colors">Terms of Service</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ivory/15">
        <div className="container-page py-5 text-xs text-ivory/60 flex flex-col sm:flex-row justify-between gap-2">
          <p>&copy; {year} {settings.business_name}. All rights reserved.</p>
          <p>Prices shown in {settings.currency_code}.</p>
        </div>
      </div>
    </footer>
  );
}
