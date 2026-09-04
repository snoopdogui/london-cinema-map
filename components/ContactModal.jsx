"use client";

import { useState } from "react";

export default function ContactModal({ onClose, darkMode }) {
  const bg = darkMode ? "bg-[#141922] text-white" : "bg-white text-gray-900";
  const muted = darkMode ? "text-slate-400" : "text-gray-500";
  const border = darkMode ? "border-slate-700" : "border-gray-200";
  const heading = darkMode ? "text-white" : "text-gray-900";
  const inputCls = darkMode
    ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-slate-500 focus:ring-1 focus:ring-slate-500/30"
    : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-300";

  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, name: name || null, email: email || null }),
      });
      if (res.ok) {
        setStatus("sent");
        setMessage("");
        setName("");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl border ${border} ${bg} overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors z-10 ${
            darkMode
              ? "text-slate-400 hover:text-white hover:bg-slate-700"
              : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="px-8 py-8">
          {status !== "sent" && (
            <>
              <h2 className={`text-xl font-bold mb-1 ${heading}`}>Get in touch</h2>
              <p className={`text-sm mb-6 ${muted}`}>
                Got feedback, suggestions, or a cinema I&apos;ve missed? Would be great to hear from you!
              </p>
            </>
          )}

          {status === "sent" ? (
            <div className="space-y-4">
              <p className="text-sm text-emerald-400 font-medium">Message sent — thanks!</p>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    darkMode
                      ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Back to map
                </button>
                <button
                  onClick={() => setStatus(null)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  Send new message
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name (optional)"
                  className={`rounded-lg border px-3 py-2 text-sm outline-none transition ${inputCls}`}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className={`rounded-lg border px-3 py-2 text-sm outline-none transition ${inputCls}`}
                />
              </div>

              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your message..."
                className={`w-full rounded-lg border px-3 py-2 text-sm resize-none outline-none transition ${inputCls}`}
              />

              {status === "error" && (
                <p className="text-xs text-red-400">Something went wrong — please try again.</p>
              )}

              <button
                type="submit"
                disabled={status === "sending" || !message.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {status === "sending" ? "Sending…" : "Send message"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
