// src/functions/fetch_and_store_gold/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Deno.serve is built into Supabase’s Edge runtime.
Deno.serve(async (_req) => {
  // 1) Read GOLDAPI_KEY from environment
  const GOLDAPI_KEY = Deno.env.get("GOLDAPI_KEY");
  if (!GOLDAPI_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing GOLDAPI_KEY in environment" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2) Fetch XAU/USD from GoldAPI
  let price: number;
  try {
    const goldRes = await fetch("https://www.goldapi.io/api/XAU/USD", {
      headers: {
        "x-access-token": GOLDAPI_KEY,
        "Content-Type": "application/json",
      },
    });
    if (!goldRes.ok) {
      const body = await goldRes.text();
      console.error("GoldAPI error:", goldRes.status, body);
      return new Response(
        JSON.stringify({ error: "GoldAPI fetch failed" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
    const goldJson = await goldRes.json();
    price = parseFloat(goldJson.price);
    if (Number.isNaN(price)) throw new Error("Invalid price from GoldAPI");
  } catch (err) {
    console.error("Fetch gold price exception:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch gold price" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // 3) Insert into Supabase table `gold_prices`:
  const DB_URL = Deno.env.get("DB_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
  const supabase = createClient(DB_URL, SERVICE_ROLE_KEY);

  const { error } = await supabase
    .from("gold_prices")
    .insert({ price_usd: price });

  if (error) {
    console.error("Supabase insert error:", error);
    return new Response(
      JSON.stringify({ error: "DB insert failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, price_usd: price }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
