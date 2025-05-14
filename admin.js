// Initialize Supabase
const supabase = supabase.createClient(
  'https://dapwpgvnfjcfqqhrpxla.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcHdwZ3ZuZmpjZnFxaHJweGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ'
);

// Admin Access Check
supabase.auth.getSession().then(async ({ data: { session }, error }) => {
  if (error || !session) {
    alert("You must be logged in.");
    window.location.href = "login.html";
    return;
  }

  const user = session.user;
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleError || !roleData || roleData.role !== 'admin') {
    alert("Access denied. Admins only.");
    window.location.href = "login.html";
  } else {
    console.log("Welcome Admin:", user.email);
    // Load rest of the dashboard
    loadPayments();
    loadSettings();
  }
});

// Example functions (keep your original ones)
async function loadPayments() {
  const { data, error } = await supabase.from("user_payments").select("*").order("timestamp", { ascending: false });
  const container = document.getElementById("paymentContainer");

  if (error) {
    container.innerHTML = `<div class="alert-error">Error loading payments: ${error.message}</div>`;
    return;
  }

  if (data.length === 0) {
    container.innerHTML = `<p>No payments found.</p>`;
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th scope="col">Email</th>
          <th scope="col">Amount</th>
          <th scope="col">Method</th>
          <th scope="col">Details</th>
          <th scope="col">Status</th>
          <th scope="col">Timestamp</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(payment => `
          <tr>
            <td>${payment.user_email}</td>
            <td>${payment.amount}</td>
            <td>${payment.method}</td>
            <td>${payment.details}</td>
            <td>${payment.status}</td>
            <td>${new Date(payment.timestamp).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function loadSettings() {
  const { data, error } = await supabase.from("payment_settings").select("*").single();
  const settingsMessage = document.getElementById("settingsMessage");

  if (error) {
    settingsMessage.textContent = "Failed to load settings.";
    return;
  }

  document.getElementById("paystackLink").value = data.paystack_link || "";
  document.getElementById("btcAddress").value = data.btc_wallet || "";
  document.getElementById("usdtAddress").value = data.usdt_wallet || "";
  document.getElementById("ethAddress").value = data.eth_wallet || "";
  document.getElementById("trxAddress").value = data.trx_wallet || "";
}

document.getElementById("saveSettingsBtn").addEventListener("click", async () => {
  const paystackLink = document.getElementById("paystackLink").value;
  const btc = document.getElementById("btcAddress").value;
  const usdt = document.getElementById("usdtAddress").value;
  const eth = document.getElementById("ethAddress").value;
  const trx = document.getElementById("trxAddress").value;

  const { error } = await supabase
    .from("payment_settings")
    .update({
      paystack_link: paystackLink,
      btc_wallet: btc,
      usdt_wallet: usdt,
      eth_wallet: eth,
      trx_wallet: trx
    })
    .eq("id", 1);

  const msg = document.getElementById("settingsMessage");
  msg.textContent = error ? "Failed to update settings." : "Settings updated!";
});
