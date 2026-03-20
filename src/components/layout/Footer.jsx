import { Link } from "react-router-dom";
import { Phone, Mail, Clock, MapPin } from "lucide-react";
import { SHOP_INFO } from "../../utils/constants";

export default function Footer() {
  return (
    <footer className="bg-earth-900 text-earth-300 mt-16">
      <div className="container-page py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              {" "}
              {/* ↑ gap a bit bigger for breathing room */}
              <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden border border-earth-200">
                {" "}
                {/* ↑ logo size */}
                <img
                  src="/Vittorios-logo.jpeg"
                  alt="Vittorios Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="font-display font-semibold text-cream text-base">
                  Vittorios
                </div>{" "}
                {/* ↑ text-sm → text-base */}
                <div className="text-earth-400 text-sm">
                  Grains & Cereals
                </div>{" "}
                {/* ↑ text-xs → text-sm */}
              </div>
            </div>
            <p className="text-sm leading-relaxed text-earth-400">
              Quality grains and cereals delivered fresh. Serving Nairobi and
              surrounding areas.
            </p>
          </div>
          {/* Quick links */}
          <div>
            <h4 className="font-display font-semibold text-cream mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              {[
                { to: "/shop", label: "Shop All Products" },
                { to: "/track", label: "Track Your Order" },
                { to: "/login", label: "Sign In" },
                { to: "/register", label: "Create Account" },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-earth-400 hover:text-brand-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-cream mb-4">
              Contact Us
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-earth-400">
                <Phone size={15} className="text-brand-400 flex-shrink-0" />
                <a
                  href={`tel:${SHOP_INFO.phone}`}
                  className="hover:text-brand-400 transition-colors"
                >
                  {SHOP_INFO.phone}
                </a>
              </li>
              <li className="flex items-center gap-2 text-earth-400">
                <Mail size={15} className="text-brand-400 flex-shrink-0" />
                <a
                  href={`mailto:${SHOP_INFO.email}`}
                  className="hover:text-brand-400 transition-colors"
                >
                  {SHOP_INFO.email}
                </a>
              </li>
              <li className="flex items-center gap-2 text-earth-400">
                <Clock size={15} className="text-brand-400 flex-shrink-0" />
                <span>{SHOP_INFO.hours}</span>
              </li>
              <li className="flex items-center gap-2 text-earth-400">
                <MapPin size={15} className="text-brand-400 flex-shrink-0" />
                <span>{SHOP_INFO.location}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-earth-700 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-earth-500">
          <span>
            © {new Date().getFullYear()} Vittorios Grains & Cereals. All rights
            reserved.
          </span>

          <span className="text-center">
            Designed & maintained by{" "}
            <a
              href="https://glimmerink.co.ke/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-400 hover:text-brand-300 transition-colors"
            >
              GlimmerInk Creations
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
