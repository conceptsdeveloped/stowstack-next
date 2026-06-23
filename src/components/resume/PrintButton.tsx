"use client";

import { Download } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      className="btn no-print"
      onClick={() => window.print()}
      aria-label="Download résumé as PDF"
    >
      <Download size={16} strokeWidth={2.25} /> Download résumé
    </button>
  );
}
