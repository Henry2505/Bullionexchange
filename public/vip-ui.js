// vip-ui.js

// 1) Unhide the body once we know the guard passed
document.body.style.visibility = 'visible';

// 2) Pull the real name from sessionStorage and update the greeting
const name = sessionStorage.getItem('cbeUserName') || 'Trader';
const greetEl = document.getElementById('greeting');
if (greetEl) greetEl.textContent = `Welcome back, ${name}!`;

// 3) Theme toggle
const html = document.documentElement;
const tbtn = document.getElementById('theme-toggle');
let theme = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', theme);
tbtn.textContent = theme === 'dark' ? '🌞' : '🌜';
tbtn.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  tbtn.textContent = theme === 'dark' ? '🌞' : '🌜';
});

// 4) Menu toggle
document.getElementById('menu-toggle').addEventListener('click', function(){
  this.classList.toggle('active');
  const menu = document.getElementById('menu-list');
  menu.classList.toggle('active');
  this.setAttribute('aria-expanded', this.classList.contains('active'));
});

// 5) Slide-in animations
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      obs.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.slide-in').forEach(el => obs.observe(el));
