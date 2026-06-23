import type { Metadata } from "next";
import {
  ArrowUpRight,
  Award,
  BadgeCheck,
  BookOpen,
  Brain,
  Briefcase,
  Building,
  Building2,
  Calendar,
  Camera,
  ChevronDown,
  Code2,
  Compass,
  FolderOpen,
  GraduationCap,
  Hammer,
  Globe,
  Mail,
  MapPin,
  PenTool,
  Plane,
  Rocket,
  Ruler,
  Sparkles,
  Star,
  TrendingUp,
  Truck,
  Users,
  Warehouse,
  Waves,
  Zap,
} from "lucide-react";
import { Counter } from "@/components/resume/Counter";
import { Dock } from "@/components/resume/Dock";
import { PrintButton } from "@/components/resume/PrintButton";
import { Reveal } from "@/components/resume/Reveal";
import { profile } from "@/data/resume-profile";
import "./resume.css";

const ACCENTS = ["var(--accent)", "var(--accent-2)", "var(--accent-3)"];
const CHIPS = ["chip--o", "chip--b", "chip--g", "chip--p", "chip--y"];
const XP_ICONS = [Rocket, TrendingUp, Brain, Camera, Briefcase, PenTool, Ruler];
const INTEREST_ICONS = [Code2, Waves, Plane, Hammer];
const PRINCIPLE_ICONS = [Compass, Zap];
const PROJECT_ICONS = [Code2, Warehouse, Building2, Truck, Building, Users];

const ic = (c: string) => ({ "--ic": c } as React.CSSProperties);

export const metadata: Metadata = {
  title: { absolute: `${profile.name} · ${profile.role}` },
  description: profile.tagline,
  alternates: { canonical: "/resume" },
  openGraph: {
    title: `${profile.name} · ${profile.role}`,
    description: profile.tagline,
    url: "/resume",
    type: "profile",
  },
  robots: { index: true, follow: true },
};

function Stars() {
  return (
    <div className="stars" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={15} fill="currentColor" strokeWidth={0} />
      ))}
    </div>
  );
}

export default function ResumePage() {
  const p = profile;
  const year = new Date().getFullYear();

  let ck = 0;
  const nextChip = () => CHIPS[ck++ % CHIPS.length];

  return (
    <div id="resume" className="resume-root">
      <main className="page">
        {/* ============ HERO ============ */}
        <Reveal>
          <header className="hero">
            <span className="hero-avatar-ring">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hero-avatar" src={p.avatar} alt={p.name} />
            </span>
            <h1 className="hero-name">
              {p.name}
              <BadgeCheck size={24} strokeWidth={2.25} />
            </h1>
            <p className="hero-role">{p.role}</p>
            <p className="hero-loc">
              <MapPin size={14} strokeWidth={2.5} />
              {p.contact.address}
            </p>
            <div className="hero-actions">
              <a className="btn btn--primary" href={`mailto:${p.contact.email}`}>
                <Mail size={16} strokeWidth={2.25} /> Get in touch
              </a>
              <a className="btn" href={`https://${p.contact.website}`} target="_blank" rel="noreferrer">
                <Globe size={16} strokeWidth={2.25} /> {p.contact.website}
              </a>
              <PrintButton />
            </div>
          </header>
        </Reveal>

        {/* ============ INTRO ============ */}
        <section id="intro" className="sec">
          <Reveal>
            <div className="seclabel">Intro</div>
          </Reveal>
          {p.introParas.map((t, i) => (
            <Reveal key={i} delay={0.05 + i * 0.05}>
              <p className="lead">{t}</p>
            </Reveal>
          ))}
          <Reveal delay={0.25}>
            <div className="pills">
              {p.availability.map((a, i) => (
                <span key={a} className="pill" style={ic(ACCENTS[i % ACCENTS.length])}>
                  <BadgeCheck size={14} strokeWidth={2.5} />
                  {a}
                </span>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ============ HIGHLIGHTS ============ */}
        <section className="sec">
          <Reveal>
            <div className="seclabel">Highlights</div>
          </Reveal>
          <div className="stats">
            {p.stats.map((s, i) => (
              <Reveal key={s.label} delay={Math.min(i * 0.05, 0.2)}>
                <div className="stat" style={ic(ACCENTS[i % ACCENTS.length])}>
                  <div className="stat-v">
                    <Counter value={s.value} />
                  </div>
                  <div className="stat-l">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ============ EXPERIENCE ============ */}
        <section id="experience" className="sec">
          <Reveal>
            <div className="seclabel">Experience</div>
          </Reveal>
          <div className="stack">
            {p.resume.experience.map((j, i) => {
              const Icon = XP_ICONS[i % XP_ICONS.length];
              return (
                <Reveal key={i} delay={Math.min(i * 0.04, 0.2)}>
                  <article className="card">
                    <div className="item-row">
                      <span className={`chip ${nextChip()}`}>
                        <Icon size={21} strokeWidth={2} />
                      </span>
                      <div className="item-body">
                        <h3 className="item-title">{j.title ?? j.org}</h3>
                        <div className="meta">
                          {j.date && (
                            <span>
                              <Calendar size={14} /> {j.date}
                            </span>
                          )}
                          <span>
                            <Building2 size={14} /> {j.org}
                          </span>
                          {j.location && (
                            <span>
                              <MapPin size={14} /> {j.location}
                            </span>
                          )}
                        </div>
                        {j.blurb && <p className="item-blurb">{j.blurb}</p>}
                      </div>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ============ SKILLS ============ */}
        <section id="skills" className="sec">
          <Reveal>
            <div className="seclabel">Skills</div>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="tags">
              {p.skillTags.map((s) => (
                <span key={s} className="tag">
                  {s}
                </span>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ============ EDUCATION ============ */}
        <section id="education" className="sec">
          <Reveal>
            <div className="seclabel">Education</div>
          </Reveal>
          <div className="stack">
            {p.resume.education.map((e, i) => (
              <Reveal key={i} delay={Math.min(i * 0.05, 0.2)}>
                <article className="card" style={ic(ACCENTS[i % ACCENTS.length])}>
                  <div className="item-row">
                    <span className={`chip ${nextChip()}`}>
                      {i === 0 ? <GraduationCap size={21} strokeWidth={2} /> : <BookOpen size={21} strokeWidth={2} />}
                    </span>
                    <div className="item-body">
                      <h3 className="item-title">{e.title ?? e.org}</h3>
                      <div className="meta">
                        {e.date && (
                          <span>
                            <Calendar size={14} /> {e.date}
                          </span>
                        )}
                        <span>
                          <GraduationCap size={14} /> {e.org}
                        </span>
                        {e.location && (
                          <span>
                            <MapPin size={14} /> {e.location}
                          </span>
                        )}
                      </div>
                      {e.blurb && <p className="item-blurb">{e.blurb}</p>}
                      {e.highlights && (
                        <ul className="hl">
                          {e.highlights.map((h) => (
                            <li key={h}>{h}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ============ LICENSE & CERTIFICATION ============ */}
        <section id="certifications" className="sec">
          <Reveal>
            <div className="seclabel">License &amp; Certification</div>
          </Reveal>
          <div className="stack">
            {p.resume.recognition.map((c, i) => (
              <Reveal key={i} delay={Math.min(i * 0.04, 0.2)}>
                <article className="card">
                  <div className="item-row">
                    <span className={`chip chip--round ${nextChip()}`}>
                      <Award size={21} strokeWidth={2} />
                    </span>
                    <div className="item-body">
                      <h3 className="item-title">{c.org}</h3>
                      {(c.title || c.blurb) && (
                        <p className="item-sub">{[c.title, c.blurb].filter(Boolean).join(" · ")}</p>
                      )}
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ============ LANGUAGES ============ */}
        <section className="sec">
          <Reveal>
            <div className="seclabel">Languages</div>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="clist">
              {p.languages.items.map((l) => (
                <div key={l.language} className="crow">
                  <span className="crow-k">{l.language}</span>
                  <span className="crow-v">
                    {l.proficiency}
                    {l.years ? ` · ${l.years} yrs` : ""}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ============ PRINCIPLES ============ */}
        <section className="sec">
          <Reveal>
            <div className="seclabel">How I Operate</div>
          </Reveal>
          <div className="stack">
            {p.operating.map((o, i) => {
              const Icon = PRINCIPLE_ICONS[i % PRINCIPLE_ICONS.length];
              return (
                <Reveal key={o.title} delay={Math.min(i * 0.06, 0.2)}>
                  <article className="tcard">
                    <div className="thead">
                      <span className={`chip chip--round ${nextChip()}`}>
                        <Icon size={20} strokeWidth={2} />
                      </span>
                      <div className="min-w-0">
                        <div className="ttitle">{o.title}</div>
                        <div className="tsub">{o.subtitle}</div>
                      </div>
                    </div>
                    <Stars />
                    <p className="ttext">{o.text}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ============ PROJECTS (collapsible) ============ */}
        <section id="projects" className="sec">
          <Reveal>
            <details className="disc">
              <summary className="disc-head">
                <span className="seclabel">Projects</span>
                <span className="disc-meta">
                  <span className="disc-count">{p.portfolio.length}</span>
                  <ChevronDown className="disc-chev" size={18} strokeWidth={2.25} />
                </span>
              </summary>
              <div className="stack disc-body">
                {p.portfolio.map((proj, i) => {
                  const Icon = PROJECT_ICONS[i % PROJECT_ICONS.length];
                  return (
                    <article className="card" key={proj.title}>
                      <div className="item-row">
                        <span className={`chip ${nextChip()}`}>
                          <Icon size={21} strokeWidth={2} />
                        </span>
                        <div className="item-body">
                          <h3 className="item-title">
                            {proj.href ? (
                              <a href={proj.href} target="_blank" rel="noreferrer">
                                {proj.title}
                                <ArrowUpRight size={15} strokeWidth={2.5} />
                              </a>
                            ) : (
                              proj.title
                            )}
                          </h3>
                          <div className="meta">
                            <span>
                              <FolderOpen size={14} /> {proj.category}
                            </span>
                          </div>
                          <div className="tags">
                            {proj.tags.map((t) => (
                              <span key={t} className="tag">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </details>
          </Reveal>
        </section>

        {/* ============ PERSONAL ============ */}
        <section id="personal" className="sec">
          <Reveal>
            <div className="seclabel">Personal</div>
          </Reveal>
          <Reveal delay={0.05}>
            <figure className="photo-banner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/resume-img/blake-formal.png" alt={p.name} loading="lazy" />
              <figcaption>Off the clock. Brazil, Dubai, and wherever&apos;s next.</figcaption>
            </figure>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lead" style={{ fontSize: 17 }}>
              {p.personal.blurb}
            </p>
          </Reveal>
          <Reveal delay={0.14}>
            <div className="pills">
              {p.personal.interests.map((it, i) => {
                const Icon = INTEREST_ICONS[i % INTEREST_ICONS.length];
                return (
                  <span key={it} className="pill" style={ic(ACCENTS[i % ACCENTS.length])}>
                    <Icon size={14} strokeWidth={2.5} />
                    {it}
                  </span>
                );
              })}
            </div>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="specgrid">
              {p.personal.facts.map((f, i) => (
                <div key={f.label} className="spec" style={ic(ACCENTS[i % ACCENTS.length])}>
                  <div className="spec-k">{f.label}</div>
                  <div className="spec-v">{f.value}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ============ CONTACT ============ */}
        <section id="contact" className="sec">
          <Reveal>
            <div className="seclabel">Contact</div>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="clist">
              <a className="crow" href={`mailto:${p.contact.email}`}>
                <span className="crow-k">Email</span>
                <span className="crow-v">{p.contact.email}</span>
              </a>
              <a className="crow" href={`https://${p.contact.website}`} target="_blank" rel="noreferrer">
                <span className="crow-k">Website</span>
                <span className="crow-v">{p.contact.website}</span>
              </a>
              <div className="crow">
                <span className="crow-k">Based in</span>
                <span className="crow-v">{p.contact.address}</span>
              </div>
              <div className="crow">
                <span className="crow-k">Languages</span>
                <span className="crow-v">{p.languages.items.map((l) => l.language.replace("Brazilian ", "")).join(", ")}</span>
              </div>
              <div className="crow">
                <span className="crow-k">Focus</span>
                <span className="crow-v">Storage ops · Paid acquisition · Applied AI</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="socials">
              <a className="social" href={`https://${p.contact.website}`} target="_blank" rel="noreferrer" aria-label="Website">
                <Globe size={18} />
              </a>
              <a className="social" href={`mailto:${p.contact.email}`} aria-label="Email">
                <Mail size={18} />
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.14}>
            <footer className="foot">
              <div className="foot-links">
                <a href={`mailto:${p.contact.email}`}>Get in touch</a>
                <a href={`https://${p.contact.website}`} target="_blank" rel="noreferrer">
                  storageads.com
                </a>
              </div>
              <div className="foot-copy">
                © {year} {p.name} · Built with Next.js &amp; React
              </div>
            </footer>
          </Reveal>
        </section>
      </main>

      <Dock />
    </div>
  );
}
