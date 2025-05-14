// admin.js

const SUPABASE_URL = 'https://dapwpgvnfjcfqqhrpxla.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcHdwZ3ZuZmpjZnFxaHJweGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    window.location.href = 'admin-login.html';
    return;
  }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!roleData || roleData.role !== 'admin') {
    alert('Access Denied: You are not an admin.');
    await supabase.auth.signOut();
    window.location.href = 'admin-login.html';
  }

  setupNavigation();
});

function logout() {
  supabase.auth.signOut().then(() => {
    window.location.href = 'admin-login.html';
  });
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('show');
}

function setupNavigation() {
  const links = document.querySelectorAll('.sidebar a[data-target]');
  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const targetId = link.getAttribute('data-target');
      document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
      document.getElementById(targetId).classList.add('active');
    });
  });
}
