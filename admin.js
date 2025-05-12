// Initialize Supabase
const SUPABASE_URL     = 'https://dapwpgvnfjcfqqhrpxla.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcHdwZ3ZuZmpjZnFxaHJweGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sidebar toggle
document.getElementById('menuToggle').onclick = () =>
  document.getElementById('sidebar').classList.toggle('show');

// Login
document.getElementById('loginBtn').onclick = async () => {
  const email = document.getElementById('adminEmail').value;
  const pw    = document.getElementById('adminPw').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
  if (error) return alert('Login failed');
  document.getElementById('pwModal').style.display = 'none';
  initAll();
};

// Logout
document.getElementById('logoutBtn').onclick = () => {
  supabase.auth.signOut();
  location.reload();
};

// After login, show dashboard
async function initAll() {
  showSection('payments');
  await Promise.all([
    loadPayments(),
    loadApplications(),
    loadUsers(),
    loadSettings(),
    loadMessages(),
    loadLogs()
  ]);
  // Show nav links now that we're in
  document.querySelectorAll('.sidebar a').forEach(a => {
    a.onclick = e => {
      e.preventDefault();
      showSection(a.dataset.target);
      document.getElementById('sidebar').classList.remove('show');
    };
  });
}

function showSection(id) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// Load functions...
async function loadPayments() {
  const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
  const tbody = document.getElementById('paymentTableBody');
  tbody.innerHTML = data.map(p => `<tr>
    <td>${p.user_id}</td><td>${p.amount}</td><td>${p.payment_method}</td><td>${p.status}</td>
  </tr>`).join('') || '<tr><td colspan="4">No records</td></tr>';
}

async function loadApplications() {
  const { data, error } = await supabase.from('applications').select('*').order('created_at', { ascending: false });
  const tbody = document.getElementById('applicationTableBody');
  tbody.innerHTML = data.map(a => `<tr>
    <td>${a.user_id}</td><td>${a.status}</td>
    <td><button class="btn" onclick="updateApplication(${a.id}, 'approved')">Approve</button></td>
    <td><button class="btn" onclick="updateApplication(${a.id}, 'rejected')">Reject</button></td>
  </tr>`).join('') || '<tr><td colspan="4">No applications</td></tr>';
}

async function updateApplication(id, status) {
  await supabase.from('applications').update({ status }).eq('id', id);
  loadApplications();
}

async function loadUsers() {
  const { data, error } = await supabase.from('members').select('*').order('created_at', { ascending: false });
  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = data.map(u => `<tr>
    <td>${u.user_id}</td><td>${u.status}</td><td>${new Date(u.created_at).toLocaleString()}</td>
  </tr>`).join('') || '<tr><td colspan="3">No users</td></tr>';
}

async function loadSettings() {
  const { data, error } = await supabase.from('settings').select('*').limit(1).single();
  if (!error) {
    document.getElementById('btcWallet').value = data.btc;
    document.getElementById('ethWallet').value = data.eth;
    document.getElementById('usdtWallet').value = data.usdt;
    document.getElementById('paystackKey').value = data.paystackKey;
  }
}

document.getElementById('submitSettings').onclick = async () => {
  const btc = document.getElementById('btcWallet').value;
  const eth = document.getElementById('ethWallet').value;
  const usdt = document.getElementById('usdtWallet').value;
  const paystackKey = document.getElementById('paystackKey').value;
  await supabase.from('settings').upsert({ id:1, btc, eth, usdt, paystackKey });
  alert('Settings saved');
};

async function loadMessages() {
  const { data, error } = await supabase.from('inbox').select('*').order('created_at', { ascending: false });
  const tbody = document.getElementById('messageTableBody');
  tbody.innerHTML = data.map(m => `<tr>
    <td>${m.user_email}</td><td>${m.message}</td><td>${m.response||''}</td>
    <td><button class="btn" onclick="replyMsg(${m.id})">Reply</button></td>
  </tr>`).join('') || '<tr><td colspan="4">No messages</td></tr>';
}

window.replyMsg = async id => {
  const resp = prompt('Your reply:');
  if (!resp) return;
  await supabase.from('inbox').update({ response: resp }).eq('id', id);
  loadMessages();
};

async function loadLogs() {
  const { data } = await supabase.from('logs').select('*').order('timestamp', { ascending: false });
  document.getElementById('logList').innerHTML = data.map(l => `<li>[${l.timestamp}] ${l.message}</li>`).join('') || '<li>No logs</li>';
}

document.getElementById('clearLogs').onclick = async () => {
  await supabase.from('logs').delete().neq('id', 0);
  loadLogs();
};

// Publish Signal
document.getElementById('submitSignal').onclick = async () => {
  const obj = {
    currency_pair: document.getElementById('pair').value,
    type: document.getElementById('type').value,
    entry_point: parseFloat(document.getElementById('entry').value),
    take_profit: parseFloat(document.getElementById('tp').value),
    stop_loss: parseFloat(document.getElementById('sl').value),
    note: document.getElementById('signalNote').value,
    status: 'pending'
  };
  await supabase.from('signals').insert([obj]);
  alert('Signal published');
};

// Broadcast (simple)
document.getElementById('sendBroadcast').onclick = () => {
  const txt = document.getElementById('broadcastText').value;
  alert('Broadcast sent: ' + txt);
};

// Upload Insight
document.getElementById('submitInsight').onclick = async () => {
  const file = document.getElementById('insightFile').files[0];
  const note = document.getElementById('insightNote').value;
  const path = `trade_insights/${Date.now()}-${file.name}`;
  await supabase.storage.from('files').upload(path, file);
  await supabase.from('trade_insights').insert([{ screenshot_url: path, insight_content: note }]);
  alert('Insight uploaded');
};

// Upload History
document.getElementById('submitHistory').onclick = async () => {
  const file = document.getElementById('historyFile').files[0];
  const note = document.getElementById('historyNote').value;
  const month = document.getElementById('tradeMonth').value;
  const path = `trading_history/${Date.now()}-${file.name}`;
  await supabase.storage.from('files').upload(path, file);
  await supabase.from('trading_history').insert([{ screenshot_url: path, month, year: new Date().getFullYear() }]);
  alert('History uploaded');
};
