const base = process.env.API_BASE_URL || "http://localhost:4173";

const checks = [
  ["/api/health", (data) => data.ok === true],
  ["/api/countries", (data) => Array.isArray(data.data) && data.data.length >= 12],
  ["/api/market-overview?country=US", (data) => data.data?.country?.countryCode === "US"],
  ["/api/search?q=AAPL", (data) => Array.isArray(data.data) && data.data.some((asset) => asset.symbol === "AAPL")],
  ["/api/quote?symbol=AAPL", (data) => data.data?.symbol === "AAPL" && Object.hasOwn(data.data, "price")],
  ["/api/history?symbol=AAPL&range=1M", (data) => data.data?.symbol === "AAPL" && Array.isArray(data.data.points)],
  ["/api/fundamentals?symbol=AAPL", (data) => data.data?.symbol === "AAPL"],
  ["/api/brokers?country=US", (data) => Array.isArray(data.data?.brokers)],
  ["/api/diagnostics", (data) => data.data?.backendOnline === true]
];

for (const [path, isValid] of checks) {
  const response = await fetch(`${base}${path}`);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  const data = await response.json();
  if (!isValid(data)) throw new Error(`${path} returned unexpected data`);
  console.log(`ok ${path}`);
}
