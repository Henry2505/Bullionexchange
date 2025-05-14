// Initialize Supabase (anon key for admin role bypass)
const SUPABASE_URL = 'https://dapwpgvnfjcfqqhrpxla.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcHdwZ3ZuZmpjZnFxaHJweGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ';

const supabaseAdmin = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Sidebar Toggle & Navigation ───

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('show');
}
function logout() {
  supabase.auth.signOut().then(() => location.reload());
}
document.querySelectorAll('.sidebar a[data-target]').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(el.dataset.target).classList.add('active');
    toggleSidebar();
  });
});
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('dashboard').classList.add('active');
  loadPayments();
  loadSettings();
  // (Call other loaders as you implement them)
});

// ─── Payments Management ───

async function loadPayments() {
  const { data, error } = await supabaseAdmin
    .from('user_payments')
    .select('*')
    .order('created_at', { ascending: false });
  const container = document.getElementById('paymentContainer');
  if (error) {
    container.innerHTML = '<p class="error">Error loading payments.</p>';
    console.error(error);
    return;
  }
  if (!data.length) {
    container.innerHTML = '<p>No payments found.</p>';
    return;
  }
  // Build table
  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>ID</th><th>Email</th><th>Plan</th><th>Amount</th>
        <th>Method</th><th>Status</th><th>When</th><th>Actions</th>
      </tr>
    </thead>
    <tbody>
      ${data.map(p => `
        <tr>
          <td>${p.id}</td>
          <td>${p.user_email}</td>
          <td>${p.plan}</td>
          <td>${p.amount}</td>
          <td>${p.method}</td>
          <td>${p.status}</td>
          <td>${new Date(p.created_at).toLocaleString()}</td>
          <td>
            <button class="btn approve-pay" data-id="${p.id}">Approve</button>
            <button class="btn reject-pay"  data-id="${p.id}">Reject</button>
            <button class="btn delete-pay"  data-id="${p.id}">Delete</button>
          </td>
        </tr>
      `).join('')}
    </tbody>
  `;
  container.innerHTML = '';
  container.appendChild(table);

  // Bind actions
  container.querySelectorAll('.approve-pay').forEach(btn => {
    btn.onclick = async () => {
      await supabaseAdmin.from('user_payments').update({ status: 'approved' }).eq('id', btn.dataset.id);
      loadPayments();
    };
  });
  container.querySelectorAll('.reject-pay').forEach(btn => {
    btn.onclick = async () => {
      await supabaseAdmin.from('user_payments').update({ status: 'rejected' }).eq('id', btn.dataset.id);
      loadPayments();
    };
  });
  container.querySelectorAll('.delete-pay').forEach(btn => {
    btn.onclick = async () => {
      await supabaseAdmin.from('user_payments').delete().eq('id', btn.dataset.id);
      loadPayments();
    };
  });
}

// ─── Payment Settings ───

async function loadSettings() {
  const { data, error } = await supabaseAdmin
    .from('payment_settings')
    .select('key,value')
    .order('id');
  const container = document.getElementById('settingsContainer');
  if (error) {
    container.textContent = 'Error loading settings';
    console.error(error);
    return;
  }
  container.innerHTML = '';
  data.forEach(item => {
    const group = document.createElement('div');
    group.className = 'form-group';
    group.innerHTML = `
      <label>${item.key}</label>
      <input type="text" id="setting_${item.key}" value="${item.value}" />
    `;
    container.appendChild(group);
  });
}

async function saveSettings() {
  document.getElementById('settingsMessage').textContent = '';
  const groups = document.querySelectorAll('#settingsContainer .form-group input');
  for (let inp of groups) {
    const key = inp.id.replace('setting_', '');
    const value = inp.value.trim();
    const { error } = await supabaseAdmin
      .from('payment_settings')
      .upsert({ key, value }, { onConflict: 'key' });
    if (error) {
      document.getElementById('settingsMessage').textContent = `Error saving ${key}`;
      console.error(error);
      return;
    }
  }
  document.getElementById('settingsMessage').textContent = 'Settings saved!';
}
