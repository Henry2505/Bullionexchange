// Unhide the page
if (document.body) {
  document.body.style.visibility = 'visible';
}

// Greeting
const name = sessionStorage.getItem('cbeUserName') || 'Trader';
const greetEl = document.getElementById('greeting');
if (greetEl) {
  greetEl.textContent = `Welcome back, ${name}!`;
}

// Theme toggle
const htmlEl = document.documentElement;
const tbtn = document.getElementById('theme-toggle');
if (tbtn) {
  let theme = localStorage.getItem('theme') || 'dark';
  htmlEl.setAttribute('data-theme', theme);
  tbtn.textContent = theme === 'dark' ? '🌞' : '🌜';
  tbtn.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    htmlEl.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    tbtn.textContent = theme === 'dark' ? '🌞' : '🌜';
  });
}

// Menu toggle
const menuToggle = document.getElementById('menu-toggle');
const menuList   = document.getElementById('menu-list');
if (menuToggle && menuList) {
  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    menuList.classList.toggle('active');
    menuToggle.setAttribute('aria-expanded', menuToggle.classList.contains('active'));
  });
}

// Slide-ins
const slides = document.querySelectorAll('.slide-in');
if (slides.length) {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  slides.forEach(el => obs.observe(el));
}
