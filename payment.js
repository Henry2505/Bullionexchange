<script type="module">
  import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

  const supabase = createClient('https://your-project-url.supabase.co', 'your-public-anon-key');

  document.addEventListener('DOMContentLoaded', async () => {
    const { data: settingsData, error } = await supabase.from('settings').select('*');
    if (error) {
      alert('Failed to load payment settings.');
      console.error(error);
      return;
    }

    const settings = {};
    settingsData.forEach(item => {
      settings[item.key] = item.value;
    });

    const planNames = {
      weekly: 'Weekly VIP Plan – $50',
      monthly: 'Monthly VIP Plan – $150',
      yearly: 'Yearly VIP Plan – $1500'
    };

    const walletMap = {
      Bitcoin: settings.btc || '',
      Ethereum: settings.eth || '',
      USDT: settings.usdt || '',
      TRX: settings.trx || ''
    };

    const selectedPackage = sessionStorage.getItem('selectedPackage') || '';
    document.getElementById('selectedPlanInfo').textContent = planNames[selectedPackage] || 'No valid package selected.';

    document.getElementById('cryptoBtn').addEventListener('click', () => {
      document.getElementById('cryptoOptions').style.display = 'block';
    });

    document.getElementById('cryptoType').addEventListener('change', function () {
      document.getElementById('walletAddress').textContent = walletMap[this.value] || 'Not set';
    });

    document.getElementById('copyWalletBtn').addEventListener('click', () => {
      const w = document.getElementById('walletAddress').textContent;
      if (w && w !== 'Not set') {
        navigator.clipboard.writeText(w).then(() => alert('Wallet address copied!'));
      } else {
        alert('No wallet address to copy.');
      }
    });

    document.getElementById('paystackBtn').addEventListener('click', () => {
      if (!settings.paystackKey) {
        return alert('Paystack key not set.');
      }
      alert('Simulated Paystack payment – then click Submit Payment.');
    });

    document.getElementById('paymentForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('userEmail').value.trim().toLowerCase();
      const cryptoType = document.getElementById('cryptoType').value;
      const isCrypto = document.getElementById('cryptoOptions').style.display === 'block';
      const method = isCrypto ? cryptoType : 'Paystack';
      const amount = selectedPackage === 'weekly' ? 50 : selectedPackage === 'monthly' ? 150 : 1500;

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return alert('Enter a valid email.');
      }

      if (!selectedPackage || !planNames[selectedPackage]) {
        return alert('No valid package selected.');
      }

      if (isCrypto && !walletMap[cryptoType]) {
        return alert('Invalid crypto type or wallet missing.');
      }

      const { data: existing, error: checkError } = await supabase
        .from('user_payments')
        .select('*')
        .eq('user_email', email)
        .neq('status', 'expired');

      if (checkError) {
        console.error(checkError);
        return alert('Could not check existing payments.');
      }

      if (existing && existing.length > 0) {
        return alert('You have already submitted a payment. Await approval.');
      }

      const { error: insertError } = await supabase.from('user_payments').insert({
        user_email: email,
        amount,
        method,
        details: isCrypto ? walletMap[cryptoType] : '',
        status: 'pending'
      });

      if (insertError) {
        console.error(insertError);
        return alert('Payment submission failed.');
      }

      alert('Payment submitted successfully!');
      window.location.href = 'CBE_login.html';
    });
  });
</script>
