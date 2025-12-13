// src/pages/Home.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import api from "../api/axios";
import { motion } from "framer-motion";
import { useLocation, useNavigate, Link } from "react-router-dom";
import PropertyCard from "../components/PropertyCard";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

/**
 * Home.jsx — upgraded, humanized, and more attractive hero + featured slider.
 * - Search now navigates to /property?q=<encoded search>
 * - Responsive featured slider: stacked on mobile, horizontal on sm+
 * - Uses properties strictly from backend
 */

export default function Home() {
  const [properties, setProperties] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);

  // hero inputs
  const [heroLocation, setHeroLocation] = useState("");
  const [heroCategory, setHeroCategory] = useState("");

  const query = useQuery();
  const navigate = useNavigate();
  const q = (query.get("q") || "").trim().toLowerCase();

  const sliderRef = useRef(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [isHoveringSlider, setIsHoveringSlider] = useState(false);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get("/api/properties")
      .then((res) => {
        if (!cancelled) {
          const arr = Array.isArray(res.data) ? res.data : res.data.properties || [];
          setProperties(arr);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch properties", err);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => (cancelled = true);
  }, []);

  

  // Featured — first 5 from backend
  const featured = useMemo(() => (Array.isArray(properties) ? properties.slice(0, 5) : []), [properties]);
  const totalCount = Array.isArray(properties) ? properties.length : 0;

  // slider helpers
  const scrollSlider = (dir = "right") => {
    const el = sliderRef.current;
    if (!el) return;
    const card = el.querySelector("[data-card]");
    const gap = 16;
    const cardWidth = card ? Math.round(card.getBoundingClientRect().width) : 300;
    const amount = (cardWidth + gap) * (dir === "right" ? 1 : -1);
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  // center detection for indicators
  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    const onScroll = () => {
      const children = Array.from(el.querySelectorAll("[data-card]"));
      if (!children.length) return;
      const containerRect = el.getBoundingClientRect();
      const center = el.scrollLeft + containerRect.width / 2;
      let bestI = 0;
      let bestDist = Infinity;
      children.forEach((c, i) => {
        const cRect = c.getBoundingClientRect();
        const cardCenter = el.scrollLeft + (cRect.left - containerRect.left) + cRect.width / 2;
        const dist = Math.abs(center - cardCenter);
        if (dist < bestDist) {
          bestDist = dist;
          bestI = i;
        }
      });
      setFeaturedIndex(bestI);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [featured]);

  // keyboard nav for slider
  useEffect(() => {
    function onKey(e) {
      const el = sliderRef.current;
      if (!el) return;
      if (document.activeElement !== el) return;
      if (e.key === "ArrowRight") { e.preventDefault(); scrollSlider("right"); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); scrollSlider("left"); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ===== UPDATED: navigate to /property?q=... when searching =====
  const onHeroSearch = (e) => {
    e && e.preventDefault();
    const parts = [];
    if (heroLocation) parts.push(heroLocation);
    if (heroCategory) parts.push(heroCategory);
    const value = parts.join(" ").trim();
    const encoded = encodeURIComponent(value);
    // If empty value, go to /property (full listing). If not, pass q param.
    if (value) navigate(`/property?q=${encoded}`);
    else navigate("/property");
  };

  useEffect(() => {
  let cancelled = false;
  setLoading(true);

  api
    .get("/api/properties")
    .then((res) => {
      if (!cancelled) {
        const arr = Array.isArray(res.data)
          ? res.data
          : res.data.properties || [];

        setProperties(arr);

        // ✅ NEW: derive categories dynamically
        const uniqueCategories = Array.from(
          new Set(
            arr
              .map(p => p.category)
              .filter(Boolean)
          )
        );

        setCategories(uniqueCategories);
      }
    })
    .catch((err) => {
      console.warn("Failed to fetch properties", err);
    })
    .finally(() => !cancelled && setLoading(false));

  return () => (cancelled = true);
}, []);


  // =============================================================

  const InfoChips = () => (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="flex gap-3 items-start p-3 rounded-lg bg-white border border-gray-100">
        <div className="w-10 h-10 rounded-lg bg-[#F8F6EE] inline-grid place-items-center text-[#6b5a2b] font-semibold">✓</div>
        <div>
          <div className="text-sm font-semibold">Verified properties</div>
          <div className="text-xs text-gray-500">Locally checked sellers & documents</div>
        </div>
      </div>

      <div className="flex gap-3 items-start p-3 rounded-lg bg-white border border-gray-100">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 inline-grid place-items-center text-indigo-700 font-semibold">☎</div>
        <div>
          <div className="text-sm font-semibold">Friendly support</div>
          <div className="text-xs text-gray-500">Call or message — quick replies</div>
        </div>
      </div>

      <div className="flex gap-3 items-start p-3 rounded-lg bg-white border border-gray-100">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 inline-grid place-items-center text-emerald-700 font-semibold">🔐</div>
        <div>
          <div className="text-sm font-semibold">Transparent process</div>
          <div className="text-xs text-gray-500">Clear pricing and paperwork guidance</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="px-4 md:px-8 lg:px-12 pt-6">
      <motion.section
        initial={reducedMotion ? {} : { opacity: 0, y: 8 }}
        animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white to-slate-50 shadow-xl"
        aria-label="Hero"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch p-6 md:p-10 relative">
          {/* Left: hero */}
          <div className="lg:col-span-6 flex flex-col justify-center z-10">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-500 flex items-center justify-center text-white font-bold shadow-md">
                  B
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Bapuji Real Estate</div>
                  <div className="text-xs text-gray-500 -mt-0.5">Handpicked homes from trusted locals</div>
                </div>
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight text-gray-900">
                Find your calm — Estate chosen with care
              </h1>

              <p className="mt-3 text-gray-600 max-w-lg">
                Browse verified listings, get quick support, and close with confidence. We keep the details clear so you can decide — no surprise fees, no fuss.
              </p>

              <div className="mt-4 flex items-center gap-3 text-sm text-gray-600">
                <div className="font-medium text-green-700">{totalCount}</div>
                <div>properties on our platform</div>
              </div>

              <InfoChips />

              <form onSubmit={onHeroSearch} className="mt-5" role="search" aria-label="Search properties">
                <div className="flex flex-col sm:flex-row items-stretch gap-3">
                  <input
                    aria-label="Location (city or area)"
                    value={heroLocation}
                    onChange={(e) => setHeroLocation(e.target.value)}
                    placeholder="e.g., Pune, Lonavala, Mahabaleshwar"
                    className="flex-1 px-4 py-3 rounded-2xl border border-gray-100 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <select
  aria-label="Property category"
  value={heroCategory}
  onChange={(e) => setHeroCategory(e.target.value)}
  className="w-full sm:w-44 px-3 py-3 rounded-2xl border border-gray-100 bg-white"
>
  <option value="">Any</option>

  {categories.map((cat) => (
    <option key={cat} value={cat}>
      {cat}
    </option>
  ))}
</select>


                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow hover:scale-[1.02] transition"
                  >
                    Search
                  </button>
                </div>

                <div className="mt-2 text-xs text-gray-500">Tip: try city names or locality — we'll show curated results.</div>
              </form>
            </div>
          </div>

          {/* Right: Featured slider */}
          <div className="lg:col-span-6 relative flex flex-col justify-center z-10">
            <div className="bg-white/80 rounded-2xl p-4 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-3 px-2">
                <div>
                  <div className="text-xs text-gray-500">Featured</div>
                  <div className="text-sm font-semibold">Curated picks — quick preview</div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => scrollSlider("left")} aria-label="Previous featured" className="p-2 rounded-md hover:bg-gray-100">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button onClick={() => scrollSlider("right")} aria-label="Next featured" className="p-2 rounded-md hover:bg-gray-100">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div
                ref={sliderRef}
                className="flex flex-wrap sm:flex-nowrap gap-4 overflow-hidden sm:overflow-x-auto no-scrollbar px-2 py-2 scroll-smooth"
                style={{ WebkitOverflowScrolling: "touch" }}
                onMouseEnter={() => setIsHoveringSlider(true)}
                onMouseLeave={() => setIsHoveringSlider(false)}
                tabIndex={-1}
                aria-label="Featured properties slider"
              >
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="w-full sm:min-w-[260px] sm:max-w-[280px] bg-white rounded-xl overflow-hidden shadow-sm animate-pulse h-44" />
                  ))
                ) : featured.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-500">No featured properties yet — check back soon.</div>
                ) : (
                  featured.map((p, idx) => (
                    <div
                      key={p._id || p.id || idx}
                      data-card
                      className="w-full sm:min-w-[260px] sm:max-w-[280px] bg-white rounded-xl overflow-hidden shadow-sm transform transition-all duration-350 hover:scale-105 hover:shadow-2xl relative"
                    >
                      <PropertyCard prop={p} />
                    </div>
                  ))
                )}
              </div>

              <div className="mt-3 flex items-center justify-center gap-2">
                {featured.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const el = sliderRef.current;
                      const card = el?.querySelectorAll("[data-card]")?.[i];
                      if (card) card.scrollIntoView({ behavior: "smooth", inline: "center" });
                    }}
                    aria-label={`Go to featured ${i + 1}`}
                    className={`w-2 h-2 rounded-full ${i === featuredIndex ? "bg-indigo-600" : "bg-gray-300"}`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 text-center">
              <Link to="/property" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-gray-200 shadow-sm hover:shadow-md">
                Browse full listings
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="mt-8">
        {q ? (
          <div className="text-sm text-gray-600">
            Showing curated matches for <span className="font-semibold">{q}</span>. For full results,{" "}
            <Link to="/property" className="text-indigo-600 underline">view all listings</Link>.
          </div>
        ) : (
          <div className="text-sm text-gray-600">Curated picks from Bapuji — use the search above to find properties by city or type.</div>
        )}
      </div>
    </div>
  );
}
