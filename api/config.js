module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://rcsfvpzmkqenghrngykf.supabase.co';

  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjc2Z2cHpta3Flbmdocm5neWtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNTk5NjcsImV4cCI6MjEwODkzNTk2N30.Bfgufx_3o-iYLrFj4aB18MvRLVPnsWdEwRk1m3kzfw4';

  const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'deal-documents';

  res.status(200).json({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
    storageBucket,
    projectRef: 'rcsfvpzmkqenghrngykf'
  });
};
