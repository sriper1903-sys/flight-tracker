// ...existing code...
import React, { useState, useCallback } from "react";

const ROUTE = { from: "DXB", to: "YYZ", date: "June 30, 2026", bags: 2 };
const AIRLINES = [
  { id: "emirates", name: "Emirates", flag: "🇦🇪", stops: "Non-stop", bags: "2×23kg ✅", color: "#d71920", note: "A380 · 14h direct" },
  { id: "qatar", name: "Qatar Airways", flag: "🇶🇦", stops: "1 stop (DOH)", bags: "2×23kg ✅ (Classic+)", color: "#5c0632", note: "Most frequent" },
  { id: "turkish", name: "Turkish Airlines", flag: "🇹🇷", stops: "1 stop (IST)", bags: "2×23kg ✅", color: "#c8102e", note: "Via Istanbul" },
  { id: "aircanada", name: "Air Canada", flag: "🍁", stops: "1 stop", bags: "1 free (Amex Aeroplan)", color: "#f01428", note: "Amex bag perk" },
  { id: "egyptair", name: "EgyptAir", flag: "🇪🇬", stops: "1 stop (CAI)", bags: "Verify at booking", color: "#00732f", note: "Budget option" },
];

const SYSTEM_PROMPT = `You are a real-time flight price research assistant. The user wants current one-way flight prices from Dubai (DXB) to Toronto Pearson (YYZ) departing June 30, 2026, for 1 adult, Economy class, with 2 checked bags.

Search for current prices on Google Flights, Kayak, Skyscanner, and airline websites for these carriers: Emirates, Qatar Airways, Turkish Airlines, Air Canada, EgyptAir.

Return ONLY a valid JSON object — no markdown, no explanation, no backticks. Format:
{
  "timestamp": "ISO string",
  "flights": [ ... ],
  "cheapest_airline": "...",
  "best_value_airline": "...",
  "summary": "...",
  "tip": "..."
}`;

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
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{
            role: "user",
            content: `Search for current one-way flight prices DXB to YYZ on June 30 2026. Check Emirates, Qatar Airways, Turkish Airlines, Air Canada, EgyptAir. I need 2 checked bags. Return JSON only.`
          }]
        })
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Proxy error: ${res.status} ${txt}`);
      }

      const raw = await res.json();

      // Attempt to extract text content robustly
      let text = "";
      if (Array.isArray(raw?.content)) {
        text = raw.content.map(c => c.text || c.content || "").join("");
      } else if (typeof raw?.completion === "string") {
        text = raw.completion;
      } else if (typeof raw === "string") {
        text = raw;
      } else {
        text = JSON.stringify(raw);
      }

      const cleaned = text.replace(/```json|```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse price data from model response");

      const parsed = JSON.parse(jsonMatch[0]);
      const withTimestamp = { ...parsed, fetchedAt: new Date().toISOString() };

      setData(withTimestamp);
      setLastUpdated(new Date());
      setHistory(prev => [withTimestamp, ...prev].slice(0, 7));
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

  const formatPrice = (p) => p ? `CA$${p.toLocaleString()}` : "—";
  const formatTime = (d) => d ? d.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" }) : "—";

  const getBestPrice = () => {
    if (!data?.flights) return null;
    const priced = data.flights.filter(f => f.price_cad);
    if (!priced.length) return null;
    return priced.reduce((a, b) => a.price_cad < b.price_cad ? a : b);
  };

  const best = getBestPrice();

  return (
    <div style={{ background: "#080c18", minHeight: "100vh", fontFamily: "'Courier New', monospace", color: "#e0e8ff", padding: 0 }}>
      {/* UI is same as before - omitted here for brevity in this snippet */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px" }}>
        <button onClick={fetchPrices} disabled={loading}>
          {loading ? "SEARCHING LIVE PRICES..." : "⟳ REFRESH PRICES NOW"}
        </button>

        {error && <div>⚠ {error}</div>}

        {/* Render data or fallback rows */}
        {data?.flights?.map((flight, i) => (
          <div key={i}>
            <div>{flight.airline} — {formatPrice(flight.price_cad)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
// ...existing code...
