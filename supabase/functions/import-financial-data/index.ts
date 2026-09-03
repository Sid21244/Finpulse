import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders, json } from "../_shared/http.ts";

type RequestBody = { batchId?: unknown; csvText?: unknown; accountId?: unknown };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authentication required" }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) return json({ error: "Supabase function environment is incomplete" }, 500);
    const body = (await request.json()) as RequestBody;
    const batchId = typeof body.batchId === "string" ? body.batchId : "";
    const accountId = typeof body.accountId === "string" ? body.accountId : null;
    const csvText = typeof body.csvText === "string" ? body.csvText : "";
    if (!batchId || !csvText || csvText.length > 5_000_000) return json({ error: "A valid batch and CSV under 5 MB are required" }, 400);

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return json({ error: "Invalid session" }, 401);
    const userId = authData.user.id;
    const { data: batch } = await supabase.from("import_batches").select("id").eq("id", batchId).eq("user_id", userId).maybeSingle();
    if (!batch) return json({ error: "Import batch not found" }, 404);
    if (accountId) {
      const { data: account } = await supabase.from("accounts").select("id").eq("id", accountId).eq("user_id", userId).maybeSingle();
      if (!account) return json({ error: "Account not found" }, 404);
    }

    await supabase.from("import_batches").update({ status: "processing", error_message: null }).eq("id", batchId);
    const parsed = parseCsv(csvText);
    if (parsed.length < 2) throw new Error("CSV has no transaction rows");
    const headers = parsed[0].map(normalizeHeader);
    const rows = parsed.slice(1).filter((row) => row.some((cell) => cell.trim()));
    const transactions = [];
    let skipped = 0;
    for (const row of rows) {
      try {
        const record = Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? ""]));
        const merchant = record.merchant || record.description || record.narration || record.particulars;
        const occurredAt = parseDate(record.date || record.transaction_date || record.value_date);
        const amount = parseAmount(record.amount, record.debit, record.credit, record.type);
        if (!merchant || !occurredAt || !amount) throw new Error("missing fields");
        const rawHash = await sha256(`${userId}|${occurredAt}|${amount}|${merchant}|${record.reference || ""}`);
        transactions.push({
          user_id: userId,
          account_id: accountId,
          import_batch_id: batchId,
          external_id: record.reference || record.transaction_id || null,
          occurred_at: occurredAt,
          amount,
          merchant: merchant.slice(0, 180),
          description: record.description || record.narration || null,
          category: record.category || categorise(merchant),
          channel: record.channel || record.mode || "Statement",
          source: "csv",
          raw_hash: rawHash,
          metadata: { originalRow: record },
        });
      } catch {
        skipped += 1;
      }
    }

    let imported = 0;
    for (let index = 0; index < transactions.length; index += 250) {
      const { data, error } = await supabase.from("transactions").upsert(transactions.slice(index, index + 250), { onConflict: "user_id,raw_hash", ignoreDuplicates: true }).select("id");
      if (error) throw error;
      imported += data?.length ?? 0;
    }
    await supabase.from("import_batches").update({
      status: skipped ? "needs_review" : "completed",
      row_count: rows.length,
      imported_count: imported,
      skipped_count: skipped,
      completed_at: new Date().toISOString(),
    }).eq("id", batchId);
    return json({ imported, skipped, total: rows.length });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Import failed" }, 400);
  }
});

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"' && quoted && input[i + 1] === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ""; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const cleanNumber = (value = "") => Number(value.replace(/[₹,\s]/g, "").replace(/^\((.*)\)$/, "-$1"));
function parseAmount(amount = "", debit = "", credit = "", type = "") {
  if (amount) {
    const parsed = cleanNumber(amount);
    if (!Number.isFinite(parsed) || parsed === 0) return null;
    return /debit|dr|expense/i.test(type) ? -Math.abs(parsed) : /credit|cr|income/i.test(type) ? Math.abs(parsed) : parsed;
  }
  const debitAmount = cleanNumber(debit);
  if (Number.isFinite(debitAmount) && debitAmount > 0) return -debitAmount;
  const creditAmount = cleanNumber(credit);
  if (Number.isFinite(creditAmount) && creditAmount > 0) return creditAmount;
  return null;
}
function parseDate(value = "") {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();
  const match = value.match(/^(\d{1,2})[-/]([A-Za-z]{3}|\d{1,2})[-/](\d{2,4})$/);
  if (!match) return null;
  const date = new Date(`${match[1]} ${match[2]} ${match[3].length === 2 ? `20${match[3]}` : match[3]}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function categorise(text: string) {
  if (/zomato|swiggy|restaurant|grocery|food/i.test(text)) return "Food & Dining";
  if (/uber|ola|metro|fuel|petrol|transport/i.test(text)) return "Transport";
  if (/rent|housing|maintenance/i.test(text)) return "Housing";
  if (/electric|internet|utility|bill/i.test(text)) return "Bills";
  if (/salary|interest received/i.test(text)) return "Income";
  return "Other";
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
