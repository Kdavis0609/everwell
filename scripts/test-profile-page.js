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

async function testProfilePage() {
  console.log('🔍 Testing Profile Page Functionality...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test 1: Check authentication status
    console.log('1️⃣ Checking authentication status...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('❌ Authentication error:', authError);
      return;
    }
    
    if (!session) {
      console.log('⚠️ No active session - user needs to log in first');
      console.log('💡 To test profile functionality:');
      console.log('   1. Go to http://localhost:3000/login');
      console.log('   2. Log in with your credentials');
      console.log('   3. Then navigate to http://localhost:3000/profile');
      return;
    }

    console.log('✅ User authenticated:', session.user.email);
    console.log('   User ID:', session.user.id);
    console.log('');

    // Test 2: Test profile fetch
    console.log('2️⃣ Testing profile fetch...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Profile fetch failed:', profileError);
      
      // Test 3: Try to create profile if it doesn't exist
      console.log('\n3️⃣ Attempting to create profile...');
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          email: session.user.email
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Profile creation failed:', createError);
        return;
      }
      
      console.log('✅ Profile created successfully:', {
        id: newProfile.id,
        email: newProfile.email,
        full_name: newProfile.full_name,
        handle: newProfile.handle,
        created_at: newProfile.created_at
      });
    } else {
      console.log('✅ Profile found:', {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        handle: profile.handle,
        created_at: profile.created_at
      });
    }
    console.log('');

    // Test 4: Test handle availability check
    console.log('4️⃣ Testing handle availability check...');
    try {
      const { data: handleAvailable, error: handleError } = await supabase.rpc('is_handle_available', {
        candidate: 'test-handle'
      });
      
      if (handleError) {
        console.error('❌ Handle availability check failed:', handleError);
      } else {
        console.log('✅ Handle availability check works, result:', handleAvailable);
      }
    } catch (e) {
      console.error('❌ Handle availability check error:', e.message);
    }
    console.log('');

    // Test 5: Test profile update
    console.log('5️⃣ Testing profile update...');
    const testName = 'Test User ' + Date.now();
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: testName
      })
      .eq('id', session.user.id);
    
    if (updateError) {
      console.error('❌ Profile update failed:', updateError);
    } else {
      console.log('✅ Profile update successful');
      
      // Revert the test change
      const { error: revertError } = await supabase
        .from('profiles')
        .update({
          full_name: profile?.full_name || null
        })
        .eq('id', session.user.id);
      
      if (revertError) {
        console.warn('⚠️ Failed to revert test change:', revertError);
      } else {
        console.log('✅ Test change reverted');
      }
    }

    console.log('\n🎉 Profile page functionality test completed successfully!');
    console.log('💡 The profile page should now work correctly at http://localhost:3000/profile');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testProfilePage().catch(console.error);
