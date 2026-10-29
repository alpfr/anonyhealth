/**
 * Create test accounts (anonpatient / anonprovider) in Supabase Auth
 * and verify they can sign in.
 *
 * Usage: node tests/e2e/create-test-accounts.mjs
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://exzmdnnkbjjgrtwnjemm.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_d_Ne0ShtZcpy14D5N3zG3Q_rtLpr2lI';

const ACCOUNTS = [
  { email: 'anonpatient@anonyhealth.test', password: 'AnonPatient2026!', role: 'patient' },
  { email: 'anonprovider@anonyhealth.test', password: 'AnonProvider2026!', role: 'provider' },
];

async function createAccount({ email, password, role }) {
  console.log(`\n── Creating ${role}: ${email}`);

  // Step 1: Try signing up
  const signUpRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email,
      password,
      data: { role },              // user_metadata
      gotrue_meta_security: {},
    }),
  });

  const signUpData = await signUpRes.json();

  if (signUpRes.ok && signUpData.id) {
    console.log(`  ✅ Account created — user ID: ${signUpData.id}`);
    console.log(`  ℹ  Email confirmation may be required (check Supabase dashboard)`);
  } else if (signUpData.msg?.includes('already registered') || signUpData.error_description?.includes('already registered') || signUpData.code === 'user_already_exists') {
    console.log(`  ⚠  Account already exists — skipping signup`);
  } else {
    console.log(`  ⚠  Signup response: ${JSON.stringify(signUpData)}`);
  }

  // Step 2: Verify sign-in works
  const signInRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  const signInData = await signInRes.json();

  if (signInRes.ok && signInData.access_token) {
    console.log(`  ✅ Sign-in verified — session active`);
    console.log(`  ℹ  User ID: ${signInData.user?.id}`);
    console.log(`  ℹ  Role metadata: ${JSON.stringify(signInData.user?.user_metadata?.role || 'none')}`);
    return { success: true, token: signInData.access_token };
  } else {
    console.log(`  ❌ Sign-in failed: ${JSON.stringify(signInData)}`);
    return { success: false };
  }
}

async function main() {
  console.log('═══ Creating AnonyHealth Test Accounts ═══');
  console.log(`Supabase: ${SUPABASE_URL}`);

  const results = [];
  for (const account of ACCOUNTS) {
    const result = await createAccount(account);
    results.push({ ...account, ...result });
  }

  console.log('\n═══ Summary ═══');
  for (const r of results) {
    console.log(`  ${r.success ? '✅' : '❌'} ${r.role}: ${r.email}`);
  }
}

main().catch(console.error);
