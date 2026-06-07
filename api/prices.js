// filepath: api/prices.js
// ...existing code...
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY (set in Vercel env vars)" });

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key
      },
      body: JSON.stringify(req.body)
    });

    const json = await anthropicRes.json();
    return res.status(anthropicRes.status).json(json);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Proxy error" });
  }
}
// ...existing code...
