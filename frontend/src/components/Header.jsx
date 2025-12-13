// src/components/Header.jsx
import React, { useState, useContext, useEffect, useRef } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../context/AuthContext";
import {
  Search as SearchIcon,
  X as XIcon,
} from "lucide-react";

const RECENT_KEY = "bapuji_recent_searches";

export default function Header({
  onSearch,
  fetchSuggestionsUrl = "/api/properties/suggest",
  minSuggestChars = 1,
}) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState([]);
  const [announce, setAnnounce] = useState("");
  const [compact, setCompact] = useState(false);
  const [listening, setListening] = useState(false);

  const inputRef = useRef(null);
  const suggestRef = useRef(null);
  const cacheRef = useRef(new Map());
  const pendingController = useRef(null);
  const recognitionRef = useRef(null);

  // Pull q from URL if present (keeps header in sync)
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      setQ(params.get("q") || "");
    } catch (e) {}
  }, [location.search]);

  useEffect(() => {
    try {
      const j = localStorage.getItem(RECENT_KEY);
      if (j) setRecent(JSON.parse(j));
    } catch (e) {}
  }, []);

  useEffect(() => {
    function onScroll() {
      setCompact(window.scrollY > 40);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (
        e.key === "/" &&
        document.activeElement &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setShowSuggest(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // optional speech recognition setup (keeps your original)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (!SR) return;
    const r = new SR();
    r.lang = "en-IN";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      setQ(text);
      setShowSuggest(true);
      submitSearch(null, null, text);
    };
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognitionRef.current = r;
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
    };
  }, []);

  useEffect(() => {
    function onDoc(e) {
      if (
        suggestRef.current &&
        !suggestRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowSuggest(false);
      }
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const scoreItem = (query, text = "") => {
    const ql = query.trim().toLowerCase();
    const t = (text || "").toLowerCase();
    if (!ql) return 0;
    if (t.startsWith(ql)) return 100;
    if (t.includes(ql)) return 50 - t.indexOf(ql) / 100;
    let score = 0,
      qi = 0;
    for (let i = 0; i < t.length && qi < ql.length; i++) {
      if (t[i] === ql[qi]) {
        score++;
        qi++;
      }
    }
    return score;
  };
  const getDebounce = (q) => {
    if (!q) return 0;
    if (q.length <= 2) return 120;
    if (q.length <= 4) return 100;
    return 70;
  };
  const escapeHtml = (s = "") =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  const highlight = (text = "", q = "") => {
    if (!q) return escapeHtml(text);
    const qi = q.trim();
    if (!qi) return escapeHtml(text);
    const re = new RegExp(`(${qi.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "ig");
    return escapeHtml(text).replace(re, "<mark class=\"bg-yellow-100 rounded-sm px-0.5\">$1</mark>");
  };

  // Strict client-side matching function (same fields as Property.jsx)
  const matchStrict = (query, rawItem) => {
    if (!query) return true; // no query -> match
    const ql = String(query).trim().toLowerCase();
    if (!ql) return true;

    const haystackParts = [];

    // rawItem might be the "raw" property object from API or normalized
    // gather common fields
    const pushIf = (v) => {
      if (Array.isArray(v)) haystackParts.push(v.join(" "));
      else if (v) haystackParts.push(String(v));
    };

    pushIf(rawItem.title || rawItem.name || rawItem.locality || rawItem.propertyName);
    pushIf(rawItem.subtitle || rawItem.address || rawItem.builder || rawItem.neighborhood);
    pushIf(rawItem.city || rawItem.town || rawItem.locality || rawItem.region);
    pushIf(rawItem.category || rawItem.type || rawItem.propertyType);
    pushIf(rawItem.location || rawItem.address || rawItem.area);
    pushIf(rawItem.description || rawItem.meta || rawItem.summary);
    pushIf(rawItem.price ? String(rawItem.price) : null);
    if (rawItem.amenities) pushIf(rawItem.amenities);
    // also include any string fields that might matter
    Object.keys(rawItem || {}).forEach((k) => {
      try {
        const v = rawItem[k];
        if (typeof v === "string" && v.length < 200 && v.length > 0) {
          haystackParts.push(v);
        }
      } catch (e) {}
    });

    const hay = haystackParts.join(" ").toLowerCase();
    return hay.includes(ql);
  };

  useEffect(() => {
    if (!fetchSuggestionsUrl) return;
    if (q.length < minSuggestChars) {
      setSuggestions([]);
      setShowSuggest(false);
      if (pendingController.current) {
        pendingController.current.abort();
        pendingController.current = null;
      }
      return;
    }
    const cached = cacheRef.current.get(q);
    if (cached) {
      setSuggestions(cached);
      setShowSuggest(true);
      setActiveIndex(-1);
      setAnnounce(`${cached.length} suggestions available`);
      return;
    }
    const debounceMs = getDebounce(q);
    const timer = setTimeout(() => {
      if (pendingController.current) pendingController.current.abort();
      const controller = new AbortController();
      pendingController.current = controller;
      setLoading(true);

      fetch(`${fetchSuggestionsUrl}?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(r)))
        .then((data) => {
          const arr = Array.isArray(data) ? data : [];

          // Normalize suggestions to allow both property objects and simple items
          const normalized = arr.map((s) => {
            return {
              id: s.id || s._id || s.propertyId || null,
              title: s.title || s.name || s.locality || "",
              subtitle: s.subtitle || s.address || s.builder || "",
              meta: s.meta || (s.price ? formatPrice(s.price) : undefined) || s.description || "",
              thumbnail: s.thumbnail || s.image || (s.images && s.images[0]) || null,
              type: s.type || (s.propertyType ? "property" : "suggestion"),
              raw: s,
            };
          });

          // score/rank suggestions
          const ranked = normalized
            .map((s) => ({ ...s, _score: Math.max(scoreItem(q, s.title), scoreItem(q, s.subtitle || ""), scoreItem(q, s.meta || "")) }))
            // keep if score positive OR short queries (len <= 2) OR matches strict haystack
            .filter((s) => s._score > 0 || q.length <= 2 || matchStrict(q, s.raw))
            .sort((a, b) => b._score - a._score)
            .slice(0, 12);

          // FINAL SAFETY: apply strict filtering again to remove server fuzzy mismatches
          const final = ranked.filter((s) => matchStrict(q, s.raw) || s._score > 0 || q.length <= 2);

          cacheRef.current.set(q, final);
          setSuggestions(final);
          setActiveIndex(-1);
          setShowSuggest(true);
          setAnnounce(`${final.length} suggestions available`);
        })
        .catch((err) => {
          if (err.name !== "AbortError") console.warn("suggest fetch", err);
        })
        .finally(() => {
          setLoading(false);
          pendingController.current = null;
        });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [q, fetchSuggestionsUrl, minSuggestChars]);

  const toggle = () => setOpen((v) => !v);
  const close = () => {
    setOpen(false);
    setShowSuggest(false);
  };
  const handleLogout = () => {
    logout();
    navigate("/");
    close();
  };

  const saveRecent = (term) => {
    try {
      if (!term) return;
      const next = [term, ...recent.filter((r) => r !== term)].slice(0, 6);
      setRecent(next);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch (e) {}
  };

  // small helper
  function formatPrice(p) {
    try {
      if (typeof p === "number") return p.toLocaleString("en-IN", { maximumFractionDigits: 0 });
      return p;
    } catch (e) {
      return p;
    }
  }

  // Submit search: navigate to listing or detail depending on suggestion
  const submitSearch = (e, suggestion, overrideText) => {
    if (e && e.preventDefault) e.preventDefault();
    const value = overrideText ?? (suggestion ? suggestion.title : q);
    if (!value) return;
    saveRecent(value);
    setShowSuggest(false);

    if (typeof onSearch === "function") onSearch(value, suggestion);

    // If suggestion looks like a property with an id, go to detail route
    if (suggestion && suggestion.id) {
      navigate(`/property/${encodeURIComponent(suggestion.id)}`);
    } else {
      // otherwise go to listing with q param
      navigate({ pathname: "/property", search: `?q=${encodeURIComponent(value || "")}` });
    }

    // keep header input in sync
    setQ(value);
    close();
  };

  const onKeyDown = (e) => {
    if (showSuggest && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0) {
          submitSearch(null, suggestions[activeIndex]);
        } else {
          submitSearch(null, null, q);
        }
      } else if (e.key === "Escape") {
        setShowSuggest(false);
      }
    } else if (e.key === "Enter") {
      // no suggestions visible, still submit
      e.preventDefault();
      submitSearch(null, null, q);
    }
  };

  const startVoice = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (e) {
      console.warn(e);
    }
  };
  const stopVoice = () => {
    try {
      recognitionRef.current?.stop();
      setListening(false);
    } catch (e) {}
  };

  const removeRecent = (term) => {
    const next = recent.filter((r) => r !== term);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const NavItem = ({ to, children, exact, onClick: itemOnClick }) => (
    <NavLink
      to={to}
      end={exact}
      onClick={(e) => {
        if (typeof itemOnClick === "function") {
          try {
            itemOnClick(e);
          } catch (err) {}
        }
        close();
      }}
      className={({ isActive }) =>
        `relative group inline-flex items-center text-sm px-3 py-2 rounded-md transition-colors duration-200 ${isActive ? "text-gray-900" : "text-gray-700 hover:text-gray-900"}`
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative z-10">{children}</span>
          <span
            aria-hidden
            className={`absolute -bottom-1 left-1/2 h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-transform duration-300 transform-gpu -translate-x-1/2 ${isActive ? "scale-x-100 shadow-[0_6px_18px_rgba(59,130,246,0.12)]" : "scale-x-0 group-hover:scale-x-100"}`}
            style={{ width: "48%", transformOrigin: "center" }}
          />
        </>
      )}
    </NavLink>
  );

  const MicIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M19 11v1a7 7 0 01-14 0v-1" />
    </svg>
  );
  const MicListeningIcon = ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <defs>
        <radialGradient id="g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(99,102,241,0.9)" />
          <stop offset="100%" stopColor="rgba(59,130,246,0.2)" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#g)" opacity="0.12" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M19 11v1a7 7 0 01-14 0v-1" />
    </svg>
  );

  const goToProperties = (e) => {
    close();
    navigate("/property");
  };

  return (
    <header className={`bg-white border-b shadow-sm z-40 ${compact ? "py-1" : "py-3"} sticky top-0`}>
      <div className="container mx-auto px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3" onClick={close}>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-md px-3 py-2 font-bold text-lg shadow">B</div>
            <div className="hidden sm:block">
              <div className="font-bold">Bapuji Real Estate</div>
              <div className="text-xs text-gray-500">Trusted properties</div>
            </div>
          </Link>
        </div>

        <form onSubmit={submitSearch} className="hidden md:flex items-center flex-1 max-w-lg mx-4 relative">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setShowSuggest(true)}
            placeholder="Search city, locality, property or builder — try 'Pune' or '2BHK'"
            className="flex-1 border rounded-l-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Search properties"
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            aria-activedescendant={activeIndex >= 0 ? `suggest-${activeIndex}` : undefined}
          />

          <button
            type="button"
            onClick={() => (listening ? stopVoice() : startVoice())}
            title={listening ? "Stop listening" : "Voice search"}
            aria-pressed={listening}
            className={`bg-transparent border-l px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${listening ? "text-red-600" : "text-gray-600"}`}
          >
            {listening ? <MicListeningIcon size={18} /> : <MicIcon size={16} />}
          </button>

          <button
            type="submit"
            className="bg-transparent border-l border-blue-500 px-4 py-2 rounded-r-md text-sm hover:bg-blue-50 transition-colors"
            aria-label="Search"
          >
            Search
          </button>

          <AnimatePresence>
            {showSuggest && (
              <motion.div
  initial={{ opacity: 0, y: -6 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -4 }}
  className="absolute left-0 right-0 mt-[220px] z-50"
>

                <ul id="search-suggestions" ref={suggestRef} role="listbox" className="bg-white border rounded-md shadow-lg max-h-64 overflow-auto">
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <div className="text-xs text-gray-600">Suggestions</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      {loading ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                      ) : null}
                      <span className="text-xs">{suggestions.length} result(s)</span>
                    </div>
                  </div>

                  {!q && recent.length > 0 && (
                    <div className="px-2 py-2">
                      <div className="text-xs text-gray-500 px-2 mb-2">Recent searches</div>
                      {recent.map((r, i) => (
                        <div key={`recent-${i}`} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 rounded">
                          <button
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setQ(r);
                              submitSearch(null, { title: r });
                            }}
                            className="text-left flex-1"
                          >
                            {r}
                          </button>
                          <button onClick={() => removeRecent(r)} title="Remove" className="ml-3 text-xs text-red-500">
                            Remove
                          </button>
                        </div>
                      ))}
                      <div className="mt-2 text-xs text-right">
                        <button
                          onClick={() => {
                            setRecent([]);
                            localStorage.removeItem(RECENT_KEY);
                          }}
                          className="text-xs text-red-500"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}

                  {q && suggestions.length === 0 && !loading && <li className="px-3 py-3 text-sm text-gray-500">No results for "{q}"</li>}

                  {q &&
                    suggestions.map((s, idx) => (
                      <li
                        key={s.id || `${s.title}-${idx}`}
                        id={`suggest-${idx}`}
                        role="option"
                        aria-selected={idx === activeIndex}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          submitSearch(null, s);
                        }}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`px-3 py-2 cursor-pointer flex gap-3 items-center ${idx === activeIndex ? "bg-gray-100" : "hover:bg-gray-50"}`}
                      >
                        {s.thumbnail ? (
                          <img src={s.thumbnail} alt={s.title} className="w-12 h-8 object-cover rounded-sm flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-8 bg-gray-100 rounded-sm flex-shrink-0 flex items-center justify-center text-xs text-gray-400">No</div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate" dangerouslySetInnerHTML={{ __html: highlight(s.title, q) }} />
                          {s.subtitle && <div className="text-xs text-gray-500 truncate mt-0.5" dangerouslySetInnerHTML={{ __html: highlight(s.subtitle, q) }} />}
                          {s.meta && <div className="text-xs text-gray-400 mt-1">{s.meta}</div>}
                        </div>

                        <div className="text-xs text-gray-500 ml-2">{s.type === "property" ? "Property" : "Suggestion"}</div>
                      </li>
                    ))}
                </ul>
                <div className="sr-only" aria-live="polite">
                  {announce}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <nav className="hidden md:flex items-center gap-3">
          <NavItem to="/" exact>Home</NavItem>

          <NavItem to="/property">Properties</NavItem>

          <NavItem to="/about">About</NavItem>

          <div className="ml-2 flex items-center gap-2">
            {!user ? (
              <>
                <Link to="/login" className="text-sm px-3 py-2 rounded-md bg-blue-600 text-white">Login</Link>
                <Link to="/register" className="text-sm px-3 py-2 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50">Sign up</Link>
              </>
            ) : (
              <>
                <NavLink to="/profile" className="text-sm px-3 py-2 rounded-md text-gray-700 hover:text-gray-900">Profile</NavLink>
                {user.role === "admin" && <NavLink to="/admin" className="text-sm px-3 py-2 rounded-md text-gray-700 hover:text-gray-900">Admin</NavLink>}
                <button onClick={handleLogout} className="text-sm px-3 py-2 rounded-md text-red-600 hover:opacity-90">Logout</button>
              </>
            )}
          </div>
        </nav>

        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => {
              if (q) {
                submitSearch(null, null, q);
              } else {
                toggle();
                setTimeout(() => {
                  const el = document.querySelector(".mobile-search-input");
                  if (el) el.focus();
                }, 160);
              }
            }}
            aria-label="Quick search or open menu"
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
          </button>

          <button onClick={toggle} aria-label="Open menu" className="p-2 rounded-md">
            <span className="relative w-6 h-6 inline-block">
              <motion.span animate={open ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }} transition={{ duration: 0.18 }} className="block absolute left-0 right-0 h-[2px] bg-gray-700" />
              <motion.span animate={open ? { opacity: 0 } : { opacity: 1 }} transition={{ duration: 0.12 }} className="block absolute left-0 right-0 top-2 h-[2px] bg-gray-700" />
              <motion.span animate={open ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }} transition={{ duration: 0.18 }} className="block absolute left-0 right-0 top-4 h-[2px] bg-gray-700" />
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="md:hidden fixed inset-0 z-50">
            <motion.button onClick={close} initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/20 z-40" aria-label="Close menu backdrop" />

            <motion.div initial={{ y: -20 }} animate={{ y: 0 }} exit={{ y: -10 }} transition={{ duration: 0.2 }} className="absolute inset-0 bg-white p-6 overflow-auto z-50">
              <div className="flex items-center justify-between mb-6">
                <Link to="/" onClick={close} className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-md px-3 py-2 font-bold text-lg shadow">B</div>
                  <div>
                    <div className="font-bold">Bapuji Real Estate</div>
                    <div className="text-xs text-gray-500">Trusted properties</div>
                  </div>
                </Link>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => (listening ? stopVoice() : startVoice())}
                      aria-pressed={listening}
                      aria-label={listening ? "Stop voice search" : "Start voice search"}
                      className={`h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-transform ${listening ? "bg-red-50 text-red-600 scale-95" : "bg-indigo-600 text-white hover:scale-105"}`}
                    >
                      {listening ? <MicListeningIcon size={22} /> : <MicIcon size={18} />}
                    </button>
                    {listening && <span className="absolute -inset-1 rounded-full animate-ping" style={{ boxShadow: "0 0 0 6px rgba(59,130,246,0.12)" }} />}
                  </div>

                  <button onClick={close} className="p-2 rounded-md">
                    <svg className="h-6 w-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={submitSearch} className="mb-6">
                <div className="flex gap-2">
                  <input className="mobile-search-input flex-1 border rounded px-3 py-2 text-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search city, locality..." />
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Search</button>
                </div>
              </form>

              <div className="flex flex-col gap-3">
                <Link to="/" onClick={close} className="text-lg text-gray-800">Home</Link>
                <button onClick={() => { goToProperties(); }} className="text-lg text-gray-800 text-left">Properties</button>
                <Link to="/about" onClick={close} className="text-lg text-gray-800">About</Link>

                {!user ? (
                  <>
                    <Link to="/login" onClick={close} className="text-lg text-blue-600">Login</Link>
                    <Link to="/register" onClick={close} className="text-lg border border-blue-600 text-blue-600 px-3 py-2 rounded text-center">Sign up</Link>
                  </>
                ) : (
                  <>
                    <Link to="/profile" onClick={close} className="text-lg text-gray-800">Profile</Link>
                    {user.role === "admin" && <Link to="/admin" onClick={close} className="text-lg text-gray-800">Admin</Link>}
                    <button onClick={() => { handleLogout(); }} className="text-lg text-red-600 text-left">Logout</button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </header>
  );
}
