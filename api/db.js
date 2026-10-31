function getEnvConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    '';
  return { supabaseUrl, supabaseKey };
}

function getHeaders(supabaseKey, extra = {}) {
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { supabaseUrl, supabaseKey } = getEnvConfig();
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase environment variables' });
  }

  try {
    if (req.method === 'GET') {
      const headers = getHeaders(supabaseKey);
      const [sellersRes, holdingsRes, companiesRes, archiveRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/sellers?select=*&order=created_at.asc`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/holdings?select=*&order=created_at.asc`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/companies?select=*&order=created_at.asc`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/archive_items?select=*&order=created_at.asc`, { headers })
      ]);
      const [sellers, holdings, companies, archive_items] = await Promise.all([
        sellersRes.json(),
        holdingsRes.json(),
        companiesRes.json(),
        archiveRes.ok ? archiveRes.json() : []
      ]);
      return res.status(200).json({
        sellers: Array.isArray(sellers) ? sellers : [],
        holdings: Array.isArray(holdings) ? holdings : [],
        companies: Array.isArray(companies) ? companies : [],
        archive_items: Array.isArray(archive_items) ? archive_items : []
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const upsertHeaders = getHeaders(supabaseKey, {
        Prefer: 'resolution=merge-duplicates,return=minimal'
      });

      if (body && Array.isArray(body.sellers) && body.sellers.length > 0) {
        await fetch(`${supabaseUrl}/rest/v1/sellers?on_conflict=id`, {
          method: 'POST',
          headers: upsertHeaders,
          body: JSON.stringify(body.sellers)
        });
      }
      if (body && Array.isArray(body.holdings) && body.holdings.length > 0) {
        await fetch(`${supabaseUrl}/rest/v1/holdings?on_conflict=id`, {
          method: 'POST',
          headers: upsertHeaders,
          body: JSON.stringify(body.holdings)
        });
      }
      if (body && Array.isArray(body.companies) && body.companies.length > 0) {
        const cleanCompanies = body.companies.map((c) => ({
          id: c.id,
          owner_id: c.owner_id || null,
          owner_name: c.owner_name || '',
          owner_email: c.owner_email || '',
          is_private: Boolean(c.is_private),
          holding_id: c.holding_id || null,
          holding_name: c.holding_name || '',
          name: c.name || '',
          brand: c.brand || 'Yapra.ai',
          funnel_status: c.funnel_status || 'Addressables',
          stage: Number(c.stage || 1),
          contact_person: c.contact_person || {},
          sector: c.sector || '',
          website: c.website || '',
          city: c.city || 'İstanbul',
          employee_size: c.employee_size || '',
          deal_value: Number(c.deal_value || 0),
          currency: c.currency || 'USD',
          expected_invoice_date: c.expected_invoice_date || '',
          summary_note: c.summary_note || '',
          manual_red_flags: Array.isArray(c.manual_red_flags) ? c.manual_red_flags : [],
          competitors: Array.isArray(c.competitors) ? c.competitors : [],
          buyers: Array.isArray(c.buyers) ? c.buyers : [],
          actions: Array.isArray(c.actions) ? c.actions : [],
          timeline: Array.isArray(c.timeline) ? c.timeline : [],
          updated_at: c.updated_at || new Date().toISOString()
        }));
        await fetch(`${supabaseUrl}/rest/v1/companies?on_conflict=id`, {
          method: 'POST',
          headers: upsertHeaders,
          body: JSON.stringify(cleanCompanies)
        });
      }
      if (body && Array.isArray(body.archive_items) && body.archive_items.length > 0) {
        const cleanArchive = body.archive_items.map((a) => ({
          id: a.id,
          category: a.category || 'document',
          brand: a.brand || 'Her İkisi',
          title: a.title || '',
          subject: a.subject || '',
          content: a.content || '',
          file_name: a.file_name || '',
          file_size: a.file_size || '',
          file_url: a.file_url || '',
          tags: Array.isArray(a.tags) ? a.tags : [],
          author_name: a.author_name || '',
          author_email: a.author_email || '',
          updated_at: a.updated_at || new Date().toISOString()
        }));
        await fetch(`${supabaseUrl}/rest/v1/archive_items?on_conflict=id`, {
          method: 'POST',
          headers: upsertHeaders,
          body: JSON.stringify(cleanArchive)
        });
      }
      if (body && body.delete_archive_id) {
        await fetch(`${supabaseUrl}/rest/v1/archive_items?id=eq.${encodeURIComponent(body.delete_archive_id)}`, {
          method: 'DELETE',
          headers: getHeaders(supabaseKey)
        });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
