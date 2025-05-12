// admin.js

// Initialize Supabase
const SUPABASE_URL     = 'https://dapwpgvnfjcfqqhrpxla.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcHdwZ3ZuZmpjZnFxaHJweGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
  // Button & link listeners
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("submitSignal").addEventListener("click", postSignal);
  document.getElementById("submitSettings").addEventListener("click", updateSettings);
  document.getElementById("submitInsight").addEventListener("click", uploadInsight);
  document.getElementById("submitHistory").addEventListener("click", uploadHistory);
  document.getElementById("clearLogs").addEventListener("click", clearLogs);

  // Load all data sections
  fetchDashboardData();
});

async function fetchDashboardData() {
  await Promise.all([
    fetchUsers(),
    fetchPayments(),
    fetchApplications(),
    fetchMessages(),
    fetchSettings(),
    fetchLogs()
  ]);
}

// —— Users —— 
async function fetchUsers() {
  const { data, error } = await supabase.from("users").select("*");
  if (error) return alert("Error fetching users: " + error.message);
  const tbody = document.getElementById("userTableBody");
  tbody.innerHTML = data.map(u => `
    <tr>
      <td>${u.username}</td>
      <td>${u.email}</td>
      <td>${u.status}</td>
    </tr>
  `).join("");
}

// —— Payments —— 
async function fetchPayments() {
  const { data, error } = await supabase.from("payments").select("*");
  if (error) return alert("Error fetching payments: " + error.message);
  const tbody = document.getElementById("paymentTableBody");
  tbody.innerHTML = data.map(p => `
    <tr>
      <td>${p.user_id}</td>
      <td>${p.amount}</td>
      <td>${p.payment_method}</td>
      <td>${p.status}</td>
    </tr>
  `).join("");
}

// —— Applications —— 
async function fetchApplications() {
  const { data, error } = await supabase.from("applications").select("*");
  if (error) return alert("Error fetching applications: " + error.message);
  const tbody = document.getElementById("applicationTableBody");
  tbody.innerHTML = data.map(a => `
    <tr>
      <td>${a.user_id}</td>
      <td>${a.status}</td>
      <td><button class="btn" onclick="approveApplication(${a.id})">Approve</button></td>
      <td><button class="btn" onclick="rejectApplication(${a.id})">Reject</button></td>
    </tr>
  `).join("");
}

async function approveApplication(id) {
  const { error } = await supabase.from("applications").update({ status: "approved" }).eq("id", id);
  if (error) return alert("Error approving: " + error.message);
  fetchApplications();
}
async function rejectApplication(id) {
  const { error } = await supabase.from("applications").update({ status: "rejected" }).eq("id", id);
  if (error) return alert("Error rejecting: " + error.message);
  fetchApplications();
}

// —— Messages (Inbox) —— 
async function fetchMessages() {
  const { data, error } = await supabase.from("inbox").select("*");
  if (error) return alert("Error fetching messages: " + error.message);
  const tbody = document.getElementById("messageTableBody");
  tbody.innerHTML = data.map(m => `
    <tr>
      <td>${m.user_email}</td>
      <td>${m.message}</td>
      <td>${m.response || ''}</td>
      <td><button class="btn" onclick="replyMessage(${m.id})">Reply</button></td>
    </tr>
  `).join("");
}

async function replyMessage(id) {
  const response = prompt("Enter your reply:");
  if (response === null) return;
  const { error } = await supabase.from("inbox").update({ response }).eq("id", id);
  if (error) return alert("Error replying: " + error.message);
  fetchMessages();
}

// —— Settings —— 
async function fetchSettings() {
  const { data, error } = await supabase.from("settings").select("*").limit(1).single();
  if (error) return alert("Error fetching settings: " + error.message);
  document.getElementById("btcWallet").value = data.btc;
  document.getElementById("ethWallet").value = data.eth;
  document.getElementById("usdtWallet").value = data.usdt;
  document.getElementById("paystackKey").value = data.paystackKey;
}

async function updateSettings() {
  const btc = document.getElementById("btcWallet").value;
  const eth = document.getElementById("ethWallet").value;
  const usdt = document.getElementById("usdtWallet").value;
  const paystackKey = document.getElementById("paystackKey").value;
  const { error } = await supabase
    .from("settings")
    .upsert({ id: 1, btc, eth, usdt, paystackKey });
  if (error) return alert("Error updating settings: " + error.message);
  alert("Settings saved!");
}

// —— Signals —— 
async function postSignal() {
  const pair = document.getElementById("pair").value;
  const type = document.getElementById("type").value;
  const entry = parseFloat(document.getElementById("entry").value);
  const tp = parseFloat(document.getElementById("tp").value);
  const sl = parseFloat(document.getElementById("sl").value);
  const note = document.getElementById("signalNote").value;
  const { error } = await supabase.from("signals").insert([{
    currency_pair: pair,
    entry_point: entry,
    stop_loss: sl,
    take_profit: tp,
    note,
    status: 'pending'
  }]);
  if (error) return alert("Error posting signal: " + error.message);
  alert("Signal posted!");
}

async function fetchLogs() {
  const { data, error } = await supabase.from("members").select("*").order('created_at', { ascending: false });
  if (error) return alert("Error fetching members: " + error.message);
  const logList = document.getElementById("logList");
  logList.innerHTML = data.map(m => `
    <li>${m.user_id} – ${m.status} – ${new Date(m.created_at).toLocaleString()}</li>
  `).join("");
}

// —— Upload Trade Insights —— 
async function uploadInsight() {
  const file     = document.getElementById("insightFile").files[0];
  const note     = document.getElementById("insightNote").value;
  const filePath = `trade_insights/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("files").upload(filePath, file);
  if (uploadError) return alert("Insight upload failed: " + uploadError.message);
  const { error } = await supabase.from("trade_insights").insert([{ 
    screenshot_url: filePath, 
    insight_content: note 
  }]);
  if (error) return alert("Error saving insight: " + error.message);
  alert("Trade insight uploaded!");
}

// —— Upload Trading History —— 
async function uploadHistory() {
  const file     = document.getElementById("historyFile").files[0];
  const note     = document.getElementById("historyNote").value;
  const month    = document.getElementById("tradeMonth").value;
  const filePath = `trading_history/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("files").upload(filePath, file);
  if (uploadError) return alert("History upload failed: " + uploadError.message);
  const { error } = await supabase.from("trading_history").insert([{ 
    screenshot_url: filePath, 
    month, 
    year: new Date().getFullYear() 
  }]);
  if (error) return alert("Error saving history: " + error.message);
  alert("Trading history uploaded!");
}

// —— Logout —— 
function logout() {
  supabase.auth.signOut();
  window.location.reload();
}
