import React, { useState, useCallback } from "react";

const ROUTE = { from: "DXB", to: "YYZ", date: "June 30, 2026", bags: 2 };
const AIRLINES = [
  { id: "emirates", name: "Emirates", flag: "🇦🇪", stops: "Non-stop", bags: "2×23kg ✅", color: "#d71920", note: "A380 · 14h direct" },
  { id: "qatar", name: "Qatar Airways", flag: "🇶🇦", stops: "1 stop (DOH)", bags: "2×23kg ✅ (Classic+)", color: "#5c0632", note: "Most frequent" },
  { id: "turkish", name: "Turkish Airlines", flag: "🇹🇷", stops: "1 stop (IST)", bags: "2×23kg ✅", color: "#c8102e", note: "Via Istanbul" },
  { id: "aircanada", name: "Air Canada", flag: "🍁", stops: "1 stop", bags: "1 free (Amex Aeroplan)", color: "#f01428", note: "Amex bag perk" },
  { id: "egyptair", name: "EgyptAir", flag: "🇪🇬", stops: "1 stop (CAI)", bags: "Verify at booking", color: "#00732f", note: "Budget option" },
];

export default function FlightTracker() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("prices");

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Search for current one-way flight prices DXB to YYZ on June 30 2026. Check Emirates, Qatar Airways, Turkish Airlines, Air Canada, EgyptAir. I need 2 checked bags. Return JSON only."
        })
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Proxy error: ${res.status} ${txt}`);
      }

      const parsed = await res.json();
      const withTimestamp = { ...parsed, fetchedAt: new Date().toISOString() };

      setData(withTimestamp);
      setLastUpdated(new Date());
      setHistory((prev) => [withTimestamp, ...prev].slice(0, 7));
    } catch (e) {
      setError(e.message || "Failed to fetch prices");
    } finally {
      setLoading(false);
    }
  }, []);

  const daysUntil = () => {
    const dep = new Date("2026-06-30");
    const now = new Date();
    return Math.ceil((dep - now) / (1000 * 60 * 60 * 24));
  };

  const urgencyColor = () => {
    const d = daysUntil();
    if (d <= 14) return "#ff4757";
    if (d <= 21) return "#ffa502";
    return "#00ff88";
  };

  const formatPrice = (p) => (p ? `CA$${p.toLocaleString()}` : "—");
  const formatTime = (d) =>
    d ? d.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" }) : "—";

  const getBestPrice = () => {
    if (!data?.flights) return null;
    const priced = data.flights.filter((f) => f.price_cad);
    if (!priced.length) return null;
    return priced.reduce((a, b) => (a.price_cad < b.price_cad ? a : b));
  };

  const best = getBestPrice();

  return (
    <div
      style={{
        background: "#080c18",
        minHeight: "100vh",
        fontFamily: "'Courier New', monospace",
        color: "#e0e8ff",
        padding: 0
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px" }}>
        <button onClick={fetchPrices} disabled={loading}>
          {loading ? "SEARCHING LIVE PRICES..." : "⟳ REFRESH PRICES NOW"}
        </button>

        {error && <div>⚠ {error}</div>}

        {data?.summary && <div style={{ marginTop: 16 }}>{data.summary}</div>}
        {data?.tip && <div style={{ marginTop: 8 }}>{data.tip}</div>}

        {data?.flights?.map((flight, i) => (
          <div key={i} style={{ marginTop: 12 }}>
            <div>
              {flight.airline} — {formatPrice(flight.price_cad)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
