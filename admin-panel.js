// 1) Supabase client initialization
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL  = 'https://dapwpgvnfjcfqqhrpxla.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ'
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// 2) Sidebar toggle & section nav
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
    .select('id,full_name,email,status,created_at')
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

/** SETTINGS: load & save payment addresses **/
async function loadWallets() {
  const { data } = await supabase
    .from('settings')
    .select('key,value')
    .in('key',['paystackKey','BTC','ETH','TRON','USDT'])
  data.forEach(({key,value}) => {
    document.getElementById(`wallet${key==="paystackKey"?"Key":key}`).value = value
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
  alert('Wallet addresses saved.')
}

document.getElementById('saveWallets').addEventListener('click', saveWallets)

/** PLACEHOLDER LOADERS for other sections **/
async function loadMessages() { /* … */ }
async function loadTestimonials() { /* … */ }
async function loadHistoryList() { /* … */ }
async function loadInsightsList() { /* … */ }
async function loadSignalsList() { /* … */ }

/** INITIAL LOAD **/
window.addEventListener('DOMContentLoaded', () => {
  loadPayments()
  loadMembers()
  loadWallets()
  // later: loadMessages(), loadTestimonials(), loadHistoryList(), loadInsightsList(), loadSignalsList()
})
