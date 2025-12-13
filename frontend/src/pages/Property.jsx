// src/pages/Property.jsx
import React, { useEffect, useState, useContext, useRef } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  Mail,
  Instagram,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  Star as StarIcon
} from "lucide-react";
import PropertyCard from "../components/PropertyCard"; // <-- imported propertycard

/**
 * Property.jsx — supports:
 * - /property         => LISTING (cards with sort + pagination + search via header)
 * - /property/:id     => DETAIL view (original — unchanged)
 *
 * Listing query params sent to GET /api/properties:
 *  q, sort, page, limit
 *
 * NOTE: internal search UI removed. Search still works via URL q (header).
 */

export default function Property() {
  const { id } = useParams(); // may be undefined for /property
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { show, Toast } = useToast();

  // read q from URL: the header navigates to /property?q=...
  const qParam = React.useMemo(() => {
    try {
      return new URLSearchParams(location.search).get("q") || "";
    } catch (e) {
      return "";
    }
  }, [location.search]);

  // Shared states
  const [loading, setLoading] = useState(true);

  // Listing state (used when no id)
  const [list, setList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // Sorting / pagination
  const [sort, setSort] = useState("newest"); // newest, price_desc, price_asc, oldest
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);

  // INTERNAL search state (kept for possible local use; header's qParam is primary)
  const [searchQuery, setSearchQuery] = useState(""); // intentionally starts empty

  // Detail states (used when id present)
  const [property, setProperty] = useState(null);

  // OTP / contact state
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(user?.mobile || "");
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifiedBrochure, setVerifiedBrochure] = useState(false);

  // UI state
  const [viewLeadCreated, setViewLeadCreated] = useState(false);

  // Inquiry state
  const [inqName, setInqName] = useState(user?.name || "");
  const [inqPhone, setInqPhone] = useState(user?.mobile || "");
  const [inqMessage, setInqMessage] = useState("");
  const [inqSending, setInqSending] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewSending, setReviewSending] = useState(false);

  // Similar properties
  const [similar, setSimilar] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  // Carousel
  const [activeIndex, setActiveIndex] = useState(0);
  const sliderInterval = useRef(null);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const carouselRef = useRef(null);

  // Aside tab
  const [asideTab, setAsideTab] = useState("brochure");

  // contact constants
  const PHONE_NUMBER = "8308040123";
  const WHATSAPP_LINK = `https://wa.me/${PHONE_NUMBER}`;
  const MAIL_ADDRESS = "bapujirealestate@gmail.com";
  const INSTAGRAM_HANDLE = "bapujirealestate";
  const INSTAGRAM_LINK = `https://instagram.com/${INSTAGRAM_HANDLE}`;

  // amenity icons
  const amenityIcons = (name) => {
    const key = (name || "").toLowerCase();
    if (key.includes("wifi") || key.includes("internet")) return "📶";
    if (key.includes("parking") || key.includes("car")) return "🚗";
    if (key.includes("pool")) return "🏊";
    if (key.includes("gym") || key.includes("fitness")) return "🏋️";
    if (key.includes("garden") || key.includes("park")) return "🌳";
    if (key.includes("lift") || key.includes("elevator")) return "🛗";
    if (key.includes("security") || key.includes("guard")) return "🛡️";
    if (key.includes("power") || key.includes("backup") || key.includes("generator")) return "🔋";
    if (key.includes("pet")) return "🐾";
    if (key.includes("cctv") || key.includes("camera")) return "📷";
    if (key.includes("ac") || key.includes("air") || key.includes("cool")) return "❄️";
    if (key.includes("kitchen") || key.includes("hob") || key.includes("stove")) return "🍽️";
    if (key.includes("balcony")) return "🌅";
    if (key.includes("club") || key.includes("clubhouse")) return "🎉";
    if (key.includes("kids") || key.includes("play")) return "🧒";
    if (key.includes("restaurant") || key.includes("dining")) return "🍴";
    if (key.includes("shopping") || key.includes("mall")) return "🛍️";
    if (key.includes("hospital") || key.includes("clinic")) return "🏥";
    if (key.includes("school") || key.includes("college")) return "🏫";
    if (key.includes("bus") || key.includes("transport")) return "🚌";
    return "✔️";
  };

  // ---------- listing fetch & helpers ----------
  const buildListParams = () => {
    const params = { limit, page };
    if (sort) params.sort = sort;

    // priority: internal searchQuery (self-contained) > qParam (URL)
    const qToUse =
      (searchQuery && String(searchQuery).trim().length > 0)
        ? String(searchQuery).trim()
        : (qParam || "");
    if (qToUse) params.q = qToUse;

    return params;
  };

  // fetchList (robust parsing like before) + client-side strict filter for search
  const fetchList = async () => {
    setListLoading(true);
    try {
      const params = buildListParams();
      const res = await api.get("/api/properties", { params });

      const raw = res.data;
      let items = [];
      let count = 0;

      if (Array.isArray(raw)) {
        items = raw;
        count = raw.length;
      } else if (raw) {
        items = raw.properties || raw.items || raw.data || [];
        if (Array.isArray(items)) {
          count = Number(raw.total ?? raw.count ?? raw.totalCount ?? items.length);
        } else {
          const possible = Object.values(raw).find(v => Array.isArray(v));
          if (possible) {
            items = possible;
            count = Number(raw.total ?? raw.count ?? items.length);
          } else {
            items = [];
            count = 0;
          }
        }
      }

      // --- CLIENT-SIDE STRICT FILTERING WHEN A QUERY IS ACTIVE ---
      const qToUseLower = (
        (searchQuery && String(searchQuery).trim().length > 0)
          ? String(searchQuery).trim().toLowerCase()
          : (qParam ? String(qParam).trim().toLowerCase() : "")
      );

      if (qToUseLower) {
        items = (Array.isArray(items) ? items : []).filter((p) => {
          const hay = [
            p.title || "",
            p.city || "",
            p.category || "",
            p.description || "",
            p.type || "",
            p.location || "",
            Array.isArray(p.amenities) ? p.amenities.join(" ") : (p.amenities || "")
          ].join(" ").toLowerCase();
          return hay.includes(qToUseLower);
        });
        count = items.length;
      }

      setList(Array.isArray(items) ? items : []);
      setTotal(Number.isNaN(Number(count)) ? (Array.isArray(items) ? items.length : 0) : Number(count));
    } catch (err) {
      console.error("Properties list fetch error:", err);
      show("Failed to load properties", { type: "error" });
    } finally {
      setListLoading(false);
    }
  };

  // When sort/pagination/search change — refetch listing
  useEffect(() => {
    if (id) return; // don't run in detail mode
    fetchList();
    // eslint-disable-next-line
  }, [sort, page, limit, id, qParam, searchQuery]);

  // If qParam changes due to header navigation, ensure we start from page 1
  useEffect(() => {
    if (id) return;
    if (page !== 1) {
      setPage(1);
      // fetchList will run because page changed (useEffect above)
    } else {
      // if already page 1, explicitly refetch to pick up new qParam
      fetchList();
    }
    // eslint-disable-next-line
  }, [qParam]);

  // Initial listing or detail fetch
  useEffect(() => {
    setLoading(true);
    if (id) {
      // DETAIL MODE
      setList([]);
      api.get(`/api/properties/${id}`)
        .then(res => {
          const p = res.data.property || res.data;
          setProperty(p);
          setEmail(user?.email || "");
          setPhone(user?.mobile || "");
          setInqName(user?.name || "");
          setInqPhone(user?.mobile || "");
        })
        .catch(err => {
          console.error("Property fetch error:", err);
          show("Failed to load property", { type: "error" });
        })
        .finally(() => setLoading(false));

      (async () => {
        try { await api.post(`/api/views/${id}/view`); } catch (e) { console.warn("view inc failed", e); }
        if (!viewLeadCreated) {
          try {
            await api.post("/api/leads", {
              phone: user?.mobile || "",
              name: user?.name || "",
              email: "",
              propertyId: id,
              action: "interested",
              source: "web"
            });
            setViewLeadCreated(true);
          } catch (e) { console.warn("create view lead failed", e); }
        }
      })();

      fetchReviews();
    } else {
      // LISTING MODE — initial fetch
      setProperty(null);
      setListLoading(true);
      fetchList().finally(() => {
        setListLoading(false);
        setLoading(false);
      });
    }

    return () => {
      if (sliderInterval.current) { clearInterval(sliderInterval.current); sliderInterval.current = null; }
    };
    // eslint-disable-next-line
  }, [id]);

  // fetch similar properties (when property loaded)
  useEffect(() => {
    if (!property) return;
    const fetchSimilar = async () => {
      setSimilarLoading(true);
      try {
        const params = {};
        if (property.category) params.category = property.category;
        if (property.city) params.city = property.city;
        params.limit = 8;
        const res = await api.get("/api/properties", { params });
        const list = res.data.properties || res.data || [];
        const filtered = Array.isArray(list) ? list.filter(p => String(p._id || p.id) !== String(property._id || property.id)).slice(0, 8) : [];
        setSimilar(filtered);
      } catch (e) {
        console.warn("fetch similar error", e);
        setSimilar([]);
      } finally {
        setSimilarLoading(false);
      }
    };
    fetchSimilar();
  }, [property]);

  useEffect(() => {
    if (property?.images && property.images.length > 1) {
      if (sliderInterval.current) clearInterval(sliderInterval.current);
      sliderInterval.current = setInterval(() => {
        setActiveIndex(i => ((i + 1) % property.images.length));
      }, 4200);
      return () => { if (sliderInterval.current) clearInterval(sliderInterval.current); };
    }
  }, [property?.images]);

  // carousel helpers
  const prevSlide = () => { if (!property?.images?.length) return; setActiveIndex(i => (i - 1 + property.images.length) % property.images.length); };
  const nextSlide = () => { if (!property?.images?.length) return; setActiveIndex(i => (i + 1) % property.images.length); };
  const goToSlide = (idx) => {
    setActiveIndex(idx);
    if (sliderInterval.current) {
      clearInterval(sliderInterval.current);
      sliderInterval.current = setInterval(() => {
        setActiveIndex(i => ((i + 1) % property.images.length));
      }, 4200);
    }
  };

  // touch
  const handleTouchStart = (e) => { touchStartX.current = e.touches?.[0]?.clientX || null; };
  const handleTouchMove = (e) => { touchEndX.current = e.touches?.[0]?.clientX || null; };
  const handleTouchEnd = () => {
    if (touchStartX.current == null || touchEndX.current == null) { touchStartX.current = null; touchEndX.current = null; return; }
    const dx = touchEndX.current - touchStartX.current;
    const threshold = 40;
    if (dx > threshold) prevSlide();
    else if (dx < -threshold) nextSlide();
    touchStartX.current = null; touchEndX.current = null;
  };

  // reviews fetch
  const fetchReviews = async () => {
    if (!id) return;
    setReviewsLoading(true);
    try {
      const res = await api.get(`/api/reviews`, { params: { propertyId: id } });
      const data = res.data.reviews || res.data || [];
      setReviews(Array.isArray(data) ? data.filter(r => r.approved !== false) : []);
    } catch (err) {
      console.warn("fetch reviews error", err);
    } finally { setReviewsLoading(false); }
  };

  // validation & flows
  const validateContact = () => {
    if (!email || !String(email).includes("@")) { show("Please enter a valid email", { type: "warning" }); return false; }
    if (!phone || phone.length < 8) { show("Please enter a valid phone number", { type: "warning" }); return false; }
    return true;
  };

  const handleSendOtp = async () => {
    if (!validateContact()) return;
    setSending(true);
    try {
      await api.post("/api/otp/send", { email, phone, propertyId: id });
      setOtpSent(true);
      setVerifiedBrochure(false);
      show("OTP sent to email", { type: "success" });
    } catch (err) {
      console.error("OTP send error", err);
      show(err?.response?.data?.message || "Failed to send OTP", { type: "error" });
    } finally { setSending(false); }
  };

  const handleVerify = async () => {
    if (!code) { show("Enter OTP", { type: "warning" }); return; }
    if (!validateContact()) return;
    try {
      const payload = { email, phone, propertyId: id, code };
      if (user) { payload.name = user.name; payload.phone = user.mobile || phone; }
      const res = await api.post("/api/otp/verify", payload);
      const brochureUrl = res?.data?.brochureUrl || res?.data?.brochure || property?.brochureUrl;

      try {
        await api.post("/api/leads", {
          name: user?.name || "",
          phone: phone || "",
          email: email || "",
          propertyId: id,
          action: "download_brochure",
          source: "email_otp"
        });
      } catch (e) { console.warn("create download lead failed", e); }

      try { await api.post(`/api/views/${id}/download`); } catch (e) { console.warn("download inc failed", e); }

      if (brochureUrl) {
        const downloadUrl = brochureUrl.startsWith("http") ? brochureUrl : brochureUrl.startsWith("/") ? brochureUrl : `/${brochureUrl}`;
        window.open(downloadUrl, "_blank");
        setVerifiedBrochure(true);
        show("Brochure opened in new tab — Verified", { type: "success" });
      } else {
        setVerifiedBrochure(true);
        show("OTP verified — no brochure file available", { type: "info" });
      }
    } catch (err) {
      console.error("OTP verify error", err);
      show(err?.response?.data?.message || "OTP verification failed", { type: "error" });
    }
  };

  const handleContactAdmin = async () => {
    if (!validateContact()) return;
    try {
      await api.post("/api/leads", {
        name: user?.name || "",
        phone: phone || "",
        email: email || "",
        propertyId: id,
        action: "contacted",
        source: "web"
      });
      show("Contact request recorded. Admin will reach out.", { type: "success" });
    } catch (err) {
      console.error("contact lead error", err);
      show(err?.response?.data?.message || "Failed to record contact request", { type: "error" });
    }
  };

  const handleQuickInterest = async () => {
    if (!validateContact()) return;
    try {
      await api.post("/api/leads", {
        name: user?.name || "",
        phone: phone || "",
        email: email || "",
        propertyId: id,
        action: "interested",
        source: "quick_interest"
      });
      show("Interest recorded. Admin will contact you.", { type: "success" });
    } catch (err) {
      console.error("interest lead error", err);
      show(err?.response?.data?.message || "Failed to record interest", { type: "error" });
    }
  };

  const handleSubmitInquiry = async () => {
    if (!inqMessage || inqMessage.trim().length < 3) { show("Please enter a message", { type: "warning" }); return; }
    if (!inqPhone || inqPhone.length < 8) { show("Please enter a valid phone number", { type: "warning" }); return; }
    setInqSending(true);
    try {
      const payload = { propertyId: id, userName: inqName || user?.name || "", userPhone: inqPhone, message: inqMessage.trim() };
      const res = await api.post("/api/inquiries", payload);
      show(res?.data?.message || "Inquiry created", { type: "success" });
      setInqMessage("");
      try {
        await api.post("/api/leads", {
          name: payload.userName || "",
          phone: payload.userPhone || "",
          email: email || "",
          propertyId: id,
          action: "interested",
          source: "inquiry"
        });
      } catch (e) { console.warn("create lead for inquiry failed", e); }
    } catch (err) {
      console.error("create inquiry error", err);
      show(err?.response?.data?.message || "Failed to submit inquiry", { type: "error" });
    } finally { setInqSending(false); }
  };

  const handleSubmitReview = async () => {
    if (!comment || comment.trim().length < 5) { show("Please write at least 5 characters for review", { type: "warning" }); return; }
    setReviewSending(true);
    try {
      const payload = { propertyId: id, userName: user?.name || inqName || "Anonymous", userPhone: user?.mobile || inqPhone || "", rating: Number(rating) || 5, comment: comment.trim() };
      const res = await api.post("/api/reviews", payload);
      const created = res?.data?.review || res?.data || null;
      if (created) {
        if (created.approved) {
          setReviews(prev => [created, ...(prev || [])]);
          show("Review submitted and published", { type: "success" });
        } else {
          show("Review submitted — pending approval", { type: "info" });
        }
      } else {
        show(res?.data?.message || "Review submitted", { type: "success" });
      }
      setComment(""); setRating(5);
    } catch (err) {
      console.error("submit review error", err);
      show(err?.response?.data?.message || "Failed to submit review", { type: "error" });
    } finally { setReviewSending(false); }
  };

  // star rating input
  const StarRatingInput = ({ value, onChange }) => (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Star rating">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star`} className="p-1 rounded focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <StarIcon size={18} className={n <= value ? "text-yellow-500" : "text-gray-300"} />
        </button>
      ))}
    </div>
  );

  // pagination helpers
  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));
  const goToPage = (p) => {
    const np = Math.min(Math.max(1, p), totalPages);
    setPage(np);
    window.scrollTo({ top: 160, behavior: "smooth" });
  };

  const resetListingFilters = () => {
    setSort("newest");
    setPage(1);
    setLimit(12);
    setSearchQuery(""); // clear internal search too
    fetchList();
  };

  // --- RENDER LISTING if no id ---
  if (!id) {
    // Listing skeleton
    if (listLoading) {
      return (
        <div className="py-8 max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse p-4 bg-white rounded-lg shadow">
                <div className="h-40 bg-gray-200 rounded mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 max-w-7xl mx-auto px-4">
        {/* Header + filters — SINGLE ROW */}
<div className="flex items-center justify-between mb-6 gap-4 flex-wrap">

  {/* LEFT — Title */}
  <div>
    <h1 className="text-2xl font-bold">Properties</h1>
  </div>

  {/* RIGHT — results + controls */}
  <div className="flex items-center gap-4 flex-wrap text-sm">

    {/* Results */}
    <div className="text-gray-600">
      {total} results {qParam ? `for “${qParam}”` : ""}
    </div>

    {/* Divider */}
    <div className="h-5 w-px bg-gray-300" />

    {/* Sort */}
    <div className="flex items-center gap-2">
      <span className="text-gray-600">Sort</span>
      <select
        value={sort}
        onChange={(e) => { setSort(e.target.value); setPage(1); }}
        className="border rounded px-2 py-1"
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="price_desc">Price: High → Low</option>
        <option value="price_asc">Price: Low → High</option>
      </select>
    </div>

    {/* Per page */}
    <div className="flex items-center gap-2">
      <span className="text-gray-600">Per page</span>
      <select
        value={limit}
        onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
        className="border rounded px-2 py-1"
      >
        <option value={6}>6</option>
        <option value={12}>12</option>
        <option value={24}>24</option>
      </select>
    </div>

    {/* Reset */}
    <button
      onClick={resetListingFilters}
      className="px-3 py-1 border rounded hover:bg-gray-50"
    >
      Reset
    </button>
  </div>
</div>


        {/* Results */}
        {list.length === 0 ? (
          <div className="p-6 bg-white rounded shadow text-gray-600">No properties found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.map((p) => (
              <div
                key={p._id || p.id}
                className="cursor-pointer"
              >
                {/* Use the centralized PropertyCard component */}
                <PropertyCard prop={p} />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">Page {page} of {Math.max(1, Math.ceil((total || 0) / limit))}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => goToPage(page - 1)} disabled={page <= 1} className="px-3 py-2 border rounded text-sm disabled:opacity-50">Prev</button>
            <div className="text-sm px-3 py-2 border rounded">{Math.min((page - 1) * limit + 1, total)} - {Math.min(page * limit, total)} of {total}</div>
            <button onClick={() => goToPage(page + 1)} disabled={(page * limit) >= total} className="px-3 py-2 border rounded text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      </motion.div>
    );
  }

  // --- DETAIL MODE: original content (unchanged behavior) ---
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="h-64 bg-gray-200 rounded-lg" />
            <div className="h-6 bg-gray-200 rounded w-1/2" />
            <div className="h-40 bg-gray-200 rounded" />
          </div>
          <div className="space-y-4">
            <div className="h-12 bg-gray-200 rounded" />
            <div className="h-40 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!property) return <div className="p-6">Property not found</div>;

  const images = property.images && property.images.length ? property.images : ["/placeholder.jpg"];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-16 md:pb-12">
      {/* Parent grid with equal height columns */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 p-6 items-stretch">
        {/* LEFT / main */}
        <main className="md:col-span-2 bg-gradient-to-b from-white to-slate-50 border rounded-3xl p-6 shadow-lg space-y-6 h-full flex flex-col">
          {/* Carousel */}
          <div
            className="relative rounded-xl overflow-hidden flex-none shadow-inner"
            ref={carouselRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* REDUCED HEIGHT: mobile h-64, desktop ~380px */}
            <div className="h-64 md:h-[380px] bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg overflow-hidden relative">
              {/* subtle overlay gradient and price ribbon */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />

              <AnimatePresence initial={false}>
                <motion.img
                  key={images[activeIndex]}
                  src={images[activeIndex]}
                  alt={property.title || "Property image"}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.35 }}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </AnimatePresence>

              {/* Price ribbon */}
              <div className="absolute left-4 top-4 bg-gradient-to-r from-indigo-600 to-violet-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-md">
                ₹{Number(property.price || 0).toLocaleString()}
              </div>

              {/* Status pill */}
              {property.status && (
                <div className="absolute right-4 top-4 bg-white/90 text-sm px-2 py-1 rounded-full font-medium text-gray-700 shadow">
                  {property.status}
                </div>
              )}
            </div>

            {images.length > 1 && (
              <>
                <button aria-label="Previous image" onClick={prevSlide} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow hover:scale-105 transition hidden sm:inline-flex">
                  <ArrowLeft size={18} />
                </button>
                <button aria-label="Next image" onClick={nextSlide} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow hover:scale-105 transition hidden sm:inline-flex">
                  <ArrowRight size={18} />
                </button>
              </>
            )}

            <div className="absolute bottom-3 left-4 right-4 flex justify-center gap-2 pointer-events-auto">
              {images.map((_, i) => (
                <button key={i} onClick={() => goToSlide(i)} aria-label={`Go to slide ${i+1}`} className={`w-2 h-2 rounded-full ${i === activeIndex ? "bg-white" : "bg-white/60"} shadow`} />
              ))}
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto py-2">
              {images.map((src, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  className={`shrink-0 w-24 h-14 rounded overflow-hidden border focus:outline-none focus:ring-2 ${idx === activeIndex ? "ring-2 ring-indigo-400" : "border-gray-200"} hover:scale-105 transition`}
                  aria-label={`Thumbnail ${idx+1}`}
                >
                  <img src={src} alt={`Thumbnail ${idx+1}`} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>

          {/* content */}
          <div className="flex-1 overflow-visible space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">{property.title}</h1>
              <p className="text-gray-600 mt-2">{property.description}</p>

              {/* tags row */}
              <div className="mt-3 flex flex-wrap gap-2">
                {(property.type ? [property.type] : []).concat(property.bedrooms ? [`${property.bedrooms} BHK`] : []).filter(Boolean).slice(0,5).map((t,i) => (
                  <div key={i} className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border">{t}</div>
                ))}
                {property.city && <div className="text-xs px-2 py-1 rounded-full bg-slate-50 text-slate-700 border">{property.city}</div>}
              </div>
            </div>

            {/* quick facts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/60 rounded-xl shadow-sm border">
                <div className="text-sm text-gray-500">Price</div>
                <div className="text-lg font-semibold">₹{Number(property.price || 0).toLocaleString()}</div>
              </div>
              <div className="p-4 bg-white/60 rounded-xl shadow-sm border">
                <div className="text-sm text-gray-500">Category</div>
                <div className="text-lg">{property.category || "-"}</div>
              </div>
              <div className="p-4 bg-white/60 rounded-xl shadow-sm border">
                <div className="text-sm text-gray-500">Location</div>
                <div>{property.location || "-"}, {property.city || "-"}</div>
              </div>
              <div className="p-4 bg-white/60 rounded-xl shadow-sm border">
                <div className="text-sm text-gray-500">Status</div>
                <div>{property.status || "-"}</div>
              </div>
            </div>

            {/* amenities */}
            <section>
              <h3 className="font-semibold text-lg">Amenities</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {property.amenities?.length ? property.amenities.map(a => (
                  <div key={a} className="flex items-center gap-2 bg-white/70 px-3 py-2 rounded-lg text-sm shadow-sm border">
                    <span className="text-lg" aria-hidden>{amenityIcons(a)}</span>
                    <span className="truncate">{a}</span>
                  </div>
                )) : <div className="text-sm text-gray-500">No amenities listed</div>}
              </div>
            </section>

            {/* reviews */}
            <section>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Reviews</h3>
                <div className="text-sm text-gray-500">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</div>
              </div>

              <div className="mt-3 space-y-3">
                {reviewsLoading ? (
                  <div className="text-sm text-gray-500">Loading reviews...</div>
                ) : reviews.length === 0 ? (
                  <div className="text-sm text-gray-500">No reviews yet — be the first to review.</div>
                ) : (
                  reviews.map(r => (
                    <motion.article key={r._id || r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-white rounded-lg shadow-sm border">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{r.userName || "Anonymous"}</div>
                        <div className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="mt-2 text-yellow-600 flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <StarIcon key={i} size={14} className={(i < (r.rating || 0) ? "text-yellow-500" : "text-gray-200")} />
                        ))}
                      </div>
                      <div className="mt-3 text-gray-700 text-sm">{r.comment}</div>
                    </motion.article>
                  ))
                )}
              </div>
            </section>
          </div>
        </main>

        {/* RIGHT / improved RHD */}
        <aside className="md:col-span-1 h-full">
          <div className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-3xl p-6 shadow-2xl flex flex-col gap-6 h-full">

            {/* Header band */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 uppercase tracking-wider">Listing</div>
                <div className="mt-1 text-lg font-semibold truncate">
                  {property.title?.slice(0, 50) || "Property"}
                </div>
                <div className="mt-1 text-sm text-gray-600">Quick actions & contact</div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-sm text-gray-500">From</div>
                <div className="text-base font-bold">₹{Number(property.price || 0).toLocaleString()}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setAsideTab("brochure")}
                className={`py-2 rounded-lg text-sm font-medium transition ${
                  asideTab === "brochure"
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-white text-gray-700 border"
                }`}
              >
                Brochure
              </button>

              <button
                onClick={() => setAsideTab("contact")}
                className={`py-2 rounded-lg text-sm font-medium transition ${
                  asideTab === "contact"
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-white text-gray-700 border"
                }`}
              >
                Contact
              </button>

              <button
                onClick={() => setAsideTab("interest")}
                className={`py-2 rounded-lg text-sm font-medium transition ${
                  asideTab === "interest"
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-white text-gray-700 border"
                }`}
              >
                I'm Interested
              </button>
            </div>

            {/* Active Tab Card (Brochure / Contact / Interest) */}
            <div className="rounded-xl p-4 bg-gradient-to-b from-white to-gray-50 border shadow-inner">
              {asideTab === "brochure" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 font-medium">Brochure</div>
                    {verifiedBrochure ? (
                      <div className="text-xs text-emerald-600 font-semibold">Verified ✓</div>
                    ) : (
                      <div className="text-xs text-gray-400">OTP required</div>
                    )}
                  </div>

                  {property.brochureUrl ? (
                    !otpSent ? (
                      <div className="space-y-3">
                        <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Email for OTP" value={email} onChange={(e) => setEmail(e.target.value)} />
                        <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
                        <button onClick={handleSendOtp} disabled={sending} className="w-full py-2 rounded-md text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow">
                          {sending ? "Sending..." : "Send OTP & Download"}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Enter OTP" value={code} onChange={(e) => setCode(e.target.value)} />
                        <div className="flex gap-3">
                          <button onClick={handleVerify} className="flex-1 py-2 rounded-md text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-500 shadow">Verify & Open</button>
                          <button onClick={() => { setOtpSent(false); setCode(""); setVerifiedBrochure(false); }} className="flex-1 py-2 rounded-md text-sm border bg-white">Reset</button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-sm text-gray-500">No brochure uploaded.</div>
                  )}
                </div>
              )}

              {/* Contact Admin */}
              {asideTab === "contact" && (
                <div className="space-y-3">
                  <div className="text-sm text-gray-700 font-medium">Contact Admin</div>
                  <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Name" value={inqName} onChange={(e) => setInqName(e.target.value)} />
                  <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Phone" value={inqPhone} onChange={(e) => setInqPhone(e.target.value)} />
                  <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <div className="flex gap-3 mt-2">
                    <button onClick={handleContactAdmin} className="flex-1 py-2 rounded-md text-sm font-semibold border bg-white">Contact Admin</button>
                    <button onClick={handleQuickInterest} className="flex-1 py-2 rounded-md text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-500">I'm Interested</button>
                  </div>
                </div>
              )}

              {/* Interest */}
              {asideTab === "interest" && (
                <div className="space-y-3">
                  <div className="text-sm text-gray-700 font-medium">Quick Interest</div>
                  <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Name" value={inqName} onChange={(e) => setInqName(e.target.value)} />
                  <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Phone" value={inqPhone} onChange={(e) => setInqPhone(e.target.value)} />
                  <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <button onClick={handleQuickInterest} className="w-full py-2 rounded-md text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-500">Notify me</button>
                  <div className="text-sm text-gray-500">Or send a short inquiry below</div>
                  <textarea value={inqMessage} onChange={(e) => setInqMessage(e.target.value)} rows={3} className="w-full border rounded px-3 py-2 text-sm" placeholder="Write your message..."></textarea>
                  <button onClick={handleSubmitInquiry} disabled={inqSending} className="w-full py-2 rounded-md text-sm font-semibold bg-indigo-700 text-white">{inqSending ? "Sending..." : "Send Inquiry"}</button>
                </div>
              )}
            </div>

            {/* Review + Catch-up */}
            <div className="rounded-xl p-4 bg-white border shadow-sm flex flex-col flex-1">
              {/* Review box */}
              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Review this property</div>
                <div className="flex items-center gap-3 mb-3">
                  <StarRatingInput value={rating} onChange={setRating} />
                  <div className="text-sm text-gray-500">{rating}/5</div>
                </div>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="w-full border rounded px-3 py-2 text-sm mb-3" placeholder="Share your experience..."></textarea>
                <div className="flex gap-3">
                  <button onClick={handleSubmitReview} disabled={reviewSending} className="flex-1 py-2 rounded-md text-sm font-semibold bg-green-600 text-white shadow">
                    {reviewSending ? "Saving..." : "Submit Review"}
                  </button>
                  <button onClick={() => { setComment(""); setRating(5); }} className="flex-1 py-2 rounded-md border text-sm">Clear</button>
                </div>
              </div>

              <div className="h-px bg-gray-100 my-3" />

              {/* Catch-up */}
              <div className="flex-1 flex flex-col justify-between rounded-md p-3" style={{ background: "linear-gradient(180deg,#fff,#fbfbff)" }}>
                <div>
                  <h4 className="text-lg font-semibold mb-1">Catch up with us</h4>
                  <p className="text-sm text-gray-600 mb-4">Need a quick, friendly call? No pressure — we’ll answer questions and walk you through details quickly.</p>

                  <div className="flex flex-col gap-3">
                    <a href={`tel:${PHONE_NUMBER}`} className="inline-flex items-center justify-center gap-3 px-4 py-2 rounded-md text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-500 text-white shadow" aria-label="Call us">
                      <Phone size={16} /> Call Us
                    </a>

                    <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-3 px-4 py-2 rounded-md text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-400 text-white shadow" aria-label="Chat on WhatsApp">
                      <MessageSquare size={16} /> WhatsApp
                    </a>
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-500">Available 9:00 AM – 7:00 PM. Prefer chat? Drop a message and we’ll respond shortly.</div>
              </div>
            </div>

            {/* CONTACT TILES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a href={`tel:${PHONE_NUMBER}`} className="flex items-center gap-3 p-3 rounded-lg bg-white border hover:shadow">
                <div className="p-2 rounded-full bg-indigo-50 text-indigo-700 shadow-sm"><Phone size={18} /></div>
                <div>
                  <div className="text-sm font-medium">Call</div>
                  <div className="text-xs text-gray-500">{PHONE_NUMBER}</div>
                </div>
              </a>

              <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-white border hover:shadow">
                <div className="p-2 rounded-full bg-green-50 text-green-700 shadow-sm"><MessageSquare size={18} /></div>
                <div>
                  <div className="text-sm font-medium">WhatsApp</div>
                  <div className="text-xs text-gray-500">Chat</div>
                </div>
              </a>

              <a href={`mailto:${MAIL_ADDRESS}`} className="flex items-center gap-3 p-3 rounded-lg bg-white border hover:shadow">
                <div className="p-2 rounded-full bg-yellow-50 text-yellow-700 shadow-sm"><Mail size={18} /></div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">Email</div>
                  <div className="text-xs text-gray-500 break-words">{MAIL_ADDRESS}</div>
                </div>
              </a>

              <a href={INSTAGRAM_LINK} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-white border hover:shadow">
                <div className="p-2 rounded-full bg-pink-50 text-pink-700 shadow-sm"><Instagram size={18} /></div>
                <div>
                  <div className="text-sm font-medium">Instagram</div>
                  <div className="text-xs text-gray-500">@{INSTAGRAM_HANDLE}</div>
                </div>
              </a>
            </div>

            {/* FIND SIMILAR SECTION */}
            <div className="rounded-xl p-4 bg-white border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Find similar properties</div>
                  <div className="text-xs text-gray-600">Properties in the same area & category</div>
                </div>
                {/* View all now points to the listing route /property */}
                <Link to="/property" className="text-xs text-indigo-600 font-semibold hover:underline">View all</Link>
              </div>

              <div className="mt-3">
                {similarLoading ? (
                  <div className="text-sm text-gray-500">Loading similar...</div>
                ) : similar.length === 0 ? (
                  <div className="text-sm text-gray-500">No similar listings found.</div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto py-2 snap-x snap-mandatory -mx-1 px-1">
                    {similar.map((s) => (
                      <div key={s._id || s.id} className="shrink-0 w-52">
                        <PropertyCard prop={s} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </aside>
      </div>

      {/* Mobile sticky quick-actions */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-2xl sm:hidden">
        <div className="bg-white/90 backdrop-blur-md border rounded-full p-2 shadow-lg flex items-center justify-between gap-3">
          <a href={`tel:${PHONE_NUMBER}`} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 text-white text-sm font-semibold shadow" aria-label="Call">
            <Phone size={16} /> Call
          </a>
          <a href={WHATSAPP_LINK} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-400 text-white text-sm font-semibold shadow" aria-label="WhatsApp">
            <MessageSquare size={16} /> WhatsApp
          </a>
        </div>
      </div>

      <Toast />
    </motion.div>
  );
}
