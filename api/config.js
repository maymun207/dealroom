module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    '';
  const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'deal-documents';

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables'
    });
  }

  return res.status(200).json({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
    storageBucket
  });
};
