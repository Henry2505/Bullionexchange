import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Replace with your actual Supabase project credentials
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Navigation
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.sidebar nav ul li a');

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.getAttribute('data-section');
    sections.forEach(section => {
      if (section.id === target) {
        section.classList.add('active');
        section.classList.remove('hidden');
      } else {
        section.classList.remove('active');
        section.classList.add('hidden');
      }
    });
  });
});

// Signals
const signalForm = document.getElementById('signalForm');
const signalItems = document.getElementById('signalItems');

signalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const currency_pair = document.getElementById('currencyPair').value;
  const entry_point = parseFloat(document.getElementById('entryPoint').value);
  const stop_loss = parseFloat(document.getElementById('stopLoss').value);
  const take_profit = parseFloat(document.getElementById('takeProfit').value);
  const note = document.getElementById('note').value;

  const { data, error } = await supabase
    .from('signals')
    .insert([{ currency_pair, entry_point, stop_loss, take_profit, note }]);

  if (error) {
    alert('Error posting signal: ' + error.message);
  } else {
    alert('Signal posted successfully!');
    signalForm.reset();
    loadSignals();
  }
});

async function loadSignals() {
  const { data, error } = await supabase
    .from('signals')
    .select('*')
    .order('created_at', { ascending: false });

  signalItems.innerHTML = '';
  if (data && data.length > 0) {
    data.forEach(signal => {
      const item = document.createElement('li');
      item.textContent = `${signal.currency_pair} | Entry: ${signal.entry_point} | SL: ${signal.stop_loss} | TP: ${signal.take_profit} | Note: ${signal.note}`;
      signalItems.appendChild(item);
    });
  } else {
    signalItems.innerHTML = '<li>No signals posted yet.</li>';
  }
}

// Testimonials
const testimonialItems = document.getElementById('testimonialItems');

async function loadTestimonials() {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('created_at', { ascending: false });

  testimonialItems.innerHTML = '';
  if (data && data.length > 0) {
    data.forEach(testimonial => {
      const item = document.createElement('li');
      item.textContent = `User ID: ${testimonial.user_id} | Content: ${testimonial.content} | Status: ${testimonial.status}`;
      testimonialItems.appendChild(item);
    });
  } else {
    testimonialItems.innerHTML = '<li>No testimonials available.</li>';
  }
}

// Payments
const paymentItems = document.getElementById('paymentItems');

async function loadPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });

  paymentItems.innerHTML = '';
  if (data && data.length > 0) {
    data.forEach(payment => {
      const item = document.createElement('li');
      item.textContent = `User ID: ${payment.user_id} | Amount: ${payment.amount} | Method: ${payment.payment_method} | Status: ${payment.status}`;
      paymentItems.appendChild(item);
    });
  } else {
    paymentItems.innerHTML = '<li>No payments recorded.</li>';
  }
}

// Inbox
const inboxItems = document.getElementById('inboxItems');

async function loadInbox() {
  const { data, error } = await supabase
    .from('inbox')
    .select('*')
    .order('created_at', { ascending: false });

  inboxItems.innerHTML = '';
  if (data && data.length > 0) {
    data.forEach(message => {
      const item = document.createElement('li');
      item.textContent = `Email: ${message.user_email} | Message: ${message.message} | Response: ${message.response || 'No response yet'}`;
      inboxItems.appendChild(item);
    });
  } else {
    inboxItems.innerHTML = '<li>No messages in inbox.</li>';
  }
}

// Trading History
const tradingHistoryItems = document.getElementById('tradingHistoryItems');

async function loadTradingHistory() {
  const { data, error } = await supabase
    .from('trading_history')
    .select('*')
    .order('created_at', { ascending: false });

  tradingHistoryItems.innerHTML = '';
  if (data && data.length > 0) {
    data.forEach(history => {
      const item = document.createElement('li');
      item.textContent = `User ID: ${history.user_id} | Month: ${history.month} | Year: ${history.year} | Screenshot URL: ${history.screenshot_url}`;
      tradingHistoryItems.appendChild(item);
    
