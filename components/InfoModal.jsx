"use client";

export default function InfoModal({ onClose, darkMode }) {
  const bg = darkMode ? "bg-[#141922] text-white" : "bg-white text-gray-900";
  const muted = darkMode ? "text-slate-400" : "text-gray-500";
  const border = darkMode ? "border-slate-700" : "border-gray-200";
  const divider = darkMode ? "border-slate-800" : "border-gray-100";
  const heading = darkMode ? "text-white" : "text-gray-900";

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-xl rounded-2xl shadow-2xl border ${border} ${bg} flex flex-col max-h-[90vh] overflow-hidden`}
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

        {/* Scrollable content */}
        <div className="overflow-y-auto px-8 py-8 space-y-6 modal-scroll">
          <h2 className={`text-2xl font-bold ${heading}`}>About London Cinema Map</h2>

          <div className={`border-t ${divider}`} />

          <section>
            <h3 className={`font-semibold text-base mb-3 ${heading}`}>Why this exists</h3>
            <p className={`text-sm leading-relaxed ${muted}`}>
              I&apos;m a bit of a cinephile, and finding the right cinema to go to should be simple, but it
              isn&apos;t. Google results are cluttered with ads and optimised options. Big chains dominate the
              top spots. The independent gems that make London&apos;s cinema scene special get buried. I wanted
              something better: one place where every cinema gets a fair showing, and the only thing that
              matters is what works for you.
            </p>
            <p className={`text-sm leading-relaxed mt-3 ${muted}`}>So I built this.</p>
          </section>

          <div className={`border-t ${divider}`} />

          <section>
            <h3 className={`font-semibold text-base mb-3 ${heading}`}>No algorithms. No ads. No agenda.</h3>
            <p className={`text-sm leading-relaxed ${muted}`}>
              London Cinema Map doesn&apos;t rank cinemas by who&apos;s paid to be seen. There&apos;s no
              generative search optimisation, no sponsored placements, no hidden logic deciding what you see
              first. Every cinema, from a two-screen independent in Dalston to a multiplex in Leicester Square,
              shows up on the same map, on equal terms.
            </p>
            <p className={`text-sm leading-relaxed mt-3 ${muted}`}>
              You filter by what actually matters. The map does the rest.
            </p>
          </section>

          <div className={`border-t ${divider}`} />

          <section className="pb-2">
            <h3 className={`font-semibold text-base mb-3 ${heading}`}>Built with love for cinema</h3>
            <p className={`text-sm leading-relaxed ${muted}`}>
              This project comes from someone who spends too much time in dark rooms watching films. If
              you&apos;re curious about what I&apos;ve been watching, you can find me on{" "}
              <a
                href="https://boxd.it/35sq5"
                target="_blank"
                rel="noopener noreferrer"
                className={`underline underline-offset-2 transition-colors ${
                  darkMode ? "text-slate-300 hover:text-white" : "text-gray-700 hover:text-gray-900"
                }`}
              >
                Letterboxd
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
