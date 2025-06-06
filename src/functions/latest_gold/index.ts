// src/functions/latest_gold/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (_req) => {
  // Read the database URL and anon key:
  const DB_URL = Deno.env.get("DB_URL")!;
  const PUBLIC_ANON_KEY = Deno.env.get("PUBLIC_ANON_KEY")!;
  const supabase = createClient(DB_URL, PUBLIC_ANON_KEY);

  // Query the most recent entry in gold_prices
  const { data, error } = await supabase
    .from("gold_prices")
    .select("price_usd, fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Supabase select error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to read latest gold price" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!data || data.length === 0) {
    return new Response(
      JSON.stringify({ error: "No gold price found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const latest = data[0];
  return new Response(
    JSON.stringify({
      price_usd: parseFloat(latest.price_usd),
      fetched_at: latest.fetched_at,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
