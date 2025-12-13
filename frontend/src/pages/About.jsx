// AboutRefactor.jsx — Subtitle rendered line-by-line
// - If `meta.subtitle` is a string it will be split into sentences and rendered as separate <p> lines.
// - Keeps rest of the file unchanged (lucide icons, timeline, aside, FAQ, modal).

import React, { useState, useMemo, createContext, useContext } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, SearchCheck, FileCheck, Headset } from "lucide-react";

// --------------------
// Defaults (can be overridden by props)
// --------------------
const DEFAULT_META = {
  title: "About Bapuji Real Estate",
  subtitle:
    "Premium property discovery with verified listings and verified local inspection teams. We ensure every listing is cross-checked for accuracy, legality, and on-site condition. Our mission is to make buying and selling property transparent, safe, and hassle-free.",
  phone: "8308040123",
  founded: "2015",
  hq: "Pune, India",
};

// workflow as objects with title + detail
const DEFAULT_WORKFLOW = [
  {
    id: "search",
    title: "Search & Shortlist",
    detail: "Find listings using filters and trusted local agents.",
  },
  {
    id: "verify",
    title: "Verify & Inspect",
    detail: "On-ground inspections and document checks by our partners.",
  },
  {
    id: "visit",
    title: "Schedule Visit",
    detail:
      "Pick a convenient slot; we confirm and accompany visits if required.",
  },
  {
    id: "negotiate",
    title: "Negotiate & Paperwork",
    detail: "Support during negotiation and document preparation.",
  },
  {
    id: "handover",
    title: "Handover & Support",
    detail: "Post-sale support until handover and beyond.",
  },
];

const DEFAULT_FAQS = [
  {
    id: "list",
    q: "How do I list a property?",
    a: "Create an account, fill listing details and our team will verify before publishing.",
  },
  {
    id: "verified",
    q: "Are listings verified?",
    a: "Yes — we verify ownership documents and conduct physical inspections.",
  },
  {
    id: "time",
    q: "How long does verification take?",
    a: "Verification typically completes within 3-5 business days depending on documents.",
  },
  {
    id: "docs",
    q: "What documents are required?",
    a: "ID proof, property title documents, and latest tax receipts typically suffice.",
  },
  {
    id: "visit",
    q: "Can I schedule a private visit?",
    a: "Yes — book a visit from the property page and our representative will confirm the slot.",
  },
];

// --------------------
// Accordion context (single-open behavior)
// --------------------
const AccordionContext = createContext();
const useAccordion = () => useContext(AccordionContext);
function AccordionProvider({ children, initial = null }) {
  const [openId, setOpenId] = useState(initial);
  const toggle = (id) => setOpenId((cur) => (cur === id ? null : id));
  return (
    <AccordionContext.Provider value={{ openId, toggle }}>
      {children}
    </AccordionContext.Provider>
  );
}

// --------------------
// Small helper Card component
// --------------------
function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm p-4 border border-gray-100 ${className}`}
    >
      {children}
    </div>
  );
}

// --------------------
// PageHeader — intentionally empty per request (title/subtitle/premium removed)
// --------------------
export function PageHeader() {
  return null;
}

// --------------------
// Aside: verified card (not sticky) + FAQs card (no duplicated company info)
// --------------------
export function AsideWithFaq({ meta, onOpenVerification, faqs }) {
  return (
    <aside className="w-full md:w-72">
      {/* Verified card — no sticky */}
      <div className="mb-4">
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-4 border border-gray-100 shadow-inner">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-lg bg-amber-200 flex items-center justify-center text-amber-900 font-bold">
              BR
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900">
                Bapuji Verified
              </div>
              <div className="text-xs text-gray-500">
                On-ground inspection & document checks
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-600">
           Our partners inspect every property before it goes live. 
ensurimg listings meet our quality and transparency standards.

          </p>

          <div className="mt-4 flex gap-2">
            <button
              onClick={onOpenVerification}
              className="px-3 py-1 bg-amber-50 text-amber-700 rounded"
            >
              Check how we verify
            </button>
          </div>
        </div>
      </div>

      {/* FAQs card — only FAQs (company info removed to avoid duplicates) */}
      <div className="bg-white rounded-2xl shadow p-4 border border-gray-100">
        <h4 className="text-sm font-semibold text-gray-800 mb-3">FAQs</h4>
        <div className="space-y-2">
          {faqs.slice(0, 4).map((f) => (
            <div key={f.id} className="border rounded-lg p-3 bg-gray-50">
              <div className="text-sm font-medium text-gray-900">{f.q}</div>
              <div className="text-xs text-gray-600 mt-1">{f.a}</div>
            </div>
          ))}
        </div>

        <Link
          to="/help"
          className="mt-3 inline-block text-sm text-amber-600 hover:underline"
        >
          See all FAQs →
        </Link>
      </div>
    </aside>
  );
}

// --------------------
// Timeline component (vertical steps)
// --------------------
export function Timeline({ steps }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 h-full">
      <h3 className="text-md font-semibold text-gray-800 mb-3">
        How we work — Timeline
      </h3>
      <div className="relative pl-8">
        <div className="absolute left-3 top-3 bottom-3 w-px bg-gray-200" />
        {steps.map((step, i) => (
          <div key={step.id ?? i} className="mb-6 relative">
            <div className="absolute left-0 top-0 h-8 w-8 rounded-full bg-white border-2 border-amber-300 flex items-center justify-center text-amber-700 font-medium">
              {i + 1}
            </div>
            <div className="ml-10">
              <div className="font-medium text-gray-800">{step.title}</div>
              <div className="text-sm text-gray-600 mt-1">{step.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --------------------
// FAQ accordion (keeps behaviour)
// --------------------
function FAQItem({ id, q, a }) {
  const { openId, toggle } = useAccordion();
  const open = openId === id;
  return (
    <div className="bg-white rounded-2xl">
      <button
        onClick={() => toggle(id)}
        aria-expanded={open}
        className="w-full text-left px-4 py-3 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-amber-200"
      >
        <span className="text-sm font-medium text-gray-900">{q}</span>
        <span className="text-gray-500 text-sm">{open ? "−" : "+"}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 text-gray-600 text-sm bg-gray-50">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQAccordion({
  faqs,
  placeholder = "Search FAQs...",
  onContact,
}) {
  const [q, setQ] = useState("");
  const results = useMemo(
    () =>
      faqs.filter((f) =>
        (f.q + " " + f.a).toLowerCase().includes(q.trim().toLowerCase())
      ),
    [faqs, q]
  );

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
        />
      </div>

      <AccordionProvider>
        <div className="grid gap-3">
          {results.length === 0 && (
            <div className="text-sm text-gray-500 p-3">
              No FAQs match “{q}”.
            </div>
          )}
          {results.map((f) => (
            <FAQItem key={f.id} id={f.id} q={f.q} a={f.a} />
          ))}
        </div>
      </AccordionProvider>

      <div className="mt-4 text-xs text-gray-500">
        Can't find an answer?{" "}
        <button onClick={onContact} className="text-amber-600 underline">
          Contact us
        </button>
        .
      </div>
    </div>
  );
}

// --------------------
// Verification modal (unchanged)
// --------------------
export function VerificationModal({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Bapuji Verification</h3>
                <p className="text-sm text-gray-600 mt-1">
                  How our verification works and what we check.
                </p>
              </div>
              <button onClick={onClose} className="text-gray-400">
                ✕
              </button>
            </div>

            <div className="mt-4 text-sm text-gray-700 space-y-3">
              <div>
                <div className="font-medium">On-site inspection</div>
                <div className="text-gray-600">
                  A trained partner visits the property to confirm condition,
                  boundaries and amenities.
                </div>
              </div>

              <div>
                <div className="font-medium">Document check</div>
                <div className="text-gray-600">
                  We verify title documents, tax receipts and owner identity to
                  reduce risk.
                </div>
              </div>

              <div>
                <div className="font-medium">Verification badge</div>
                <div className="text-gray-600">
                  Verified listings get a clear badge and higher visibility on
                  our platform.
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// --------------------
// Main About component
// --------------------
export default function AboutRefactor({
  meta = DEFAULT_META,
  workflow = DEFAULT_WORKFLOW,
  faqs = DEFAULT_FAQS,
}) {
  const [showVerification, setShowVerification] = useState(false);

  // sample stats (optional)
  const stats = [
    { label: "Listings verified", value: "1.2k+" },
    { label: "Cities", value: "12" },
    { label: "Agents", value: "180+" },
    {
      label: "Years",
      value: meta.founded
        ? `${new Date().getFullYear() - Number(meta.founded)} yrs`
        : "—",
    },
  ];

  const testimonials = [
    {
      author: "Ravi K., Buyer",
      quote: "Smooth inspection and quick verification — highly recommended.",
    },
    {
      author: "Maya S., Seller",
      quote: "Professional team, easy paperwork and great support.",
    },
  ];

  // Render subtitle line-by-line:
  const subtitleLines = useMemo(() => {
    if (!meta?.subtitle) return [];
    if (Array.isArray(meta.subtitle)) return meta.subtitle.filter(Boolean);
    // split on sentence endings (". " or ".\n") while keeping punctuation tidy
    const pieces = meta.subtitle
      .split(/(?:\.\s+|\.\n+)/)
      .map((s) => s.trim())
      .filter(Boolean);
    // ensure each piece ends with a period for consistent line rendering
    return pieces.map((p) => (/[.!?]$/.test(p) ? p : `${p}.`));
  }, [meta]);

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-white via-white to-gray-50 p-6 md:p-12"
      data-testid="about-page"
    >
      <div className="max-w-7xl mx-auto">
        <PageHeader />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1">
                {/* NEW: Company title above description */}
                <h2 className="text-2xl md:text-3xl font-extrabold mb-3 text-gray-900">
                  About Bapuji Real Estate
                </h2>

                {/* Subtitle rendered as separate lines */}
                <div className="text-gray-700 leading-snug text-xs md:text-sm space-y-2 mb-6">
                  {subtitleLines.map((line, idx) => (
                    <p key={idx} className="m-0 text-xs md:text-sm">
                      {line}
                    </p>
                  ))}
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">
                    What we deliver
                  </h4>

                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-amber-600" />
                      Verified Listings
                    </li>

                    <li className="flex items-center gap-2">
                      <SearchCheck className="h-4 w-4 text-amber-600" />
                      Field Inspections
                    </li>

                    <li className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-amber-600" />
                      Legal Assistance
                    </li>

                    <li className="flex items-center gap-2">
                      <Headset className="h-4 w-4 text-amber-600" />
                      Dedicated Support
                    </li>
                  </ul>
                </div>

                {/* Consolidated card with company info + stats */}
                <div className="mt-8 grid grid-cols-1 gap-4">
                  <div className="bg-white rounded-2xl shadow p-4 border border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500">Founded</div>
                        <div className="font-medium text-gray-800">
                          {meta.founded}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">
                          Headquarters
                        </div>
                        <div className="font-medium text-gray-800">
                          {meta.hq}
                        </div>
                      </div>

                      <div className="col-span-1 sm:col-span-2 mt-2">
                        <div className="flex flex-wrap gap-3">
                          {/* Keep call and properties buttons only inside this consolidated card */}
                          <a
                            href={`tel:${meta.phone}`}
                            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700"
                          >
                            Call Us.!
                          </a>
                          <Link
                            to="/property"
                            className="inline-block px-4 py-2 border border-amber-600 text-amber-700 rounded-lg hover:bg-amber-50"
                          >
                            Properties
                          </Link>
                        </div>
                      </div>

                      <div className="col-span-1 sm:col-span-2 mt-4">
                        <div className="text-sm font-semibold text-gray-800 mb-2">
                          Company stats
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {stats.map((s) => (
                            <div
                              key={s.label}
                              className="bg-amber-50 rounded-lg p-3 text-center"
                            >
                              <div className="text-xs text-gray-500">
                                {s.label}
                              </div>
                              <div className="text-lg font-semibold text-gray-900">
                                {s.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <AsideWithFaq
                meta={meta}
                onOpenVerification={() => setShowVerification(true)}
                faqs={faqs}
              />
            </div>
          </section>

          <div className="lg:col-span-1 flex flex-col gap-6">
            <Timeline steps={workflow} />

            <div className="bg-white rounded-2xl shadow p-4 text-sm">
              <div className="mb-2 font-semibold text-gray-800">Trusted by</div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-700">Local agents</div>
                  <div className="text-xs text-gray-500">Partnered</div>
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-700">Banks</div>
                  <div className="text-xs text-gray-500">KYC</div>
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-700">Developers</div>
                  <div className="text-xs text-gray-500">API</div>
                </div>
              </div>

              <Link
                to="/partners"
                className="mt-3 inline-block text-xs text-amber-600 hover:underline"
              >
                See partner programs →
              </Link>
            </div>
          </div>
        </div>

        <footer className="mt-8 text-sm text-gray-400">
          © {new Date().getFullYear()} Bapuji Real Estate
        </footer>

        <VerificationModal
          open={showVerification}
          onClose={() => setShowVerification(false)}
        />
      </div>
    </div>
  );
}
