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

async function testProfileDB() {
  console.log('🔍 Testing Profile Database Connection...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('Environment check:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET (' + supabaseUrl.substring(0, 20) + '...)' : 'MISSING');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'SET (' + supabaseKey.substring(0, 20) + '...)' : 'MISSING');
  console.log('');

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('Please check your .env.local file or environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test 1: Check if we can connect
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

    // Test 2: Check table structure
    console.log('2️⃣ Checking profiles table structure...');
    const { data: columns, error: columnsError } = await supabase
      .from('profiles')
      .select('*')
      .limit(0);
    
    if (columnsError) {
      console.error('❌ Failed to check table structure:', columnsError);
      return;
    }
    
    console.log('✅ Table structure check passed');
    console.log('Available columns:', Object.keys(columns || {}));
    console.log('');

    // Test 3: Check if handle column exists
    console.log('3️⃣ Checking handle column...');
    try {
      const { data: handleTest, error: handleError } = await supabase
        .from('profiles')
        .select('handle')
        .limit(1);
      
      if (handleError) {
        console.log('⚠️ Handle column may not exist:', handleError.message);
      } else {
        console.log('✅ Handle column exists');
      }
    } catch (e) {
      console.log('⚠️ Handle column check failed:', e.message);
    }
    console.log('');

    // Test 4: Check RPC functions
    console.log('4️⃣ Testing RPC functions...');
    try {
      const { data: rpcTest, error: rpcError } = await supabase.rpc('is_handle_available', {
        candidate: 'test'
      });
      
      if (rpcError) {
        console.log('⚠️ RPC function may not exist:', rpcError.message);
      } else {
        console.log('✅ RPC function exists, result:', rpcTest);
      }
    } catch (e) {
      console.log('⚠️ RPC function check failed:', e.message);
    }
    console.log('');

    // Test 5: Check authentication
    console.log('5️⃣ Testing authentication...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('❌ Authentication error:', authError);
    } else if (!session) {
      console.log('⚠️ No active session (this is normal for unauthenticated requests)');
    } else {
      console.log('✅ User authenticated:', session.user.email);
      
      // Test 6: Try to get user's profile
      console.log('\n6️⃣ Testing profile fetch for authenticated user...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Profile fetch failed:', profileError);
      } else {
        console.log('✅ Profile found:', {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          handle: profile.handle,
          created_at: profile.created_at
        });
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testProfileDB().catch(console.error);
