// ─────────────── admin-dashboard.js ───────────────

// 1) loadDashboard: fetch today's signals count, populate watchlist, update 24h Gold Δ (placeholder)
async function loadDashboard() {
  try {
    const today = new Date().toISOString().split('T')[0];
    // Example: count signals with timestamp ≥ today
    const { count, error: signalError } = await supabase
      .from('signals')
      .select('id', { count: 'exact', head: false })
      .gte('timestamp', today);

    if (signalError) throw signalError;

    // Display “N/A” for now (Could replace with actual logic for 24h Δ)
    document.getElementById('stat-gold-change').textContent = 'N/A';

    // Load Watchlist from localStorage
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    const ul = document.getElementById('watch-list');
    ul.innerHTML = '';

    for (const sym of watchlist) {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      let priceChange = 'N/A';
      let priceClass  = '';

      try {
        // Attempt a simple rate check (first–3 letters are base, last–3 letters are quote)
        const res  = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/${sym.slice(0, 3)}`);
        const data = await res.json();
        const rate = data.conversion_rates[sym.slice(3)] || 1;
        priceChange = rate.toFixed(2); // or random placeholder
        priceClass  = parseFloat(priceChange) >= 0 ? 'positive' : 'negative';
      } catch (err) {
        console.error('Watchlist error:', err.message);
      }

      li.innerHTML = `
        <span>${sym}</span>
        <span class="price-change ${priceClass}">${priceChange}</span>
        <button class="btn btn-sm btn-outline-danger">Remove</button>
      `;
      li.querySelector('button').onclick = () => {
        const filtered = watchlist.filter(s => s !== sym);
        localStorage.setItem('watchlist', JSON.stringify(filtered));
        loadDashboard();
      };
      ul.appendChild(li);
    }

    document.getElementById('add-watch').onclick = () => {
      const input = document.getElementById('watch-input');
      const sym = input.value.trim().toUpperCase();
      if (sym && !watchlist.includes(sym)) {
        watchlist.push(sym);
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
        loadDashboard();
        input.value = '';
      }
    };
  } catch (err) {
    console.error('Load dashboard error:', err.message);
    addNotification('Failed to load dashboard', 'critical');
  }
}

// 2) initChart: initialize TradingView widget
function initChart(interval = '240') {
  try {
    document.getElementById('tv_chart').innerHTML = '';
    new window.TradingView.widget({
      container_id: "tv_chart",
      width: "100%",
      height: "450",
      symbol: "OANDA:XAUUSD",
      interval, 
      timezone: "Africa/Lagos",
      theme: "dark",
      style: "1",
      locale: "en",
      toolbar_bg: "#1f1f1f",
      studies: [
        { id: "MASimple@tv-basicstudies", inputs: { length: 50 } },
        { id: "MASimple@tv-basicstudies", inputs: { length: 200 } }
      ],
      enable_publishing: false,
      allow_symbol_change: false,
      save_image: false
    });
  } catch (err) {
    console.error('Init chart error:', err.message);
    document.getElementById('tv_chart').innerHTML = '<p style="color:var(--error)">Failed to load chart</p>';
  }
}

// 3) loadGoldNews: fetch top 8 gold news articles from GNews
async function loadGoldNews() {
  const ul = document.getElementById('news-list');
  ul.innerHTML = '<li><div class="spinner"></div></li>';
  try {
    const res  = await retryFetch(`https://gnews.io/api/v4/search?q=gold+market&lang=en&max=8&apikey=${GNEWS_API_KEY}`);
    const data = await res.json();
    if (data.errors) throw new Error(data.errors.join(', '));
    ul.innerHTML = '';
    if (!data.articles || data.articles.length === 0) {
      throw new Error('No articles found');
    }
    data.articles.forEach(article => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="${article.url}" target="_blank">${article.title}</a>`;
      ul.appendChild(li);
    });
  } catch (err) {
    console.error('Load news error:', err.message);
    ul.innerHTML = '';
    const fallback = [
      { title: 'Gold Prices Surge in Q2 2025', url: '#' },
      { title: 'Central Banks Boost Gold Reserves', url: '#' },
      { title: 'Gold ETF Demand Rises Amid Volatility', url: '#' }
    ];
    fallback.forEach(article => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="${article.url}" target="_blank">${article.title}</a>`;
      ul.appendChild(li);
    });
    ul.innerHTML += '<li style="color:var(--error)">Failed to load news. Check GNews API key or quota.</li>';
  }
}

// 4) loadEconCalendar: fetch economic events from Finnhub for next 7 days
async function loadEconCalendar() {
  const tbody = document.getElementById('calendar-body');
  tbody.innerHTML = '<tr><td colspan="7"><div class="spinner"></div></td></tr>';
  try {
    const today  = new Date();
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 7);

    const yyyy  = today.getFullYear();
    const mm    = String(today.getMonth() + 1).padStart(2, '0');
    const dd    = String(today.getDate()).padStart(2, '0');
    const fromStr = `${yyyy}-${mm}-${dd}`;

    const yyyy2  = toDate.getFullYear();
    const mm2    = String(toDate.getMonth() + 1).padStart(2, '0');
    const dd2    = String(toDate.getDate()).padStart(2, '0');
    const toStr  = `${yyyy2}-${mm2}-${dd2}`;

    const url = `https://finnhub.io/api/v1/calendar/economic?from=${fromStr}&to=${toStr}&token=${FINNHUB_API_KEY}`;
    const res = await retryFetch(url);
    const data = await res.json();
    if (!data || !data.data) throw new Error('No calendar data returned');

    tbody.innerHTML = '';
    const allDates = Object.keys(data.data).sort();
    for (const dateKey of allDates) {
      const eventsOnDate = data.data[dateKey];
      eventsOnDate.forEach(evt => {
        const tr = document.createElement('tr');
        if (evt.importance === 3) tr.classList.add('high-impact');
        const cols = [
          dateKey,
          evt.time     || '-',
          evt.country  || '-',
          evt.event    || '-',
          evt.importance === 3 ? 'High' : evt.importance === 2 ? 'Medium' : 'Low',
          evt.actual   !== null ? evt.actual   : '-',
          evt.previous !== null ? evt.previous : '-'
        ];
        cols.forEach(text => {
          const td = document.createElement('td');
          td.textContent = text;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }
    if (tbody.children.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">No upcoming events found in the next 7 days</td></tr>';
    }
  } catch (err) {
    console.error('Load calendar error:', err.message);
    tbody.innerHTML = '<tr><td colspan="7" style="color:var(--error)">Failed to load calendar</td></tr>';
  }
}

// 5) loadRecentActivity: fetch last 10 user_activity entries
async function loadRecentActivity() {
  const tbody = document.getElementById('activity-body');
  tbody.innerHTML = '<tr><td colspan="5"><div class="spinner"></div></td></tr>';
  try {
    const { data: tables, error: schemaError } = await supabase.from('user_activity').select('*').limit(0);
    if (schemaError) throw new Error('Table check failed');
    const { data, error } = await supabase
      .from('user_activity')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);
    if (error) throw error;

    tbody.innerHTML = '';
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No activity data available</td></tr>';
      return;
    }
    data.forEach(activity => {
      const tr = document.createElement('tr');
      ['timestamp', 'action', 'ip_address', 'city', 'device'].forEach(key => {
        const td = document.createElement('td');
        td.textContent = key === 'timestamp' ? new Date(activity[key]).toLocaleString() : activity[key] || '-';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Load activity error:', err.message);
    tbody.innerHTML = '<tr><td colspan="5" style="color:var(--error)">Failed to load activity. Check Supabase setup.</td></tr>';
  }
}

// 6) DOMContentLoaded: wire up dashboard‐specific functions and chart toggles
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  initChart();
  loadGoldNews();
  loadEconCalendar();
  loadRecentActivity();

  document.querySelectorAll('.chart-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('.chart-toggle button.active').classList.remove('active');
      btn.classList.add('active');
      initChart(btn.dataset.interval);
    });
  });
});
