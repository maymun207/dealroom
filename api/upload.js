const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://rcsfvpzmkqenghrngykf.supabase.co';

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjc2Z2cHpta3Flbmdocm5neWtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNTk5NjcsImV4cCI6MjEwODkzNTk2N30.Bfgufx_3o-iYLrFj4aB18MvRLVPnsWdEwRk1m3kzfw4';

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'deal-documents';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { fileName, base64Data, contentType, companyId } = body || {};
    const safeName = `${Date.now()}_${(fileName || 'dosya').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const objectPath = companyId ? `${companyId}/${safeName}` : safeName;

    const commaIdx = (base64Data || '').indexOf(',');
    const cleanBase64 = commaIdx > -1 ? base64Data.slice(commaIdx + 1) : base64Data || '';
    const buffer = Buffer.from(cleanBase64, 'base64');

    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${objectPath}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': contentType || 'application/octet-stream',
        'x-upsert': 'true'
      },
      body: buffer
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return res.status(uploadRes.status).json({ error: errText });
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${objectPath}`;
    return res.status(200).json({
      ok: true,
      url: publicUrl,
      bucket: STORAGE_BUCKET,
      fileName: safeName,
      path: objectPath
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
