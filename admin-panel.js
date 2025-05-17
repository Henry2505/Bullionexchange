// 1) Supabase client initialization
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL  = 'https://dapwpgvnfjcfqqhrpxla.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ'
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

 // 0) AUTH GUARD
-supabase.auth.onAuthStateChange((event, session) => {
-  if (!session) window.location.href = 'login.html';
-});
+supabase.auth.onAuthStateChange((event, session) => {
+  if (!session) window.location.href = 'admin-login.html';
+});

-(async () => {
-  const { data: { session } } = await supabase.auth.getSession();
-  if (!session) window.location.href = 'login.html';
-})();
+;(async () => {
+  const { data: { session } } = await supabase.auth.getSession();
+  if (!session) window.location.href = 'admin-login.html';
+})();

// 1) Sidebar toggle & section nav
const sidebar = document.getElementById('sidebar')
const toggleBtn = document.getElementById('toggleSidebar')
toggleBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'))

document.querySelectorAll('#sidebar nav li').forEach(li => {
  li.addEventListener('click', () => {
    document.querySelectorAll('main section').forEach(s => s.classList.remove('active'))
    document.getElementById(li.dataset.section).classList.add('active')
  })
})

/** PAYMENTS **/
async function loadPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select(`id, amount, currency, proof_url, status, created_at, users(full_name,email)`)
    .order('created_at', { ascending: false })
  if (error) return console.error(error)

  document.getElementById('paymentsTable').innerHTML = `
    <table><thead><tr>
      <th>User</th><th>Email</th><th>Amount</th><th>Status</th><th>Applied</th><th>Actions</th>
    </tr></thead><tbody>
    ${data.map(p => `
      <tr>
        <td>${p.users.full_name}</td>
        <td>${p.users.email}</td>
        <td>${p.amount} ${p.currency}</td>
        <td id="status-${p.id}">${p.status}</td>
        <td>${new Date(p.created_at).toLocaleString()}</td>
        <td>
          ${p.status==='pending'
            ? `<button onclick="approvePayment('${p.id}')">Approve</button>
               <button onclick="rejectPayment('${p.id}')">Reject</button>`
            : ''}
        </td>
      </tr>`).join('')}
    </tbody></table>`
}

window.approvePayment = async id => {
  await supabase.from('payments').update({ status:'approved' }).eq('id', id)
  document.getElementById(`status-${id}`).textContent = 'approved'
}
window.rejectPayment = async id => {
  await supabase.from('payments').update({ status:'rejected' }).eq('id', id)
  document.getElementById(`status-${id}`).textContent = 'rejected'
}

/** MEMBERS **/
async function loadMembers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, status, created_at')
    .order('created_at',{ ascending:false })
  if (error) return console.error(error)

  document.getElementById('membersTable').innerHTML = `
    <table><thead><tr>
      <th>Name</th><th>Email</th><th>Status</th><th>Joined</th><th>Actions</th>
    </tr></thead><tbody>
    ${data.map(u => `
      <tr>
        <td>${u.full_name}</td>
        <td>${u.email}</td>
        <td id="user-status-${u.id}">${u.status}</td>
        <td>${new Date(u.created_at).toLocaleDateString()}</td>
        <td>
          ${u.status==='pending'
            ? `<button onclick="updateMemberStatus('${u.id}','approved')">Approve</button>
               <button onclick="updateMemberStatus('${u.id}','rejected')">Reject</button>`
            : ''}
        </td>
      </tr>`).join('')}
    </tbody></table>`
}

window.updateMemberStatus = async (id,status) => {
  await supabase.from('users').update({ status }).eq('id',id)
  document.getElementById(`user-status-${id}`).textContent = status
}

/** SETTINGS **/
async function loadWallets() {
  const { data } = await supabase
    .from('settings')
    .select('key,value')
    .in('key',['paystackKey','BTC','ETH','TRON','USDT'])
  data.forEach(({key,value}) => {
    const elId = key === 'paystackKey' ? 'paystackKey' : `wallet${key}`
    document.getElementById(elId).value = value
  })
}

async function saveWallets(e) {
  e.preventDefault()
  const mappings = {
    paystackKey: document.getElementById('paystackKey').value,
    BTC:          document.getElementById('walletBTC').value,
    ETH:          document.getElementById('walletETH').value,
    TRON:         document.getElementById('walletTRON').value,
    USDT:         document.getElementById('walletUSDT').value,
  }
  for (let [key,value] of Object.entries(mappings)) {
    await supabase
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' })
  }
  alert('Saved.')
}

document.getElementById('saveWallets').addEventListener('click', saveWallets)

/** INBOX **/
async function loadMessages() {
  const { data, error } = await supabase
    .from('messages')
    .select('id,name,email,subject,body,created_at')
    .order('created_at', { ascending: false });
  if (error) return console.error(error);

  document.getElementById('messagesTable').innerHTML = `
    <table><thead><tr>
      <th>Name</th><th>Email</th><th>Subject</th><th>Received</th><th>Actions</th>
    </tr></thead><tbody>
      ${data.map(m => `
        <tr>
          <td>${m.name}</td>
          <td>${m.email}</td>
          <td>${m.subject}</td>
          <td>${new Date(m.created_at).toLocaleString()}</td>
          <td><button onclick="showReply('${m.email}')">Reply</button></td>
        </tr>`).join('')}
    </tbody></table>`;
}

function showReply(email) {
  document.getElementById('replyToEmail').textContent = email;
  document.getElementById('messageReply').classList.remove('hidden');
}

document.getElementById('cancelReply').onclick = () => {
  document.getElementById('messageReply').classList.add('hidden');
};

document.getElementById('sendReply').onclick = async () => {
  const to    = document.getElementById('replyToEmail').textContent;
  const text  = document.getElementById('replyBody').value;
  const { error } = await supabase.functions.invoke('send-email', {
    body: { to, subject: 'Re: Your Message', text }
  });
  if (error) return alert('Send failed: ' + error.message);
  alert('Reply sent.');
  document.getElementById('messageReply').classList.add('hidden');
};

/** TESTIMONIALS **/
async function loadTestimonials() {
  const { data, error } = await supabase
    .from('testimonials')
    .select('id,text,status,created_at,users(full_name,email)')
    .order('created_at', { ascending: false });
  if (error) return console.error(error);

  document.getElementById('testimonialsTable').innerHTML = `
    <table><thead><tr>
      <th>User</th><th>Email</th><th>Text</th><th>Status</th><th>Actions</th>
    </tr></thead><tbody>
      ${data.map(t => `
        <tr>
          <td>${t.users.full_name}</td>
          <td>${t.users.email}</td>
          <td>${t.text}</td>
          <td id="test-status-${t.id}">${t.status}</td>
          <td>${
            t.status==='pending'
              ? `<button onclick="moderateTestimonial('${t.id}','approved')">Approve</button>
                 <button onclick="moderateTestimonial('${t.id}','rejected')">Reject</button>`
              : ''
          }</td>
        </tr>`).join('')}
    </tbody></table>`;
}

window.moderateTestimonial = async (id, status) => {
  await supabase.from('testimonials').update({ status }).eq('id', id);
  document.getElementById(`test-status-${id}`).textContent = status;
};

/** TRADE HISTORY **/
async function loadHistoryList() {
  const { data, error } = await supabase
    .from('trade_history')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return console.error(error);

  document.getElementById('historyList').innerHTML = data.map(h => `
    <div class="history-card">
      <img src="${h.url}" alt="Trade ${h.month}" />
      <p><strong>Month:</strong> ${h.month}</p>
      <p>${h.notes}</p>
    </div>
  `).join('');
}

document.getElementById('uploadHistory').onclick = async () => {
  const month = +document.getElementById('historyMonth').value;
  const fileEl = document.getElementById('historyFile');
  const notes  = document.getElementById('historyNotes').value;
  if (!fileEl.files.length) return alert('Select a file.');
  const file = fileEl.files[0];
  const path = `history/${Date.now()}_${file.name}`;

  const { error: upErr } = await supabase.storage.from('trade-history').upload(path, file);
  if (upErr) return alert('Upload failed: ' + upErr.message);

  const { data: urlData } = supabase.storage.from('trade-history').getPublicUrl(path);
  const { error: insErr } = await supabase
    .from('trade_history')
    .insert([{ month, notes, url: urlData.publicUrl }]);
  if (insErr) return alert('Insert failed: ' + insErr.message);

  alert('Uploaded.');
  loadHistoryList();
};

/** TRADE INSIGHTS **/
async function loadInsightsList() {
  const { data, error } = await supabase
    .from('trade_insights')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return console.error(error);

  document.getElementById('insightsList').innerHTML = data.map(i => `
    <div class="insight-card">
      <h4>${i.title}</h4>
      <p>${i.body}</p>
      <small>${new Date(i.created_at).toLocaleString()}</small>
    </div>
  `).join('');
}

document.getElementById('postInsight').onclick = async () => {
  const title = document.getElementById('insightTitle').value;
  const body  = document.getElementById('insightBody').value;
  if (!title || !body) return alert('Fill both fields.');
  const { error } = await supabase
    .from('trade_insights')
    .insert([{ title, body }]);
  if (error) return alert('Insert failed: ' + error.message);

  alert('Posted.');
  loadInsightsList();
};

/** SIGNALS **/
async function loadSignalsList() {
  const { data, error } = await supabase
    .from('signals')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return console.error(error);

  document.getElementById('signalsTable').innerHTML = `
    <table><thead><tr>
      <th>Type</th><th>Name</th><th>Entry</th><th>SL</th><th>TP1</th><th>TP2</th><th>Actions</th>
    </tr></thead><tbody>
      ${data.map(s => `
        <tr>
          <td>${s.type}</td>
          <td>${s.name}</td>
          <td>${s.entry_level}</td>
          <td>${s.sl}</td>
          <td>${s.tp1}</td>
          <td>${s.tp2}</td>
          <td><button onclick="deleteSignal('${s.id}')">Delete</button></td>
        </tr>`).join('')}
    </tbody></table>`;
}

document.getElementById('createSignal').onclick = async () => {
  const obj = {
    type: document.getElementById('signalType').value,
    name: document.getElementById('signalName').value,
    entry_level: +document.getElementById('entryLevel').value,
    sl: +document.getElementById('sl').value,
    tp1: +document.getElementById('tp1').value,
    tp2: +document.getElementById('tp2').value,
  };
  const { error } = await supabase.from('signals').insert([obj]);
  if (error) return alert('Create failed: ' + error.message);

  alert('Created.');
  loadSignalsList();
};

window.deleteSignal = async id => {
  await supabase.from('signals').delete().eq('id', id);
  loadSignalsList();
};

/** INITIAL LOAD **/
window.addEventListener('DOMContentLoaded', () => {
  loadPayments();
  loadMembers();
  loadWallets();
  loadMessages();
  loadTestimonials();
  loadHistoryList();
  loadInsightsList();
  loadSignalsList();
});
