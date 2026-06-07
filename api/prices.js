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
    return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  }

  try {
    const prompt = req.body?.prompt || "Get flight prices DXB to YYZ June 30 2026.";

    // ✅ Using gemini-1.5-flash-latest (sometimes more compatible) 
    // ✅ Using v1beta which supports more features
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: SYSTEM_PROMPT + "\n\n" + prompt
                }
              ]
            }
          ]
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

    const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      return res.status(500).json({ error: "Empty response from Gemini" });
    }

    // Clean JSON
    const cleaned = text.replace(/```json|```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(500).json({ error: "No JSON found in response", rawText: text });
    }

    return res.status(200).json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    return res.status(500).json({ error: err.message || "Proxy error" });
  }
}
