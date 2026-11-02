// GainTrain: prepojenie cez Apple Zdravie a iOS Skratky je vypnuté. Hodinky prepojíme cez appku v App Store a Google Play.
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Content-Type": "text/plain; charset=utf-8" };
Deno.serve((req) => req.method === "OPTIONS" ? new Response("ok", { headers: CORS }) : new Response("Táto funkcia je vypnutá. Skratku môžeš z iPhonu zmazať.", { status: 410, headers: CORS }));
