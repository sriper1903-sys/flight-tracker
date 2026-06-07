import { useState, useEffect, useCallback } from "react";

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
  "flights": [
    {
      "airline": "Emirates",
      "price_cad": 1050,
      "price_usd": 780,
      "stops": "Non-stop",
      "duration": "14h 10m",
      "bags_included": 2,
      "bag_note": "2x23kg included Americas route",
      "booking_url": "https://www.emirates.com",
      "source": "emirates.com",
      "alert": null
    }
  ],
  "cheapest_airline": "Qatar Airways",
  "best_value_airline": "Emirates",
  "summary": "One sentence summary of today's prices",
  "tip": "One actionable booking tip for today"
}

For bag_note: Emirates and Turkish include 2 bags. Qatar includes 2 bags on Classic/Comfort, NOT on Lite. Air Canada 1st bag free with Amex Aeroplan card.
Set alert to a short warning string if the fare seems unusually high or if bag restrictions apply, otherwise null.
Use real web search to find accurate current prices. If you cannot find a price, use null for price_cad.`;

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
      const response = await fetch("https://api.anthropic.com/v1/messages", {
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

      const raw = await response.json();
      const text = raw.content
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("");

      const cleaned = text.replace(/```json|```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse price data");

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
    <div style={{
      background: "#080c18",
      minHeight: "100vh",
      fontFamily: "'Courier New', monospace",
      color: "#e0e8ff",
      padding: "0",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Grid background */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.04,
        backgroundImage: "linear-gradient(#00d4ff 1px, transparent 1px), linear-gradient(90deg, #00d4ff 1px, transparent 1px)",
        backgroundSize: "40px 40px", pointerEvents: "none", zIndex: 0
      }} />

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px", position: "relative", zIndex: 1 }}>

        {/* ── HEADER ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "#00d4ff", letterSpacing: "0.25em", marginBottom: 8 }}>
                ✈ FLIGHT PRICE TRACKER
              </div>
              <h1 style={{
                fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                fontWeight: 900,
                margin: 0,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                fontFamily: "'Georgia', serif"
              }}>
                <span style={{ color: "#fff" }}>DXB</span>
                <span style={{ color: "#00d4ff", margin: "0 10px" }}>→</span>
                <span style={{ color: "#fff" }}>YYZ</span>
              </h1>
              <div style={{ fontSize: 12, color: "#6b7fa3", marginTop: 6 }}>
                June 30 2026 · 1 Adult · 2 Checked Bags · Economy
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{
                background: "#0f1929", border: "1px solid #1f3055",
                borderRadius: 10, padding: "10px 16px"
              }}>
                <div style={{ fontSize: 10, color: "#6b7fa3", marginBottom: 4 }}>DEPARTURE IN</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: urgencyColor(), lineHeight: 1 }}>
                  {daysUntil()}
                </div>
                <div style={{ fontSize: 10, color: "#6b7fa3", marginTop: 2 }}>DAYS</div>
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div style={{
            marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap",
            alignItems: "center"
          }}>
            {lastUpdated && (
              <span style={{ fontSize: 11, color: "#6b7fa3" }}>
                Last updated: {formatTime(lastUpdated)}
              </span>
            )}
            {best && (
              <span style={{
                background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.2)",
                color: "#00ff88", fontSize: 11, padding: "3px 10px", borderRadius: 6
              }}>
                ↓ Cheapest today: {formatPrice(best.price_cad)} on {best.airline}
              </span>
            )}
            {daysUntil() <= 21 && (
              <span style={{
                background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.2)",
                color: "#ff4757", fontSize: 11, padding: "3px 10px", borderRadius: 6
              }}>
                ⚠ Book soon — prices rising
              </span>
            )}
          </div>
        </div>

        {/* ── REFRESH BUTTON ── */}
        <button
          onClick={fetchPrices}
          disabled={loading}
          style={{
            width: "100%", marginBottom: 28,
            background: loading ? "#0f1929" : "linear-gradient(135deg, #00d4ff, #0099cc)",
            border: loading ? "1px solid #1f3055" : "none",
            color: loading ? "#6b7fa3" : "#000",
            fontFamily: "'Courier New', monospace",
            fontWeight: 900, fontSize: 14, letterSpacing: "0.15em",
            padding: "16px", borderRadius: 12, cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10
          }}
        >
          {loading ? (
            <>
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
              SEARCHING LIVE PRICES... (15–30 seconds)
            </>
          ) : (
            <>⟳ REFRESH PRICES NOW</>
          )}
        </button>

        {error && (
          <div style={{
            background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.3)",
            borderRadius: 10, padding: "14px 18px", marginBottom: 20, fontSize: 13, color: "#ff6b7a"
          }}>
            ⚠ {error}. Try refreshing again.
          </div>
        )}

        {/* ── TABS ── */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #1a2a45", paddingBottom: 0 }}>
          {["prices", "strategy", "history"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: "none", border: "none",
              borderBottom: activeTab === tab ? "2px solid #00d4ff" : "2px solid transparent",
              color: activeTab === tab ? "#00d4ff" : "#6b7fa3",
              fontFamily: "'Courier New', monospace", fontSize: 12,
              letterSpacing: "0.15em", padding: "8px 16px", cursor: "pointer",
              textTransform: "uppercase", transition: "color 0.2s"
            }}>
              {tab}
            </button>
          ))}
        </div>

        {/* ── PRICES TAB ── */}
        {activeTab === "prices" && (
          <div>
            {!data && !loading && (
              <div style={{
                textAlign: "center", padding: "60px 20px",
                background: "#0f1929", borderRadius: 16, border: "1px dashed #1a2a45"
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✈</div>
                <div style={{ color: "#6b7fa3", fontSize: 14 }}>
                  Hit "Refresh Prices Now" to fetch live prices<br />
                  from Emirates, Qatar, Turkish, Air Canada & EgyptAir
                </div>
              </div>
            )}

            {data?.summary && (
              <div style={{
                background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.2)",
                borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#a0c8e0"
              }}>
                💡 {data.summary}
              </div>
            )}

            {data?.tip && (
              <div style={{
                background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.2)",
                borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#ffd700"
              }}>
                🎯 Today's tip: {data.tip}
              </div>
            )}

            {data?.flights?.map((flight, i) => {
              const isCheapest = best?.airline === flight.airline;
              const isBestVal = data?.best_value_airline === flight.airline;
              return (
                <div key={i} style={{
                  background: isCheapest ? "rgba(0,255,136,0.05)" : "#0d1626",
                  border: `1px solid ${isCheapest ? "rgba(0,255,136,0.3)" : isBestVal ? "rgba(0,212,255,0.25)" : "#1a2a45"}`,
                  borderRadius: 14, padding: "20px 24px", marginBottom: 14,
                  transition: "transform 0.15s",
                  position: "relative"
                }}>
                  {isCheapest && (
                    <div style={{
                      position: "absolute", top: -1, right: 16,
                      background: "#00ff88", color: "#000",
                      fontSize: 10, fontWeight: 900, padding: "3px 10px",
                      borderRadius: "0 0 8px 8px", letterSpacing: "0.1em"
                    }}>CHEAPEST</div>
                  )}
                  {isBestVal && !isCheapest && (
                    <div style={{
                      position: "absolute", top: -1, right: 16,
                      background: "#00d4ff", color: "#000",
                      fontSize: 10, fontWeight: 900, padding: "3px 10px",
                      borderRadius: "0 0 8px 8px", letterSpacing: "0.1em"
                    }}>BEST VALUE</div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <span style={{ fontSize: 28 }}>
                        {AIRLINES.find(a => a.name === flight.airline)?.flag || "✈"}
                      </span>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.01em" }}>
                          {flight.airline}
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7fa3", marginTop: 3 }}>
                          {flight.stops} · {flight.duration || "—"}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontSize: 30, fontWeight: 900, lineHeight: 1,
                        color: flight.price_cad ? (isCheapest ? "#00ff88" : "#e0e8ff") : "#6b7fa3",
                        fontFamily: "'Georgia', serif"
                      }}>
                        {formatPrice(flight.price_cad)}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7fa3", marginTop: 2 }}>
                        {flight.price_usd ? `≈ US$${flight.price_usd.toLocaleString()}` : "CAD one-way"}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <span style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 6,
                      background: "rgba(0,255,136,0.1)", color: "#00ff88",
                      border: "1px solid rgba(0,255,136,0.2)"
                    }}>
                      🧳 {flight.bag_note || flight.bags_included + " bags"}
                    </span>
                    {flight.alert && (
                      <span style={{
                        fontSize: 11, padding: "3px 10px", borderRadius: 6,
                        background: "rgba(255,165,0,0.1)", color: "#ffa502",
                        border: "1px solid rgba(255,165,0,0.2)"
                      }}>
                        ⚠ {flight.alert}
                      </span>
                    )}
                    <span style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 6,
                      background: "rgba(0,212,255,0.08)", color: "#00d4ff",
                      border: "1px solid rgba(0,212,255,0.15)"
                    }}>
                      via {flight.source || "search"}
                    </span>
                  </div>

                  {flight.booking_url && (
                    <a href={flight.booking_url} target="_blank" rel="noopener noreferrer" style={{
                      display: "inline-block", marginTop: 14,
                      background: isCheapest ? "#00ff88" : "transparent",
                      border: isCheapest ? "none" : "1px solid #1f3a5a",
                      color: isCheapest ? "#000" : "#00d4ff",
                      fontFamily: "'Courier New', monospace",
                      fontSize: 12, fontWeight: 900, letterSpacing: "0.1em",
                      padding: "8px 18px", borderRadius: 8, textDecoration: "none",
                      transition: "all 0.15s"
                    }}>
                      BOOK NOW →
                    </a>
                  )}
                </div>
              );
            })}

            {/* Static fallback airline rows while no data */}
            {!data && !loading && AIRLINES.map((a, i) => (
              <div key={i} style={{
                background: "#0d1626", border: "1px solid #1a2a45",
                borderRadius: 14, padding: "18px 24px", marginBottom: 12,
                opacity: 0.6
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <span style={{ fontSize: 24 }}>{a.flag}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: "#6b7fa3" }}>{a.stops} · {a.note}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#3a5a80" }}>Refresh for price</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── STRATEGY TAB ── */}
        {activeTab === "strategy" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              {
                icon: "🇦🇪",
                title: "Emirates — Best Comfort Pick",
                body: "Non-stop DXB→YYZ in ~14h on A380. Includes 2×23kg bags on Americas routes — no bag fee surprises. Book on emirates.com. Use CIBC Dividend via CIBC by Expedia for 1% cash back.",
                color: "#00d4ff"
              },
              {
                icon: "🇶🇦",
                title: "Qatar Airways — Best Budget Pick",
                body: "Most frequent route (53x/week via Doha). Economy Classic or Comfort = 2 bags included. AVOID Economy Lite (only 1 bag). Book direct on qatarairways.com.",
                color: "#00ff88"
              },
              {
                icon: "💳",
                title: "CIBC Dividend Card Strategy",
                body: "Book via cibc.com → Travel → CIBC by Expedia to earn 1% cash back on your ticket. No free bags on this card — but Dividend Visa Infinite includes emergency travel medical insurance.",
                color: "#ffa502"
              },
              {
                icon: "💳",
                title: "Amex Card Strategy",
                body: "If you have Amex Aeroplan: book Air Canada for free first checked bag (saves ~$75). Amex Platinum: $200 airline fee credit covers bag fees on other airlines. Transfer Membership Rewards to Aeroplan for award flights.",
                color: "#ff6b35"
              },
              {
                icon: "🔔",
                title: "Price Alert — Set It Now",
                body: "Go to Google Flights, search DXB→YYZ Jun 30, click the bell icon to set an email alert. Do the same on Kayak. June 30 is summer travel — prices typically spike 3–4 weeks out.",
                color: "#ffd700"
              },
              {
                icon: "📅",
                title: "Booking Window",
                body: `${daysUntil()} days until departure. Ideal booking window for international flights is 3–6 weeks out. You're entering the zone — prices will likely rise weekly from now. Book when you see a price you're happy with.`,
                color: daysUntil() <= 21 ? "#ff4757" : "#00ff88"
              }
            ].map((s, i) => (
              <div key={i} style={{
                background: "#0d1626", border: `1px solid ${s.color}22`,
                borderLeft: `3px solid ${s.color}`,
                borderRadius: 12, padding: "18px 20px"
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 14, color: s.color, marginBottom: 6 }}>{s.title}</div>
                    <div style={{ fontSize: 13, color: "#a0b0cc", lineHeight: 1.6 }}>{s.body}</div>
                  </div>
                </div>
              </div>
            ))}

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginTop: 8
            }}>
              {[
                { label: "Google Flights Alert", url: "https://www.google.com/travel/flights", color: "#4285f4" },
                { label: "Kayak Price Alert", url: "https://www.kayak.com/flights/DXB-YYZ/2026-06-30", color: "#ff690f" },
                { label: "CIBC by Expedia", url: "https://www.cibc.com/en/personal-banking/credit-cards/travel/cibc-by-expedia.html", color: "#c8102e" },
                { label: "Emirates Direct", url: "https://www.emirates.com", color: "#d71920" },
              ].map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{
                  background: "#0d1626", border: `1px solid ${l.color}44`,
                  borderRadius: 10, padding: "12px 16px", textDecoration: "none",
                  color: l.color, fontSize: 12, fontWeight: 700,
                  letterSpacing: "0.05em", display: "block",
                  transition: "background 0.15s"
                }}>
                  → {label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === "history" && (
          <div>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7fa3", fontSize: 13 }}>
                No price history yet. Refresh prices to start tracking.
              </div>
            ) : (
              history.map((h, i) => {
                const cheap = h.flights?.filter(f => f.price_cad)
                  .sort((a, b) => a.price_cad - b.price_cad)[0];
                return (
                  <div key={i} style={{
                    background: "#0d1626", border: "1px solid #1a2a45",
                    borderRadius: 12, padding: "16px 20px", marginBottom: 10,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    flexWrap: "wrap", gap: 10
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#6b7fa3" }}>
                        {new Date(h.fetchedAt).toLocaleString("en-CA")}
                      </div>
                      <div style={{ fontSize: 13, color: "#a0b0cc", marginTop: 4 }}>
                        {h.summary}
                      </div>
                    </div>
                    {cheap && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#00ff88", fontFamily: "'Georgia', serif" }}>
                          CA${cheap.price_cad.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7fa3" }}>{cheap.airline}</div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{ marginTop: 40, textAlign: "center", fontSize: 11, color: "#2a3a55", borderTop: "1px solid #0f1929", paddingTop: 20 }}>
          DXB → YYZ · Jun 30 2026 · Prices fetched live via web search · Always verify at checkout
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        a:hover { opacity: 0.85; }
        button:hover:not(:disabled) { filter: brightness(1.1); }
      `}</style>
    </div>
  );
}
// ...existing code...
const response = await fetch("/api/prices", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: `Search for current one-way flight prices DXB to YYZ on June 30 2026. Check Emirates, Qatar Airways, Turkish Airlines, Air Canada, EgyptAir. I need 2 checked bags. Return JSON only.` }]
  })
});
// ...existing code...
