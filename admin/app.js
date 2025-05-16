const sections = {
  dashboard: '<p>Welcome to your Admin Dashboard.</p>',
  signals:    '<p>Here you’ll publish and manage signals.</p>',
  payments:   '<p>Approve/reject payments and view history.</p>',
  messages:   '<p>Receive and reply to user messages.</p>',
  users:      '<p>Manage users and VIP access.</p>',
  logs:       '<p>Audit logs of all admin actions.</p>',
};

const sidebarItems = document.querySelectorAll('.sidebar li');
const titleEl = document.getElementById('section-title');
const contentEl = document.getElementById('section-content');

sidebarItems.forEach(item => {
  item.addEventListener('click', () => {
    // Highlight active
    sidebarItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    // Update section
    const sec = item.dataset.section;
    titleEl.textContent = item.textContent;
    contentEl.innerHTML = sections[sec] || '<p>Coming soon…</p>';
  });
});

// Initialize first item
sidebarItems[0].classList.add('active');
contentEl.innerHTML = sections.dashboard;
