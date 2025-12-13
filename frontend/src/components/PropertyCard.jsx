import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

/**
 * propertycard.jsx
 * Compact, minimal & premium variant — robust image resolver with explicit load/visibility handling.
 */

export default function PropertyCard({ prop = {} }) {
  const DEFAULT_PLACEHOLDER = "/placeholder.jpg";

  // IMAGE RESOLVER (same as before)
  const chooseRawImage = () => {
    if (!prop) return null;
    if (Array.isArray(prop.images) && prop.images.length) {
      const first = prop.images[0];
      if (!first) return null;
      if (typeof first === "string") return first;
      if (first.url) return first.url;
      if (first.src) return first.src;
      if (first.path) return first.path;
      if (first.secure_url) return first.secure_url;
      if (first.thumbnail) return first.thumbnail;
      return null;
    }
    if (prop.image && typeof prop.image === "string") return prop.image;
    if (prop.url && typeof prop.url === "string") return prop.url;
    if (prop.thumb && typeof prop.thumb === "string") return prop.thumb;
    return null;
  };

  const raw = chooseRawImage();

  const resolveSrc = (src) => {
    if (!src) return DEFAULT_PLACEHOLDER;
    const trimmed = String(src).trim();
    if (/^data:/.test(trimmed) || /^https?:\/\//i.test(trimmed) || /^\/\/.*/.test(trimmed)) {
      return trimmed;
    }
    const envBase = (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_URL) ||
                    (typeof window !== "undefined" && window.__API_BASE__) ||
                    "";
    const base = envBase ? String(envBase).replace(/\/+$/,"") : "";
    if (base) {
      if (trimmed.startsWith("/")) return `${base}${trimmed}`;
      return `${base}/${trimmed}`;
    }
    if (typeof window !== "undefined" && window.location && window.location.origin) {
      const origin = window.location.origin.replace(/\/+$/,"");
      if (trimmed.startsWith("/")) return `${origin}${trimmed}`;
      return `${origin}/${trimmed}`;
    }
    return trimmed;
  };

  const imageSrc = resolveSrc(raw);

  // image load state to avoid white flash / ensure visibility
  const [imgLoaded, setImgLoaded] = useState(false);

  const formatPrice = (p) => {
    if (p == null || p === "") return "—";
    const num = Number(p);
    return Number.isFinite(num) ? `₹${num.toLocaleString("en-IN")}` : String(p);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const evt = new CustomEvent("property:wishlist", { detail: { id: prop?._id || prop?.id } });
    window.dispatchEvent(evt);
  };

  const onImgError = (e) => {
    if (e && e.target) {
      // eslint-disable-next-line no-console
      console.warn(`[PropertyCard] image failed to load for id=${prop?._id || prop?.id}:`, imageSrc);
      e.target.src = DEFAULT_PLACEHOLDER;
    }
  };

  return (
    <motion.article
      layout
      whileHover={{ translateY: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="group w-full max-w-xs rounded-xl overflow-hidden bg-white border bg-clip-padding
                 border-1px border-[#8775e0] shadow-sm hover:shadow-md transition"
    >
      <Link to={`/property/${prop?._id || prop?.id}`} className="block">
        {/* Image container: transparent background so image shows through */}
        <div className="relative h-40 sm:h-44 w-full overflow-hidden bg-transparent">
          <img
            src={imageSrc}
            alt={prop?.title || "Property image"}
            onLoad={() => setImgLoaded(true)}
            onError={onImgError}
            // enforce block + positioning + z-index so image is visible and not covered
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              position: "relative",
              zIndex: 0,
              transition: "opacity .35s ease",
              opacity: imgLoaded ? 1 : 0
            }}
            loading="lazy"
          />

          {/* Overlay above the image (semi-transparent) */}
          <div
            aria-hidden
            style={{ position: "absolute", inset: 0, zIndex: 5 }}
            className="bg-gradient-to-t from-black/20 to-transparent pointer-events-none"
          />

          {/* Price pill */}
          {prop?.price != null && (
            <div className="absolute left-3 bottom-3 z-10">
              <span className="text-sm font-semibold bg-black/70 text-white px-3 py-1 rounded-md backdrop-blur-sm border border-white/5">
                {formatPrice(prop.price)}
              </span>
            </div>
          )}

          {/* Tiny featured dot */}
          {prop?.isFeatured && (
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#D4B56A] shadow-sm" title="Featured" />
            </div>
          )}

          {/* Wishlist button */}
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={handleWishlist}
              aria-label="Wishlist"
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:scale-105 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                   fill={prop?.wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4"
                   className={`w-4 h-4 ${prop?.wishlisted ? "text-rose-600" : "text-gray-700"}`}>
                <path d="M12 21s-7.5-4.873-10-8.12C-1.5 8.631 4.03 3 8.91 6.09 10.76 7.43 12 9.05 12 9.05s1.24-1.62 3.09-2.96C19.97 3 25.5 8.63 22 12.88 19.5 16.127 12 21 12 21z"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Compact Content */}
        <div className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight truncate">
                {prop?.title || "Untitled property"}
              </h3>
              {prop?.subtitle ? (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{prop.subtitle}</p>
              ) : (
                (prop?.city || prop?.location) && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {prop.city ? prop.city : prop.location}
                  </p>
                )
              )}
            </div>
          </div>

          {/* Small metadata row — only show fields that exist */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {prop?.category && (
              <span className="text-xs px-2 py-1 rounded-full bg-gray-50 border border-gray-100 text-gray-700">
                {prop.category}
              </span>
            )}
            {prop?.purpose && (
              <span className="text-xs px-2 py-1 rounded-full bg-gray-50 border border-gray-100 text-gray-700">
                {prop.purpose}
              </span>
            )}
            {prop?.status && (
              <span className="ml-auto text-xs text-gray-400">{prop.status}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
