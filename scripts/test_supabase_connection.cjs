const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iokhdhqnpslpwsxspvaj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlva2hkaHFucHNscHdzeHNwdmFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjQyMDUsImV4cCI6MjEwNDAwMDIwNX0.8o2UFh4VXRUObjvBq_rVRxIar7yZSU7vrCgaHutYyPE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Testing Supabase connection and tables...');
  const tables = [
    'kanji',
    'vocabulary',
    'grammar',
    'sentence',
    'question',
    'stage',
    'map',
    'stage_content',
    'user_mastery',
    'user_activity',
    'relation'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ Table '${table}':`, error.message);
      } else {
        console.log(`✅ Table '${table}': READY (rows: ${data ? data.length : 0})`);
      }
    } catch (err) {
      console.log(`⚠️ Table '${table}' exception:`, err.message);
    }
  }
}

checkTables();
