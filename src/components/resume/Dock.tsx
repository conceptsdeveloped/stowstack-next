"use client";

import { useEffect, useState } from "react";
import { User, Sparkles, FolderOpen, Briefcase, GraduationCap, Award, Heart, Mail } from "lucide-react";

const ITEMS = [
  { id: "intro", label: "Intro", Icon: User },
  { id: "experience", label: "Experience", Icon: Briefcase },
  { id: "skills", label: "Skills", Icon: Sparkles },
  { id: "education", label: "Education", Icon: GraduationCap },
  { id: "certifications", label: "Certifications", Icon: Award },
  { id: "projects", label: "Projects", Icon: FolderOpen },
  { id: "personal", label: "Personal", Icon: Heart },
  { id: "contact", label: "Contact", Icon: Mail },
];

export function Dock() {
  const [active, setActive] = useState("intro");

  useEffect(() => {
    const sections = ITEMS.map((i) => document.getElementById(i.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        // pick the entry nearest the top third of the viewport
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className="dock" aria-label="Section navigation">
      {ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`dockbtn${active === id ? " active" : ""}`}
          aria-label={label}
          aria-current={active === id ? "true" : undefined}
          onClick={() => go(id)}
        >
          <Icon size={20} strokeWidth={2} />
          <span className="dock-tip">{label}</span>
        </button>
      ))}
    </nav>
  );
}
