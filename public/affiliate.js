<!-- Save as: /js/affiliate.js -->
<script type="module">
  // 1. Initialize Supabase
  import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

  // Replace with your actual project values:
  const SUPABASE_URL = 'https://dapwpgvnfjcfqqhrpxla.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInJlZiI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzYSIsInJlZiI6ImRhcHdwZ3ZuZmpjZnFxaHJweGxhIiwicm9sZSI6IkFub24iLCJpYXQiOjE3NDcwNDA4ODgsImV4cCI6MjA2MjYxNjg4OH0.ICC0UsLlzJDNre7rFCeD3k6iVzo6jOJgn3PhABpEMsQ';
  
  export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 2. Capture referral code from URL and store in localStorage
  export function captureReferralCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      localStorage.setItem('apex_referral', ref);
      // Log a "visit" in referral_activity
      recordReferralActivity(ref, 'visit', null);
    }
  }

  // 3. Helper to record any referral activity
  export async function recordReferralActivity(refCode, action, amountPaid = null) {
    try {
      // You can optionally fetch visitor IP via a serverless function – 
      // here we’ll store null or a placeholder
      const visitorIp = 'unknown'; 

      const { error } = await supabase
        .from('referral_activity')
        .insert({
          visitor_ip: visitorIp,
          ref_code_used: refCode,
          action_taken: action,
          amount_paid: amountPaid
        });
      if (error) console.error('referral_activity error:', error);
      else return true;
    } catch (err) {
      console.error(err);
    }
  }

  // 4. Affiliate Registration
  export async function registerAffiliate({ name, email, referral_code, wallet_address, password }) {
    // 1. Create a Supabase Auth user under "affiliates" tenant or store "password" hashed yourself.
    // For simplicity, we’ll skip Supabase Auth and just store the record in "affiliates".
    const { data, error } = await supabase
      .from('affiliates')
      .insert([
        {
          name,
          email,
          referral_code,
          wallet_address,
          status: 'pending',   // admin will activate
          total_clicks: 0,
          signups_made: 0,
          conversions: 0,
          total_earned: 0,
        }
      ]);

    if (error) throw error;
    return data;
  }

  // 5. Affiliate Login (Simple email lookup + no password)
  export async function loginAffiliate({ email }) {
    const { data, error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('email', email)
      .single();
    if (error) throw error;
    if (data.status !== 'active') throw new Error('Account not active.');
    // In a real system, implement password + session. For demo, store affiliate ID in localStorage.
    localStorage.setItem('affiliate_id', data.id);
    localStorage.setItem('affiliate_code', data.referral_code);
    return data;
  }

  // 6. Check Logged-In Affiliate
  export function getLoggedInAffiliate() {
    const id = localStorage.getItem('affiliate_id');
    const code = localStorage.getItem('affiliate_code');
    if (!id || !code) return null;
    return { id, code };
  }

  // 7. Fetch Affiliate Dashboard Stats
  export async function fetchAffiliateStats(affiliateCode) {
    // 7a. Count total clicks (aggregate from referral_activity)
    // 7b. Count total signups (action_taken = 'signup')
    // 7c. Count total conversions & sum(amount_paid)
    const { data, error } = await supabase
      .from('referral_activity')
      .select(`
        action_taken,
        amount_paid
      `)
      .eq('ref_code_used', affiliateCode);

    if (error) throw error;

    let stats = {
      total_clicks: 0,
      signups_made: 0,
      conversions: 0,
      total_earned: 0
    };
    data.forEach((row) => {
      if (row.action_taken === 'visit') stats.total_clicks++;
      if (row.action_taken === 'signup') stats.signups_made++;
      if (row.action_taken === 'conversion') {
        stats.conversions++;
        stats.total_earned += Number(row.amount_paid);
      }
    });
    // Update in affiliates table as well:
    await supabase
      .from('affiliates')
      .update({
        total_clicks: stats.total_clicks,
        signups_made: stats.signups_made,
        conversions: stats.conversions,
        total_earned: stats.total_earned
      })
      .eq('referral_code', affiliateCode);

    return stats;
  }

  // 8. Record a “Signup” Action (to be called when a new user registers on your site)
  export async function recordSignup(refCode) {
    // 1. Insert into referral_activity
    await recordReferralActivity(refCode, 'signup', null);
  }

  // 9. Record a “Conversion” (paid signup)—call this when payment succeeds
  export async function recordConversion(refCode, amountPaid = 5000) {
    // amountPaid: ₦5,000 (fixed commission)
    await recordReferralActivity(refCode, 'conversion', amountPaid);

    // Also increment counters in affiliates table (we’ll rely on fetchAffiliateStats to sync)
  }

  // 10. Logout Affiliate
  export function logoutAffiliate() {
    localStorage.removeItem('affiliate_id');
    localStorage.removeItem('affiliate_code');
  }

  // 11. Generate a random referral code if user didn’t pick one
  export function generateReferralCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Immediately capture referral code on any page load:
  captureReferralCode();
</script>
