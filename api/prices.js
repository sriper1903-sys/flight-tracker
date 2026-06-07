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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return res
      .status(500)
      .json({ error: "Missing GEMINI_API_KEY (set in Vercel env vars)" });
  }

  try {
    const prompt =
      req.body?.prompt ||
      "Search for current one-way flight prices DXB to YYZ on June 30 2026. Check Emirates, Qatar Airways, Turkish Airlines, Air Canada, EgyptAir. I need 2 checked bags. Return JSON only.";

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        })
      }
    );

    const raw = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({
        error: raw?.error?.message || "Gemini API request failed",
        details: raw
      });
    }

    const text =
      raw?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() || "";

    if (!text) {
      return res.status(500).json({
        error: "Gemini returned an empty response",
        details: raw
      });
    }

    const cleaned = text.replace(/```json|```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(500).json({
        error: "Could not parse JSON from Gemini response",
        rawText: text
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Proxy error" });
  }
}
