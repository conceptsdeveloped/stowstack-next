"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PALETTE = [
  "#2C3E6B", // navy
  "#8C2332", // burgundy
  "#1B4D3E", // forest
  "#4A5563", // slate
  "#3B5E5E", // dark teal
  "#6B4C3B", // walnut
  "#5C3D6E", // plum
  "#2E4A62", // steel blue
  "#3C5C4A", // hunter green
  "#7A3B3B", // wine
  "#4A5D23", // olive
  "#4E3A5E", // grape
];

function shouldSkip(el: HTMLElement): boolean {
  if (el.closest("[data-ad-mockup]")) return true;
  if (el.closest("[data-no-recolor]")) return true;
  if (el.hasAttribute("data-no-recolor")) return true;
  if (el.closest("nav")) return true;
  return false;
}

function cycleButtonColors() {
  const root = document.querySelector(".admin-theme main");
  if (!root) return;

  const buttons = root.querySelectorAll<HTMLElement>(
    'button[class*="bg-blue-"], button[class*="bg-[#3B82F6]"], a[class*="bg-blue-"], button[class*="bg-indigo-"]'
  );

  let i = 0;
  buttons.forEach((btn) => {
    if (shouldSkip(btn)) return;
    const href = btn.getAttribute("href");
    if (href && href.startsWith("/admin")) return;
    if (btn.getAttribute("role") === "tab") return;

    const parent = btn.parentElement;
    if (parent) {
      const sibs = parent.querySelectorAll("button, a");
      if (sibs.length >= 4) {
        const w = btn.getBoundingClientRect().width;
        const allSame = Array.from(sibs).every(s => Math.abs(s.getBoundingClientRect().width - w) < 10);
        if (allSame) return;
      }
    }

    const color = PALETTE[i % PALETTE.length];
    btn.style.backgroundColor = color;
    btn.style.color = "#FDFCFA";
    btn.style.border = "3px solid #050505";
    btn.style.boxShadow = "4px 4px 0 #050505";
    btn.style.borderRadius = "0.4em";
    btn.style.fontWeight = "900";
    btn.style.textTransform = "uppercase";
    btn.style.letterSpacing = "0.04em";
    for (const child of btn.children) {
      (child as HTMLElement).style.color = "#FDFCFA";
    }
    i++;
  });
}

function addColorAccents() {
  const root = document.querySelector(".admin-theme main");
  if (!root) return;

  const accentColors = ["#2C3E6B", "#8C2332", "#1B4D3E", "#3B5E5E", "#5C3D6E", "#6B4C3B", "#2E4A62", "#4A5D23", "#7A3B3B", "#4E3A5E"];
  const sectionHeaders = root.querySelectorAll<HTMLElement>('[class*="uppercase"][class*="tracking"]');
  let si = 0;
  sectionHeaders.forEach((h) => {
    if (shouldSkip(h)) return;
    h.style.color = accentColors[(si + 3) % accentColors.length];
    si++;
  });
}

export function ColorCycler() {
  const pathname = usePathname();

  useEffect(() => {
    const run = () => {
      cycleButtonColors();
      addColorAccents();
    };

    const t1 = setTimeout(run, 50);
    const t2 = setTimeout(run, 300);

    const observer = new MutationObserver(() => {
      requestAnimationFrame(run);
    });

    const root = document.querySelector(".admin-theme main");
    if (root) {
      observer.observe(root, { childList: true, subtree: true });
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
