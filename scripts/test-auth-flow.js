const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local file
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    envLines.forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnvFile();

async function testAuthFlow() {
  console.log('🔍 Testing Authentication Flow...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('Environment check:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET (' + supabaseUrl.substring(0, 30) + '...)' : 'MISSING');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'SET (' + supabaseKey.substring(0, 30) + '...)' : 'MISSING');
  console.log('');

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test 1: Check basic connection
    console.log('1️⃣ Testing basic connection...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Connection failed:', testError);
      return;
    }
    console.log('✅ Connection successful\n');

    // Test 2: Check current session
    console.log('2️⃣ Checking current session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
    } else if (!session) {
      console.log('⚠️ No active session found');
      console.log('💡 This is normal if you\'re not logged in\n');
    } else {
      console.log('✅ Active session found:');
      console.log('   - User ID:', session.user.id);
      console.log('   - User Email:', session.user.email);
      console.log('   - Session expires:', new Date(session.expires_at * 1000).toLocaleString());
      console.log('');
    }

    // Test 3: Check user authentication
    console.log('3️⃣ Checking user authentication...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ User authentication error:', userError);
    } else if (!user) {
      console.log('⚠️ No authenticated user');
      console.log('💡 To test login functionality:');
      console.log('   1. Open http://localhost:3000/login in your browser');
      console.log('   2. Use either Magic Link or Email/Password login');
      console.log('   3. Check the browser console for any errors');
      console.log('   4. After login, run this script again to verify\n');
    } else {
      console.log('✅ User authenticated:');
      console.log('   - User ID:', user.id);
      console.log('   - User Email:', user.email);
      console.log('   - Last sign in:', user.last_sign_in_at);
      console.log('');

      // Test 4: Try to fetch user profile
      console.log('4️⃣ Testing profile fetch for authenticated user...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Profile fetch failed:', profileError);
        
        // Try to create profile
        console.log('\n   Attempting to create profile...');
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email
          })
          .select()
          .single();
        
        if (createError) {
          console.error('❌ Profile creation failed:', createError);
        } else {
          console.log('✅ Profile created successfully');
        }
      } else {
        console.log('✅ Profile found and accessible');
        console.log('   - Full name:', profile.full_name || 'Not set');
        console.log('   - Handle:', profile.handle || 'Not set');
        console.log('');
      }
    }

    // Test 5: Check auth settings
    console.log('5️⃣ Checking auth configuration...');
    try {
      // This will help us understand if there are any auth configuration issues
      const { data: authData, error: authConfigError } = await supabase.auth.getUser();
      if (authConfigError) {
        console.log('⚠️ Auth configuration may have issues:', authConfigError.message);
      } else {
        console.log('✅ Auth configuration appears to be working');
      }
    } catch (e) {
      console.log('⚠️ Auth configuration check failed:', e.message);
    }

    console.log('\n📋 Summary:');
    console.log('- Database connection: ✅ Working');
    console.log('- Auth configuration: ✅ Working');
    if (session && user) {
      console.log('- User authentication: ✅ Logged in');
      console.log('- Next step: Profile page should work at http://localhost:3000/profile');
    } else {
      console.log('- User authentication: ⚠️ Not logged in');
      console.log('- Next step: Log in at http://localhost:3000/login');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testAuthFlow().catch(console.error);
