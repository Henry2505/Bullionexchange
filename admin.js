// admin.js

// Function to fetch data and update dashboard cards
async function updateDashboard() {
  // Fetch total users
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*');

  if (userError) {
    console.error('Error fetching users:', userError);
  } else {
    document.getElementById('total-users').textContent = users.length;
  }

  // Fetch total payments
  const { data: payments, error: paymentError } = await supabase
    .from('payments')
    .select('*');

  if (paymentError) {
    console.error('Error fetching payments:', paymentError);
  } else {
    document.getElementById('total-payments').textContent = payments.length;
  }

  // Fetch total signals (example of fetching signal data)
  const { data: signals, error: signalError } = await supabase
    .from('signals')
    .select('*');

  if (signalError) {
    console.error('Error fetching signals:', signalError);
  } else {
    document.getElementById('total-signals').textContent = signals.length;
  }

  // Fetch total trade history (example of fetching trade data)
  const { data: history, error: historyError } = await supabase
    .from('trade_history')
    .select('*');

  if (historyError) {
    console.error('Error fetching trade history:', historyError);
  } else {
    document.getElementById('total-history').textContent = history.length;
  }
}

// Initialize the dashboard on page load
document.addEventListener('DOMContentLoaded', updateDashboard);
