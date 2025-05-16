// Section templates
const sections = {
  dashboard: `<div class="card">
                <h2>Dashboard</h2>
                <p>Key metrics and summaries will appear here.</p>
              </div>`,
  signals:   `<div class="card">
                <h2>Signals</h2>
                <p>Publish and manage your daily trade signals.</p>
              </div>`,
  payments:  `<div class="card">
                <h2>Payments</h2>
                <p>Review, approve, or reject user payments.</p>
              </div>`,
  messages:  `<div class="card">
                <h2>Messages</h2>
                <p>Inbox: view and reply to user messages.</p>
              </div>`,
  users:     `<div class="card">
                <h2>Users</h2>
                <p>Approve VIP applications and manage user list.</p>
              </div>`,
  history:   `<div class="card">
                <h2>Trade History</h2>
                <p>Upload/view past VIP trade screenshots and notes.</p>
              </div>`,
  settings:  `<div class="card">
                <h2>Settings</h2>
                <p>Manage wallet addresses, email templates, and more.</p>
              </div>`
};

// Element refs
const navItems    = document.querySelectorAll('.sidebar nav li');
const titleEl     = document.getElementById('section-title');
const contentArea = document.getElementById('section-content');
const menuToggle  = document.getElementById('menu-toggle');
const sidebar     = document.querySelector('.sidebar');
const logoutBtn   = document.getElementById('logout-btn');

// Navigation click handler
navItems.forEach(item => {
  item.addEventListener('click', () => {
    // Highlight active
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    // Load section
    const sec = item.dataset.section;
    titleEl.textContent = item.textContent;
    contentArea.innerHTML = sections[sec] || '<p>Coming soon…</p>';
    // Close sidebar on mobile
    if (window.innerWidth < 769) {
      sidebar.classList.remove('open');
    }
  });
});

// Menu toggle for mobile
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

// Logout placeholder
logoutBtn.addEventListener('click', () => {
  alert('Logging out…');
  // TODO: hook into real auth
});

// Initialize default view
contentArea.innerHTML = sections.dashboard;
