const port = process.env.PORT ?? 3001;
let response;
try {
  response = await fetch(`http://localhost:${port}/api/healthz`);
  if (!response.ok) {
    console.error(`Healthcheck failed: HTTP ${response.status}`);
  }
} catch (error) {
  console.error("Healthcheck failed:", error);
}
process.exit(response?.ok ? 0 : 1);
