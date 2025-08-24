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

async function testDBSchema() {
  console.log('🔍 Testing Database Schema...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test 1: Check profiles table structure
    console.log('1️⃣ Checking profiles table structure...');
    
    // Try to get a single row to see what columns exist
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profileError) {
      console.error('❌ Profiles table error:', profileError);
      
      // Try to get table info
      const { data: tableInfo, error: tableError } = await supabase
        .from('profiles')
        .select('count')
        .limit(0);
      
      if (tableError) {
        console.error('❌ Cannot access profiles table:', tableError);
      } else {
        console.log('✅ Profiles table exists but has no data');
      }
      return;
    }
    
    if (profileData && profileData.length > 0) {
      const columns = Object.keys(profileData[0]);
      console.log('✅ Profiles table columns:', columns);
      
      // Test each expected column
      const expectedColumns = ['id', 'email', 'full_name', 'avatar_url', 'handle', 'created_at', 'updated_at'];
      console.log('\n2️⃣ Testing expected columns:');
      
      for (const column of expectedColumns) {
        try {
          const { data: testData, error: testError } = await supabase
            .from('profiles')
            .select(column)
            .limit(1);
          
          if (testError) {
            console.log(`❌ Column '${column}' - Error:`, testError.message);
          } else {
            console.log(`✅ Column '${column}' - Accessible`);
          }
        } catch (e) {
          console.log(`❌ Column '${column}' - Exception:`, e.message);
        }
      }
    } else {
      console.log('⚠️ Profiles table exists but is empty');
    }

    // Test 3: Check if we can insert a test profile
    console.log('\n3️⃣ Testing profile creation...');
    const testUserId = '00000000-0000-0000-0000-000000000000';
    
    try {
      const { data: insertData, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: testUserId,
          email: 'test@example.com',
          full_name: 'Test User'
        })
        .select();
      
      if (insertError) {
        console.log('❌ Profile insert test failed:', insertError.message);
      } else {
        console.log('✅ Profile insert test successful');
        
        // Clean up test data
        const { error: deleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', testUserId);
        
        if (deleteError) {
          console.log('⚠️ Failed to clean up test data:', deleteError.message);
        } else {
          console.log('✅ Test data cleaned up');
        }
      }
    } catch (e) {
      console.log('❌ Profile insert test exception:', e.message);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testDBSchema().catch(console.error);
