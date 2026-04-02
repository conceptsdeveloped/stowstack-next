import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, TrendingDown, Minus, Filter, MapPin, DollarSign, BarChart3, Truck, Eye, Wrench, ArrowRightLeft, Clock, Store } from "lucide-react";

// --- Constants ---
const markets = [
  "Houston Metro", "Dallas-Fort Worth", "San Antonio", "Austin", "Phoenix Metro",
  "Tampa Bay", "Orlando", "Jacksonville", "Atlanta Metro", "Nashville",
  "Charlotte", "Raleigh-Durham"
];

const dealerTypes = ["Company Store", "Independent Dealer", "Neighborhood Dealer", "Moving Center"];

const equipmentTypes = {
  trucks: ["10' Truck", "15' Truck", "17' Truck", "20' Truck", "26' Truck"],
  trailers: ["4x8 Trailer", "5x8 Trailer", "5x10 Trailer", "6x12 Trailer"],
  towing: ["Auto Transport", "Tow Dolly"],
};

const allEquipmentNames = [...equipmentTypes.trucks, ...equipmentTypes.trailers, ...equipmentTypes.towing];

function randBetween(min, max) { return Math.round((min + Math.random() * (max - min)) * 100) / 100; }
function randInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }

function generateDealers(count) {
  const streets = [
    "Main St", "Westheimer Rd", "Highway 290", "FM 1960", "Airline Dr",
    "Bellaire Blvd", "Richmond Ave", "Memorial Dr", "Loop 410", "I-35 Frontage",
    "Colonial Dr", "Peachtree Rd", "Broadway St", "Market St", "Commerce Blvd",
    "Industrial Pkwy", "Veterans Blvd", "State Hwy 6", "Beltway 8", "Dixie Hwy"
  ];
  const bizNames = [
    "Sunbelt Gas & Go", "Metro Shell", "QuikStop", "Valley Hardware", "Lakeside Tire",
    "Apex Auto Parts", "Crossroads BP", "Ranger Fuel", "Five Points Exxon", "Summit Chevron",
    "Bayou Lube Express", "Central Ace Hardware", "Lone Star Mobil", "Ridgeway Napa",
    "Patriot Fuel", "Hilltop Service", "Blue Ridge Auto", "Trailhead Gas", "Riverbend Texaco",
    "Peach State Oil"
  ];

  const dealers = [];
  for (let i = 0; i < count; i++) {
    const market = markets[i % markets.length];
    const type = dealerTypes[i % dealerTypes.length];
    const isCompanyStore = type === "Company Store" || type === "Moving Center";

    // Fleet for this dealer
    const truckCount = isCompanyStore ? randInt(15, 40) : randInt(3, 15);
    const trailerCount = isCompanyStore ? randInt(8, 20) : randInt(1, 8);
    const towingCount = isCompanyStore ? randInt(4, 10) : randInt(0, 4);
    const totalEquip = truckCount + trailerCount + towingCount;

    const utilization = isCompanyStore ? randBetween(55, 92) : randBetween(35, 88);
    const onRent = Math.floor(totalEquip * utilization / 100);

    // Revenue
    const avgTicket = randBetween(29.99, 189.99);
    const transactionsThisMonth = Math.floor(onRent * randBetween(2.5, 5));
    const revenue = Math.round(transactionsThisMonth * avgTicket);
    const commission = isCompanyStore ? 0 : Math.round(revenue * randBetween(0.18, 0.25));

    // One-way vs in-town
    const oneWayPct = Math.round(randBetween(20, 65));
    const inTownPct = 100 - oneWayPct;

    // Counts
    const dispatchesThisWeek = randInt(5, 45);
    const returnsThisWeek = randInt(4, 40);
    const netFlowThisWeek = dispatchesThisWeek - returnsThisWeek;

    // Maintenance / issues
    const needsMaintenance = randInt(0, Math.max(1, Math.floor(totalEquip * 0.15)));
    const overdue = randInt(0, Math.max(0, Math.floor(needsMaintenance * 0.4)));
    const customerComplaints = randInt(0, 5);

    // Dealer health
    const dealerRating = Math.round(randBetween(2.5, 5.0) * 10) / 10;
    const lastVisitDays = randInt(1, 60);
    const missedPickups = randInt(0, 4);

    let status = "healthy";
    if (utilization < 45 || overdue > 2 || dealerRating < 3.0 || missedPickups > 2) status = "critical";
    else if (utilization < 60 || needsMaintenance > 3 || dealerRating < 3.5 || lastVisitDays > 30) status = "warning";
    else if (utilization > 82 && dealerRating >= 4.5) status = "top-performer";

    dealers.push({
      id: i + 1,
      entityId: isCompanyStore ? `CS-${(1000 + i)}` : `DLR-${(5000 + i)}`,
      name: isCompanyStore ? `U-Haul ${type} #${(700 + i)}` : bizNames[i % bizNames.length],
      address: `${randInt(1000, 9999)} ${streets[i % streets.length]}`,
      market,
      type,
      isCompanyStore,
      truckCount, trailerCount, towingCount, totalEquip,
      utilization: Math.round(utilization * 10) / 10,
      onRent,
      avgTicket,
      transactionsThisMonth,
      revenue,
      commission,
      oneWayPct, inTownPct,
      dispatchesThisWeek, returnsThisWeek, netFlowThisWeek,
      needsMaintenance, overdue,
      customerComplaints,
      dealerRating,
      lastVisitDays,
      missedPickups,
      status,
      utilTrend: Math.random() > 0.4 ? (Math.random() > 0.5 ? "up" : "flat") : "down",
      revTrend: Math.random() > 0.35 ? (Math.random() > 0.5 ? "up" : "flat") : "down",
    });
  }
  return dealers;
}

const allDealers = generateDealers(56);

// --- Shared Components ---

function KPICard({ label, value, subtext, icon: Icon, accent }) {
  const colors = {
    gold: { bg: "#F2EBD9", text: "#B58B3F", icon: "#B58B3F" },
    green: { bg: "#e8f0e0", text: "#788c5d", icon: "#788c5d" },
    red: { bg: "#f5e0dc", text: "#B04A3A", icon: "#B04A3A" },
    blue: { bg: "#dfe9f3", text: "#6a9bcc", icon: "#6a9bcc" },
    dark: { bg: "#e8e6dc", text: "#141413", icon: "#6a6560" },
  };
  const c = colors[accent] || colors.dark;
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #e8e6dc", flex: "1 1 0", minWidth: 180 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ background: c.bg, borderRadius: 8, padding: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={18} color={c.icon} />
        </div>
        <span style={{ fontSize: 13, color: "#6a6560", fontFamily: "Poppins, sans-serif", fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color: c.text, fontFamily: "Poppins, sans-serif", lineHeight: 1.1 }}>{value}</div>
      {subtext && <div style={{ fontSize: 12, color: "#b0aea5", marginTop: 4, fontFamily: "Lora, serif" }}>{subtext}</div>}
    </div>
  );
}

function TrendIcon({ trend, size = 14 }) {
  if (trend === "up") return <TrendingUp size={size} color="#788c5d" />;
  if (trend === "down") return <TrendingDown size={size} color="#B04A3A" />;
  return <Minus size={size} color="#b0aea5" />;
}

function StatusBadge({ status }) {
  const config = {
    critical: { bg: "#f5e0dc", text: "#B04A3A", label: "Critical" },
    warning: { bg: "#F2EBD9", text: "#9A7A35", label: "Warning" },
    healthy: { bg: "#e8f0e0", text: "#788c5d", label: "Healthy" },
    "top-performer": { bg: "#dfe9f3", text: "#6a9bcc", label: "Top Performer" },
  };
  const c = config[status] || config.healthy;
  return (
    <span style={{
      background: c.bg, color: c.text, fontSize: 11, fontWeight: 600,
      padding: "3px 10px", borderRadius: 99, fontFamily: "Poppins, sans-serif",
      whiteSpace: "nowrap"
    }}>
      {c.label}
    </span>
  );
}

function UtilizationBar({ value }) {
  let color = "#788c5d";
  if (value < 45) color = "#B04A3A";
  else if (value < 60) color = "#B58B3F";
  else if (value > 82) color = "#6a9bcc";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 140 }}>
      <div style={{ flex: 1, height: 8, background: "#e8e6dc", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(value, 100)}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color, fontFamily: "Poppins, sans-serif", minWidth: 42, textAlign: "right" }}>
        {value}%
      </span>
    </div>
  );
}

function DealerTypeBadge({ type }) {
  const c = {
    "Company Store": { bg: "#dfe9f3", text: "#6a9bcc" },
    "Moving Center": { bg: "#dfe9f3", text: "#6a9bcc" },
    "Independent Dealer": { bg: "#F2EBD9", text: "#9A7A35" },
    "Neighborhood Dealer": { bg: "#e8e6dc", text: "#6a6560" },
  };
  const s = c[type] || c["Neighborhood Dealer"];
  return (
    <span style={{
      background: s.bg, color: s.text, fontSize: 10, fontWeight: 600,
      padding: "2px 8px", borderRadius: 99, fontFamily: "Poppins, sans-serif",
      whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.03em"
    }}>
      {type}
    </span>
  );
}

function StarRating({ rating }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let color = "#788c5d";
  if (rating < 3.0) color = "#B04A3A";
  else if (rating < 3.5) color = "#B58B3F";
  return (
    <span style={{ fontSize: 13, fontWeight: 600, color, fontFamily: "Poppins, sans-serif" }}>
      {rating.toFixed(1)}
    </span>
  );
}

// --- Main Dashboard ---
export default function AFMDashboard() {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("utilization");
  const [sortDir, setSortDir] = useState("asc");
  const [filterMarket, setFilterMarket] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [activeTab, setActiveTab] = useState("dealers");

  const filtered = useMemo(() => {
    let f = allDealers;
    if (search) {
      const s = search.toLowerCase();
      f = f.filter(x =>
        x.name.toLowerCase().includes(s) ||
        x.address.toLowerCase().includes(s) ||
        x.market.toLowerCase().includes(s) ||
        x.entityId.toLowerCase().includes(s)
      );
    }
    if (filterMarket !== "All") f = f.filter(x => x.market === filterMarket);
    if (filterStatus !== "All") f = f.filter(x => x.status === filterStatus);
    if (filterType !== "All") f = f.filter(x => x.type === filterType);
    f = [...f].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return f;
  }, [search, sortKey, sortDir, filterMarket, filterStatus, filterType]);

  const kpis = useMemo(() => {
    const total = allDealers.length;
    const totalEquip = allDealers.reduce((s, d) => s + d.totalEquip, 0);
    const totalOnRent = allDealers.reduce((s, d) => s + d.onRent, 0);
    const avgUtil = Math.round(totalOnRent / totalEquip * 1000) / 10;
    const totalRev = allDealers.reduce((s, d) => s + d.revenue, 0);
    const totalTrucks = allDealers.reduce((s, d) => s + d.truckCount, 0);
    const totalTrailers = allDealers.reduce((s, d) => s + d.trailerCount, 0);
    const totalTowing = allDealers.reduce((s, d) => s + d.towingCount, 0);
    const criticals = allDealers.filter(d => d.status === "critical").length;
    const warnings = allDealers.filter(d => d.status === "warning").length;
    const totalMaint = allDealers.reduce((s, d) => s + d.needsMaintenance, 0);
    const totalOverdue = allDealers.reduce((s, d) => s + d.overdue, 0);
    const totalDispatches = allDealers.reduce((s, d) => s + d.dispatchesThisWeek, 0);
    const totalReturns = allDealers.reduce((s, d) => s + d.returnsThisWeek, 0);
    const companyStores = allDealers.filter(d => d.isCompanyStore).length;
    const independents = total - companyStores;
    return {
      total, totalEquip, totalOnRent, avgUtil, totalRev,
      totalTrucks, totalTrailers, totalTowing,
      criticals, warnings, totalMaint, totalOverdue,
      totalDispatches, totalReturns, companyStores, independents
    };
  }, []);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortHeader({ label, field, width }) {
    const active = sortKey === field;
    return (
      <th onClick={() => toggleSort(field)} style={{
        cursor: "pointer", padding: "10px 12px", textAlign: "left", fontSize: 11,
        fontWeight: 600, color: active ? "#B58B3F" : "#6a6560", textTransform: "uppercase",
        letterSpacing: "0.05em", fontFamily: "Poppins, sans-serif", userSelect: "none",
        borderBottom: "2px solid #e8e6dc", width: width || "auto", whiteSpace: "nowrap"
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {label}
          {active && (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
        </span>
      </th>
    );
  }

  return (
    <div style={{ fontFamily: "Poppins, sans-serif", background: "#faf9f5", minHeight: "100vh", color: "#141413" }}>
      {/* Header */}
      <div style={{ background: "#141413", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Truck size={24} color="#B58B3F" />
            <div style={{ fontSize: 22, fontWeight: 600, color: "#faf9f5", letterSpacing: "-0.01em" }}>
              AFM Fleet Command Center
            </div>
          </div>
          <div style={{ fontSize: 13, color: "#b0aea5", marginTop: 2, fontFamily: "Lora, serif" }}>
            {kpis.total} dealer locations ({kpis.companyStores} company stores, {kpis.independents} independents) across {markets.length} markets
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ background: "#1e1d1b", borderRadius: 8, padding: "8px 14px", border: "1px solid #333" }}>
            <div style={{ fontSize: 10, color: "#b0aea5", textTransform: "uppercase", letterSpacing: "0.05em" }}>Fleet</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#B58B3F" }}>{kpis.totalEquip.toLocaleString()}</div>
          </div>
          <div style={{ background: "#1e1d1b", borderRadius: 8, padding: "8px 14px", border: "1px solid #333" }}>
            <div style={{ fontSize: 10, color: "#b0aea5", textTransform: "uppercase", letterSpacing: "0.05em" }}>On Rent</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#788c5d" }}>{kpis.totalOnRent.toLocaleString()}</div>
          </div>
          {kpis.criticals > 0 && (
            <div style={{ background: "#B04A3A", color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={14} /> {kpis.criticals} Critical
            </div>
          )}
          {kpis.totalOverdue > 0 && (
            <div style={{ background: "#B58B3F", color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <Wrench size={14} /> {kpis.totalOverdue} Overdue Maint
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1500, margin: "0 auto" }}>
        {/* KPI Row */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <KPICard label="Fleet Utilization" value={`${kpis.avgUtil}%`} subtext={`${kpis.totalOnRent} of ${kpis.totalEquip} units on rent`} icon={BarChart3} accent="gold" />
          <KPICard label="Monthly Revenue" value={`$${(kpis.totalRev / 1000).toFixed(0)}K`} subtext={`${kpis.totalDispatches + kpis.totalReturns} transactions this week`} icon={DollarSign} accent="green" />
          <KPICard label="Weekly Flow" value={`${kpis.totalDispatches - kpis.totalReturns > 0 ? "+" : ""}${kpis.totalDispatches - kpis.totalReturns}`} subtext={`${kpis.totalDispatches} dispatches / ${kpis.totalReturns} returns`} icon={ArrowRightLeft} accent={(kpis.totalDispatches - kpis.totalReturns >= 0) ? "blue" : "red"} />
          <KPICard label="Maintenance" value={kpis.totalMaint} subtext={`${kpis.totalOverdue} overdue service`} icon={Wrench} accent={kpis.totalOverdue > 5 ? "red" : "gold"} />
        </div>

        {/* Fleet Breakdown Mini Cards */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { label: "Trucks", count: kpis.totalTrucks, color: "#B58B3F" },
            { label: "Trailers", count: kpis.totalTrailers, color: "#6a9bcc" },
            { label: "Towing", count: kpis.totalTowing, color: "#788c5d" },
          ].map(eq => (
            <div key={eq.label} style={{
              background: "#fff", borderRadius: 10, padding: "12px 20px", border: "1px solid #e8e6dc",
              display: "flex", alignItems: "center", gap: 12, flex: "1 1 0", minWidth: 160
            }}>
              <div style={{ width: 4, height: 36, borderRadius: 2, background: eq.color }} />
              <div>
                <div style={{ fontSize: 12, color: "#6a6560", fontWeight: 500 }}>{eq.label}</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: eq.color }}>{eq.count.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 360 }}>
            <Search size={16} color="#b0aea5" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search dealers, IDs, addresses, markets..."
              style={{
                width: "100%", padding: "10px 12px 10px 36px", border: "1px solid #e8e6dc",
                borderRadius: 8, fontSize: 14, fontFamily: "Poppins, sans-serif",
                background: "#fff", outline: "none", color: "#141413"
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Filter size={14} color="#6a6560" />
            <select value={filterMarket} onChange={e => setFilterMarket(e.target.value)} style={{
              padding: "10px 12px", border: "1px solid #e8e6dc", borderRadius: 8, fontSize: 13,
              fontFamily: "Poppins, sans-serif", background: "#fff", color: "#141413", cursor: "pointer"
            }}>
              <option value="All">All Markets</option>
              {markets.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{
            padding: "10px 12px", border: "1px solid #e8e6dc", borderRadius: 8, fontSize: 13,
            fontFamily: "Poppins, sans-serif", background: "#fff", color: "#141413", cursor: "pointer"
          }}>
            <option value="All">All Dealer Types</option>
            {dealerTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{
            padding: "10px 12px", border: "1px solid #e8e6dc", borderRadius: 8, fontSize: 13,
            fontFamily: "Poppins, sans-serif", background: "#fff", color: "#141413", cursor: "pointer"
          }}>
            <option value="All">All Status</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="healthy">Healthy</option>
            <option value="top-performer">Top Performer</option>
          </select>
          <div style={{ fontSize: 13, color: "#b0aea5", marginLeft: "auto" }}>
            Showing {filtered.length} of {allDealers.length}
          </div>
        </div>

        {/* Dealer Table */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e6dc", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#faf9f5" }}>
                  <SortHeader label="Dealer" field="name" width="200px" />
                  <SortHeader label="Market" field="market" width="130px" />
                  <SortHeader label="Utilization" field="utilization" width="160px" />
                  <SortHeader label="Fleet" field="totalEquip" width="75px" />
                  <SortHeader label="Revenue" field="revenue" width="100px" />
                  <SortHeader label="1-Way %" field="oneWayPct" width="75px" />
                  <SortHeader label="Net Flow" field="netFlowThisWeek" width="85px" />
                  <SortHeader label="Maint" field="needsMaintenance" width="70px" />
                  <SortHeader label="Rating" field="dealerRating" width="70px" />
                  <SortHeader label="Status" field="status" width="110px" />
                  <th style={{ padding: "10px 12px", borderBottom: "2px solid #e8e6dc", width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, idx) => (
                  <tr key={d.id} style={{
                    borderBottom: "1px solid #f0efe8",
                    background: selectedDealer === d.id ? "#F2EBD9" : (idx % 2 === 0 ? "#fff" : "#fdfcf9"),
                    cursor: "pointer", transition: "background 0.15s"
                  }}
                  onClick={() => setSelectedDealer(selectedDealer === d.id ? null : d.id)}
                  onMouseEnter={e => { if (selectedDealer !== d.id) e.currentTarget.style.background = "#faf8f2"; }}
                  onMouseLeave={e => { if (selectedDealer !== d.id) e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fdfcf9"; }}
                  >
                    <td style={{ padding: "12px", fontSize: 13 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, color: "#141413" }}>{d.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, color: "#b0aea5" }}>{d.entityId}</span>
                        <DealerTypeBadge type={d.type} />
                      </div>
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#6a6560" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <MapPin size={12} color="#b0aea5" /> {d.market}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <UtilizationBar value={d.utilization} />
                        <TrendIcon trend={d.utilTrend} />
                      </div>
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#6a6560", textAlign: "center" }}>
                      <span style={{ fontWeight: 600, color: "#141413" }}>{d.onRent}</span>/{d.totalEquip}
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, fontWeight: 600, color: "#141413" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        ${(d.revenue / 1000).toFixed(1)}K
                        <TrendIcon trend={d.revTrend} />
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, textAlign: "center", color: d.oneWayPct > 50 ? "#6a9bcc" : "#6a6560", fontWeight: 500 }}>
                      {d.oneWayPct}%
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, textAlign: "center" }}>
                      <span style={{
                        color: d.netFlowThisWeek > 0 ? "#788c5d" : d.netFlowThisWeek < 0 ? "#B04A3A" : "#b0aea5",
                        fontWeight: 600
                      }}>
                        {d.netFlowThisWeek > 0 ? "+" : ""}{d.netFlowThisWeek}
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, textAlign: "center" }}>
                      <span style={{
                        color: d.overdue > 0 ? "#B04A3A" : d.needsMaintenance > 3 ? "#9A7A35" : "#788c5d",
                        fontWeight: 600
                      }}>
                        {d.needsMaintenance}
                        {d.overdue > 0 && <span style={{ fontSize: 10, color: "#B04A3A" }}> ({d.overdue}!)</span>}
                      </span>
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <StarRating rating={d.dealerRating} />
                    </td>
                    <td style={{ padding: "12px" }}><StatusBadge status={d.status} /></td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <Eye size={14} color="#b0aea5" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedDealer && (() => {
          const d = allDealers.find(x => x.id === selectedDealer);
          if (!d) return null;
          return (
            <div style={{
              marginTop: 16, background: "#fff", borderRadius: 12, border: "1px solid #e8e6dc",
              padding: 24
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>
                {/* Location Info */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{d.name}</div>
                  </div>
                  <div style={{ fontSize: 13, color: "#6a6560", display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                    <MapPin size={13} /> {d.address}
                  </div>
                  <div style={{ fontSize: 12, color: "#b0aea5", marginBottom: 8 }}>{d.market} — {d.entityId}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <DealerTypeBadge type={d.type} />
                    <StatusBadge status={d.status} />
                  </div>
                  <div style={{ fontSize: 12, color: d.lastVisitDays > 30 ? "#B04A3A" : "#6a6560", marginTop: 10, display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={12} /> Last visit: {d.lastVisitDays} days ago
                  </div>
                </div>

                {/* Fleet Breakdown */}
                <div>
                  <div style={{ fontSize: 11, color: "#b0aea5", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 10 }}>Fleet Breakdown</div>
                  <UtilizationBar value={d.utilization} />
                  <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                    {[
                      { label: "Trucks", count: d.truckCount, color: "#B58B3F" },
                      { label: "Trailers", count: d.trailerCount, color: "#6a9bcc" },
                      { label: "Towing", count: d.towingCount, color: "#788c5d" },
                    ].map(e => (
                      <div key={e.label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 600, color: e.color }}>{e.count}</div>
                        <div style={{ fontSize: 11, color: "#b0aea5" }}>{e.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: "#6a6560", marginTop: 6 }}>{d.onRent} on rent / {d.totalEquip} total</div>
                </div>

                {/* Revenue & Transactions */}
                <div>
                  <div style={{ fontSize: 11, color: "#b0aea5", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 10 }}>Revenue</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: "#B58B3F" }}>${d.revenue.toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: "#6a6560", marginTop: 4 }}>Avg ticket: ${d.avgTicket.toFixed(2)}</div>
                  <div style={{ fontSize: 12, color: "#6a6560" }}>Transactions: {d.transactionsThisMonth}</div>
                  {d.commission > 0 && (
                    <div style={{ fontSize: 12, color: "#788c5d", fontWeight: 500, marginTop: 4 }}>Commission: ${d.commission.toLocaleString()}</div>
                  )}
                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    <div style={{ padding: "4px 10px", background: "#dfe9f3", borderRadius: 6, fontSize: 12, color: "#6a9bcc", fontWeight: 600 }}>
                      {d.oneWayPct}% one-way
                    </div>
                    <div style={{ padding: "4px 10px", background: "#e8e6dc", borderRadius: 6, fontSize: 12, color: "#6a6560", fontWeight: 600 }}>
                      {d.inTownPct}% in-town
                    </div>
                  </div>
                </div>

                {/* Operations */}
                <div>
                  <div style={{ fontSize: 11, color: "#b0aea5", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 10 }}>Operations This Week</div>
                  <div style={{ fontSize: 13, color: "#141413" }}>
                    Dispatches: <strong>{d.dispatchesThisWeek}</strong> / Returns: <strong>{d.returnsThisWeek}</strong>
                  </div>
                  <div style={{ fontSize: 13, color: d.netFlowThisWeek >= 0 ? "#788c5d" : "#B04A3A", fontWeight: 600 }}>
                    Net: {d.netFlowThisWeek > 0 ? "+" : ""}{d.netFlowThisWeek}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 12, color: d.overdue > 0 ? "#B04A3A" : "#6a6560", display: "flex", alignItems: "center", gap: 4 }}>
                      <Wrench size={12} /> Maintenance: {d.needsMaintenance} units {d.overdue > 0 && `(${d.overdue} OVERDUE)`}
                    </div>
                    {d.missedPickups > 0 && (
                      <div style={{ fontSize: 12, color: "#B04A3A", marginTop: 2 }}>
                        Missed pickups: {d.missedPickups}
                      </div>
                    )}
                    {d.customerComplaints > 0 && (
                      <div style={{ fontSize: 12, color: d.customerComplaints > 2 ? "#B04A3A" : "#9A7A35", marginTop: 2 }}>
                        Customer complaints: {d.customerComplaints}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#6a6560", marginTop: 6 }}>Dealer rating: {d.dealerRating.toFixed(1)} / 5.0</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Market Summary */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "#141413" }}>Market Summary</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {markets.map(market => {
              const md = allDealers.filter(d => d.market === market);
              if (md.length === 0) return null;
              const avgUtil = Math.round(md.reduce((s, d) => s + d.utilization, 0) / md.length * 10) / 10;
              const totalRev = md.reduce((s, d) => s + d.revenue, 0);
              const totalFleet = md.reduce((s, d) => s + d.totalEquip, 0);
              const criticals = md.filter(d => d.status === "critical").length;
              const overdueMaint = md.reduce((s, d) => s + d.overdue, 0);
              return (
                <div key={market}
                  onClick={() => { setFilterMarket(market); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  style={{
                    background: "#fff", borderRadius: 10, border: "1px solid #e8e6dc", padding: "16px 20px",
                    cursor: "pointer", transition: "border-color 0.15s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#B58B3F"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#e8e6dc"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{market}</span>
                    <span style={{ fontSize: 12, color: "#b0aea5" }}>{md.length} dealers — {totalFleet} units</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 13, flexWrap: "wrap" }}>
                    <span style={{ color: avgUtil < 50 ? "#B04A3A" : "#788c5d", fontWeight: 600 }}>{avgUtil}% util</span>
                    <span style={{ color: "#141413" }}>${(totalRev / 1000).toFixed(0)}K rev</span>
                    {criticals > 0 && (
                      <span style={{ color: "#B04A3A", display: "flex", alignItems: "center", gap: 3 }}>
                        <AlertTriangle size={12} /> {criticals} critical
                      </span>
                    )}
                    {overdueMaint > 0 && (
                      <span style={{ color: "#B58B3F", display: "flex", alignItems: "center", gap: 3 }}>
                        <Wrench size={12} /> {overdueMaint} overdue
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "32px 0 16px", fontSize: 12, color: "#b0aea5", fontFamily: "Lora, serif" }}>
          AFM Fleet Command Center — Mock Demo Data
        </div>
      </div>
    </div>
  );
}
