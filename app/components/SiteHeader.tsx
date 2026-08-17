import { useState } from "react";
import { Link, NavLink } from "@remix-run/react";

const NAV_LINKS = [
  { to: "/shop", label: "Shop All" },
  { to: "/shop?category=dresses", label: "Dresses" },
  { to: "/shop?category=jumpsuits", label: "Jumpsuits" },
  { to: "/shop?category=sets", label: "Sets" },
  { to: "/shop?new=1", label: "New Arrivals" },
  { to: "/order-what-you-want", label: "Order What You Want" },
];

export function SiteHeader({ businessName, cartCount = 0 }: { businessName: string; cartCount?: number }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-ivory/95 backdrop-blur border-b border-line">
      <div className="container-page flex items-center justify-between h-16 md:h-20">
        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 -ml-2"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M3 7h18M3 12h18M3 17h18" strokeLinecap="round" />
            )}
          </svg>
        </button>

        <Link to="/" className="font-display text-xl md:text-2xl tracking-wide">
          {businessName}
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              className="text-sm tracking-wide uppercase text-charcoal/80 hover:text-forest transition-colors"
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/shop" className="hidden md:inline text-sm tracking-wide uppercase hover:text-forest transition-colors" aria-label="Search">
            Search
          </Link>
          <Link to="/cart" className="relative p-2" aria-label={`View cart${cartCount ? `, ${cartCount} items` : ""}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path
                d="M6 8h12l-1 12a2 2 0 01-2 2H9a2 2 0 01-2-2L6 8zM9 8V6a3 3 0 016 0v2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-[1.125rem] min-w-[1.125rem] px-1 rounded-full bg-brass text-ivory text-[10px] leading-[1.125rem] text-center font-semibold">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile nav panel */}
      {open && (
        <nav className="md:hidden border-t border-line bg-ivory">
          <ul className="container-page py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-base tracking-wide uppercase border-b border-line/60"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
