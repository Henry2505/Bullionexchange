// admin.js (Main script for admin panel)

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Supabase config
const SUPABASE_URL = 'https://dapwpgvnfjcfqqhrpxla.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Replace with your actual anon key
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Navigation routing
document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('.nav-link');
  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = link.getAttribute('href');
      loadPage(target);
    });
  });

  const path = window.location.pathname.split('/').pop();
  if (path === '' || path === 'admin-panel-private.html') {
    loadPage('admin-overview.html');
  } else {
    loadPage(path);
  }
});

async function loadPage(page) {
  const content = document.getElementById('content');
  try {
    const res = await fetch(page);
    const html = await res.text();
    content.innerHTML = html;

    if (page === 'admin-payments.html') loadPayments();
    // Add more load handlers if needed
  } catch (err) {
    content.innerHTML = '<p>Failed to load page.</p>';
  }
}

// Load payments from Supabase
async function loadPayments() {
  const { data, error } = await supabase.from('payments').select('*');
  const tableBody = document.getElementById('payment-table-body');
  tableBody.innerHTML = '';

  if (error) {
    console.error('Error fetching payments:', error);
    tableBody.innerHTML = '<tr><td colspan="5">Failed to load payments.</td></tr>';
    return;
  }

  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.id}</td>
      <td>${row.method}</td>
      <td>${row.details || ''}</td>
      <td>${row.date ? new Date(row.date).toLocaleString() : '-'}</td>
      <td><button class="edit-btn" data-id="${row.id}">Edit</button></td>
    `;
    tableBody.appendChild(tr);
  });

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editPayment(btn.dataset.id));
  });
}

// Edit or Add Payment
window.savePayment = async () => {
  const id = document.getElementById('payment-id').value;
  const method = document.getElementById('payment-method').value;
  const details = document.getElementById('payment-details').value;

  if (!method) {
    alert('Payment method is required.');
    return;
  }

  const payload = { method, details };

  if (id) {
    const { error } = await supabase.from('payments').update(payload).eq('id', id);
    if (error) {
      alert('Error updating payment.');
      console.error(error);
      return;
    }
  } else {
    payload.date = new Date().toISOString();
    const { error } = await supabase.from('payments').insert([payload]);
    if (error) {
      alert('Error adding payment.');
      console.error(error);
      return;
    }
  }

  document.getElementById('payment-form').reset();
  document.getElementById('payment-id').value = '';
  loadPayments();
};

window.editPayment = async (id) => {
  const { data, error } = await supabase.from('payments').select('*').eq('id', id).single();
  if (error || !data) {
    alert('Payment not found.');
    return;
  }

  document.getElementById('payment-id').value = data.id;
  document.getElementById('payment-method').value = data.method;
  document.getElementById('payment-details').value = data.details || '';
};
