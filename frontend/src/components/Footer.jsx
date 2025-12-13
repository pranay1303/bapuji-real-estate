import React from "react";
import { Phone, Mail, Instagram } from "lucide-react";

const PHONE = "8308040123";
const MAIL = "bapujirealestate@gmail.com";
const WHATSAPP = `https://wa.me/91${PHONE}`;
const INSTAGRAM = "https://instagram.com/bapujirealestate";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-10">
      {/* Thin premium gold divider */}
      <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#d6c087] to-transparent opacity-80" />

      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-5 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Branding */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
              style={{
                background: "linear-gradient(135deg,#5b21b6,#0ea5e9)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              B
            </div>

            <div className="text-sm">
              <div className="font-semibold text-gray-900 tracking-tight">
                Bapuji Real Estate
              </div>
              <div className="text-gray-500 text-xs -mt-0.5">
                © {year} • Trusted & Verified
              </div>
            </div>
          </div>

          {/* Contact Icons */}
          <div className="flex items-center gap-3">
            <FooterIcon label="Call" href={`tel:${PHONE}`}>
              <Phone size={17} className="text-blue-600" />
            </FooterIcon>

            <FooterIcon label="Email" href={`mailto:${MAIL}`}>
              <Mail size={17} className="text-amber-600" />
            </FooterIcon>

            <FooterIcon label="WhatsApp" href={WHATSAPP} target="_blank">
              <svg
                viewBox="0 0 32 32"
                className="w-[18px] h-[18px] text-green-600 fill-current"
                aria-hidden="true"
              >
                <path d="M16.04 2.67c-7.33 0-13.33 5.93-13.33 13.22 0 2.33.62 4.62 1.78 6.65L2.67 29.33l7.01-1.81c1.91 1.04 4.07 1.58 6.36 1.58h.01c7.33 0 13.32-5.93 13.32-13.22 0-3.53-1.38-6.84-3.89-9.34-2.51-2.49-5.82-3.87-9.34-3.87zm0 23.95c-1.96 0-3.87-.53-5.53-1.54l-.39-.23-4.17 1.09 1.12-4.07-.26-.42c-1.1-1.76-1.68-3.78-1.68-5.86 0-6.07 4.98-10.99 11.1-10.99 2.97 0 5.76 1.15 7.86 3.23s3.27 4.85 3.27 7.79c0 6.06-4.97 10.99-11.1 10.99zm5.97-8.31c-.32-.16-1.9-.94-2.2-1.05-.29-.1-.5-.16-.71.16-.21.31-.81 1.05-.99 1.27-.18.21-.36.23-.68.08-.33-.16-1.38-.51-2.63-1.62a9.41 9.41 0 0 1-1.74-2.09c-.18-.31-.02-.48.14-.64.15-.15.32-.39.48-.58.16-.19.21-.33.32-.54.1-.22.05-.41 0-.57-.05-.16-.71-1.72-.97-2.36-.26-.64-.53-.55-.72-.55h-.62c-.2 0-.53.07-.81.37-.28.31-1.07 1.04-1.07 2.57s1.1 2.98 1.26 3.19c.16.21 2.16 3.47 5.26 4.71.74.31 1.32.5 1.77.64.75.24 1.43.2 1.97.12.6-.09 1.85-.76 2.12-1.5.26-.74.26-1.35.18-1.49-.08-.13-.27-.21-.59-.37z" />
              </svg>
            </FooterIcon>

            <FooterIcon label="Instagram" href={INSTAGRAM} target="_blank">
              <Instagram size={17} className="text-pink-600" />
            </FooterIcon>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* Ultra-minimal premium rounded icon button */
function FooterIcon({ href, children, label, target }) {
  return (
    <a
      href={href}
      target={target}
      aria-label={label}
      className="
        group relative w-10 h-10
        rounded-full flex items-center justify-center
        bg-white border border-gray-200
        shadow-sm hover:shadow-md
        hover:-translate-y-0.5 transition-all duration-200
      "
      style={{
        boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
      }}
    >
      {children}

      {/* Minimal floating tooltip */}
      <span
        className="
          absolute -top-8 px-2 py-1 rounded-md text-[10px] font-medium text-white 
          bg-gray-900 opacity-0 group-hover:opacity-100 transition-all pointer-events-none
        "
      >
        {label}
      </span>
    </a>
  );
}
