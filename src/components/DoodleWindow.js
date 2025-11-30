"use client";

import React from "react";
import Link from "next/link";

export default function DoodleWindow({
  title,
  subtitle,
  modeLabel,
  backHref,
  backLabel = "Back to Doodleverse",
  footerText,
  children,
}) {
  return (
    <div className="bg-white/95 border-[3px] border-black rounded-[28px] shadow-[8px_8px_0_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[calc(100vh-3rem)]">
      {/* OS-style header */}
      <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 border-b-[3px] border-black bg-white/95">
        <div className="flex items-center gap-3 min-w-0">
          {/* traffic lights */}
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57] border border-black/40" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e] border border-black/40" />
            <span className="h-3 w-3 rounded-full bg-[#28c840] border border-black/40" />
          </div>
          {/* title + optional subtitle */}
          <div className="min-w-0">
            {title && (
              <h1 className="text-sm sm:text-base font-semibold truncate">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="hidden sm:block text-[10px] text-slate-500 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {modeLabel && (
          <div className="hidden sm:flex items-center text-[10px] uppercase tracking-wide text-slate-600">
            mode:{" "}
            <span className="ml-1 font-semibold text-slate-800">
              {modeLabel}
            </span>
          </div>
        )}
      </header>

      {/* Scrollable content area */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>

      {/* Unified footer with Back pill */}
      {(backHref || footerText) && (
        <footer className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 border-t-[3px] border-black bg-slate-50/90 text-[10px] sm:text-xs">
          <div className="flex items-center">
            {backHref && (
              <Link
                href={backHref}
                className="inline-flex items-center px-3 sm:px-3.5 py-1.5 rounded-full border border-black bg-white shadow-[3px_3px_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-transform font-semibold"
              >
                ← {backLabel}
              </Link>
            )}
          </div>

          <div className="ml-auto text-[9px] sm:text-[10px] text-slate-500 italic text-right">
            {footerText ?? "Doodle responsibly. Copium levels may spike."}
          </div>
        </footer>
      )}
    </div>
  );
}
