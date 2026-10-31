// ============================================================================
// DEAL ROOM V2 — SATICI KAYDI, TEK CTA KARŞILAMA, PUBLIC/PRIVATE & OTOMATİK HUNİ
// ============================================================================

const STAGES_9 = [
  { id: 1, label: 'İlk Temas', short: '1. İlk Temas' },
  { id: 2, label: 'Engagement', short: '2. Engagement' },
  { id: 3, label: 'Doküman Paylaşımı', short: '3. Doküman' },
  { id: 4, label: 'Teknik Demo', short: '4. Teknik Demo' },
  { id: 5, label: 'Pilot/PoC', short: '5. Pilot/PoC' },
  { id: 6, label: 'İlk Teklif', short: '6. İlk Teklif' },
  { id: 7, label: 'Revize Teklif', short: '7. Revize Teklif' },
  { id: 8, label: 'Sözleşme', short: '8. Sözleşme' },
  { id: 9, label: 'Kazanıldı', short: '9. Kazanıldı 🏆' }
];

const BUYER_ROLES_6 = [
  'Karar Verici',
  'Finansal Alıcı',
  'Kullanıcı Alıcı',
  'Teknik Alıcı',
  'Şampiyon',
  'Engelleyici'
];

const STANDARD_WINS_14 = [
  'Promosyon / Terfi Alma',
  'Zam / Prim Kazanma',
  'İş Kolaylığı & Konfor',
  'Hız ve Zaman Kazanma',
  'Kendini İspat Etme',
  'Yeni Teknolojiyi Hayata Geçirme',
  'Şirket İçi Görünürlüğün Artması',
  'Önem & Yetki Seviyesinin Artması',
  'Kafası Rahat Tatile Çıkabilme',
  'Maliyet Azaltma (Cost Saving)',
  'Kontrol Seviyesinin Artması',
  'Riskten Korunma / Denetim Uyumluluğu',
  'IT / Dış Tedarikçi Bağımlılığından Kurtulma',
  'Prestij / Holdingde Örnek Proje Çıkarma'
];

const STANDARD_PRODUCTS_8 = [
  'Danışmanlık',
  'Digital Transformasyon Ürünleri',
  'ARMES',
  'IoT-Ignite',
  'Yapra.ai',
  'CWF',
  'Analiz',
  'Pilot'
];

const TIMELINE_TYPES = {
  meeting_note: { label: '📝 Toplantı Notu', badge: 'badge-ardic' },
  email: { label: '📩 Email / Yazışma', badge: 'badge-neutral' },
  proposal: { label: '💰 İlk Teklif', badge: 'badge-yapra' },
  revision: { label: '🔄 Revize Teklif', badge: 'badge-warning' },
  contract_draft: { label: '📝 Sözleşme Draft', badge: 'badge-warning' },
  contract: { label: '📜 Final Sözleşme', badge: 'badge-both' },
  document: { label: '📄 Doküman', badge: 'badge-neutral' }
};

const ARCHIVE_CATEGORIES = {
  presentation: { label: '📊 Sunumlar', badge: 'badge-yapra', tlType: 'document' },
  email_template: { label: '✉️ Email Şablonları', badge: 'badge-ardic', tlType: 'email' },
  document: { label: '📄 Doküman & Sözleşme', badge: 'badge-neutral', tlType: 'document' },
  price_list: { label: '💰 Fiyat Listeleri', badge: 'badge-warning', tlType: 'proposal' },
  case_study: { label: '🏆 Case Studies', badge: 'badge-both', tlType: 'document' }
};

const DEFAULT_ARCHIVE_ITEMS = [];

class DealRoomApp {
  constructor() {
    this.db = { sellers: [], holdings: [], companies: [], archive_items: [], trash_items: [] };
    this.currentSeller = null; // Satıcı girişi / kaydı
    this.currentView = 'funnel'; // 'auth' | 'funnel' | 'room'
    this.activeFunnelBox = 'Engaged'; // 'Addressables' | 'Contacted' | 'Engaged'
    this.scopeFilter = 'ALL_VISIBLE'; // 'MY_DEALS' | 'ALL_VISIBLE'
    this.groupByHolding = true;
    this.brandFilter = 'ALL'; // 'ALL' | 'Yapra.ai' | 'ArdicTech'
    this.activeCompanyId = null;
    this.timelineFilter = 'ALL';
    this.archiveCategoryFilter = 'ALL';
    this.archiveBrandFilter = 'ALL';
    this.archiveSearchQuery = '';
    this.archiveTargetCompanyId = '';
    this.showArchiveForm = false;
    this.editingArchiveId = null;
    this.selectedTimelineArchiveItem = null;
    this.draftAttachedArchiveItem = null;
    this.ctaQuery = '';
    this.ctaBelongsToHolding = 'yes'; // 'yes' | 'no'
    this.supabaseClient = null;
    this.accessToken = null;
    this.authMode = 'login'; // 'login' | 'signup' | 'otp'
    this.authError = '';
    this.authSuccess = '';
    this.authLoading = false;
    this.pendingDroppedFile = null;
    this.toastMessage = null;

    this.init();
  }

  async init() {
    this.setupDialogLightDismissFallback();
    this.setupGlobalSearch();
    await this.initCloudConfig();

    // Gerçek Supabase Auth oturumunu kontrol et
    if (this.supabaseClient) {
      try {
        const {
          data: { session }
        } = await this.supabaseClient.auth.getSession();
        if (session && session.user) {
          this.accessToken = session.access_token;
          await this.loadDatabase();
          await this.syncAuthUserToSeller(session.user);
        }
      } catch (authErr) {
        console.warn('Supabase Auth session check warning:', authErr);
      }

      this.supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
          this.accessToken = session.access_token;
          if (!this.currentSeller || this.currentSeller.email.toLowerCase() !== session.user.email.toLowerCase()) {
            await this.loadDatabase();
            await this.syncAuthUserToSeller(session.user);
            this.currentView = 'funnel';
            document.getElementById('topbar').style.display = 'flex';
            document.getElementById('aiFabBtn').style.display = 'flex';
            this.updateUserHeader();
            this.render();
          }
        } else if (event === 'SIGNED_OUT') {
          this.accessToken = null;
          this.currentSeller = null;
          this.currentView = 'auth';
          document.getElementById('topbar').style.display = 'none';
          document.getElementById('aiFabBtn').style.display = 'none';
          this.render();
        }
      });
    }

    if (!this.currentSeller) {
      this.currentView = 'auth';
      document.getElementById('topbar').style.display = 'none';
      document.getElementById('aiFabBtn').style.display = 'none';
    } else {
      document.getElementById('topbar').style.display = 'flex';
      document.getElementById('aiFabBtn').style.display = 'flex';
      this.updateUserHeader();
    }

    this.renderAiWelcome();
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.expandedBottomWidget) this.setExpandedBottomWidget(null);
        if (this.expandedRoomWidget) this.setExpandedRoomWidget(null);
      }
    });
    // Hover Card'ların pencere kenarlarından taşmasını otomatik engelleyen dinleyici
    const clampHoverCardToViewport = (e) => {
      const wrapper = e.target.closest('.dash-widget-wrapper');
      if (!wrapper) return;
      const body = wrapper.querySelector('.dash-hover-body');
      if (!body) return;
      body.style.left = '50%';
      body.style.right = 'auto';
      body.style.transform = 'translateX(-50%)';
      requestAnimationFrame(() => {
        const rect = body.getBoundingClientRect();
        const vw = window.innerWidth;
        if (rect.left < 12) {
          const shift = 12 - rect.left;
          body.style.transform = `translateX(calc(-50% + ${Math.round(shift)}px))`;
        } else if (rect.right > vw - 12) {
          const shift = rect.right - (vw - 12);
          body.style.transform = `translateX(calc(-50% - ${Math.round(shift)}px))`;
        }
      });
    };
    document.addEventListener('mouseover', clampHoverCardToViewport);
    document.addEventListener('click', clampHoverCardToViewport);

    // Müşteri odasındayken doğrudan Cmd+V / Ctrl+V ile kopyalanmış mail veya dosyayı Masaüstüne indirmeden yapıştırma
    document.addEventListener('paste', async (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      if (this.viewMode !== 'company' || !this.selectedCompanyId) return;

      const clipData = e.clipboardData;
      if (!clipData) return;

      if (clipData.files && clipData.files.length > 0) {
        e.preventDefault();
        const comp = this.db.companies.find((c) => c.id === this.selectedCompanyId);
        if (comp) {
          await this.handleInstantDropOnCustomerRoom(comp, clipData);
        }
        return;
      }

      const text = (clipData.getData('text/plain') || '').trim();
      if (text) {
        e.preventDefault();
        await this.pasteEmailFromClipboard(this.selectedCompanyId, text);
      }
    });

    this.render();
  }

  setupDialogLightDismissFallback() {
    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
      document.querySelectorAll('dialog').forEach((dialog) => {
        dialog.addEventListener('click', (event) => {
          if (event.target !== dialog) return;
          const rect = dialog.getBoundingClientRect();
          const isDialogContent =
            rect.top <= event.clientY &&
            event.clientY <= rect.top + rect.height &&
            rect.left <= event.clientX &&
            event.clientX <= rect.left + rect.width;
          if (isDialogContent) return;
          dialog.close();
        });
      });
    }
  }

  showToast(msg) {
    this.toastMessage = msg;
    setTimeout(() => {
      this.toastMessage = null;
      const el = document.getElementById('liveToastBanner');
      if (el) el.style.display = 'none';
    }, 5500);
  }

  openDialog(id) {
    const dlg = document.getElementById(id);
    if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
  }

  closeDialog(id) {
    const dlg = document.getElementById(id);
    if (dlg && typeof dlg.close === 'function') dlg.close();
  }

  async initCloudConfig() {
    this.sbUrl = '';
    this.sbKey = '';
    this.sbBucket = 'deal-documents';
    try {
      const cfgRes = await fetch('/api/config');
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        if (cfg.supabaseUrl) this.sbUrl = cfg.supabaseUrl;
        if (cfg.supabaseKey) this.sbKey = cfg.supabaseKey;
        if (cfg.storageBucket) this.sbBucket = cfg.storageBucket;
      }
    } catch (err) {
      console.error('Failed to load cloud runtime config (/api/config):', err);
    }
    if (window.supabase && this.sbUrl && this.sbKey) {
      try {
        this.supabaseClient = window.supabase.createClient(this.sbUrl, this.sbKey);
      } catch (e) {
        console.warn('Supabase client init warning:', e);
      }
    }
  }

  getSupabaseHeaders(extra = {}) {
    const bearer = this.accessToken || this.sbKey;
    return {
      apikey: this.sbKey,
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
      ...extra
    };
  }

  async loadDatabase() {
    if (this.sbUrl && this.sbKey) {
      try {
        const [sellersRes, holdingsRes, companiesRes, archiveRes, trashRes] = await Promise.all([
          fetch(`${this.sbUrl}/rest/v1/sellers?select=*&order=created_at.asc`, { headers: this.getSupabaseHeaders() }),
          fetch(`${this.sbUrl}/rest/v1/holdings?select=*&order=created_at.asc`, { headers: this.getSupabaseHeaders() }),
          fetch(`${this.sbUrl}/rest/v1/companies?select=*&order=created_at.asc`, { headers: this.getSupabaseHeaders() }),
          fetch(`${this.sbUrl}/rest/v1/archive_items?select=*&order=created_at.asc`, { headers: this.getSupabaseHeaders() }),
          fetch(`${this.sbUrl}/rest/v1/trash_items?select=*&order=deleted_at.desc`, { headers: this.getSupabaseHeaders() })
        ]);
        if (sellersRes.ok && holdingsRes.ok && companiesRes.ok) {
          const [sellers, holdings, companies, archive_items, trash_items] = await Promise.all([
            sellersRes.json(),
            holdingsRes.json(),
            companiesRes.json(),
            archiveRes.ok ? archiveRes.json() : [],
            trashRes.ok ? trashRes.json() : []
          ]);
          this.db = {
            sellers: Array.isArray(sellers) ? sellers : [],
            holdings: Array.isArray(holdings) ? holdings : [],
            companies: Array.isArray(companies) ? companies : [],
            archive_items:
              Array.isArray(archive_items) && archive_items.length > 0 ? archive_items : [...DEFAULT_ARCHIVE_ITEMS],
            trash_items: Array.isArray(trash_items) ? trash_items : []
          };
          return;
        }
      } catch (sbErr) {
        console.warn('Direct Supabase REST fetch warning, falling back to serverless /api/db:', sbErr);
      }
    }

    try {
      const res = await fetch('/api/db');
      if (res.ok) {
        const data = await res.json();
        this.db = {
          sellers: Array.isArray(data.sellers) ? data.sellers : [],
          holdings: Array.isArray(data.holdings) ? data.holdings : [],
          companies: Array.isArray(data.companies) ? data.companies : [],
          archive_items:
            Array.isArray(data.archive_items) && data.archive_items.length > 0
              ? data.archive_items
              : [...DEFAULT_ARCHIVE_ITEMS],
          trash_items: Array.isArray(data.trash_items) ? data.trash_items : []
        };
      }
    } catch (e) {
      console.error('Supabase veritabanı yüklenemedi:', e);
    }
  }

  async persistDatabase(extraPayload = {}) {
    try {
      if (this.sbUrl && this.sbKey) {
        const upsertHeaders = this.getSupabaseHeaders({
          Prefer: 'resolution=merge-duplicates,return=minimal'
        });
        if (Array.isArray(this.db.sellers) && this.db.sellers.length > 0) {
          await fetch(`${this.sbUrl}/rest/v1/sellers?on_conflict=id`, {
            method: 'POST',
            headers: upsertHeaders,
            body: JSON.stringify(this.db.sellers)
          });
        }
        if (Array.isArray(this.db.holdings) && this.db.holdings.length > 0) {
          await fetch(`${this.sbUrl}/rest/v1/holdings?on_conflict=id`, {
            method: 'POST',
            headers: upsertHeaders,
            body: JSON.stringify(this.db.holdings)
          });
        }
        if (Array.isArray(this.db.companies) && this.db.companies.length > 0) {
          const cleanCompanies = this.db.companies.map((c) => ({
            id: c.id,
            owner_id: c.owner_id || null,
            owner_name: c.owner_name || '',
            owner_email: c.owner_email || '',
            is_private: Boolean(c.is_private),
            holding_id: c.holding_id || null,
            holding_name: c.holding_name || '',
            name: c.name || '',
            brand: c.brand || 'Yapra.ai',
            products: Array.isArray(c.products) ? c.products : [],
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
            payment_date: c.payment_date || '',
            delivery_date: c.delivery_date || '',
            contract_status: c.contract_status || '',
            deliveries: Array.isArray(c.deliveries) ? c.deliveries : [],
            summary_note: c.summary_note || '',
            manual_red_flags: Array.isArray(c.manual_red_flags) ? c.manual_red_flags : [],
            competitors: Array.isArray(c.competitors) ? c.competitors : [],
            buyers: Array.isArray(c.buyers) ? c.buyers : [],
            actions: Array.isArray(c.actions) ? c.actions : [],
            timeline: Array.isArray(c.timeline) ? c.timeline : [],
            updated_at: new Date().toISOString()
          }));
          await fetch(`${this.sbUrl}/rest/v1/companies?on_conflict=id`, {
            method: 'POST',
            headers: upsertHeaders,
            body: JSON.stringify(cleanCompanies)
          });
        }
        if (Array.isArray(this.db.archive_items) && this.db.archive_items.length > 0) {
          const cleanArchive = this.db.archive_items.map((a) => ({
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
            updated_at: new Date().toISOString()
          }));
          await fetch(`${this.sbUrl}/rest/v1/archive_items?on_conflict=id`, {
            method: 'POST',
            headers: upsertHeaders,
            body: JSON.stringify(cleanArchive)
          });
        }
        if (Array.isArray(this.db.trash_items) && this.db.trash_items.length > 0) {
          const cleanTrash = this.db.trash_items.map((t) => ({
            id: t.id,
            item_type: t.item_type || 'item',
            item_title: t.item_title || '',
            company_id: t.company_id || '',
            company_name: t.company_name || '',
            payload: t.payload || {},
            deleted_by_name: t.deleted_by_name || '',
            deleted_by_email: t.deleted_by_email || '',
            deleted_at: t.deleted_at || new Date().toISOString()
          }));
          await fetch(`${this.sbUrl}/rest/v1/trash_items?on_conflict=id`, {
            method: 'POST',
            headers: upsertHeaders,
            body: JSON.stringify(cleanTrash)
          });
        }
        if (extraPayload && extraPayload.delete_archive_id) {
          await fetch(
            `${this.sbUrl}/rest/v1/archive_items?id=eq.${encodeURIComponent(extraPayload.delete_archive_id)}`,
            {
              method: 'DELETE',
              headers: this.getSupabaseHeaders()
            }
          );
        }
        if (extraPayload && extraPayload.delete_company_id) {
          await fetch(
            `${this.sbUrl}/rest/v1/companies?id=eq.${encodeURIComponent(extraPayload.delete_company_id)}`,
            {
              method: 'DELETE',
              headers: this.getSupabaseHeaders()
            }
          );
        }
        if (extraPayload && extraPayload.delete_holding_id) {
          await fetch(
            `${this.sbUrl}/rest/v1/holdings?id=eq.${encodeURIComponent(extraPayload.delete_holding_id)}`,
            {
              method: 'DELETE',
              headers: this.getSupabaseHeaders()
            }
          );
        }
        if (extraPayload && extraPayload.delete_trash_id) {
          await fetch(
            `${this.sbUrl}/rest/v1/trash_items?id=eq.${encodeURIComponent(extraPayload.delete_trash_id)}`,
            {
              method: 'DELETE',
              headers: this.getSupabaseHeaders()
            }
          );
        }
        if (extraPayload && extraPayload.empty_trash) {
          await fetch(`${this.sbUrl}/rest/v1/trash_items?id=not.is.null`, {
            method: 'DELETE',
            headers: this.getSupabaseHeaders()
          });
        }
        return;
      }

      // Serverless /api/db endpoint (also writes directly to Supabase)
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...this.db, ...extraPayload })
      });
    } catch (e) {
      console.error('Supabase kayıt hatası:', e);
    }
  }

  // GÖRÜNÜRLÜK FİLTRESİ (PUBLIC vs PRIVATE KURALI)
  // Bir müşteri default olarak Public'tir (is_private = false).
  // Eğer satıcı Private yaptıysa (is_private = true), sadece o müşterinin sahibi (owner_email) görebilir!
  getVisibleCompanies() {
    const myEmail = this.currentSeller ? this.currentSeller.email.toLowerCase() : '';
    return (this.db.companies || []).filter((c) => {
      if (c.is_private && (c.owner_email || '').toLowerCase() !== myEmail) {
        return false; // Başka satıcının Private müşterisi gizlenir
      }
      if (this.scopeFilter === 'MY_DEALS') {
        return (c.owner_email || '').toLowerCase() === myEmail;
      }
      return true;
    });
  }

  // ============================================================================
  // OTOMATİK HUNİ (FUNNEL) YERLEŞTİRME MOTORU
  // 1) Yeni müşteri ilk açıldığında -> Otomatik 'Addressables'
  // 2) İlk temas / Email girildiğinde -> Otomatik 'Contacted'
  // 3) Toplantı notu, yeni toplantı/PoC/Demo/Teklif aksiyonu veya Teklif eklendiğinde -> Otomatik 'Engaged'
  // ============================================================================
  autoEvaluateCompanyFunnel(comp) {
    const prevFunnel = comp.funnel_status;
    const timeline = comp.timeline || [];
    const actions = comp.actions || [];
    const stage = Number(comp.stage || 1);

    const hasMeetingOrProposalOrDoc = timeline.some((t) =>
      ['meeting_note', 'proposal', 'revision', 'contract', 'document'].includes(t.type)
    );
    const hasEngagedAction = actions.length > 0;
    const hasEmailOnly = timeline.some((t) => t.type === 'email');

    if (stage >= 2 || hasMeetingOrProposalOrDoc || hasEngagedAction) {
      comp.funnel_status = 'Engaged';
      if (comp.stage < 2) comp.stage = 2;
    } else if (hasEmailOnly || stage === 1) {
      if (hasEmailOnly && comp.funnel_status === 'Addressables') {
        comp.funnel_status = 'Contacted';
      }
    }

    if (prevFunnel !== comp.funnel_status) {
      this.showToast(
        `✨ Sistem Otomatik Sınıflandırma: "${comp.name}" girilen veriler doğrultusunda otomatik olarak "${comp.funnel_status}" aşamasına taşındı!`
      );
    }
  }

  // ============================================================================
  // EKSİK BİLGİLER & OTOMATİK RED FLAG DENETÇİSİ
  // ============================================================================
  computeMissingInfo(company) {
    const missing = [];
    const buyers = company.buyers || [];

    if (!company.contact_person || !company.contact_person.name) {
      missing.push('İletişim Kişisi (Contact Person) bilgisi henüz girilmemiş.');
    }
    if (buyers.length === 0) {
      missing.push('6 Alıcı Tipinden (Karar Verici, Finansal Alıcı, Şampiyon vb.) henüz hiçbiri tanımlanmamış.');
    } else {
      if (!buyers.some((b) => b.role === 'Karar Verici')) {
        missing.push('👑 Karar Verici rolünde kişi henüz eklenmemiş.');
      }
      if (!buyers.some((b) => b.role === 'Şampiyon')) {
        missing.push('🏆 İçerideki Şampiyon rolünde kişi henüz belirlenmemiş.');
      }
      if (!buyers.some((b) => b.role === 'Finansal Alıcı')) {
        missing.push('💰 Finansal Alıcı henüz eklenmemiş.');
      }
    }
    if (!company.deal_value || Number(company.deal_value) === 0) {
      missing.push('Tahmini Teklif / Fırsat Tutarı ($) henüz girilmemiş.');
    }
    if (!company.expected_invoice_date && company.funnel_status === 'Engaged') {
      missing.push('Hedef Fatura Tarihi henüz belirlenmemiş.');
    }
    return missing;
  }

  computeRedFlags(company) {
    const flags = [];
    const buyers = company.buyers || [];
    const actions = company.actions || [];
    const stage = Number(company.stage || 1);

    // KURAL 1: Potansiyel Win ile Teklif Çıkılması
    if (stage >= 6) {
      const potentialBuyers = buyers.filter((b) => b.win_status === 'potential');
      potentialBuyers.forEach((b) => {
        flags.push({
          type: 'auto',
          text: `Win Riski: "${b.name}" (${b.role}) için Win durumu hâlâ "⏳ Potansiyel Win" iken ${STAGES_9[stage - 1].label} aşamasına geçildi!`
        });
      });

      if (buyers.length === 0) {
        flags.push({
          type: 'auto',
          text: `Alıcı Eksikliği: Hiçbir Alıcı (Buyer Role) tanımlanmadan ${STAGES_9[stage - 1].label} aşamasına gelindi!`
        });
      }
    }

    // KURAL 2: Engelleyici rolünde alıcı
    const blockers = buyers.filter((b) => b.role === 'Engelleyici');
    blockers.forEach((b) => {
      flags.push({
        type: 'auto',
        text: `Engelleyici Alıcı: "${b.name}" (${b.title}) odada Engelleyici rolünde bulunuyor.`
      });
    });

    // KURAL 3: Engaged / Demo aşamasında Karar Verici eksikliği
    if (stage >= 4 && !buyers.some((b) => b.role === 'Karar Verici')) {
      flags.push({
        type: 'auto',
        text: `Karar Verici Eksik: ${STAGES_9[stage - 1].label} aşamasına gelindi ancak henüz "Karar Verici" rolünde kişi eklenmedi.`
      });
    }

    // KURAL 4: Geciken Toplantı Sonrası Aksiyon
    const todayStr = new Date().toISOString().slice(0, 10);
    actions.forEach((act) => {
      if (!act.completed && act.due_date && act.due_date < todayStr) {
        flags.push({
          type: 'auto',
          text: `Geciken Aksiyon (${act.due_date}): "${act.title}" (${act.owner})`
        });
      }
    });

    (company.manual_red_flags || []).forEach((m, idx) => {
      flags.push({ type: 'manual', index: idx, text: m });
    });

    return flags;
  }

  getBrandBadgeHtml(brand) {
    if (brand === 'Yapra.ai') return `<span class="badge badge-yapra">🌱 Yapra.ai</span>`;
    if (brand === 'ArdicTech') return `<span class="badge badge-ardic">⚙️ ArdicTech</span>`;
    return `<span class="badge badge-both">✨ Yapra.ai + ArdicTech</span>`;
  }

  formatCurrency(val) {
    const num = Number(val || 0);
    if (!num) return '$0';
    return '$' + num.toLocaleString('en-US');
  }

  setupGlobalSearch() {
    const input = document.getElementById('globalSearchInput');
    const dropdown = document.getElementById('globalSearchResults');
    if (!input || !dropdown) return;

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        dropdown.style.display = 'none';
        return;
      }

      const matches = [];
      this.getVisibleCompanies().forEach((comp) => {
        const holdingMatch = (comp.holding_name || '').toLowerCase().includes(q);
        const nameMatch = comp.name.toLowerCase().includes(q);
        const sectorMatch = (comp.sector || '').toLowerCase().includes(q);

        if (nameMatch || holdingMatch || sectorMatch) {
          matches.push({
            companyId: comp.id,
            title: `${comp.name} (${comp.holding_name || 'Bağımsız'})`,
            subtitle: `${comp.funnel_status} • Sahibi: ${comp.owner_name || 'Ekip'} • ${comp.is_private ? '🔒 Private' : '🌐 Public'}`,
            tag: '🏢 Müşteri Odası'
          });
        }

        (comp.buyers || []).forEach((b) => {
          if (b.name.toLowerCase().includes(q) || (b.title || '').toLowerCase().includes(q)) {
            matches.push({
              companyId: comp.id,
              title: `👤 ${b.name} — ${b.role}`,
              subtitle: `${comp.name} (${b.title})`,
              tag: 'Alıcı (Buyer)'
            });
          }
        });

        (comp.timeline || []).forEach((t) => {
          if ((t.title || '').toLowerCase().includes(q) || (t.content || '').toLowerCase().includes(q)) {
            const tInfo = TIMELINE_TYPES[t.type] || { label: 'Kayıt' };
            matches.push({
              companyId: comp.id,
              title: `${tInfo.label}: ${t.title}`,
              subtitle: `${comp.name} • ${t.created_at}`,
              tag: 'Tarihçe / Not'
            });
          }
        });
      });

      (this.db.archive_items || []).forEach((arc) => {
        if (
          (arc.title || '').toLowerCase().includes(q) ||
          (arc.content || '').toLowerCase().includes(q) ||
          (arc.subject || '').toLowerCase().includes(q) ||
          (arc.tags || []).some((tg) => tg.toLowerCase().includes(q))
        ) {
          const catMeta = ARCHIVE_CATEGORIES[arc.category] || { label: '📚 Arşiv' };
          matches.push({
            archiveCategory: arc.category,
            title: `${catMeta.label}: ${arc.title}`,
            subtitle: `${arc.brand} • Kurumsal Arşiv & Şablon Kütüphanesi`,
            tag: '📚 Arşiv'
          });
        }
      });

      if (matches.length === 0) {
        dropdown.innerHTML = `<div style="padding: 14px 16px; color: var(--text-muted); font-size: 0.85rem;">"${input.value}" için sonuç bulunamadı.</div>`;
      } else {
        dropdown.innerHTML = matches
          .slice(0, 10)
          .map(
            (m) => `
            <div class="search-result-item" onclick="${
              m.archiveCategory
                ? `window.app.openArchiveModal(null, '${m.archiveCategory}')`
                : `window.app.openCompanyRoom('${m.companyId}')`
            }; document.getElementById('globalSearchResults').style.display='none'; document.getElementById('globalSearchInput').value='';">
              <div>
                <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${m.title}</div>
                <div style="font-size: 0.76rem; color: var(--text-muted);">${m.subtitle}</div>
              </div>
              <span class="badge badge-neutral">${m.tag}</span>
            </div>
          `
          )
          .join('');
      }
      dropdown.style.display = 'block';
    });
  }

  goHome() {
    this.currentView = 'funnel';
    this.activeCompanyId = null;
    this.render();
  }

  selectFunnelBox(boxName) {
    this.activeFunnelBox = boxName;
    this.currentView = 'funnel';
    this.render();
  }

  openCompanyRoom(companyId) {
    this.activeCompanyId = companyId;
    this.currentView = 'room';
    this.timelineFilter = 'ALL';
    this.expandedBottomWidget = null;
    this.expandedRoomWidget = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.render();
  }

  render() {
    const root = document.getElementById('appRoot');
    if (!root) return;
    this.updateTrashCountBadge();

    if (!this.currentSeller || this.currentView === 'auth') {
      root.innerHTML = this.renderSellerAuthScreen();
      return;
    }

    if (this.currentView === 'room' && this.activeCompanyId) {
      const comp = this.db.companies.find((c) => c.id === this.activeCompanyId);
      if (comp) {
        root.innerHTML = this.renderDealRoomScreen(comp);
        this.bindDropzoneEvents(comp.id);
        return;
      }
    }

    root.innerHTML = this.renderFunnelScreen();
  }

  // ============================================================================
  // EKRAN 0: GERÇEK SUPABASE AUTHENTICATION (GİRİŞ YAP / KAYIT OL / OTP)
  // ============================================================================
  async syncAuthUserToSeller(authUser) {
    if (!authUser || !authUser.email) return;
    const email = authUser.email.trim().toLowerCase();
    this.db.sellers = this.db.sellers || [];
    let seller = this.db.sellers.find((s) => (s.email || '').toLowerCase() === email);

    if (!seller) {
      const metaName = authUser.user_metadata && (authUser.user_metadata.full_name || authUser.user_metadata.name);
      const rawPrefix = email.split('@')[0].replace(/[._-]/g, ' ');
      const formattedName =
        metaName ||
        rawPrefix
          .split(' ')
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

      seller = {
        id: authUser.id || 's-' + Date.now(),
        name: formattedName || email,
        email,
        role: 'Satış Yöneticisi',
        brand_focus: email.endsWith('@ardictech.com') ? 'ArdicTech' : 'Her İkisi',
        created_at: new Date().toISOString()
      };
      this.db.sellers.push(seller);
      await this.persistDatabase();
    }

    this.currentSeller = seller;
    localStorage.setItem('dealroom_last_email', email);
  }

  setAuthMode(mode) {
    this.authMode = mode;
    this.authError = '';
    this.authSuccess = '';
    this.pendingAuthEmail = null;
    this.render();
  }

  renderSellerAuthScreen() {
    const rememberedEmail = localStorage.getItem('dealroom_last_email') || '';

    // Eğer OTP kodu gönderildiyse 6 haneli Supabase OTP doğrulama ekranı
    if (this.pendingAuthEmail) {
      return `
        <div class="auth-floating-wrapper">
          <img
            src="/logo.jpg"
            alt="DealRoom"
            class="auth-floating-logo"
          />

          <div class="auth-screen-card" style="text-align: center;">
            <h2 style="font-size: 1.25rem; font-weight: 800; color: #0D1B3E; margin-bottom: 8px;">
              E-posta Doğrulama Kodu
            </h2>
            <p style="font-size: 0.92rem; color: var(--text-secondary); margin-bottom: 16px;">
              Supabase tarafından <strong>${this.pendingAuthEmail}</strong> adresine gönderilen doğrulama kodunu giriniz.
            </p>

            ${
              this.authError
                ? `<div style="background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; padding: 10px 14px; border-radius: 10px; font-size: 0.85rem; font-weight: 600; margin-bottom: 14px;">⚠️ ${this.authError}</div>`
                : ''
            }

            <form onsubmit="window.app.handleVerifySupabaseOtp(event)">
              <input
                type="text"
                id="authCodeInput"
                class="auth-large-input"
                style="font-weight: 700; letter-spacing: 4px; margin-bottom: 16px;"
                required
                placeholder="Doğrulama Kodu"
                autofocus
              />
              <button type="submit" class="btn btn-logo-gradient" style="width: 100%; padding: 17px; font-size: 1.08rem;" ${this.authLoading ? 'disabled' : ''}>
                ${this.authLoading ? 'Doğrulanıyor...' : 'Onayla ve Giriş Yap ➔'}
              </button>
            </form>

            <button
              type="button"
              class="btn btn-outline btn-sm"
              style="margin-top: 14px; border: none;"
              onclick="window.app.pendingAuthEmail = null; window.app.authError = ''; window.app.render();"
            >
              ← Giriş ekranına dön
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="auth-floating-wrapper">
        <img
          src="/logo.jpg"
          alt="DealRoom"
          class="auth-floating-logo"
        />

        <div class="auth-screen-card" style="text-align: center;">
          <!-- Giriş / Yeni Kayıt / Şifresiz OTP Seçici -->
          <div style="display: inline-flex; gap: 6px; padding: 4px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 999px; margin-bottom: 20px;">
            <button
              type="button"
              onclick="window.app.setAuthMode('login')"
              style="padding: 7px 16px; border-radius: 999px; border: none; font-size: 0.82rem; font-weight: 700; cursor: pointer; background: ${this.authMode === 'login' ? '#FFFFFF' : 'transparent'}; color: ${this.authMode === 'login' ? '#0D1B3E' : '#64748B'}; box-shadow: ${this.authMode === 'login' ? '0 2px 8px rgba(15,23,42,0.08)' : 'none'};"
            >
              🔑 Giriş Yap
            </button>
            <button
              type="button"
              onclick="window.app.setAuthMode('signup')"
              style="padding: 7px 16px; border-radius: 999px; border: none; font-size: 0.82rem; font-weight: 700; cursor: pointer; background: ${this.authMode === 'signup' ? '#FFFFFF' : 'transparent'}; color: ${this.authMode === 'signup' ? '#0D1B3E' : '#64748B'}; box-shadow: ${this.authMode === 'signup' ? '0 2px 8px rgba(15,23,42,0.08)' : 'none'};"
            >
              ✨ Yeni Hesap
            </button>
            <button
              type="button"
              onclick="window.app.setAuthMode('otp')"
              style="padding: 7px 14px; border-radius: 999px; border: none; font-size: 0.82rem; font-weight: 700; cursor: pointer; background: ${this.authMode === 'otp' ? '#FFFFFF' : 'transparent'}; color: ${this.authMode === 'otp' ? '#0D1B3E' : '#64748B'}; box-shadow: ${this.authMode === 'otp' ? '0 2px 8px rgba(15,23,42,0.08)' : 'none'};"
            >
              📩 E-posta Kodu
            </button>
          </div>

          ${
            this.authError
              ? `<div style="background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; padding: 10px 14px; border-radius: 10px; font-size: 0.85rem; font-weight: 600; margin-bottom: 14px;">⚠️ ${this.authError}</div>`
              : ''
          }
          ${
            this.authSuccess
              ? `<div style="background: #ECFDF5; border: 1px solid #A7F3D0; color: #059669; padding: 10px 14px; border-radius: 10px; font-size: 0.85rem; font-weight: 600; margin-bottom: 14px;">✅ ${this.authSuccess}</div>`
              : ''
          }

          <form onsubmit="window.app.handleSupabaseAuthSubmit(event)">
            ${
              this.authMode === 'signup'
                ? `
              <input
                type="text"
                id="authFullNameInput"
                name="name"
                autocomplete="name"
                class="auth-large-input"
                style="margin-bottom: 12px;"
                required
                placeholder="Ad Soyad (Örn: Hülya Kahveci)"
              />
            `
                : ''
            }

            <input
              type="email"
              id="simpleAuthEmailInput"
              name="email"
              autocomplete="email"
              class="auth-large-input"
              style="margin-bottom: 12px;"
              required
              placeholder="E-posta adresiniz"
              value="${rememberedEmail}"
              autofocus
            />

            ${
              this.authMode !== 'otp'
                ? `
              <input
                type="password"
                id="simpleAuthPasswordInput"
                name="password"
                autocomplete="${this.authMode === 'signup' ? 'new-password' : 'current-password'}"
                class="auth-large-input"
                style="margin-bottom: 16px;"
                required
                minlength="6"
                placeholder="Şifreniz"
              />
            `
                : ''
            }

            <button type="submit" class="btn btn-logo-gradient" style="width: 100%; padding: 18px; font-size: 1.08rem;" ${this.authLoading ? 'disabled' : ''}>
              ${
                this.authLoading
                  ? 'İşleniyor...'
                  : this.authMode === 'signup'
                  ? 'Kayıt Ol ve Başla ➔'
                  : this.authMode === 'otp'
                  ? 'E-postama Giriş Kodu Gönder ➔'
                  : 'Giriş Yap ➔'
              }
            </button>
          </form>
        </div>
      </div>
    `;
  }

  async handleSupabaseAuthSubmit(e) {
    e.preventDefault();
    if (!this.supabaseClient) {
      this.authError = 'Supabase bağlantısı başlatılamadı.';
      this.render();
      return;
    }

    const email = document.getElementById('simpleAuthEmailInput').value.trim().toLowerCase();
    const passwordEl = document.getElementById('simpleAuthPasswordInput');
    const password = passwordEl ? passwordEl.value : '';
    const fullNameEl = document.getElementById('authFullNameInput');
    const fullName = fullNameEl ? fullNameEl.value.trim() : '';

    this.authError = '';
    this.authSuccess = '';
    this.authLoading = true;
    this.render();

    try {
      if (this.authMode === 'otp') {
        const { error } = await this.supabaseClient.auth.signInWithOtp({ email });
        this.authLoading = false;
        if (error) {
          this.authError = error.message;
        } else {
          this.pendingAuthEmail = email;
        }
        this.render();
        return;
      }

      if (this.authMode === 'signup') {
        const { data, error } = await this.supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });
        this.authLoading = false;
        if (error) {
          this.authError = error.message;
          this.render();
          return;
        }
        if (data && data.session && data.user) {
          this.accessToken = data.session.access_token;
          await this.loadDatabase();
          await this.syncAuthUserToSeller(data.user);
          this.completeSignInTransition();
          return;
        }
        this.authSuccess = 'Hesabınız oluşturuldu! E-posta onayınız tamamlandıysa şimdi giriş yapabilirsiniz.';
        this.authMode = 'login';
        this.render();
        return;
      }

      // Default: 'login' with email & password via Supabase Auth
      const { data, error } = await this.supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      this.authLoading = false;
      if (error) {
        this.authError =
          error.message === 'Invalid login credentials'
            ? 'E-posta veya şifre hatalı. Lütfen Supabase Auth bilgilerinizi kontrol edin.'
            : error.message;
        this.render();
        return;
      }

      if (data && data.session && data.user) {
        this.accessToken = data.session.access_token;
        await this.loadDatabase();
        await this.syncAuthUserToSeller(data.user);
        this.completeSignInTransition();
      }
    } catch (err) {
      this.authLoading = false;
      this.authError = err.message || 'Giriş sırasında beklenmeyen bir hata oluştu.';
      this.render();
    }
  }

  async handleVerifySupabaseOtp(e) {
    e.preventDefault();
    const token = document.getElementById('authCodeInput').value.trim();
    if (!token || !this.pendingAuthEmail) return;

    this.authError = '';
    this.authLoading = true;
    this.render();

    try {
      const { data, error } = await this.supabaseClient.auth.verifyOtp({
        email: this.pendingAuthEmail,
        token,
        type: 'email'
      });
      this.authLoading = false;
      if (error) {
        this.authError = 'Doğrulama kodu geçersiz veya süresi dolmuş: ' + error.message;
        this.render();
        return;
      }
      if (data && data.session && data.user) {
        this.accessToken = data.session.access_token;
        this.pendingAuthEmail = null;
        await this.loadDatabase();
        await this.syncAuthUserToSeller(data.user);
        this.completeSignInTransition();
      }
    } catch (err) {
      this.authLoading = false;
      this.authError = err.message;
      this.render();
    }
  }

  completeSignInTransition() {
    this.pendingAuthEmail = null;
    this.authError = '';
    this.authSuccess = '';
    this.currentView = 'funnel';
    document.getElementById('topbar').style.display = 'flex';
    document.getElementById('aiFabBtn').style.display = 'flex';
    this.updateUserHeader();
    this.render();
  }

  // ============================================================================
  // EKRAN 1: ULTRA-SADE DASHBOARD
  // 1. Üstte küçük Addressables / Contacted / Engaged butonları (Hover Card ile scroll'lu liste) + Benimkiler/Public
  // 2. Ortada tek ve sade CTA: "Müşteri ismini giriniz" (Kayıtlıysa sayfasına gider, yeniyse Hover Card ile açar)
  // 3. Altta yan yana 3 kutu: 1) Satıcının Red Flag'leri | 2) Aksiyonlar | 3) Son 5 Teklif (Expand ile tümü)
  // ============================================================================
  renderFunnelScreen() {
    const visibleCompanies = this.getVisibleCompanies();

    const addressables = visibleCompanies.filter((c) => c.funnel_status === 'Addressables');
    const contacted = visibleCompanies.filter((c) => c.funnel_status === 'Contacted');
    const engaged = visibleCompanies.filter((c) => c.funnel_status === 'Engaged');

    const renderHoverListHtml = (list, emptyText) => {
      if (list.length === 0) {
        return `<div style="padding: 18px; text-align: center; color: var(--text-muted); font-size: 0.82rem;">${emptyText}</div>`;
      }
      return list
        .map((c) => {
          const rf = this.computeRedFlags(c).length;
          const prodText = Array.isArray(c.products) && c.products.length > 0 ? ` • 📦 ${c.products.join(', ')}` : '';
          return `
            <div class="funnel-hover-item" onclick="window.app.openCompanyRoom('${c.id}')">
              <div>
                <div style="font-weight: 700; font-size: 0.9rem; color: #0D1B3E; display: flex; align-items: center; gap: 6px;">
                  <span>${c.name}</span>
                  <span style="font-size: 0.72rem; color: var(--text-muted);">${c.is_private ? '🔒' : '🌐'}</span>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                  🏛️ ${c.holding_name || 'Bağımsız'} • ${c.brand}${prodText} • ${this.formatCurrency(c.deal_value)}
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                ${rf > 0 ? `<span class="badge badge-redflag">🚩 ${rf}</span>` : ''}
                <span class="badge badge-ardic">Aç ➔</span>
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  style="padding: 2px 7px; font-size: 0.72rem; color: #DC2626; border-color: #FECACA; background: #FFFFFF;"
                  onclick="event.stopPropagation(); window.app.deleteCompany('${c.id}')"
                  title="Çöp Kutusu'na Taşı"
                >🗑️</button>
              </div>
            </div>
          `;
        })
        .join('');
    };

    const companyNamesDatalist = visibleCompanies
      .map((c) => `<option value="${c.name}">${c.holding_name || 'Bağımsız'} — ${c.funnel_status}</option>`)
      .join('');

    return `
      ${
        this.toastMessage
          ? `<div id="liveToastBanner" style="background: #EFF6FF; border: 1px solid #93C5FD; color: #1E40AF; padding: 12px 18px; border-radius: 10px; margin-bottom: 16px; font-weight: 600; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center;">
              <span>${this.toastMessage}</span>
              <button class="btn btn-outline btn-sm" onclick="this.parentElement.style.display='none'">Tamam</button>
            </div>`
          : ''
      }

      <!-- 1. ÜST BAR: KÜÇÜK FUNNEL BUTONLARI (HOVER CARD LİSTELER) + BENİMKİLER / PUBLIC ANAHTARI -->
      <div class="dashboard-top-pills-bar">
        <div class="funnel-pills-group">
          <!-- ADDRESSABLES HOVER PILL -->
          <div
            class="funnel-pill-wrapper ${this.openHoverMenu === 'Addressables' ? 'open' : ''}"
            onmouseenter="window.app.setHoverMenu('Addressables')"
            onmouseleave="window.app.setHoverMenu(null)"
          >
            <button
              type="button"
              class="funnel-pill-btn ${this.openHoverMenu === 'Addressables' ? 'active' : ''}"
              onclick="window.app.toggleHoverMenuClick('Addressables', event)"
            >
              <span>🎯 Addressables</span>
              <span class="funnel-pill-count">${addressables.length}</span>
            </button>
            <div class="funnel-hover-card" onclick="event.stopPropagation()">
              <div class="funnel-hover-header">
                <span>🎯 Addressables Müşterileri</span>
                <span style="font-size: 0.74rem; color: var(--text-muted);">Tıkla &amp; Sayfaya Git</span>
              </div>
              <div class="funnel-hover-list">
                ${renderHoverListHtml(addressables, 'Henüz Addressables müşterisi yok.')}
              </div>
            </div>
          </div>

          <!-- CONTACTED HOVER PILL -->
          <div
            class="funnel-pill-wrapper ${this.openHoverMenu === 'Contacted' ? 'open' : ''}"
            onmouseenter="window.app.setHoverMenu('Contacted')"
            onmouseleave="window.app.setHoverMenu(null)"
          >
            <button
              type="button"
              class="funnel-pill-btn ${this.openHoverMenu === 'Contacted' ? 'active' : ''}"
              onclick="window.app.toggleHoverMenuClick('Contacted', event)"
            >
              <span>📩 Contacted</span>
              <span class="funnel-pill-count">${contacted.length}</span>
            </button>
            <div class="funnel-hover-card" onclick="event.stopPropagation()">
              <div class="funnel-hover-header">
                <span>📩 Contacted Müşterileri</span>
                <span style="font-size: 0.74rem; color: var(--text-muted);">Tıkla &amp; Sayfaya Git</span>
              </div>
              <div class="funnel-hover-list">
                ${renderHoverListHtml(contacted, 'Henüz Contacted müşterisi yok.')}
              </div>
            </div>
          </div>

          <!-- ENGAGED HOVER PILL -->
          <div
            class="funnel-pill-wrapper ${this.openHoverMenu === 'Engaged' ? 'open' : ''}"
            onmouseenter="window.app.setHoverMenu('Engaged')"
            onmouseleave="window.app.setHoverMenu(null)"
          >
            <button
              type="button"
              class="funnel-pill-btn ${this.openHoverMenu === 'Engaged' ? 'active' : ''}"
              onclick="window.app.toggleHoverMenuClick('Engaged', event)"
            >
              <span>🤝 Engaged</span>
              <span class="funnel-pill-count">${engaged.length}</span>
            </button>
            <div class="funnel-hover-card" onclick="event.stopPropagation()">
              <div class="funnel-hover-header">
                <span>🤝 Engaged Aktif Müşteriler</span>
                <span style="font-size: 0.74rem; color: var(--text-muted);">Tıkla &amp; Sayfaya Git</span>
              </div>
              <div class="funnel-hover-list">
                ${renderHoverListHtml(engaged, 'Henüz Engaged müşterisi yok.')}
              </div>
            </div>
          </div>
        </div>

        <!-- SAĞ ÜST: BENİMKİLER / PUBLIC ANAHTARI -->
        <div style="display: flex; align-items: center; gap: 6px; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 4px; border-radius: 999px;">
          <button
            type="button"
            class="btn btn-sm"
            style="border-radius: 999px; ${
              this.scopeFilter === 'MY_DEALS'
                ? 'background: #FFFFFF; color: #0D1B3E; border: 1.5px solid #16B5EA; box-shadow: 0 2px 8px rgba(22, 181, 234, 0.15);'
                : 'background: transparent; color: #64748B; border: 1.5px solid transparent;'
            }"
            onclick="window.app.setScopeFilter('MY_DEALS')"
          >
            👤 Benimkiler
          </button>
          <button
            type="button"
            class="btn btn-sm"
            style="border-radius: 999px; ${
              this.scopeFilter === 'ALL_VISIBLE'
                ? 'background: #FFFFFF; color: #0D1B3E; border: 1.5px solid #16B5EA; box-shadow: 0 2px 8px rgba(22, 181, 234, 0.15);'
                : 'background: transparent; color: #64748B; border: 1.5px solid transparent;'
            }"
            onclick="window.app.setScopeFilter('ALL_VISIBLE')"
          >
            🌐 Benimkiler + Public
          </button>
        </div>
      </div>

      <!-- 2. ORTADA TEK VE SADE ANA CTA ("MÜŞTERİ İSMİNİ GİRİNİZ") -->
      <section class="center-customer-cta-section">
        <div class="center-customer-cta-card">
          <p style="font-size: 1.2rem; font-weight: 700; color: #0D1B3E; margin-bottom: 18px;">
            Müşteri ismini giriniz
          </p>
          <form onsubmit="window.app.handleCenterCustomerSubmit(event)">
            <input
              type="text"
              id="heroCtaCustomerInput"
              list="existingCompanyNamesList"
              class="auth-large-input"
              style="margin-bottom: 16px;"
              placeholder="Örn: Tüpraş, Enerjisa veya yeni müşteri adı..."
              value="${this.ctaQuery}"
              oninput="window.app.handleHeroCtaInput(this.value)"
              autocomplete="off"
            />
            <datalist id="existingCompanyNamesList">
              ${companyNamesDatalist}
            </datalist>
            <button type="submit" class="btn btn-logo-gradient" style="width: 100%; padding: 17px; font-size: 1.08rem;">
              Devam Et ➔
            </button>
          </form>
        </div>

        <!-- YENİ MÜŞTERİ İSE AÇILAN HOVER CARD -->
        <div id="heroCtaDynamicContainer">
          ${this.renderHeroCtaDynamicContent()}
        </div>
      </section>

      <!-- 3. ALT TARAFTA YAN YANA 3 KUTU: RED FLAGS | AKSİYONLAR | SON 5 TEKLİF (EXPAND) -->
      ${this.renderDashboardBottomThreeBoxes(visibleCompanies)}
    `;
  }

  setHoverMenu(menuName) {
    this.openHoverMenu = menuName;
    document.querySelectorAll('.funnel-pill-wrapper').forEach((el) => el.classList.remove('open'));
    document.querySelectorAll('.funnel-pill-btn').forEach((el) => el.classList.remove('active'));
    if (menuName) {
      const idx = menuName === 'Addressables' ? 0 : menuName === 'Contacted' ? 1 : 2;
      const wrappers = document.querySelectorAll('.funnel-pill-wrapper');
      if (wrappers[idx]) {
        wrappers[idx].classList.add('open');
        wrappers[idx].querySelector('.funnel-pill-btn')?.classList.add('active');
      }
    }
  }

  toggleHoverMenuClick(menuName, e) {
    if (e) e.stopPropagation();
    this.setHoverMenu(this.openHoverMenu === menuName ? null : menuName);
  }

  handleHeroCtaInput(val) {
    this.ctaQuery = val;
    if (!val.trim()) {
      this.showNewCustomerHoverCard = false;
      const container = document.getElementById('heroCtaDynamicContainer');
      if (container) container.innerHTML = '';
    }
  }

  handleCenterCustomerSubmit(e) {
    e.preventDefault();
    const inputEl = document.getElementById('heroCtaCustomerInput');
    const q = (inputEl ? inputEl.value : this.ctaQuery || '').trim();
    if (!q) return;
    this.ctaQuery = q;

    const visible = this.getVisibleCompanies();
    // 1. Açılmış bir müşteri ise -> Doğrudan müşteri sayfasına git!
    const existing =
      visible.find((c) => c.name.toLowerCase() === q.toLowerCase()) ||
      visible.find((c) => c.name.toLowerCase().includes(q.toLowerCase()));

    if (existing) {
      this.showNewCustomerHoverCard = false;
      this.openCompanyRoom(existing.id);
      return;
    }

    // 2. İlk kez girilen yeni müşteri ise -> Hover Card açılarak ilk bilgileri (Holding mi, Contact Person) sorsun!
    this.showNewCustomerHoverCard = true;
    const container = document.getElementById('heroCtaDynamicContainer');
    if (container) {
      container.innerHTML = this.renderHeroCtaDynamicContent();
    }
  }

  setCtaHoldingChoice(val) {
    this.ctaBelongsToHolding = val;
    const container = document.getElementById('heroCtaDynamicContainer');
    if (container) {
      container.innerHTML = this.renderHeroCtaDynamicContent();
    }
  }

  renderHeroCtaDynamicContent() {
    const q = (this.ctaQuery || '').trim();
    if (!q || !this.showNewCustomerHoverCard) return '';

    const holdingOptions = this.db.holdings.map((h) => `<option value="${h.id}">${h.name}</option>`).join('');
    return `
      <div class="new-customer-hover-card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #E2E8F0;">
          <div>
            <span class="badge badge-yapra">🆕 İlk Kez Girilen Müşteri</span>
            <strong style="font-size: 1.05rem; color: #0D1B3E; margin-left: 6px;">"${q}"</strong>
          </div>
          <button
            type="button"
            class="btn btn-outline btn-sm"
            onclick="window.app.showNewCustomerHoverCard = false; document.getElementById('heroCtaDynamicContainer').innerHTML = '';"
          >
            ✕
          </button>
        </div>

        <form onsubmit="window.app.handleCreateFromHeroCta(event)">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div>
              <label style="font-size: 0.78rem; font-weight: 700; display: block; margin-bottom: 4px;">
                1. Bir Holding'e mi ait?
              </label>
              <select class="select-field" style="width: 100%;" onchange="window.app.setCtaHoldingChoice(this.value)">
                <option value="yes" ${this.ctaBelongsToHolding === 'yes' ? 'selected' : ''}>🏛️ Evet, Holding'e ait</option>
                <option value="no" ${this.ctaBelongsToHolding === 'no' ? 'selected' : ''}>🏢 Hayır, Bağımsız Şirket</option>
              </select>
            </div>

            <div>
              <label style="font-size: 0.78rem; font-weight: 700; display: block; margin-bottom: 4px;">
                ${this.ctaBelongsToHolding === 'yes' ? 'Holding Seçin veya Yeni Yazın' : 'Şirket Yapısı'}
              </label>
              ${
                this.ctaBelongsToHolding === 'yes'
                  ? `
                <div style="display: flex; gap: 6px;">
                  <select id="ctaHoldingSelect" class="select-field" style="flex: 1;">
                    ${holdingOptions}
                  </select>
                  <input type="text" id="ctaNewHoldingInput" class="input-field" style="flex: 1;" placeholder="veya Yeni Holding yaz..." />
                </div>
              `
                  : `<input type="text" class="input-field" style="width: 100%;" disabled value="Bağımsız Şirket" />`
              }
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div>
              <label style="font-size: 0.78rem; font-weight: 700; display: block; margin-bottom: 4px;">İlgili Markamız</label>
              <select id="ctaBrandSelect" class="select-field" style="width: 100%;">
                <option value="Yapra.ai">🌱 Yapra.ai</option>
                <option value="ArdicTech">⚙️ ArdicTech</option>
                <option value="Her İkisi">✨ Her İkisi</option>
              </select>
            </div>
            <div>
              <label style="font-size: 0.78rem; font-weight: 700; display: block; margin-bottom: 4px;">Görünürlük (Default: Public)</label>
              <select id="ctaPrivacySelect" class="select-field" style="width: 100%;">
                <option value="public" selected>🌐 Public (Herkese Açık)</option>
                <option value="private">🔒 Private (Sadece Bana Özel)</option>
              </select>
            </div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; margin-bottom: 12px;">
            <div style="font-size: 0.8rem; font-weight: 700; color: #0D1B3E; margin-bottom: 8px;">
              📦 2. Hangi Ürün / Çözüm İçin İlişkideyiz? (Birden Fazla Seçilebilir + Yeni Eklenebilir):
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">
              ${STANDARD_PRODUCTS_8.map(
                (prod) => `
                <label style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 999px; font-size: 0.76rem; font-weight: 600; cursor: pointer;">
                  <input type="checkbox" name="ctaProductCheckbox" value="${prod}" ${prod === 'Yapra.ai' ? 'checked' : ''} />
                  <span>${prod}</span>
                </label>
              `
              ).join('')}
            </div>
            <input
              type="text"
              id="ctaCustomProductInput"
              class="input-field"
              style="width: 100%; background: #FFFFFF; font-size: 0.78rem;"
              placeholder="+ Listede olmayan yeni ürün/kategori varsa yazın (virgülle ayırabilirsiniz)..."
            />
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; margin-bottom: 14px;">
            <div style="font-size: 0.8rem; font-weight: 700; color: #0D1B3E; margin-bottom: 8px;">
              👤 3. Contact Person (İletişim Kişisi) Bilgileri:
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <input type="text" id="ctaContactName" class="input-field" placeholder="Ad Soyad" />
              <input type="text" id="ctaContactTitle" class="input-field" placeholder="Ünvan / Departman" />
              <input type="email" id="ctaContactEmail" class="input-field" placeholder="E-posta adresi" />
              <input type="text" id="ctaContactPhone" class="input-field" placeholder="Telefon" />
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="submit" class="btn btn-outline btn-sm" onclick="window.app.ctaOpenRoomMode = false;">
              🎯 Addressables'a Kaydet
            </button>
            <button type="submit" class="btn btn-logo-gradient btn-sm" style="padding: 9px 16px;" onclick="window.app.ctaOpenRoomMode = true;">
              🚀 Addressables'a Aç &amp; Müşteri Sayfasına Git ➔
            </button>
          </div>
        </form>
      </div>
    `;
  }

  renderDashboardBottomThreeBoxes(visibleCompanies) {
    // 1. KUTU VERİSİ: Satıcının Red Flag'leri
    const allRedFlags = [];
    visibleCompanies.forEach((c) => {
      const flags = this.computeRedFlags(c);
      flags.forEach((f) => {
        allRedFlags.push({
          companyId: c.id,
          companyName: c.name,
          holdingName: c.holding_name,
          text: f.text
        });
      });
    });

    // 2. KUTU VERİSİ: Satıcının Açık Aksiyonları (Next Steps)
    const allActions = [];
    visibleCompanies.forEach((c) => {
      (c.actions || []).forEach((act) => {
        if (!act.completed) {
          allActions.push({
            companyId: c.id,
            companyName: c.name,
            ...act
          });
        }
      });
    });

    // 3. KUTU VERİSİ: En Son Gönderilen Teklifler (Son 5 + Expand)
    const allProposals = [];
    visibleCompanies.forEach((c) => {
      (c.timeline || []).forEach((t) => {
        if (t.type === 'proposal' || t.type === 'revision') {
          allProposals.push({
            companyId: c.id,
            companyName: c.name,
            brand: c.brand,
            dealValue: t.amount || this.formatCurrency(c.deal_value),
            ...t
          });
        }
      });
    });

    // Eğer timeline'da teklif kaydı olmayıp aşaması >= 6 olan varsa onları da listeye dahil et
    visibleCompanies.forEach((c) => {
      if (
        Number(c.stage || 1) >= 6 &&
        !allProposals.some((p) => p.companyId === c.id)
      ) {
        allProposals.push({
          companyId: c.id,
          companyName: c.name,
          brand: c.brand,
          type: c.stage === 7 ? 'revision' : 'proposal',
          title: `${c.name} — ${STAGES_9[(c.stage || 1) - 1].label}`,
          dealValue: this.formatCurrency(c.deal_value),
          created_at: (c.updated_at || '').slice(0, 10)
        });
      }
    });

    const todayStr = new Date().toISOString().slice(0, 10);

    const renderRedFlagItems = (list) =>
      list.length === 0
        ? `<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.84rem;">Aktif Red Flag bulunmuyor.</div>`
        : list
            .map(
              (rf) => `
            <div class="dash-widget-item" style="background: #FEF2F2; border-color: #FECACA;" onclick="window.app.openCompanyRoom('${rf.companyId}')">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="font-size: 0.86rem; color: #991B1B;">🏢 ${rf.companyName}</strong>
                <span style="font-size: 0.72rem; color: #DC2626; font-weight: 700;">Odaya Git ➔</span>
              </div>
              <div style="font-size: 0.79rem; color: #7F1D1D;">⚠️ ${rf.text}</div>
            </div>
          `
            )
            .join('');

    const renderActionItems = (list) =>
      list.length === 0
        ? `<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.84rem;">Bekleyen açık aksiyon yok.</div>`
        : list
            .map((act) => {
              const isOverdue = act.due_date && act.due_date < todayStr;
              return `
                <div class="dash-widget-item" onclick="window.app.openCompanyRoom('${act.companyId}')">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong style="font-size: 0.85rem; color: #0D1B3E;">🏢 ${act.companyName}</strong>
                    <span class="badge ${isOverdue ? 'badge-redflag' : 'badge-neutral'}">
                      📅 ${act.due_date || 'Bu hafta'}
                    </span>
                  </div>
                  <div style="font-size: 0.8rem; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
                    <input
                      type="checkbox"
                      onclick="event.stopPropagation(); window.app.toggleAction('${act.companyId}', '${act.id}')"
                      title="Tamamlandı olarak işaretle"
                    />
                    <span>${act.title}</span>
                  </div>
                </div>
              `;
            })
            .join('');

    const renderProposalItems = (list) =>
      list.length === 0
        ? `<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.84rem;">Henüz gönderilen teklif kaydı yok.</div>`
        : list
            .map(
              (p) => `
            <div class="dash-widget-item" onclick="window.app.openCompanyRoom('${p.companyId}')">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                <strong style="font-size: 0.86rem; color: #0D1B3E;">🏢 ${p.companyName}</strong>
                <span class="badge badge-yapra">${p.dealValue}</span>
              </div>
              <div style="font-size: 0.79rem; color: var(--text-secondary);">
                ${p.type === 'revision' ? '🔄 Revize:' : '📄 İlk Teklif:'} ${p.title}
              </div>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 3px;">
                ${p.file_name ? `📎 ${p.file_name} • ` : ''}${p.created_at || ''}
              </div>
            </div>
          `
            )
            .join('');

    // Eğer bir kutu EXPAND edildiyse ekranda sabit kalan & arkası blur olan modalı hazırla
    let expandedModalHtml = '';
    if (this.expandedBottomWidget) {
      let modalTitle = '';
      let modalBadge = '';
      let modalContent = '';

      if (this.expandedBottomWidget === 'redflags') {
        modalTitle = '🚩 Red Flag Uyarıları (Tüm Liste)';
        modalBadge = `<span class="badge badge-redflag">${allRedFlags.length} Risk</span>`;
        modalContent = renderRedFlagItems(allRedFlags);
      } else if (this.expandedBottomWidget === 'actions') {
        modalTitle = '⚡ Açık Aksiyonlar (Tüm Liste)';
        modalBadge = `<span class="badge badge-warning">${allActions.length} Aksiyon</span>`;
        modalContent = renderActionItems(allActions);
      } else if (this.expandedBottomWidget === 'proposals') {
        modalTitle = '💰 Son Gönderilen Teklifler (Tüm Liste)';
        modalBadge = `<span class="badge badge-yapra">${allProposals.length} Teklif</span>`;
        modalContent = renderProposalItems(allProposals);
      }

      expandedModalHtml = `
        <div class="dash-expanded-backdrop" onclick="if(event.target === this) window.app.setExpandedBottomWidget(null)">
          <div class="dash-expanded-modal">
            <div class="dash-expanded-header">
              <div style="display: flex; align-items: center; gap: 10px;">
                <strong style="font-size: 1.12rem; color: #0D1B3E;">${modalTitle}</strong>
                ${modalBadge}
              </div>
              <button
                type="button"
                class="btn btn-outline btn-sm"
                onclick="window.app.setExpandedBottomWidget(null)"
              >
                ✕ Küçült / Kapat
              </button>
            </div>
            <div class="dash-expanded-body">
              ${modalContent}
            </div>
          </div>
        </div>
      `;
    }

    return `
      <section class="dashboard-bottom-3-grid">
        <!-- 1. İNCE HAP BUTON (HOVER CARD): SATICININ RED FLAG'LERİ -->
        <div class="dash-widget-wrapper" onclick="this.classList.toggle('hover-open')">
          <button type="button" class="dash-slim-pill-btn">
            <span>🚩 Red Flag Uyarıları</span>
            <span class="funnel-pill-count" style="background: #FFFFFF; color: #DC2626; border-color: #FCA5A5;">${allRedFlags.length}</span>
          </button>

          <div class="dash-hover-body" onclick="event.stopPropagation()">
            <div class="dash-hover-card-top">
              <strong style="font-size: 0.85rem; color: #0D1B3E;">🚩 Red Flag Uyarıları (${allRedFlags.length})</strong>
              <button
                type="button"
                class="dash-expand-btn"
                onclick="window.app.setExpandedBottomWidget('redflags')"
              >
                ⤢ Expand
              </button>
            </div>
            ${renderRedFlagItems(allRedFlags.slice(0, 5))}
          </div>
        </div>

        <!-- 2. İNCE HAP BUTON (HOVER CARD): TOPLANTI SONRASI AÇIK AKSİYONLAR -->
        <div class="dash-widget-wrapper" onclick="this.classList.toggle('hover-open')">
          <button type="button" class="dash-slim-pill-btn">
            <span>⚡ Açık Aksiyonlar</span>
            <span class="funnel-pill-count" style="background: #FFFFFF; color: #D97706; border-color: #FCD34D;">${allActions.length}</span>
          </button>

          <div class="dash-hover-body" onclick="event.stopPropagation()">
            <div class="dash-hover-card-top">
              <strong style="font-size: 0.85rem; color: #0D1B3E;">⚡ Açık Aksiyonlar (${allActions.length})</strong>
              <button
                type="button"
                class="dash-expand-btn"
                onclick="window.app.setExpandedBottomWidget('actions')"
              >
                ⤢ Expand
              </button>
            </div>
            ${renderActionItems(allActions.slice(0, 5))}
          </div>
        </div>

        <!-- 3. İNCE HAP BUTON (HOVER CARD): EN SON GÖNDERİLEN TEKLİFLER -->
        <div class="dash-widget-wrapper" onclick="this.classList.toggle('hover-open')">
          <button type="button" class="dash-slim-pill-btn">
            <span>💰 Son Gönderilen Teklifler</span>
            <span class="funnel-pill-count" style="background: #FFFFFF; color: #0284C7; border-color: #7DD3FC;">${allProposals.length}</span>
          </button>

          <div class="dash-hover-body" onclick="event.stopPropagation()">
            <div class="dash-hover-card-top">
              <strong style="font-size: 0.85rem; color: #0D1B3E;">💰 Son 5 Gönderilen Teklif (Toplam: ${allProposals.length})</strong>
              <button
                type="button"
                class="dash-expand-btn"
                onclick="window.app.setExpandedBottomWidget('proposals')"
              >
                ⤢ Expand
              </button>
            </div>
            ${renderProposalItems(allProposals.slice(0, 5))}
          </div>
        </div>
      </section>
      ${expandedModalHtml}
    `;
  }

  setExpandedBottomWidget(widgetKey) {
    this.expandedBottomWidget = widgetKey;
    this.render();
  }

  async handleCreateFromHeroCta(e) {
    e.preventDefault();
    const companyName = (this.ctaQuery || '').trim();
    if (!companyName) return;

    let holdingId = null;
    let holdingName = 'Bağımsız Şirket';

    if (this.ctaBelongsToHolding === 'yes') {
      const newHoldingText = (document.getElementById('ctaNewHoldingInput')?.value || '').trim();
      const selectedHoldingId = document.getElementById('ctaHoldingSelect')?.value;

      if (newHoldingText) {
        const newH = {
          id: 'h-' + Date.now(),
          name: newHoldingText,
          sector: 'Holding / Grup',
          notes: ''
        };
        this.db.holdings.push(newH);
        holdingId = newH.id;
        holdingName = newH.name;
      } else if (selectedHoldingId && selectedHoldingId !== '__NEW__') {
        const hObj = this.db.holdings.find((h) => h.id === selectedHoldingId);
        if (hObj) {
          holdingId = hObj.id;
          holdingName = hObj.name;
        }
      }
    }

    const brand = document.getElementById('ctaBrandSelect')?.value || 'Yapra.ai';
    const isPrivate = document.getElementById('ctaPrivacySelect')?.value === 'private';

    const checkedProducts = Array.from(document.querySelectorAll('input[name="ctaProductCheckbox"]:checked')).map(
      (cb) => cb.value
    );
    const customProdRaw = (document.getElementById('ctaCustomProductInput')?.value || '').trim();
    const customProds = customProdRaw
      ? customProdRaw
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      : [];
    const products = Array.from(new Set([...checkedProducts, ...customProds]));

    const cpName = (document.getElementById('ctaContactName')?.value || '').trim();
    const cpTitle = (document.getElementById('ctaContactTitle')?.value || '').trim();
    const cpEmail = (document.getElementById('ctaContactEmail')?.value || '').trim();
    const cpPhone = (document.getElementById('ctaContactPhone')?.value || '').trim();

    const initialBuyers = [];
    if (cpName) {
      initialBuyers.push({
        id: 'b-' + Date.now(),
        name: cpName,
        title: cpTitle || 'İletişim Kişisi',
        email: cpEmail,
        phone: cpPhone,
        role: 'Kullanıcı Alıcı',
        wins: [],
        custom_win: '',
        win_status: 'potential'
      });
    }

    const newComp = {
      id: 'c-' + Date.now(),
      owner_id: this.currentSeller.id,
      owner_name: this.currentSeller.name,
      owner_email: this.currentSeller.email,
      is_private: isPrivate,
      holding_id: holdingId,
      holding_name: holdingName,
      name: companyName,
      brand,
      products,
      funnel_status: 'Addressables', // KURAL: Yeni girilen müşteri otomatik olarak Addressables'a geçer!
      stage: 1,
      contact_person: {
        name: cpName,
        title: cpTitle,
        email: cpEmail,
        phone: cpPhone
      },
      sector: 'Kurumsal',
      city: 'İstanbul',
      deal_value: 0,
      currency: 'USD',
      expected_invoice_date: '',
      payment_date: '',
      delivery_date: '',
      contract_status: '',
      deliveries: [],
      summary_note: '',
      manual_red_flags: [],
      buyers: initialBuyers,
      actions: [],
      timeline: [
        {
          id: 't-' + Date.now(),
          type: 'document',
          title: `Yeni Müşteri Kaydı Açıldı (Otomatik: Addressables)`,
          content: cpName ? `İlk İletişim Kişisi (Contact Person): ${cpName} (${cpTitle})` : 'Müşteri kartı oluşturuldu.',
          author: this.currentSeller.name,
          created_at: new Date().toLocaleString('tr-TR').slice(0, 16)
        }
      ],
      updated_at: new Date().toISOString()
    };

    this.db.companies.unshift(newComp);
    this.ctaQuery = '';
    this.showNewCustomerHoverCard = false;
    await this.persistDatabase();

    if (this.ctaOpenRoomMode) {
      this.openCompanyRoom(newComp.id);
    } else {
      this.showToast(`✅ "${companyName}" oluşturuldu ve otomatik olarak Addressables listesine eklendi!`);
      this.render();
    }
  }

  async toggleCompanyPrivacy(compId, event) {
    if (event) event.stopPropagation();
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    comp.is_private = !comp.is_private;
    await this.persistDatabase();
    this.render();
  }

  setScopeFilter(scope) {
    this.scopeFilter = scope;
    this.render();
  }

  renderCompanyListSection(companies) {
    if (companies.length === 0) {
      return `
        <div style="background: #fff; border: 1px solid var(--border-light); border-radius: 12px; padding: 40px; text-align: center; color: var(--text-muted);">
          Bu aşamada müşteri bulunmuyor. Yukarıdaki <strong>"Müşteri İsmini Giriniz"</strong> alanından hemen yeni müşteri ekleyebilirsiniz.
        </div>
      `;
    }

    if (!this.groupByHolding) {
      return `
        <div class="holding-group">
          ${companies.map((c) => this.renderCompanyRowHtml(c)).join('')}
        </div>
      `;
    }

    const groups = {};
    companies.forEach((c) => {
      const key = c.holding_name || 'Bağımsız Şirketler';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });

    return Object.keys(groups)
      .map((holdingName) => {
        const list = groups[holdingName];
        const groupSum = list.reduce((acc, item) => acc + Number(item.deal_value || 0), 0);
        return `
          <div class="holding-group">
            <div class="holding-header">
              <div class="holding-title">
                <span>🏛️ ${holdingName}</span>
                <span class="badge badge-neutral">${list.length} Alt Şirket</span>
              </div>
              <div style="font-size: 0.82rem; color: var(--text-secondary);">
                Grup Toplam Potansiyel: <strong>${this.formatCurrency(groupSum)}</strong>
              </div>
            </div>
            ${list.map((c) => this.renderCompanyRowHtml(c)).join('')}
          </div>
        `;
      })
      .join('');
  }

  renderCompanyRowHtml(c) {
    const redFlags = this.computeRedFlags(c);
    const missingInfo = this.computeMissingInfo(c);
    const openActions = (c.actions || []).filter((a) => !a.completed);
    const stageObj = STAGES_9[(c.stage || 1) - 1] || STAGES_9[0];

    return `
      <div class="company-row" onclick="window.app.openCompanyRoom('${c.id}')">
        <div class="company-main-info">
          <div class="company-name-line">
            <span>${c.name}</span>
            ${this.getBrandBadgeHtml(c.brand)}
            <button
              class="privacy-toggle-btn ${c.is_private ? 'private' : 'public'}"
              onclick="window.app.toggleCompanyPrivacy('${c.id}', event)"
              title="Public / Private durumunu değiştirmek için tıklayın"
            >
              ${c.is_private ? '🔒 Private' : '🌐 Public'}
            </button>
          </div>
          <div class="company-sub-line">
            <span>🏛️ ${c.holding_name || 'Bağımsız'}</span>
            <span>•</span>
            <span>👤 Sahibi: <strong>${c.owner_name || 'Ekip'}</strong></span>
            ${c.contact_person?.name ? `<span>• Contact: ${c.contact_person.name}</span>` : ''}
          </div>
        </div>

        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 3px;">Satış Aşaması</div>
          <span class="badge badge-ardic">${stageObj.short}</span>
        </div>

        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 3px;">Alıcılar &amp; Eksik Bilgi</div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <span class="badge badge-neutral">👤 ${(c.buyers || []).length} Alıcı</span>
            ${missingInfo.length > 0 ? `<span class="badge badge-warning">⚠️ ${missingInfo.length} Eksik</span>` : ''}
            ${openActions.length > 0 ? `<span class="badge badge-ardic">⚡ ${openActions.length} Aksiyon</span>` : ''}
          </div>
        </div>

        <div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 3px;">Teklif &amp; Red Flag</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="font-size: 0.95rem;">${this.formatCurrency(c.deal_value)}</strong>
            ${
              redFlags.length > 0
                ? `<span class="badge badge-redflag">🚩 ${redFlags.length} Red Flag</span>`
                : `<span class="badge badge-success">✓ Sağlıklı</span>`
            }
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window.app.openCompanyRoom('${c.id}')">
            Odaya Gir ➔
          </button>
          <button
            type="button"
            class="btn btn-outline btn-sm"
            style="padding: 5px 9px; color: #DC2626; border-color: #FECACA; background: #FFFFFF;"
            onclick="event.stopPropagation(); window.app.deleteCompany('${c.id}')"
            title="Bu müşteriyi Çöp Kutusu'na taşı"
          >
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  // ============================================================================
  // EKRAN 2: ŞİRKETİN İÇİNE GİRİLDİĞİNDE DEAL ROOM (3 ANA KUTU + EKSİK BİLGİ & RED FLAG)
  // ============================================================================
  renderDealRoomScreen(comp) {
    const redFlags = this.computeRedFlags(comp);
    const missingInfo = this.computeMissingInfo(comp);
    const sisterCompanies = this.getVisibleCompanies().filter(
      (other) => other.holding_id && other.holding_id === comp.holding_id && other.id !== comp.id
    );

    return `
      ${
        this.toastMessage
          ? `<div id="liveToastBanner" style="background: #ECFDF5; border: 1px solid #6EE7B7; color: #065F46; padding: 12px 18px; border-radius: 10px; margin-bottom: 16px; font-weight: 700; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center;">
              <span>${this.toastMessage}</span>
              <button class="btn btn-outline btn-sm" onclick="this.parentElement.style.display='none'">Tamam</button>
            </div>`
          : ''
      }

      <!-- EN YUKARIDA ÇOK İNCE 9 AŞAMALI SATIŞ SEVİYESİ TAKİP ŞERİDİ -->
      <div class="slim-top-stepper-bar" title="Satış seviyesini takip edin veya değiştirmek için tıklayın">
        ${STAGES_9.map((st) => {
          const cur = Number(comp.stage || 1);
          const cls = st.id < cur ? 'completed' : st.id === cur ? 'current' : '';
          return `
            <button
              type="button"
              class="slim-step-pill ${cls}"
              onclick="window.app.setCompanyStage('${comp.id}', ${st.id})"
            >
              <span>${st.id < cur ? '✓' : st.id + '.'}</span>
              <span>${st.label}</span>
            </button>
          `;
        }).join('')}
      </div>

      <!-- ÜST GEZİNTİ ÇUBUĞU -->
      <div class="dealroom-breadcrumb">
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-outline btn-sm" style="background: #FFFFFF;" onclick="window.app.goHome()">
            ← Dashboard'a Dön (${comp.funnel_status})
          </button>
          <span style="color: var(--text-muted); font-size: 0.85rem;">
            ${comp.holding_name || 'Bağımsız'} / <strong>${comp.name} Deal Room</strong>
          </span>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <button
            class="privacy-toggle-btn ${comp.is_private ? 'private' : 'public'}"
            style="padding: 6px 14px; font-size: 0.82rem; background: #FFFFFF;"
            onclick="window.app.toggleCompanyPrivacy('${comp.id}', event)"
          >
            ${comp.is_private ? '🔒 Private Müşteri (Sadece Bana Özel — Değiştir)' : '🌐 Public Müşteri (Herkese Açık — Private Yap)'}
          </button>
          <button
            class="btn btn-outline btn-sm"
            style="background: #FFFFFF; border-color: #16B5EA; color: #0D1B3E; font-weight: 700;"
            onclick="window.app.openArchiveModal('${comp.id}')"
          >
            📚 Arşivden Gönder / Ekle
          </button>
          <button class="btn btn-outline btn-sm" style="background: #FFFFFF;" onclick="window.app.openMessageDraftModal('${comp.id}')">
            ✉️ İlk Temas / Email Taslağı
          </button>
          <button class="btn btn-outline btn-sm" style="background: #FFFFFF;" onclick="window.app.openEditCompanyModal('${comp.id}')">
            ✏️ Genel Kartı Düzenle
          </button>
          <button
            class="btn btn-outline btn-sm"
            style="background: #FFFFFF; color: #DC2626;"
            onclick="window.app.deleteCompany('${comp.id}')"
            title="Müşteri Odasını Sil"
          >
            🗑️ Sil
          </button>
        </div>
      </div>

      <!-- ORTADA MÜŞTERİ & HOLDİNG TANITIM KARTI (ÜSTTE KİMLİK, ALTTA 3 METRİK KUTUSU) -->
      <section class="box-1-general-card">
        <div class="general-card-top" style="padding-bottom: 0; border-bottom: none; margin-bottom: 0;">
          <div class="general-identity">
            <div class="holding-pill-bar">
              <span class="badge badge-neutral" style="background: #FFFFFF;">🏛️ Holding: ${comp.holding_name || 'Bağımsız Şirket'}</span>
              ${this.getBrandBadgeHtml(comp.brand)}
              <span class="badge badge-neutral" style="background: #FFFFFF;">👤 Satıcı: ${comp.owner_name || this.currentSeller.name}</span>
              ${
                comp.contact_person?.name
                  ? `<span class="badge badge-ardic" style="background: #FFFFFF;">📞 Contact Person: ${comp.contact_person.name} (${comp.contact_person.title || ''})</span>`
                  : ''
              }
            </div>

            <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 6px; flex-wrap: wrap;">
              <h1 style="font-size: 1.65rem; font-weight: 800; letter-spacing: -0.02em; color: #0D1B3E;">${comp.name}</h1>
              <span class="badge ${comp.funnel_status === 'Engaged' ? 'badge-yapra' : comp.funnel_status === 'Contacted' ? 'badge-ardic' : 'badge-neutral'}" style="font-size: 0.85rem; padding: 5px 12px; background: #FFFFFF;">
                Konum: ${comp.funnel_status}
              </span>
            </div>

            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 4px; max-width: 660px;">
              ${comp.summary_note || 'Müşteri notu veya kapsam özeti eklemek için "Genel Kartı Düzenle" butonuna tıklayabilirsiniz.'}
            </p>

            <!-- İLİŞKİDE OLDUĞUMUZ ÜRÜNLER & ÇOKLU SEÇİM / YENİ KATEGORİ EKLEME BARI -->
            <div style="margin-top: 10px; padding: 8px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap;">
              <span style="font-size: 0.76rem; font-weight: 800; color: #0D1B3E; margin-right: 4px;">📦 Satılacak Ürünler:</span>
              ${Array.from(new Set([...STANDARD_PRODUCTS_8, ...(comp.products || [])]))
                .map((prod) => {
                  const isSelected = (comp.products || []).includes(prod);
                  const safeProd = prod.replace(/'/g, "\\'");
                  return `
                    <button
                      type="button"
                      onclick="window.app.toggleCompanyProductInline('${comp.id}', '${safeProd}')"
                      style="padding: 3px 10px; border-radius: 999px; font-size: 0.74rem; font-weight: 700; cursor: pointer; transition: all 0.15s; ${
                        isSelected
                          ? 'background: #EFF6FF; color: #0284C7; border: 1.5px solid #16B5EA;'
                          : 'background: #FFFFFF; color: #64748B; border: 1px dashed #CBD5E1;'
                      }"
                      title="Bu ürünü müşteriye eklemek/çıkarmak için tıklayın"
                    >
                      ${isSelected ? '✓ ' : '+ '}${prod}
                    </button>
                  `;
                })
                .join('')}
              <button
                type="button"
                class="btn btn-outline btn-sm"
                style="padding: 2px 8px; font-size: 0.72rem; border-radius: 999px; background: #FFFFFF;"
                onclick="window.app.promptAddCustomProductCategory('${comp.id}')"
              >
                + Yeni Kategori
              </button>
            </div>

            ${
              sisterCompanies.length > 0
                ? `
              <div style="display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap; margin-top: 6px;">
                <span style="font-size: 0.76rem; color: var(--text-muted); font-weight: 600;">
                  Aynı Holdingdeki Diğer Alt Şirketler:
                </span>
                ${sisterCompanies
                  .map(
                    (sis) => `
                  <span class="sister-company-chip" style="background: #FFFFFF;" onclick="window.app.openCompanyRoom('${sis.id}')">
                    🏢 ${sis.name} (${sis.funnel_status})
                  </span>
                `
                  )
                  .join('')}
              </div>
            `
                : ''
            }
          </div>

          <!-- KARTIN ALT TARAFINDA YAN YANA METRİK KUTULARI (TEKLİF/SÖZLEŞME, FATURA/ÖDEME, TESLİMAT, RED FLAG) -->
          <div class="general-metrics-bar" style="grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));">
            <div class="metric-card-mini" style="background: #FFFFFF;">
              <label>Teklif &amp; Sözleşme Durumu</label>
              <strong>${this.formatCurrency(comp.deal_value)}</strong>
              <div style="font-size: 0.72rem; color: #0369A1; font-weight: 700; margin-top: 2px;">
                ${comp.contract_status ? `📜 ${comp.contract_status}` : '📝 Sözleşme Girilmedi'}
              </div>
            </div>
            <div class="metric-card-mini" style="background: #FFFFFF;">
              <label>📅 Fatura &amp; 💳 Ödeme Günü</label>
              <strong style="font-size: 0.88rem;">Fatura: ${comp.expected_invoice_date || 'Belirlenmedi'}</strong>
              <div style="font-size: 0.73rem; color: var(--text-secondary); font-weight: 600; margin-top: 2px;">
                💳 Ödeme: ${comp.payment_date || 'Belirlenmedi'}
              </div>
            </div>
            <div class="metric-card-mini" style="background: #FFFFFF; cursor: pointer;" onclick="window.app.setExpandedRoomWidget('deliveries')" title="Proje Teslimatlarını Yönetmek İçin Tıklayın">
              <label>🚀 Proje Teslimat Takibi</label>
              <strong style="font-size: 0.88rem;">${comp.delivery_date || 'Planlanmadı'}</strong>
              <div style="font-size: 0.72rem; color: #0284C7; font-weight: 700; margin-top: 2px;">
                📦 ${(comp.deliveries || []).length} Teslimat / Milestone ➔
              </div>
            </div>
            <div class="metric-card-mini" style="background: #FFFFFF;">
              <label>Red Flag &amp; Eksik</label>
              <strong style="color: ${redFlags.length > 0 ? 'var(--danger-color)' : 'var(--success-color)'};">
                🚩 ${redFlags.length} Risk / ⚠️ ${missingInfo.length} Eksik
              </strong>
            </div>
          </div>

          <!-- DOĞRUDAN MÜŞTERİ KARTINDA GÖRÜNÜR DRAG & DROP EMAIL / DOKÜMAN ALANI -->
          <div
            id="roomQuickDropzone"
            class="dropzone-box"
            style="margin-top: 14px; margin-bottom: 0; padding: 12px 16px; background: #FFFFFF; border: 1.5px dashed #93C5FD; border-radius: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;"
            onclick="window.app.openTimelineModal('${comp.id}')"
          >
            <div style="display: flex; align-items: center; gap: 10px; text-align: left;">
              <span style="font-size: 1.35rem;">📥</span>
              <div>
                <div style="font-weight: 700; font-size: 0.86rem; color: #0D1B3E;">
                  Apple Mail'den Doğrudan Sürükleyin, <code>Cmd+V</code> ile Yapıştırın veya Doküman Bırakın
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                  Masaüstüne kaydetmeye gerek yok! Apple Mail'den sürükleyin, kopyalayıp yapıştırın veya PDF/Word bırakın
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;" onclick="event.stopPropagation()">
              <button
                type="button"
                class="btn btn-outline btn-sm"
                style="background: #FFFFFF; border-color: #16B5EA; color: #0D1B3E; font-weight: 700;"
                onclick="window.app.fetchEmailsFromAppleMailBridge('${comp.id}')"
                title="Apple Mail'de seçili olan e-postaları masaüstüne kaydetmeden doğrudan odaya çeker"
              >
                📩 Apple Mail'den Seçili Mailleri Çek
              </button>
              <button
                type="button"
                class="btn btn-outline btn-sm"
                style="background: #FFFFFF; font-weight: 700;"
                onclick="window.app.pasteEmailFromClipboard('${comp.id}')"
                title="Kopyaladığınız (Cmd+C) mail metnini tek tıkla odaya kaydeder"
              >
                📋 Kopyalanan Maili Yapıştır
              </button>
              <button
                type="button"
                class="btn btn-outline btn-sm"
                style="background: #FFFFFF;"
                onclick="window.app.openTimelineModal('${comp.id}')"
              >
                ➕ Elle Ekle
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- ALT BÖLÜM: TÜM DETAYLAR İNCE BEYAZ HAP BUTONLAR (HOVER CARD + EXPAND & ARKASI BLUR) -->
      ${this.renderRoomBottomHoverPills(comp, redFlags, missingInfo)}
    `;
  }

  setExpandedRoomWidget(widgetKey) {
    this.expandedRoomWidget = widgetKey;
    this.render();
  }

  renderRoomBottomHoverPills(comp, redFlags, missingInfo) {
    const buyers = comp.buyers || [];
    const actions = comp.actions || [];
    const timeline = comp.timeline || [];
    const competitors = comp.competitors || [];
    const todayStr = new Date().toISOString().slice(0, 10);

    // 1) 6 ALICI ROLÜNÜN TAMAMI HER ZAMAN GÖRÜNSÜN (DOLU OLANLAR + HENÜZ TANIMLANMAMIŞ ROL SLOTLARI)
    const fullBuyersHtml = BUYER_ROLES_6.map((roleName) => {
      const roleBuyers = buyers.filter((b) => b.role === roleName);
      if (roleBuyers.length > 0) {
        return roleBuyers.map((b) => this.renderBuyerCardHtml(comp.id, b, comp.stage)).join('');
      }
      return `
        <div class="buyer-card" style="border-style: dashed; background: #FFFFFF; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <strong style="font-size: 0.96rem; color: #0D1B3E;">👤 ${roleName}</strong>
              <span class="badge badge-neutral" style="background: #FFFFFF;">Henüz Tanımlanmadı</span>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">
              Bu alıcı tipi için kişi bilgileri (Ad Soyad, Title, Email, Tel) ve Win seçimi henüz girilmedi.
            </div>
          </div>
          <button
            type="button"
            class="btn btn-outline btn-sm"
            style="background: #FFFFFF; white-space: nowrap;"
            onclick="window.app.openBuyerModal('${comp.id}', null, '${roleName}')"
          >
            ➕ ${roleName} Ekle
          </button>
        </div>
      `;
    }).join('');

    // 1b) ALICILAR KISA ÖNİZLEME (HOVER CARD İÇİN — 6 ROLÜN TAMAMI)
    const hoverBuyersHtml = BUYER_ROLES_6.map((roleName) => {
      const b = buyers.find((item) => item.role === roleName);
      if (!b) {
        return `
          <div class="dash-widget-item" style="background: #FFFFFF; border-style: dashed;" onclick="window.app.openBuyerModal('${comp.id}', null, '${roleName}')">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="font-size: 0.84rem; color: #64748B;">👤 ${roleName}</strong>
              <span class="badge badge-neutral" style="background: #FFFFFF;">+ Kişi &amp; Win Tanımla</span>
            </div>
          </div>
        `;
      }
      return `
        <div class="dash-widget-item" style="background: #FFFFFF;" onclick="window.app.setExpandedRoomWidget('buyers')">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
            <strong style="font-size: 0.86rem; color: #0D1B3E;">👤 ${b.name} (${b.role})</strong>
            <span class="badge ${b.win_status === 'created' ? 'badge-success' : 'badge-warning'}" style="background: #FFFFFF;">
              ${b.win_status === 'created' ? '✅ Win Yaratıldı' : '⏳ Potansiyel Win'}
            </span>
          </div>
          <div style="font-size: 0.76rem; color: var(--text-secondary);">
            ${b.title || ''}
          </div>
          <div style="font-size: 0.73rem; color: var(--text-muted); margin-top: 2px;">
            ${b.email ? `✉️ ${b.email} ` : ''}${b.phone ? `• 📞 ${b.phone}` : ''} • 🎯 ${(b.wins || []).length + (b.custom_win ? 1 : 0)} Win
          </div>
        </div>
      `;
    }).join('');

    // 2) RED FLAG & EKSİK BİLGİLER İÇERİĞİ
    const renderRedFlagsAndMissingHtml = () => `
      ${
        redFlags.length > 0
          ? `
        <div class="redflag-alert-box" style="margin-bottom: 12px;">
          <div class="redflag-alert-title">
            <span>🚩 Aktif Red Flag Uyarıları (${redFlags.length})</span>
          </div>
          <ul class="redflag-list">
            ${redFlags
              .map(
                (rf) => `
              <li>
                <span>⚠️ ${rf.text}</span>
                ${
                  rf.type === 'manual'
                    ? `<button class="btn btn-outline btn-sm" style="padding: 1px 6px; font-size: 0.7rem; background:#FFFFFF;" onclick="window.app.removeManualRedFlag('${comp.id}', ${rf.index})">Kaldır</button>`
                    : `<span class="badge badge-redflag" style="background:#FFFFFF;">Otomatik</span>`
                }
              </li>
            `
              )
              .join('')}
          </ul>
        </div>
      `
          : `
        <div style="padding: 10px 14px; background: #FFFFFF; border: 1px solid var(--success-border); border-radius: 8px; color: var(--success-color); font-size: 0.82rem; font-weight: 600; margin-bottom: 12px;">
          ✅ Aktif Red Flag bulunmuyor.
        </div>
      `
      }
      ${
        missingInfo.length > 0
          ? `
        <div class="missing-info-box" style="margin-bottom: 0;">
          <div style="font-weight: 700; font-size: 0.84rem; color: #92400E; margin-bottom: 6px;">
            📋 Eksik Bilgiler (${missingInfo.length}):
          </div>
          <ul style="padding-left: 18px; font-size: 0.79rem; color: #78350F; display: flex; flex-direction: column; gap: 4px;">
            ${missingInfo.map((m) => `<li>${m}</li>`).join('')}
          </ul>
        </div>
      `
          : ''
      }
    `;

    // 3) AKSİYONLAR İÇERİĞİ
    const renderActionsHtml = (showForm = true) => `
      ${
        showForm
          ? `
        <form onsubmit="window.app.handleAddAction(event, '${comp.id}')" style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
          <input
            type="text"
            id="newActionTitle"
            class="input-field"
            style="flex: 1; min-width: 150px; padding: 7px 10px; font-size: 0.8rem; background: #FFFFFF;"
            required
            placeholder="Yeni aksiyon (Pilot, Teklif, Toplantı)..."
          />
          <input
            type="text"
            id="newActionOwner"
            class="input-field"
            style="width: 110px; padding: 7px 8px; font-size: 0.8rem; background: #FFFFFF;"
            placeholder="Sorumlu"
            value="${this.currentSeller.name}"
          />
          <input
            type="date"
            id="newActionDate"
            class="input-field"
            style="width: 125px; padding: 7px 8px; font-size: 0.8rem; background: #FFFFFF;"
            required
          />
          <button type="submit" class="btn btn-outline btn-sm" style="background: #FFFFFF;">+ Ekle</button>
        </form>
      `
          : ''
      }
      ${
        actions.length === 0
          ? `<div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 0.82rem;">Henüz toplantı sonrası aksiyon girilmedi.</div>`
          : actions
              .map((act) => {
                const isOverdue = !act.completed && act.due_date && act.due_date < todayStr;
                return `
                  <div class="action-item ${act.completed ? 'done' : ''} ${isOverdue ? 'overdue' : ''}" style="background: #FFFFFF;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1;">
                      <input
                        type="checkbox"
                        ${act.completed ? 'checked' : ''}
                        onchange="window.app.toggleAction('${comp.id}', '${act.id}')"
                      />
                      <span>${act.title}</span>
                    </label>
                    <div style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                      <span class="badge badge-neutral" style="background: #FFFFFF;">${act.owner || 'Ekip'}</span>
                      <span class="badge ${isOverdue ? 'badge-redflag' : 'badge-neutral'}" style="background: #FFFFFF;">
                        📅 ${act.due_date || '-'}
                      </span>
                      <button
                        class="btn btn-outline btn-sm"
                        style="padding: 2px 6px; font-size: 0.7rem; background: #FFFFFF;"
                        onclick="window.app.deleteAction('${comp.id}', '${act.id}')"
                      >✕</button>
                    </div>
                  </div>
                `;
              })
              .join('')
      }
    `;

    // 4) TEKLİFLER, TOPLANTI NOTLARI & DOSYALAR (TIMELINE)
    const hoverTimelineHtml =
      timeline.length === 0
        ? `<div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 0.82rem;">Henüz kayıt yok.</div>`
        : timeline
            .slice(0, 5)
            .map((item) => {
              const meta = TIMELINE_TYPES[item.type] || { label: 'Kayıt', badge: 'badge-neutral' };
              return `
                <div class="dash-widget-item" style="background: #FFFFFF;" onclick="window.app.setExpandedRoomWidget('timeline')">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                    <span class="badge ${meta.badge}" style="background: #FFFFFF;">${meta.label}</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted);">${item.created_at || ''}</span>
                  </div>
                  <div style="font-size: 0.82rem; font-weight: 700; color: #0D1B3E;">${item.title}</div>
                  ${item.file_name ? `<div style="font-size: 0.73rem; color: var(--text-muted); margin-top: 2px;">📎 ${item.file_name}</div>` : ''}
                </div>
              `;
            })
            .join('');

    const statusBannerHtml = this.uploadStatusMessage
      ? `<div style="margin-bottom: 12px; padding: 12px 16px; border-radius: 12px; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; justify-content: space-between; gap: 10px; ${
          this.uploadStatusType === 'error'
            ? 'background: #FFFBEB; border: 1.5px solid #F59E0B; color: #92400E;'
            : this.uploadStatusType === 'loading'
            ? 'background: #EFF6FF; border: 1.5px solid #3B82F6; color: #1E40AF;'
            : 'background: #ECFDF5; border: 1.5px solid #10B981; color: #065F46;'
        }">
          <span>${this.uploadStatusMessage}</span>
          <button type="button" class="btn btn-outline btn-sm" style="background: #FFFFFF; padding: 2px 8px; font-size: 0.74rem;" onclick="window.app.uploadStatusMessage = null; window.app.render();">Tamam</button>
        </div>`
      : '';

    const fullTimelineHtml = `
      ${statusBannerHtml}
      <div class="dropzone-box" id="roomDropzone" style="background: #FFFFFF;" onclick="window.app.openTimelineModal('${comp.id}')">
        <div style="font-size: 1.3rem; margin-bottom: 4px;">📥</div>
        <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">
          Apple Mail'den Doğrudan Sürükleyin, <code>Cmd+V</code> ile Yapıştırın veya Doküman (PDF, Word, Excel) Bırakın
        </div>
        <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px; margin-bottom: 10px;">
          Masaüstüne kaydetmeye gerek olmadan doğrudan Apple Mail'den sürükleyebilir veya aşağıdaki tek tık butonlarını kullanabilirsiniz:
        </div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;" onclick="event.stopPropagation()">
          <button
            type="button"
            class="btn btn-outline btn-sm"
            style="background: #FFFFFF; border-color: #16B5EA; color: #0D1B3E; font-weight: 700;"
            onclick="window.app.fetchEmailsFromAppleMailBridge('${comp.id}')"
          >
            📩 Apple Mail'de Seçili Mailleri Tek Tıkla Çek
          </button>
          <button
            type="button"
            class="btn btn-outline btn-sm"
            style="background: #FFFFFF; font-weight: 700;"
            onclick="window.app.pasteEmailFromClipboard('${comp.id}')"
          >
            📋 Panodaki (Kopyalanan) Maili Anında Kaydet
          </button>
          <button
            type="button"
            class="btn btn-outline btn-sm"
            style="background: #FFFFFF;"
            onclick="window.app.openTimelineModal('${comp.id}')"
          >
            ➕ Form Aç (Not + Dosya)
          </button>
        </div>
      </div>

      <div class="timeline-filter-tabs">
        <button class="filter-tab ${this.timelineFilter === 'ALL' ? 'active' : ''}" style="background: #FFFFFF; color: #0D1B3E;" onclick="window.app.setTimelineFilter('ALL')">
          Tümü (${timeline.length})
        </button>
        <button class="filter-tab ${this.timelineFilter === 'meeting_note' ? 'active' : ''}" style="background: #FFFFFF; color: #0D1B3E;" onclick="window.app.setTimelineFilter('meeting_note')">
          📝 Toplantı Notları
        </button>
        <button class="filter-tab ${this.timelineFilter === 'email' ? 'active' : ''}" style="background: #FFFFFF; color: #0D1B3E;" onclick="window.app.setTimelineFilter('email')">
          📩 Emailler
        </button>
        <button class="filter-tab ${this.timelineFilter === 'proposal_revision' ? 'active' : ''}" style="background: #FFFFFF; color: #0D1B3E;" onclick="window.app.setTimelineFilter('proposal_revision')">
          💰 Teklifler &amp; Revizyonlar
        </button>
        <button class="filter-tab ${this.timelineFilter === 'document_contract' ? 'active' : ''}" style="background: #FFFFFF; color: #0D1B3E;" onclick="window.app.setTimelineFilter('document_contract')">
          📄 Doküman &amp; Sözleşmeler
        </button>
      </div>

      <div class="timeline-feed" style="max-height: none;">
        ${this.renderTimelineFeedHtml(comp)}
      </div>
    `;

    // 5) RAKİPLER İÇERİĞİ (HOVER CARD & EXPAND MODU)
    const renderCompetitorsHtml = (showForm = true) => `
      ${
        showForm
          ? `
        <form onsubmit="window.app.handleAddCompetitor(event, '${comp.id}')" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; padding: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
          <input
            type="text"
            id="newCompetitorName"
            class="input-field"
            style="background: #FFFFFF;"
            required
            placeholder="Rakip Firma / Ürün Adı *"
          />
          <input
            type="text"
            id="newCompetitorStatus"
            class="input-field"
            style="background: #FFFFFF;"
            placeholder="Durum (Örn: Teklif Verdi, Eleniyor, İç Ekip)"
          />
          <input
            type="text"
            id="newCompetitorNote"
            class="input-field"
            style="grid-column: span 2; background: #FFFFFF;"
            placeholder="Rekabet Notu / Güçlü-Zayıf Yönü / Bizim Avantajımız..."
          />
          <div style="grid-column: span 2; display: flex; justify-content: flex-end;">
            <button type="submit" class="btn btn-outline btn-sm" style="background: #FFFFFF; font-weight: 700;">
              ⚔️ + Rakip Kaydet
            </button>
          </div>
        </form>
      `
          : ''
      }
      ${
        competitors.length === 0
          ? `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.82rem;">Henüz rakip bilgisi eklenmedi.</div>`
          : competitors
              .map(
                (rk) => `
              <div class="dash-widget-item" style="background: #FFFFFF;" onclick="window.app.setExpandedRoomWidget('competitors')">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <strong style="font-size: 0.88rem; color: #0D1B3E;">⚔️ ${rk.name}</strong>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    ${rk.status ? `<span class="badge badge-neutral" style="background: #FFFFFF;">${rk.status}</span>` : ''}
                    ${
                      showForm
                        ? `<button type="button" class="btn btn-outline btn-sm" style="padding: 2px 6px; font-size: 0.7rem; background:#FFFFFF;" onclick="event.stopPropagation(); window.app.deleteCompetitor('${comp.id}', '${rk.id}')">✕</button>`
                        : ''
                    }
                  </div>
                </div>
                ${rk.note ? `<div style="font-size: 0.79rem; color: var(--text-secondary);">${rk.note}</div>` : ''}
              </div>
            `
              )
              .join('')
      }
    `;

    // 6) TESLİMATLAR, FATURA KESİMİ & ÖDEME TAKİBİ İÇERİĞİ
    const deliveries = comp.deliveries || [];
    const renderDeliveriesHtml = (showForm = true) => `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin-bottom: 12px; padding: 10px; background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 10px;">
        <div>
          <label style="font-size: 0.72rem; color: #0369A1; font-weight: 700; display: block;">📜 Sözleşme Durumu</label>
          <select
            class="select-field"
            style="width: 100%; background: #FFFFFF; font-size: 0.78rem; padding: 4px 8px; margin-top: 2px;"
            onchange="window.app.updateCompanyContractAndDatesInline('${comp.id}', 'contract_status', this.value)"
          >
            <option value="" ${!comp.contract_status ? 'selected' : ''}>Henüz Yok</option>
            <option value="Sözleşme Draft" ${comp.contract_status === 'Sözleşme Draft' ? 'selected' : ''}>📝 Sözleşme Draft</option>
            <option value="Final Sözleşme" ${comp.contract_status === 'Final Sözleşme' ? 'selected' : ''}>📜 Final Sözleşme</option>
          </select>
        </div>
        <div>
          <label style="font-size: 0.72rem; color: #0369A1; font-weight: 700; display: block;">📅 Fatura Kesim Tarihi</label>
          <input
            type="date"
            class="input-field"
            style="width: 100%; background: #FFFFFF; font-size: 0.78rem; padding: 4px 8px; margin-top: 2px;"
            value="${comp.expected_invoice_date || ''}"
            onchange="window.app.updateCompanyContractAndDatesInline('${comp.id}', 'expected_invoice_date', this.value)"
          />
        </div>
        <div>
          <label style="font-size: 0.72rem; color: #0369A1; font-weight: 700; display: block;">💳 Ödeme Günü</label>
          <input
            type="date"
            class="input-field"
            style="width: 100%; background: #FFFFFF; font-size: 0.78rem; padding: 4px 8px; margin-top: 2px;"
            value="${comp.payment_date || ''}"
            onchange="window.app.updateCompanyContractAndDatesInline('${comp.id}', 'payment_date', this.value)"
          />
        </div>
        <div>
          <label style="font-size: 0.72rem; color: #0369A1; font-weight: 700; display: block;">🚀 Proje Teslimat Tarihi</label>
          <input
            type="date"
            class="input-field"
            style="width: 100%; background: #FFFFFF; font-size: 0.78rem; padding: 4px 8px; margin-top: 2px;"
            value="${comp.delivery_date || ''}"
            onchange="window.app.updateCompanyContractAndDatesInline('${comp.id}', 'delivery_date', this.value)"
          />
        </div>
      </div>
      ${
        showForm
          ? `
        <form onsubmit="window.app.handleAddDelivery(event, '${comp.id}')" style="display: grid; grid-template-columns: 1.5fr 1fr 1fr auto; gap: 6px; margin-bottom: 12px; padding: 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; align-items: center;">
          <input
            type="text"
            id="newDeliveryTitle"
            class="input-field"
            style="background: #FFFFFF; font-size: 0.8rem;"
            required
            placeholder="Proje Teslimatı / Ödeme / Fatura Kalemi *"
          />
          <input
            type="date"
            id="newDeliveryDate"
            class="input-field"
            style="background: #FFFFFF; font-size: 0.8rem;"
            required
          />
          <input
            type="text"
            id="newDeliveryAmount"
            class="input-field"
            style="background: #FFFFFF; font-size: 0.8rem;"
            placeholder="Tutar / Not (Örn: $25,000 - 1. Faz)"
          />
          <button type="submit" class="btn btn-outline btn-sm" style="background: #FFFFFF; font-weight: 700;">
            + Ekle
          </button>
        </form>
      `
          : ''
      }
      ${
        deliveries.length === 0
          ? `<div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 0.82rem;">Henüz alt teslimat / ödeme fazı girilmedi.</div>`
          : deliveries
              .map(
                (dlv) => `
              <div class="action-item ${dlv.completed ? 'done' : ''}" style="background: #FFFFFF; margin-bottom: 6px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1;">
                  <input
                    type="checkbox"
                    ${dlv.completed ? 'checked' : ''}
                    onchange="window.app.toggleDeliveryItem('${comp.id}', '${dlv.id}')"
                  />
                  <span><strong>${dlv.title}</strong> ${dlv.amount ? `<span class="badge badge-yapra" style="background:#FFFFFF;">${dlv.amount}</span>` : ''}</span>
                </label>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="badge badge-neutral" style="background: #FFFFFF;">📅 ${dlv.due_date || '-'}</span>
                  <button
                    type="button"
                    class="btn btn-outline btn-sm"
                    style="padding: 2px 6px; font-size: 0.7rem; color: #DC2626; background: #FFFFFF;"
                    onclick="event.stopPropagation(); window.app.deleteDeliveryItem('${comp.id}', '${dlv.id}')"
                    title="Çöp Kutusu'na Taşı"
                  >🗑️</button>
                </div>
              </div>
            `
              )
              .join('')
      }
    `;

    // EĞER BİR KUTU EXPAND EDİLDİYSE ARKASI BLUR OLAN VE EKRANDA SABİT KALAN MODAL
    let expandedRoomModalHtml = '';
    if (this.expandedRoomWidget) {
      let mTitle = '';
      let mActions = '';
      let mBody = '';

      if (this.expandedRoomWidget === 'buyers') {
        mTitle = `👥 Alıcılar (6 Buyer Role) & Win Analizi (${buyers.length})`;
        mActions = `
          <button type="button" class="btn btn-outline btn-sm" style="background:#FFFFFF;" onclick="window.app.openBuyerModal('${comp.id}')">
            ➕ Alıcı (Buyer) &amp; Win Ekle
          </button>
        `;
        mBody = fullBuyersHtml;
      } else if (this.expandedRoomWidget === 'redflags') {
        mTitle = `🚩 Red Flag Uyarıları (${redFlags.length}) & Eksik Bilgiler (${missingInfo.length})`;
        mActions = `
          <button type="button" class="btn btn-outline btn-sm" style="background:#FFFFFF;" onclick="window.app.promptManualRedFlag('${comp.id}')">
            🚩 + Manuel Red Flag Ekle
          </button>
        `;
        mBody = renderRedFlagsAndMissingHtml();
      } else if (this.expandedRoomWidget === 'actions') {
        mTitle = `⚡ Toplantı Sonrası Aksiyonlar (${actions.length})`;
        mBody = renderActionsHtml(true);
      } else if (this.expandedRoomWidget === 'timeline') {
        mTitle = `📂 Teklifler, Toplantı Notları & Dosyalar (${timeline.length})`;
        mActions = `
          <button type="button" class="btn btn-outline btn-sm" style="background:#FFFFFF;" onclick="window.app.openTimelineModal('${comp.id}')">
            ➕ Email / Toplantı Notu / Teklif Ekle
          </button>
        `;
        mBody = fullTimelineHtml;
      } else if (this.expandedRoomWidget === 'competitors') {
        mTitle = `⚔️ Rakipler & Rekabet Analizi (${competitors.length})`;
        mBody = renderCompetitorsHtml(true);
      } else if (this.expandedRoomWidget === 'deliveries') {
        mTitle = `📦 Sözleşme, Fatura Kesimi, Ödeme Günü & Proje Teslimatları (${deliveries.length})`;
        mBody = renderDeliveriesHtml(true);
      }

      expandedRoomModalHtml = `
        <div class="dash-expanded-backdrop" onclick="if(event.target === this) window.app.setExpandedRoomWidget(null)">
          <div class="dash-expanded-modal" style="width: 860px;">
            <div class="dash-expanded-header">
              <strong style="font-size: 1.08rem; color: #0D1B3E;">${mTitle}</strong>
              <div style="display: flex; align-items: center; gap: 8px;">
                ${mActions}
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  style="background: #FFFFFF;"
                  onclick="window.app.setExpandedRoomWidget(null)"
                >
                  ✕ Küçült / Kapat
                </button>
              </div>
            </div>
            <div class="dash-expanded-body">
              ${mBody}
            </div>
          </div>
        </div>
      `;
    }

    return `
      <section class="dashboard-bottom-3-grid" style="margin-top: 24px;">
        <!-- 1. HOVER CARD PILL: ALICILAR & WIN'LER -->
        <div class="dash-widget-wrapper" onclick="this.classList.toggle('hover-open')">
          <button type="button" class="dash-slim-pill-btn">
            <span>👥 Alıcılar &amp; Win'ler</span>
            <span class="funnel-pill-count">${buyers.length}</span>
          </button>

          <div class="dash-hover-body" style="width: 420px;" onclick="event.stopPropagation()">
            <div class="dash-hover-card-top">
              <strong style="font-size: 0.85rem; color: #0D1B3E;">👥 Alıcılar &amp; Win'ler (${buyers.length})</strong>
              <div style="display: flex; gap: 6px;">
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  style="padding: 4px 10px; font-size: 0.74rem; background: #FFFFFF;"
                  onclick="window.app.openBuyerModal('${comp.id}')"
                >
                  ➕ Alıcı Ekle
                </button>
                <button
                  type="button"
                  class="dash-expand-btn"
                  onclick="window.app.setExpandedRoomWidget('buyers')"
                >
                  ⤢ Expand
                </button>
              </div>
            </div>
            <div style="max-height: 280px; overflow-y: auto;">
              ${hoverBuyersHtml}
            </div>
          </div>
        </div>

        <!-- 2. HOVER CARD PILL: RED FLAG & EKSİK BİLGİLER -->
        <div class="dash-widget-wrapper" onclick="this.classList.toggle('hover-open')">
          <button type="button" class="dash-slim-pill-btn">
            <span>🚩 Red Flag &amp; Eksik Bilgiler</span>
            <span class="funnel-pill-count" style="color: #DC2626; border-color: #FCA5A5;">${redFlags.length + missingInfo.length}</span>
          </button>

          <div class="dash-hover-body" style="width: 420px;" onclick="event.stopPropagation()">
            <div class="dash-hover-card-top">
              <strong style="font-size: 0.85rem; color: #0D1B3E;">🚩 Red Flag (${redFlags.length}) &amp; Eksik (${missingInfo.length})</strong>
              <div style="display: flex; gap: 6px;">
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  style="padding: 4px 10px; font-size: 0.74rem; background: #FFFFFF;"
                  onclick="window.app.promptManualRedFlag('${comp.id}')"
                >
                  + Manuel Flag
                </button>
                <button
                  type="button"
                  class="dash-expand-btn"
                  onclick="window.app.setExpandedRoomWidget('redflags')"
                >
                  ⤢ Expand
                </button>
              </div>
            </div>
            <div style="max-height: 280px; overflow-y: auto;">
              ${renderRedFlagsAndMissingHtml()}
            </div>
          </div>
        </div>

        <!-- 3. HOVER CARD PILL: TOPLANTI SONRASI AKSİYONLAR -->
        <div class="dash-widget-wrapper" onclick="this.classList.toggle('hover-open')">
          <button type="button" class="dash-slim-pill-btn">
            <span>⚡ Toplantı Sonrası Aksiyonlar</span>
            <span class="funnel-pill-count" style="color: #D97706; border-color: #FCD34D;">${actions.filter((a) => !a.completed).length}</span>
          </button>

          <div class="dash-hover-body" style="width: 420px;" onclick="event.stopPropagation()">
            <div class="dash-hover-card-top">
              <strong style="font-size: 0.85rem; color: #0D1B3E;">⚡ Açık Aksiyonlar (${actions.filter((a) => !a.completed).length})</strong>
              <button
                type="button"
                class="dash-expand-btn"
                onclick="window.app.setExpandedRoomWidget('actions')"
              >
                ⤢ Expand
              </button>
            </div>
            <div style="max-height: 280px; overflow-y: auto;">
              ${renderActionsHtml(false)}
            </div>
          </div>
        </div>

        <!-- 4. HOVER CARD PILL: TEKLİFLER, TOPLANTI NOTLARI & DOSYALAR -->
        <div class="dash-widget-wrapper" onclick="this.classList.toggle('hover-open')">
          <button type="button" class="dash-slim-pill-btn">
            <span>📂 Teklifler, Notlar &amp; Dosyalar</span>
            <span class="funnel-pill-count" style="color: #0284C7; border-color: #7DD3FC;">${timeline.length}</span>
          </button>

          <div class="dash-hover-body" style="width: 420px;" onclick="event.stopPropagation()">
            <div class="dash-hover-card-top">
              <strong style="font-size: 0.85rem; color: #0D1B3E;">📂 Son 5 Kayıt / Teklif (Toplam: ${timeline.length})</strong>
              <div style="display: flex; gap: 6px;">
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  style="padding: 4px 10px; font-size: 0.74rem; background: #FFFFFF;"
                  onclick="window.app.openTimelineModal('${comp.id}')"
                >
                  ➕ Ekle
                </button>
                <button
                  type="button"
                  class="dash-expand-btn"
                  onclick="window.app.setExpandedRoomWidget('timeline')"
                >
                  ⤢ Expand
                </button>
              </div>
            </div>
            <div style="max-height: 280px; overflow-y: auto;">
              ${hoverTimelineHtml}
            </div>
          </div>
        </div>

        <!-- 5. HOVER CARD PILL: RAKİPLER (SS2 YANINA EKLENDİ) -->
        <div class="dash-widget-wrapper" onclick="this.classList.toggle('hover-open')">
          <button type="button" class="dash-slim-pill-btn">
            <span>⚔️ Rakipler</span>
            <span class="funnel-pill-count" style="color: #7C3AED; border-color: #DDD6FE;">${competitors.length}</span>
          </button>

          <div class="dash-hover-body" style="width: 420px;" onclick="event.stopPropagation()">
            <div class="dash-hover-card-top">
              <strong style="font-size: 0.85rem; color: #0D1B3E;">⚔️ Rakipler &amp; Rekabet (${competitors.length})</strong>
              <button
                type="button"
                class="dash-expand-btn"
                onclick="window.app.setExpandedRoomWidget('competitors')"
              >
                ⤢ Expand (+ Ekle)
              </button>
            </div>
            <div style="max-height: 280px; overflow-y: auto;">
              ${renderCompetitorsHtml(false)}
            </div>
          </div>
        </div>

        <!-- 6. HOVER CARD PILL: TESLİMAT, FATURA & ÖDEME TAKİBİ -->
        <div class="dash-widget-wrapper" onclick="this.classList.toggle('hover-open')">
          <button type="button" class="dash-slim-pill-btn">
            <span>📦 Teslimat, Fatura &amp; Ödeme</span>
            <span class="funnel-pill-count" style="color: #059669; border-color: #A7F3D0;">${deliveries.length}</span>
          </button>

          <div class="dash-hover-body" style="width: 440px;" onclick="event.stopPropagation()">
            <div class="dash-hover-card-top">
              <strong style="font-size: 0.85rem; color: #0D1B3E;">📦 Sözleşme, Fatura, Ödeme &amp; Teslimat (${deliveries.length})</strong>
              <button
                type="button"
                class="dash-expand-btn"
                onclick="window.app.setExpandedRoomWidget('deliveries')"
              >
                ⤢ Expand (+ Ekle)
              </button>
            </div>
            <div style="max-height: 280px; overflow-y: auto;">
              ${renderDeliveriesHtml(false)}
            </div>
          </div>
        </div>
      </section>
      ${expandedRoomModalHtml}
    `;
  }

  async handleAddCompetitor(e, compId) {
    e.preventDefault();
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    const name = (document.getElementById('newCompetitorName')?.value || '').trim();
    const status = (document.getElementById('newCompetitorStatus')?.value || '').trim();
    const note = (document.getElementById('newCompetitorNote')?.value || '').trim();
    if (!name) return;

    comp.competitors = comp.competitors || [];
    comp.competitors.unshift({
      id: 'comp-' + Date.now(),
      name,
      status,
      note
    });
    await this.persistDatabase();
    this.render();
  }

  async deleteCompetitor(compId, rkId) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    const target = (comp.competitors || []).find((r) => r.id === rkId);
    if (!target) return;
    comp.competitors = (comp.competitors || []).filter((r) => r.id !== rkId);
    await this.moveToTrash({
      item_type: 'competitor',
      item_title: `⚔️ Rakip: ${target.name}`,
      company_id: comp.id,
      company_name: comp.name,
      payload: target
    });
    this.render();
  }

  // ÜRÜNLER, SÖZLEŞME, FATURA, ÖDEME & PROJE TESLİMATI METOTLARI
  async toggleCompanyProductInline(compId, prodName) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    comp.products = Array.isArray(comp.products) ? comp.products : [comp.brand || 'Yapra.ai'];
    if (comp.products.includes(prodName)) {
      comp.products = comp.products.filter((p) => p !== prodName);
    } else {
      comp.products.push(prodName);
    }
    await this.persistDatabase();
    this.render();
  }

  async promptAddCustomProductCategory(compId) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    const raw = prompt('Eklenecek yeni ürün / kategori adını girin (Örn: Özel Entegrasyon, Eğitim, Lisans):');
    if (!raw || !raw.trim()) return;
    const prod = raw.trim();
    comp.products = Array.isArray(comp.products) ? comp.products : [comp.brand || 'Yapra.ai'];
    if (!comp.products.includes(prod)) {
      comp.products.push(prod);
    }
    await this.persistDatabase();
    this.render();
  }

  async updateCompanyContractAndDatesInline(compId, field, value) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    comp[field] = value || '';
    if (field === 'contract_status' && value === 'signed' && comp.stage < 9) {
      comp.stage = 9;
    } else if (field === 'contract_status' && (value === 'final' || value === 'draft') && comp.stage < 8) {
      comp.stage = 8;
    }
    await this.persistDatabase();
    this.render();
  }

  async handleAddDelivery(e, compId) {
    e.preventDefault();
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    const title = (document.getElementById('newDeliveryTitle')?.value || '').trim();
    const date = (document.getElementById('newDeliveryDate')?.value || '').trim();
    const owner = (document.getElementById('newDeliveryOwner')?.value || '').trim();
    if (!title) return;
    comp.deliveries = Array.isArray(comp.deliveries) ? comp.deliveries : [];
    comp.deliveries.unshift({
      id: 'deliv-' + Date.now(),
      title,
      date,
      owner: owner || (this.currentSeller ? this.currentSeller.name : 'Proje Ekibi'),
      completed: false
    });
    await this.persistDatabase();
    this.render();
  }

  async toggleDeliveryItem(compId, delivId) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    const d = (comp.deliveries || []).find((x) => x.id === delivId);
    if (!d) return;
    d.completed = !d.completed;
    await this.persistDatabase();
    this.render();
  }

  async deleteDeliveryItem(compId, delivId) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    const target = (comp.deliveries || []).find((x) => x.id === delivId);
    if (!target) return;
    comp.deliveries = (comp.deliveries || []).filter((x) => x.id !== delivId);
    await this.moveToTrash({
      item_type: 'delivery',
      item_title: `📦 Teslimat: ${target.title}`,
      company_id: comp.id,
      company_name: comp.name,
      payload: target
    });
    this.render();
  }

  renderBuyerCardHtml(compId, b, stage) {
    const isBlocker = b.role === 'Engelleyici';
    const isDecision = b.role === 'Karar Verici';
    const isChampion = b.role === 'Şampiyon';
    const roleClass = isBlocker ? 'blocker-role' : isDecision ? 'decision-role' : isChampion ? 'champion-role' : '';
    const hasStageWarning = Number(stage || 1) >= 6 && b.win_status === 'potential';
    const isDropdownOpen = this.openInlineWinBuyerId === b.id;

    return `
      <div class="buyer-card ${roleClass}">
        <div class="buyer-top">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <strong style="font-size: 1rem; color: #0D1B3E;">👤 ${b.name}</strong>

              <!-- Alıcı Rolü Dropdown -->
              <select
                class="select-field"
                style="padding: 3px 10px; font-size: 0.78rem; font-weight: 700; border-radius: 999px; background: #FFFFFF;"
                onchange="window.app.updateBuyerRoleInline('${compId}', '${b.id}', this.value)"
                title="Alıcı Rolünü Değiştir"
              >
                ${BUYER_ROLES_6.map(
                  (r) => `<option value="${r}" ${b.role === r ? 'selected' : ''}>${r}</option>`
                ).join('')}
              </select>

              <!-- Win Durumu Butonu -->
              <button
                class="badge ${b.win_status === 'created' ? 'badge-success' : 'badge-warning'}"
                style="cursor: pointer; background: #FFFFFF; border-width: 1.5px;"
                onclick="window.app.toggleBuyerWinStatus('${compId}', '${b.id}')"
              >
                ${b.win_status === 'created' ? '✅ Win Netleşti / Yaratıldı' : '⏳ Henüz Yaratılmadı (Potansiyel Win)'}
              </button>
            </div>

            <!-- Alıcı Bilgileri: Title, Email, Telefon -->
            <div class="buyer-contact-grid">
              <span class="buyer-info-pill">💼 <strong>Title:</strong> ${b.title || 'Belirtilmedi'}</span>
              <span class="buyer-info-pill">✉️ <strong>Email:</strong> ${b.email || 'Girilmedi'}</span>
              <span class="buyer-info-pill">📞 <strong>Tel:</strong> ${b.phone || 'Girilmedi'}</span>
            </div>
          </div>

          <div style="display: flex; gap: 6px;">
            <button class="btn btn-outline btn-sm" onclick="window.app.openBuyerModal('${compId}', '${b.id}')">✏️ Bilgileri Düzenle</button>
            <button class="btn btn-outline btn-sm" style="color: #DC2626; border-color: #FECACA;" title="Çöp Kutusu'na Taşı" onclick="window.app.deleteBuyer('${compId}', '${b.id}')">🗑️ Sil</button>
          </div>
        </div>

        ${
          hasStageWarning
            ? `<div style="font-size: 0.78rem; color: var(--danger-color); background: var(--danger-bg); padding: 6px 10px; border-radius: 6px; margin-bottom: 8px; font-weight: 600;">
                🚩 Teklif aşamasına geçildi ancak bu alıcının Win durumu hâlâ "Potansiyel Win"!
              </div>`
            : ''
        }

        <!-- WIN DROPDOWN MENÜSÜ + ELLE ÖZEL WIN EKLEME OPSİYONU -->
        <div class="inline-win-dropdown-wrapper" style="margin-bottom: 10px;">
          <button
            type="button"
            class="win-dropdown-trigger-btn"
            onclick="window.app.toggleInlineWinDropdown('${b.id}', event)"
          >
            <span>🎯 Win Seçin veya Elle Özel Win Ekleyin (${(b.wins || []).length + (b.custom_win ? 1 : 0)} Seçili)</span>
            <span>${isDropdownOpen ? '▴ Kapat' : '▾ Menü'}</span>
          </button>

          ${
            isDropdownOpen
              ? `
            <div class="win-dropdown-menu" onclick="event.stopPropagation()">
              <div style="padding: 8px 12px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; font-size: 0.76rem; font-weight: 700; color: #334155; display: flex; justify-content: space-between; align-items: center;">
                <span>14 Standart Win (Tıklayarak Ekleyin/Çıkarın)</span>
                <button type="button" class="btn btn-outline btn-sm" style="padding: 2px 8px; font-size: 0.72rem;" onclick="window.app.toggleInlineWinDropdown(null, event)">Kapat ✓</button>
              </div>
              <div class="win-dropdown-options-list">
                ${STANDARD_WINS_14.map((w) => {
                  const isChecked = (b.wins || []).includes(w);
                  const safeW = w.replace(/'/g, "\\'");
                  return `
                    <label class="win-dropdown-option-row">
                      <input
                        type="checkbox"
                        ${isChecked ? 'checked' : ''}
                        onchange="window.app.toggleBuyerStandardWinInline('${compId}', '${b.id}', '${safeW}')"
                      />
                      <span>${w}</span>
                    </label>
                  `;
                }).join('')}
              </div>

              <!-- ELLE EKLENMESİ İSTENEN ÖZEL WIN ALANI -->
              <div style="padding: 10px 12px; border-top: 1px solid #E2E8F0; background: #F0F9FF;">
                <div style="font-size: 0.76rem; font-weight: 700; color: #0369A1; margin-bottom: 6px;">
                  ✍️ + Elle Özel Win Ekle:
                </div>
                <div style="display: flex; gap: 6px;">
                  <input
                    type="text"
                    id="inlineCustomWin_${b.id}"
                    class="input-field"
                    style="flex: 1; background: #FFFFFF; padding: 6px 10px; font-size: 0.8rem;"
                    placeholder="Örn: Holding inovasyon ödülüne aday olmak..."
                    value=""
                    onkeydown="if(event.key==='Enter'){event.preventDefault(); window.app.saveBuyerCustomWinInline('${compId}', '${b.id}');}"
                  />
                  <button
                    type="button"
                    class="btn btn-outline btn-sm"
                    style="background: #FFFFFF; font-weight: 700; color: #0369A1; border-color: #38BDF8;"
                    onclick="window.app.saveBuyerCustomWinInline('${compId}', '${b.id}')"
                  >
                    ✓ Kaydet
                  </button>
                </div>
              </div>
            </div>
          `
              : ''
          }
        </div>

        <!-- Seçilmiş Win Etiketleri -->
        <div class="buyer-wins-list">
          ${(b.wins || [])
            .map((w) => {
              const safeW = w.replace(/'/g, "\\'");
              return `
                <span class="win-chip" style="background: #FFFFFF; display: inline-flex; align-items: center; gap: 5px;">
                  🎯 ${w}
                  <span
                    style="cursor: pointer; color: #94A3B8; font-weight: 800; margin-left: 2px;"
                    title="Bu Win'i kaldır"
                    onclick="window.app.toggleBuyerStandardWinInline('${compId}', '${b.id}', '${safeW}')"
                  >×</span>
                </span>
              `;
            })
            .join('')}
          ${
            b.custom_win
              ? `
            <span class="win-chip custom" style="background: #FFFFFF; display: inline-flex; align-items: center; gap: 5px;">
              ✨ Özel Win: ${b.custom_win}
              <span
                style="cursor: pointer; color: #94A3B8; font-weight: 800; margin-left: 2px;"
                title="Özel Win'i kaldır"
                onclick="window.app.clearBuyerCustomWinInline('${compId}', '${b.id}')"
              >×</span>
            </span>
          `
              : ''
          }
        </div>
      </div>
    `;
  }

  renderTimelineFeedHtml(comp) {
    const allItems = comp.timeline || [];
    const filtered = allItems.filter((item) => {
      if (this.timelineFilter === 'ALL') return true;
      if (this.timelineFilter === 'proposal_revision') return item.type === 'proposal' || item.type === 'revision';
      if (this.timelineFilter === 'document_contract')
        return item.type === 'document' || item.type === 'contract' || item.type === 'contract_draft';
      return item.type === this.timelineFilter;
    });

    if (filtered.length === 0) {
      return `<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.84rem; border: 1px dashed var(--border-light); border-radius: 8px;">Bu filtrede kayıt bulunmuyor.</div>`;
    }

    return filtered
      .map((item) => {
        const meta = TIMELINE_TYPES[item.type] || { label: 'Kayıt', badge: 'badge-neutral' };
        const cleanTitle = (item.title || '').replace(/^📩\s*/, '').trim();
        const cleanContent = (item.content || '').trim();
        const isOnlySubject = !cleanContent || cleanContent === cleanTitle || cleanContent === item.title;

        return `
          <div class="timeline-card">
            <div class="timeline-card-header">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span class="badge ${meta.badge}">${meta.label}</span>
                <strong style="font-size: 0.9rem;">${item.title}</strong>
                ${item.amount ? `<span class="badge badge-yapra">${item.amount}</span>` : ''}
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 0.74rem; color: var(--text-muted); margin-right: 4px;">${item.created_at || ''}</span>
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  style="padding: 2px 8px; font-size: 0.72rem; background: #FFFFFF;"
                  onclick="window.app.openEditTimelineEntry('${comp.id}', '${item.id}')"
                  title="Bu kaydın içeriğini düzenle veya metin yapıştır"
                >
                  ✏️ Düzenle
                </button>
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  style="padding: 2px 8px; font-size: 0.72rem; color: #DC2626; border-color: #FECACA; background: #FFFFFF;"
                  onclick="window.app.deleteTimelineEntry('${comp.id}', '${item.id}')"
                  title="Bu kaydı sil"
                >
                  🗑️ Sil
                </button>
              </div>
            </div>
            ${
              item.type === 'email' && isOnlySubject
                ? `<div style="margin-top: 8px; padding: 10px 12px; background: #FFFBEB; border: 1px dashed #F59E0B; border-radius: 8px; font-size: 0.8rem; color: #92400E; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                    <span>⚠️ <strong>Sol listeden sürüklendiği için Apple Mail yalnızca mail başlığını iletti.</strong> Mailin içindeki metni kopyalayıp (<code>Cmd+C</code>) sağdaki butona tıklayarak içeriği ekleyebilirsiniz:</span>
                    <button
                      type="button"
                      class="btn btn-outline btn-sm"
                      style="background: #FFFFFF; border-color: #F59E0B; color: #92400E; font-weight: 700;"
                      onclick="window.app.pasteBodyIntoTimelineItem('${comp.id}', '${item.id}')"
                    >
                      📋 Kopyalanan Mail İçeriğini Buraya Yapıştır
                    </button>
                  </div>`
                : item.content
                ? `<div style="font-size: 0.84rem; color: var(--text-secondary); white-space: pre-line; margin-top: 8px; padding: 10px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; max-height: 260px; overflow-y: auto;">${item.content}</div>`
                : ''
            }
            ${
              item.file_name
                ? `<div style="margin-top: 8px; display: inline-flex; align-items: center; gap: 8px; padding: 5px 10px; background: var(--bg-page); border: 1px solid var(--border-light); border-radius: 6px; font-size: 0.78rem;">
                    <span>📎 <strong>${item.file_name}</strong> ${item.file_size ? `(${item.file_size})` : ''}</span>
                    ${item.file_url ? `<a href="${item.file_url}" target="_blank" style="color: var(--accent-primary); font-weight: 600;">İndir / Aç</a>` : ''}
                  </div>`
                : ''
            }
          </div>
        `;
      })
      .join('');
  }

  setBrandFilter(brand) {
    this.brandFilter = brand;
    this.render();
  }

  toggleGroupByHolding() {
    this.groupByHolding = !this.groupByHolding;
    this.render();
  }

  setTimelineFilter(filter) {
    this.timelineFilter = filter;
    this.render();
  }

  async quickMoveFunnel(compId, targetFunnel) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    comp.funnel_status = targetFunnel;
    if (targetFunnel === 'Engaged' && comp.stage < 2) comp.stage = 2;
    comp.timeline = comp.timeline || [];
    comp.timeline.unshift({
      id: 't-' + Date.now(),
      type: 'meeting_note',
      title: `Müşteri tanımı "${targetFunnel}" olarak güncellendi`,
      content: '',
      created_at: new Date().toLocaleString('tr-TR').slice(0, 16)
    });
    await this.persistDatabase();
    this.render();
  }

  async changeCompanyFunnel(compId, targetFunnel) {
    await this.quickMoveFunnel(compId, targetFunnel);
  }

  async setCompanyStage(compId, stageNum) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    comp.stage = stageNum;
    this.autoEvaluateCompanyFunnel(comp);
    comp.timeline = comp.timeline || [];
    comp.timeline.unshift({
      id: 't-' + Date.now(),
      type: 'meeting_note',
      title: `Satış Seviyesi "${STAGES_9[stageNum - 1].short}" aşamasına ilerletildi`,
      content: '',
      created_at: new Date().toLocaleString('tr-TR').slice(0, 16)
    });
    await this.persistDatabase();
    this.render();
  }

  openBuyerModal(compId, buyerId = null, presetRole = null) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;

    const existing = buyerId ? (comp.buyers || []).find((b) => b.id === buyerId) : null;
    document.getElementById('buyerIdInput').value = existing ? existing.id : '';
    document.getElementById('buyerNameInput').value = existing ? existing.name : '';
    document.getElementById('buyerTitleInput').value = existing ? existing.title : '';
    document.getElementById('buyerRoleSelect').value = existing ? existing.role : presetRole || 'Karar Verici';
    document.getElementById('buyerEmailInput').value = existing ? existing.email || '' : '';
    document.getElementById('buyerPhoneInput').value = existing ? existing.phone || '' : '';
    document.getElementById('buyerCustomWinInput').value = existing ? existing.custom_win || '' : '';

    // Bu müşteri ve bağlı olduğu Holding altındaki tanıdığımız tüm kişileri dropdown'a doldur
    const existingContactSelect = document.getElementById('buyerExistingContactSelect');
    if (existingContactSelect) {
      const knownContacts = [];
      const addContactCandidate = (person, sourceLabel) => {
        if (!person || !person.name || !person.name.trim()) return;
        const key = `${person.name.trim().toLowerCase()}|${(person.email || '').trim().toLowerCase()}`;
        if (knownContacts.some((k) => k.key === key)) return;
        knownContacts.push({
          key,
          name: person.name.trim(),
          title: person.title || '',
          email: person.email || '',
          phone: person.phone || '',
          sourceLabel
        });
      };

      if (comp.contact_person && comp.contact_person.name) {
        addContactCandidate(comp.contact_person, `${comp.name} — İlk Contact`);
      }
      (comp.buyers || []).forEach((b) => addContactCandidate(b, `${comp.name} — Mevcut Alıcı`));

      if (comp.holding_id) {
        (this.db.companies || [])
          .filter((other) => other.holding_id === comp.holding_id && other.id !== comp.id)
          .forEach((sister) => {
            if (sister.contact_person && sister.contact_person.name) {
              addContactCandidate(sister.contact_person, `${sister.name} (${comp.holding_name})`);
            }
            (sister.buyers || []).forEach((sb) =>
              addContactCandidate(sb, `${sister.name} (${comp.holding_name})`)
            );
          });
      }

      this.knownBuyerCandidates = knownContacts;
      existingContactSelect.innerHTML = [
        `<option value="">-- Yeni Kişi Girin veya Tanıdığımız Kişilerden Seçin (${knownContacts.length} Kayıtlı Kişi) --</option>`,
        ...knownContacts.map(
          (c, idx) =>
            `<option value="${idx}">👤 ${c.name}${c.title ? ` (${c.title})` : ''} — [${c.sourceLabel}]</option>`
        )
      ].join('');
      existingContactSelect.value = '';
    }

    const statusRadios = document.querySelectorAll('input[name="buyerWinStatus"]');
    statusRadios.forEach((r) => {
      r.checked = r.value === (existing ? existing.win_status : 'potential');
    });

    const selectedWins = existing ? existing.wins || [] : [];
    const allOptions = Array.from(new Set([...STANDARD_WINS_14, ...selectedWins]));
    const container = document.getElementById('buyerWinsCheckboxContainer');
    container.innerHTML = allOptions.map((w) => {
      const checked = selectedWins.includes(w) ? 'checked' : '';
      return `
        <label class="win-dropdown-option-row">
          <input type="checkbox" name="buyerWinCheckbox" value="${w}" ${checked} onchange="window.app.updateModalWinSummary()" />
          <span>${w}</span>
        </label>
      `;
    }).join('');

    const menuEl = document.getElementById('modalWinDropdownMenu');
    if (menuEl) menuEl.style.display = 'none';
    this.updateModalWinSummary();

    this.openDialog('buyerDialog');
  }

  handlePickExistingContactForBuyer(idxStr) {
    if (idxStr === '' || idxStr === null || idxStr === undefined) return;
    const candidate = (this.knownBuyerCandidates || [])[Number(idxStr)];
    if (!candidate) return;
    const nameEl = document.getElementById('buyerNameInput');
    const titleEl = document.getElementById('buyerTitleInput');
    const emailEl = document.getElementById('buyerEmailInput');
    const phoneEl = document.getElementById('buyerPhoneInput');
    if (nameEl) nameEl.value = candidate.name || '';
    if (titleEl) titleEl.value = candidate.title || '';
    if (emailEl) emailEl.value = candidate.email || '';
    if (phoneEl) phoneEl.value = candidate.phone || '';
  }

  toggleModalWinDropdown(event) {
    if (event) event.stopPropagation();
    const menuEl = document.getElementById('modalWinDropdownMenu');
    if (!menuEl) return;
    menuEl.style.display = menuEl.style.display === 'none' ? 'block' : 'none';
  }

  closeModalWinDropdown() {
    const menuEl = document.getElementById('modalWinDropdownMenu');
    if (menuEl) menuEl.style.display = 'none';
  }

  updateModalWinSummary() {
    const checkedWins = Array.from(document.querySelectorAll('input[name="buyerWinCheckbox"]:checked')).map(
      (cb) => cb.value
    );
    const customWin = (document.getElementById('buyerCustomWinInput')?.value || '').trim();
    const totalCount = checkedWins.length + (customWin ? 1 : 0);

    const summaryEl = document.getElementById('modalWinDropdownSummary');
    if (summaryEl) {
      summaryEl.textContent =
        totalCount > 0
          ? `🎯 ${totalCount} Win Seçildi (Değiştirmek veya elle eklemek için tıklayın)`
          : '🎯 Win seçmek için tıklayın (14 Standart Win + Elle Ekleme)...';
    }

    const chipsEl = document.getElementById('modalSelectedWinsChips');
    if (chipsEl) {
      chipsEl.innerHTML = [
        ...checkedWins.map((w) => `<span class="win-chip" style="background:#FFFFFF;">🎯 ${w}</span>`),
        ...(customWin ? [`<span class="win-chip custom" style="background:#FFFFFF;">✨ Özel: ${customWin}</span>`] : [])
      ].join('');
    }
  }

  toggleInlineWinDropdown(buyerId, event) {
    if (event) event.stopPropagation();
    this.openInlineWinBuyerId = this.openInlineWinBuyerId === buyerId ? null : buyerId;
    this.render();
  }

  async updateBuyerRoleInline(compId, buyerId, newRole) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    const buyer = (comp.buyers || []).find((b) => b.id === buyerId);
    if (!buyer) return;
    buyer.role = newRole;
    await this.persistDatabase();
    this.render();
  }

  async toggleBuyerStandardWinInline(compId, buyerId, winText) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    const buyer = (comp.buyers || []).find((b) => b.id === buyerId);
    if (!buyer) return;
    buyer.wins = buyer.wins || [];
    if (buyer.wins.includes(winText)) {
      buyer.wins = buyer.wins.filter((w) => w !== winText);
    } else {
      buyer.wins.push(winText);
    }
    await this.persistDatabase();
    this.render();
  }

  async saveBuyerCustomWinInline(compId, buyerId) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    const buyer = (comp.buyers || []).find((b) => b.id === buyerId);
    if (!buyer) return;
    const inputEl = document.getElementById(`inlineCustomWin_${buyerId}`);
    const typedText = inputEl ? inputEl.value.trim() : '';

    if (typedText) {
      buyer.wins = buyer.wins || [];
      if (!buyer.wins.includes(typedText)) {
        buyer.wins.push(typedText);
      }
    }

    // Kaydet'e basıldığında dropdown menüyü kapat ki eklenen Win rozeti hemen altta görünsün
    this.openInlineWinBuyerId = null;
    await this.persistDatabase();
    this.render();
  }

  async clearBuyerCustomWinInline(compId, buyerId) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    const buyer = (comp.buyers || []).find((b) => b.id === buyerId);
    if (!buyer) return;
    buyer.custom_win = '';
    await this.persistDatabase();
    this.render();
  }

  async saveBuyer(e) {
    e.preventDefault();
    const comp = this.db.companies.find((c) => c.id === this.activeCompanyId);
    if (!comp) return;

    const buyerId = document.getElementById('buyerIdInput').value;
    const name = document.getElementById('buyerNameInput').value.trim();
    const title = document.getElementById('buyerTitleInput').value.trim();
    const role = document.getElementById('buyerRoleSelect').value;
    const email = document.getElementById('buyerEmailInput').value.trim();
    const phone = document.getElementById('buyerPhoneInput').value.trim();
    const customWin = document.getElementById('buyerCustomWinInput').value.trim();
    const winStatus = document.querySelector('input[name="buyerWinStatus"]:checked')?.value || 'potential';

    const checkedWins = Array.from(document.querySelectorAll('input[name="buyerWinCheckbox"]:checked')).map(
      (cb) => cb.value
    );

    comp.buyers = comp.buyers || [];
    if (buyerId) {
      const idx = comp.buyers.findIndex((b) => b.id === buyerId);
      if (idx > -1) {
        comp.buyers[idx] = {
          ...comp.buyers[idx],
          name,
          title,
          role,
          email,
          phone,
          wins: checkedWins,
          custom_win: customWin,
          win_status: winStatus
        };
      }
    } else {
      comp.buyers.push({
        id: 'b-' + Date.now(),
        name,
        title,
        role,
        email,
        phone,
        wins: checkedWins,
        custom_win: customWin,
        win_status: winStatus
      });
    }

    this.closeDialog('buyerDialog');
    await this.persistDatabase();
    this.render();
  }

  async toggleBuyerWinStatus(compId, buyerId) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    const buyer = (comp.buyers || []).find((b) => b.id === buyerId);
    if (!buyer) return;
    buyer.win_status = buyer.win_status === 'created' ? 'potential' : 'created';
    await this.persistDatabase();
    this.render();
  }

  async deleteBuyer(compId, buyerId) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    const target = (comp.buyers || []).find((b) => b.id === buyerId);
    if (!target) return;
    comp.buyers = (comp.buyers || []).filter((b) => b.id !== buyerId);
    await this.moveToTrash({
      item_type: 'buyer',
      item_title: `👤 Alıcı: ${target.name} (${target.role || ''})`,
      company_id: comp.id,
      company_name: comp.name,
      payload: target
    });
    this.render();
  }

  async promptManualRedFlag(compId) {
    const text = prompt('Bu Deal Room için manuel Red Flag (Risk / Uyarı) notunu girin:');
    if (!text || !text.trim()) return;
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    comp.manual_red_flags = comp.manual_red_flags || [];
    comp.manual_red_flags.push(text.trim());
    await this.persistDatabase();
    this.render();
  }

  async removeManualRedFlag(compId, index) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp || !comp.manual_red_flags) return;
    const removedText = comp.manual_red_flags[index];
    comp.manual_red_flags.splice(index, 1);
    if (removedText) {
      await this.moveToTrash({
        item_type: 'red_flag',
        item_title: `🚩 Red Flag: ${removedText}`,
        company_id: comp.id,
        company_name: comp.name,
        payload: { text: removedText }
      });
    } else {
      await this.persistDatabase();
    }
    this.render();
  }

  // TOPLANTI SONRASI AKSİYON EKLENDİĞİNDE -> OTOMATİK ENGAGED KONTROLÜ
  async handleAddAction(e, compId) {
    e.preventDefault();
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;

    const title = document.getElementById('newActionTitle').value.trim();
    const owner = document.getElementById('newActionOwner').value.trim();
    const dueDate = document.getElementById('newActionDate').value;

    if (!title) return;
    comp.actions = comp.actions || [];
    comp.actions.unshift({
      id: 'act-' + Date.now(),
      title,
      owner: owner || this.currentSeller.name,
      due_date: dueDate,
      completed: false
    });

    // KURAL: Toplantı yapılmış ve teklif, pilot, başka toplantı aksiyonu girilmişse otomatik Engaged'a koyar!
    this.autoEvaluateCompanyFunnel(comp);

    await this.persistDatabase();
    this.render();
  }

  async toggleAction(compId, actionId) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    const act = (comp.actions || []).find((a) => a.id === actionId);
    if (!act) return;
    act.completed = !act.completed;
    await this.persistDatabase();
    this.render();
  }

  async deleteAction(compId, actionId) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    const target = (comp.actions || []).find((a) => a.id === actionId);
    if (!target) return;
    comp.actions = (comp.actions || []).filter((a) => a.id !== actionId);
    await this.moveToTrash({
      item_type: 'action',
      item_title: `⚡ Aksiyon: ${target.title}`,
      company_id: comp.id,
      company_name: comp.name,
      payload: target
    });
    this.render();
  }

  bindDropzoneEvents(compId) {
    const attachDropHandlers = (el, isInsideModal = false) => {
      if (!el || el.dataset.dropBound === '1') return;
      el.dataset.dropBound = '1';

      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        el.classList.add('dragover');
        const quickDz = document.getElementById('roomQuickDropzone');
        if (quickDz) quickDz.classList.add('dragover');
      });

      el.addEventListener('dragleave', () => {
        el.classList.remove('dragover');
        const quickDz = document.getElementById('roomQuickDropzone');
        if (quickDz) quickDz.classList.remove('dragover');
      });

      el.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.remove('dragover');
        const quickDz = document.getElementById('roomQuickDropzone');
        if (quickDz) quickDz.classList.remove('dragover');

        const files = e.dataTransfer?.files;
        if (isInsideModal) {
          if (files && files.length > 0) {
            this.pendingDroppedFile = files[0];
            this.applyDroppedFileToOpenTimelineModal(files[0]);
          }
          return;
        }

        await this.handleInstantDropOnCustomerRoom(this.activeCompanyId || compId, e.dataTransfer);
      });
    };

    attachDropHandlers(document.getElementById('roomQuickDropzone'), false);
    attachDropHandlers(document.getElementById('roomDropzone'), false);
    attachDropHandlers(document.getElementById('timelineModalDropzone'), true);
    attachDropHandlers(document.getElementById('appRoot'), false);
  }

  async uploadSingleFileToCloud(compId, fileObj) {
    let uploadedUrl = '';
    const fileName = fileObj.name;
    const fileSize = Math.round(fileObj.size / 1024) + ' KB';
    const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const objectPath = `${compId}/${safeName}`;
    const bucket = this.sbBucket || 'deal-documents';

    if (this.sbUrl && this.sbKey) {
      try {
        const sbUpRes = await fetch(`${this.sbUrl}/storage/v1/object/${bucket}/${objectPath}`, {
          method: 'POST',
          headers: {
            apikey: this.sbKey,
            Authorization: `Bearer ${this.accessToken || this.sbKey}`,
            'Content-Type': fileObj.type || 'application/octet-stream',
            'x-upsert': 'true'
          },
          body: fileObj
        });
        if (sbUpRes.ok) {
          uploadedUrl = `${this.sbUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
        }
      } catch (sbStorageErr) {
        console.warn('Supabase Storage doğrudan yükleme uyarısı:', sbStorageErr);
      }
    }

    if (!uploadedUrl) {
      try {
        const base64Data = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(fileObj);
        });
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName,
            base64Data,
            contentType: fileObj.type || 'application/octet-stream',
            companyId: compId
          })
        });
        const upJson = await upRes.json();
        if (upJson.url) uploadedUrl = upJson.url;
      } catch (err) {
        console.warn('Dosya yükleme uyarısı:', err);
      }
    }

    return { uploadedUrl, fileName, fileSize };
  }

  async handleInstantDropOnCustomerRoom(compId, dataTransfer) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp || !dataTransfer) return;

    const files = dataTransfer.files ? Array.from(dataTransfer.files) : [];

    // DURUM 1: 1 veya birden fazla gerçek dosya (.pdf, .docx, .xlsx, .eml, .txt vb.) sürüklendiyse ANINDA HEPSİNİ YÜKLE VE KAYDET!
    if (files.length > 0) {
      this.uploadStatusType = 'loading';
      this.uploadStatusMessage = `⏳ ${files.length} dosya algılandı (${files.map((f) => f.name).join(', ')}), buluta yükleniyor ve kaydediliyor...`;
      this.render();

      const savedNames = [];
      for (const fileObj of files) {
        const fName = fileObj.name;
        const lower = fName.toLowerCase();
        let type = 'document';
        if (lower.includes('revize')) type = 'revision';
        else if (lower.includes('teklif') || lower.includes('proposal') || lower.includes('fiyat')) type = 'proposal';
        else if (lower.includes('sozlesme') || lower.includes('sözleşme') || lower.includes('nda')) type = 'contract';
        else if (lower.endsWith('.eml') || lower.endsWith('.msg')) type = 'email';

        let title = fName.replace(/\.[^/.]+$/, '');
        let content = `Sürükle-bırak ile yüklendi: ${fName}`;

        if (lower.endsWith('.eml') || lower.endsWith('.txt')) {
          try {
            const rawText = await fileObj.text();
            if (lower.endsWith('.eml')) {
              const subjMatch = rawText.match(/^Subject:\s*(.+)$/im);
              if (subjMatch) title = subjMatch[1].trim();
              const parts = rawText.split(/\r?\n\r?\n/);
              const bodyText = parts.slice(1).join('\n\n').trim();
              if (bodyText) content = bodyText.slice(0, 4000);
            } else if (rawText.trim()) {
              content = rawText.trim().slice(0, 4000);
            }
          } catch (readErr) {
            console.warn('Text/EML okuma uyarısı:', readErr);
          }
        }

        const { uploadedUrl, fileName, fileSize } = await this.uploadSingleFileToCloud(comp.id, fileObj);

        comp.timeline = comp.timeline || [];
        comp.timeline.unshift({
          id: 't-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          type,
          title,
          content,
          amount: '',
          file_name: fileName,
          file_size: fileSize,
          file_url: uploadedUrl,
          author: this.currentSeller ? this.currentSeller.name : 'Satıcı',
          created_at: new Date().toLocaleString('tr-TR').slice(0, 16)
        });
        savedNames.push(title);
      }

      this.autoEvaluateCompanyFunnel(comp);
      await this.persistDatabase();
      this.uploadStatusType = 'success';
      this.uploadStatusMessage = `✅ ${savedNames.length} kayıt (${savedNames.join(', ')}) başarıyla "${comp.name}" odasına yüklendi ve kaydedildi!`;
      this.render();
      return;
    }

    // DURUM 2: Dosya değil ama mailin içinden seçili e-posta metni sürüklendiyse
    // (Not: Apple Mail sol listesinden satır sürüklendiğinde droppedUri 'message:...' olur ve droppedPlain yalnızca Konu başlığını içerir!)
    const droppedPlain = (dataTransfer.getData('text/plain') || '').trim();
    const droppedUri = (dataTransfer.getData('text/uri-list') || '').trim();
    const isMailRowDrag = droppedUri.startsWith('message:') || droppedPlain.startsWith('message:');

    if (droppedPlain && !isMailRowDrag) {
      const firstLine = droppedPlain.split(/\r?\n/)[0].slice(0, 75) || 'Sürüklenen E-posta / Not';
      comp.timeline = comp.timeline || [];
      comp.timeline.unshift({
        id: 't-' + Date.now(),
        type: 'email',
        title: `📩 ${firstLine}`,
        content: droppedPlain,
        amount: '',
        file_name: '',
        file_size: '',
        file_url: '',
        author: this.currentSeller ? this.currentSeller.name : 'Satıcı',
        created_at: new Date().toLocaleString('tr-TR').slice(0, 16)
      });
      this.autoEvaluateCompanyFunnel(comp);
      await this.persistDatabase();
      this.uploadStatusType = 'success';
      this.uploadStatusMessage = `✅ Sürüklenen e-posta metni başarıyla "${comp.name}" odasına kaydedildi!`;
      this.render();
      return;
    }

    // DURUM 3: Apple Mail'den doğrudan liste satırı sürüklendiğinde
    const draggedSubject = !droppedPlain.startsWith('message:') ? droppedPlain : '';
    await this.fetchEmailsFromAppleMailBridge(comp.id, draggedSubject);
  }

  async fetchEmailsFromAppleMailBridge(compId, fallbackSubject = '') {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;

    this.uploadStatusType = 'loading';
    this.uploadStatusMessage = '⏳ Apple Mail\'de seçili/sürüklenen mailler doğrudan okunuyor...';
    this.render();

    const endpoints = ['/api/apple-mail', 'http://localhost:3000/api/apple-mail'];
    let bridgeData = null;

    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json && json.ok && Array.isArray(json.emails)) {
            bridgeData = json;
            break;
          }
        }
      } catch (_err) {
        // Diğer adresi dene
      }
    }

    if (bridgeData && bridgeData.emails.length > 0) {
      comp.timeline = comp.timeline || [];
      const savedTitles = [];

      for (const mail of bridgeData.emails) {
        const subj = (mail.subject || 'Apple Mail E-postası').trim();
        const sender = (mail.sender || '').trim();
        const dateStr = (mail.date || '').trim();
        const attNames = Array.isArray(mail.attachments) && mail.attachments.length > 0 ? mail.attachments.join(', ') : '';
        const bodyClean = (mail.content || '').trim().slice(0, 6000);

        const headerLines = [];
        if (sender) headerLines.push(`Kimden: ${sender}`);
        if (dateStr) headerLines.push(`Tarih: ${dateStr}`);
        if (attNames) headerLines.push(`Ekli Dosyalar: ${attNames}`);

        const fullContent = [headerLines.join(' | '), bodyClean].filter(Boolean).join('\n\n');

        comp.timeline.unshift({
          id: 't-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          type: 'email',
          title: `📩 ${subj}`,
          content: fullContent,
          amount: '',
          file_name: attNames ? `📎 ${attNames}` : '',
          file_size: '',
          file_url: '',
          author: this.currentSeller ? this.currentSeller.name : 'Satıcı',
          created_at: new Date().toLocaleString('tr-TR').slice(0, 16)
        });
        savedTitles.push(subj);
      }

      this.autoEvaluateCompanyFunnel(comp);
      await this.persistDatabase();
      this.uploadStatusType = 'success';
      this.uploadStatusMessage = `✅ Apple Mail'den ${savedTitles.length} e-posta (${savedTitles.join(', ')}) tüm içeriğiyle "${comp.name}" odasına kaydedildi!`;
      this.render();
      return;
    }

    // Eğer sol listeden sürüklendiyse ve Mac güvenlik izni nedeniyle yalnızca Konu başlığı geldiyse:
    if (fallbackSubject) {
      this.uploadStatusType = 'error';
      this.uploadStatusMessage =
        `⚠️ Sol listeden sürüklediğinizde Mac yalnızca mailin Konu başlığını ("${fallbackSubject}") iletir, gövde metnini gizler. Mailin sağ tarafındaki (içindeki) metni seçip sürükleyin VEYA mailin içindeyken Cmd+A ve Cmd+C yapıp aşağıya Cmd+V yapıştırın!`;
      this.render();
      this.openTimelineModal(comp.id);
      const titleInput = document.getElementById('tlTitleInput');
      const contentInput = document.getElementById('tlContentInput');
      if (titleInput) titleInput.value = fallbackSubject;
      if (contentInput) {
        contentInput.placeholder = 'Mailin içindeki yazıyı kopyalayıp (Cmd+A -> Cmd+C) buraya Cmd+V ile yapıştırın...';
        setTimeout(() => contentInput.focus(), 80);
      }
      return;
    }

    this.uploadStatusType = 'error';
    this.uploadStatusMessage =
      '💡 Mailin tüm içeriğinin görünmesi için: Mailin sağ tarafındaki (okuma alanındaki) metni kopyalayıp (Cmd+A ve Cmd+C) bu sayfada doğrudan Cmd+V yapın veya seçili metni buraya sürükleyin!';
    this.render();
  }

  async pasteBodyIntoTimelineItem(compId, itemId) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    const item = (comp.timeline || []).find((t) => t.id === itemId);
    if (!item) return;

    let text = '';
    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        text = (await navigator.clipboard.readText()).trim();
      } catch (_err) {
        // Pano izni yoksa düzenleme penceresini aç
      }
    }

    if (!text) {
      this.openEditTimelineEntry(compId, itemId);
      return;
    }

    item.content = text.slice(0, 6000);
    await this.persistDatabase();
    this.uploadStatusType = 'success';
    this.uploadStatusMessage = `✅ Mail içeriği "${item.title}" kaydına başarıyla eklendi!`;
    this.render();
  }

  openEditTimelineEntry(compId, itemId) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    const item = (comp.timeline || []).find((t) => t.id === itemId);
    if (!item) return;

    this.activeCompanyId = compId;
    this.editingTimelineItemId = itemId;
    this.openTimelineModal(compId, null, true);

    const typeSelect = document.getElementById('tlTypeSelect');
    const titleInput = document.getElementById('tlTitleInput');
    const contentInput = document.getElementById('tlContentInput');
    const amountInput = document.getElementById('tlAmountInput');

    if (typeSelect) typeSelect.value = item.type || 'email';
    if (titleInput) titleInput.value = (item.title || '').replace(/^📩\s*/, '');
    if (contentInput) {
      const cleanTitle = (item.title || '').replace(/^📩\s*/, '').trim();
      contentInput.value = item.content === cleanTitle ? '' : item.content || '';
      setTimeout(() => contentInput.focus(), 80);
    }
    if (amountInput) amountInput.value = item.amount || '';
  }

  async deleteTimelineEntry(compId, itemId) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    const target = (comp.timeline || []).find((t) => t.id === itemId);
    if (!target) return;
    comp.timeline = (comp.timeline || []).filter((t) => t.id !== itemId);
    const meta = TIMELINE_TYPES[target.type] || { label: 'Kayıt' };
    await this.moveToTrash({
      item_type: 'timeline',
      item_title: `${meta.label}: ${target.title}`,
      company_id: comp.id,
      company_name: comp.name,
      payload: target
    });
    this.render();
  }

  async pasteEmailFromClipboard(compId, directText = null) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;

    let text = directText;
    if (!text && navigator.clipboard && navigator.clipboard.readText) {
      try {
        text = (await navigator.clipboard.readText()).trim();
      } catch (_err) {
        // Tarayıcı izin vermezse modal açıp Cmd+V yaptır
      }
    }

    if (!text) {
      this.uploadStatusType = 'error';
      this.uploadStatusMessage =
        '📋 Lütfen önce mail programınızda maili kopyalayın (Cmd+C), ardından bu sayfada klavyeden doğrudan Cmd+V tuşlarına basın!';
      this.render();
      return;
    }

    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let title = lines[0] ? lines[0].slice(0, 80) : 'Yapıştırılan E-posta';
    const subjLine = lines.find((l) => /^(Subject|Konu)\s*:/i.test(l));
    if (subjLine) {
      title = subjLine.replace(/^(Subject|Konu)\s*:\s*/i, '').trim().slice(0, 85);
    }

    comp.timeline = comp.timeline || [];
    comp.timeline.unshift({
      id: 't-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      type: 'email',
      title: `📩 ${title}`,
      content: text.slice(0, 6000),
      amount: '',
      file_name: '',
      file_size: '',
      file_url: '',
      author: this.currentSeller ? this.currentSeller.name : 'Satıcı',
      created_at: new Date().toLocaleString('tr-TR').slice(0, 16)
    });

    this.autoEvaluateCompanyFunnel(comp);
    await this.persistDatabase();
    this.uploadStatusType = 'success';
    this.uploadStatusMessage = `✅ Kopyalanan e-posta ("${title}") Masaüstüne indirilmeden doğrudan "${comp.name}" odasına kaydedildi!`;
    this.render();
  }

  applyDroppedFileToOpenTimelineModal(droppedFile) {
    if (!droppedFile) return;
    this.pendingDroppedFile = droppedFile;
    const fileBadge = document.getElementById('tlFileBadge');
    const titleInput = document.getElementById('tlTitleInput');
    const contentInput = document.getElementById('tlContentInput');
    const typeSelect = document.getElementById('tlTypeSelect');

    const fName = droppedFile.name;
    if (fileBadge) {
      fileBadge.textContent = `📎 Sürüklenen Dosya: ${fName} (${Math.round(droppedFile.size / 1024)} KB)`;
    }
    if (titleInput && !titleInput.value.trim()) {
      titleInput.value = fName.replace(/\.[^/.]+$/, '');
    }

    const lower = fName.toLowerCase();
    if (typeSelect) {
      if (lower.includes('revize')) typeSelect.value = 'revision';
      else if (lower.includes('teklif') || lower.includes('proposal') || lower.includes('fiyat'))
        typeSelect.value = 'proposal';
      else if (lower.includes('sozlesme') || lower.includes('sözleşme') || lower.includes('nda'))
        typeSelect.value = 'contract';
      else if (lower.endsWith('.eml') || lower.endsWith('.msg')) typeSelect.value = 'email';
      else typeSelect.value = 'document';
    }

    // Eğer sürüklenen dosya .eml veya .txt ise içeriğini otomatik oku ve Konu + Email Metni alanlarına yerleştir
    if (lower.endsWith('.eml') || lower.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = () => {
        const raw = String(reader.result || '');
        if (lower.endsWith('.eml')) {
          const subjMatch = raw.match(/^Subject:\s*(.+)$/im);
          if (subjMatch && titleInput) {
            titleInput.value = subjMatch[1].trim();
          }
          const parts = raw.split(/\r?\n\r?\n/);
          const bodyText = parts.slice(1).join('\n\n').trim();
          if (contentInput && !contentInput.value.trim()) {
            contentInput.value = bodyText.slice(0, 4000);
          }
        } else if (contentInput && !contentInput.value.trim()) {
          contentInput.value = raw.slice(0, 4000);
        }
      };
      reader.readAsText(droppedFile);
    }
  }

  openTimelineModal(compId, droppedFile = null, keepEditId = false) {
    if (!keepEditId) this.editingTimelineItemId = null;
    this.pendingDroppedFile = droppedFile;
    this.selectedTimelineArchiveItem = null;
    const fileBadge = document.getElementById('tlFileBadge');
    const titleInput = document.getElementById('tlTitleInput');
    const typeSelect = document.getElementById('tlTypeSelect');
    const fileInput = document.getElementById('tlFileInput');
    const archiveSelect = document.getElementById('tlArchiveSelect');

    if (fileInput) fileInput.value = '';
    document.getElementById('tlContentInput').value = '';
    document.getElementById('tlAmountInput').value = '';

    if (archiveSelect) {
      const archiveItems = this.db.archive_items || [];
      archiveSelect.innerHTML = [
        `<option value="">-- Arşivden hazır sunum, fiyat listesi, case study, şablon veya doküman seçin --</option>`,
        ...archiveItems.map((arc) => {
          const catMeta = ARCHIVE_CATEGORIES[arc.category] || { label: '📚 Arşiv' };
          return `<option value="${arc.id}">${catMeta.label} (${arc.brand}) — ${arc.title}</option>`;
        })
      ].join('');
    }

    if (droppedFile) {
      this.applyDroppedFileToOpenTimelineModal(droppedFile);
    } else {
      fileBadge.textContent = '📎 Müşterinin paylaştığı dokümanı / .eml dosyasını buraya sürükleyin veya sağdan seçin';
      titleInput.value = '';
      typeSelect.value = 'email';
    }

    this.openDialog('timelineDialog');
  }

  handleTimelineArchivePick(archiveId) {
    const arc = (this.db.archive_items || []).find((a) => a.id === archiveId);
    const comp = this.db.companies.find((c) => c.id === this.activeCompanyId);
    const fileBadge = document.getElementById('tlFileBadge');
    const titleInput = document.getElementById('tlTitleInput');
    const contentInput = document.getElementById('tlContentInput');
    const typeSelect = document.getElementById('tlTypeSelect');

    if (!arc) {
      this.selectedTimelineArchiveItem = null;
      return;
    }

    this.selectedTimelineArchiveItem = arc;
    const catMeta = ARCHIVE_CATEGORIES[arc.category] || { tlType: 'document' };
    if (typeSelect) {
      if (arc.category === 'document' && arc.title.toLowerCase().includes('nda')) {
        typeSelect.value = 'contract';
      } else {
        typeSelect.value = catMeta.tlType || 'document';
      }
    }
    if (titleInput) {
      titleInput.value = this.interpolateTemplateForCompany(arc.subject || arc.title, comp);
    }
    if (contentInput) {
      contentInput.value = this.interpolateTemplateForCompany(arc.content || '', comp);
    }
    if (fileBadge && arc.file_name) {
      fileBadge.textContent = `📚 Arşiv Dosyası Bağlandı: ${arc.file_name} (${arc.file_size || 'Bulut'})`;
    }
  }

  // TIMELINE KAYDI EKLENDİĞİNDE -> OTOMATİK CONTACTED VEYA ENGAGED YERLEŞTİRME
  async saveTimelineEntry(e) {
    e.preventDefault();
    const comp = this.db.companies.find((c) => c.id === this.activeCompanyId);
    if (!comp) return;

    const type = document.getElementById('tlTypeSelect').value;
    const title = document.getElementById('tlTitleInput').value.trim();
    const content = document.getElementById('tlContentInput').value.trim();
    const amount = document.getElementById('tlAmountInput').value.trim();
    const extractActions = document.getElementById('tlExtractActionsCheckbox').checked;
    const fileInput = document.getElementById('tlFileInput');

    const fileObj = this.pendingDroppedFile || (fileInput.files && fileInput.files[0]);
    let uploadedUrl = this.selectedTimelineArchiveItem ? this.selectedTimelineArchiveItem.file_url || '' : '';
    let fileName = this.selectedTimelineArchiveItem ? this.selectedTimelineArchiveItem.file_name || '' : '';
    let fileSize = this.selectedTimelineArchiveItem ? this.selectedTimelineArchiveItem.file_size || '' : '';

    if (fileObj) {
      fileName = fileObj.name;
      fileSize = Math.round(fileObj.size / 1024) + ' KB';
      const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const objectPath = `${comp.id}/${safeName}`;
      const bucket = this.sbBucket || 'deal-documents';

      // 1. Önce doğrudan Supabase Storage (deal-documents bucket) içerisine yükle
      if (this.sbUrl && this.sbKey) {
        try {
          const sbUpRes = await fetch(`${this.sbUrl}/storage/v1/object/${bucket}/${objectPath}`, {
            method: 'POST',
            headers: {
              apikey: this.sbKey,
              Authorization: `Bearer ${this.accessToken || this.sbKey}`,
              'Content-Type': fileObj.type || 'application/octet-stream',
              'x-upsert': 'true'
            },
            body: fileObj
          });
          if (sbUpRes.ok) {
            uploadedUrl = `${this.sbUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
          }
        } catch (sbStorageErr) {
          console.warn('Supabase Storage doğrudan yükleme uyarısı, API fallback deneniyor:', sbStorageErr);
        }
      }

      // 2. Fallback: /api/upload üzerinden yükle
      if (!uploadedUrl) {
        try {
          const base64Data = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(fileObj);
          });
          const upRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName,
              base64Data,
              contentType: fileObj.type || 'application/octet-stream',
              companyId: comp.id
            })
          });
          const upJson = await upRes.json();
          if (upJson.url) uploadedUrl = upJson.url;
        } catch (err) {
          console.warn('Dosya yükleme uyarısı:', err);
        }
      }
    }

    comp.timeline = comp.timeline || [];
    if (this.editingTimelineItemId) {
      const existing = comp.timeline.find((t) => t.id === this.editingTimelineItemId);
      if (existing) {
        existing.type = type;
        existing.title = type === 'email' && !title.startsWith('📩') ? `📩 ${title}` : title;
        existing.content = content;
        existing.amount = amount;
        if (fileName) existing.file_name = fileName;
        if (fileSize) existing.file_size = fileSize;
        if (uploadedUrl) existing.file_url = uploadedUrl;
      }
      this.editingTimelineItemId = null;
    } else {
      comp.timeline.unshift({
        id: 't-' + Date.now(),
        type,
        title,
        content,
        amount,
        file_name: fileName,
        file_size: fileSize,
        file_url: uploadedUrl,
        author: this.currentSeller ? this.currentSeller.name : 'Satıcı',
        created_at: new Date().toLocaleString('tr-TR').slice(0, 16)
      });
    }

    if (type === 'proposal' && comp.stage < 6) comp.stage = 6;
    if (type === 'revision' && comp.stage < 7) comp.stage = 7;
    if (type === 'contract_draft') {
      if (comp.stage < 8) comp.stage = 8;
      if (!comp.contract_status || comp.contract_status === 'none') comp.contract_status = 'draft';
    }
    if (type === 'contract') {
      if (comp.stage < 8) comp.stage = 8;
      if (!comp.contract_status || comp.contract_status === 'none' || comp.contract_status === 'draft') {
        comp.contract_status = 'final';
      }
    }

    if ((type === 'proposal' || type === 'revision') && amount) {
      const numeric = Number(amount.replace(/[^0-9.]/g, ''));
      if (numeric > 0) comp.deal_value = numeric;
    }

    if (extractActions && content) {
      const lines = content.split('\n');
      const nextWeekDate = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
          const actTitle = trimmed.slice(2).trim();
          if (actTitle.length > 3) {
            comp.actions = comp.actions || [];
            comp.actions.unshift({
              id: 'act-' + Date.now() + Math.random().toString(36).slice(2, 5),
              title: actTitle,
              owner: this.currentSeller ? this.currentSeller.name : 'Ekip',
              due_date: nextWeekDate,
              completed: false
            });
          }
        }
      });
    }

    // OTOMATİK SINIFLANDIRMA MOTORUNU ÇALIŞTIR:
    // Email eklendiyse -> Contacted; Toplantı notu / Teklif / Doküman / Aksiyon eklendiyse -> Engaged!
    this.autoEvaluateCompanyFunnel(comp);

    this.pendingDroppedFile = null;
    this.uploadStatusType = 'success';
    this.uploadStatusMessage = `✅ "${title}" kaydı${fileName ? ` ve "${fileName}" dosyası` : ''} başarıyla "${comp.name}" odasına kaydedildi!`;
    this.closeDialog('timelineDialog');
    await this.persistDatabase();
    this.render();
  }

  populateHoldingSelect(selectedId = '') {
    const sel = document.getElementById('compHoldingSelect');
    if (!sel) return;
    sel.innerHTML = [
      `<option value="">Bağımsız Şirket (Holding Yok)</option>`,
      ...this.db.holdings.map(
        (h) => `<option value="${h.id}" ${h.id === selectedId ? 'selected' : ''}>${h.name}</option>`
      )
    ].join('');
  }

  renderModalProductsCheckboxes(selectedProducts = []) {
    const container = document.getElementById('compProductsCheckboxContainer');
    if (!container) return;
    const allProds = Array.from(new Set([...STANDARD_PRODUCTS_8, ...(selectedProducts || [])]));
    container.innerHTML = allProds
      .map((p) => {
        const isChecked = (selectedProducts || []).includes(p);
        return `
          <label style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 0.76rem; font-weight: 700; cursor: pointer; border: 1.5px solid ${
            isChecked ? '#0284C7' : '#CBD5E1'
          }; background: ${isChecked ? '#E0F2FE' : '#FFFFFF'}; color: ${isChecked ? '#0369A1' : '#334155'};">
            <input type="checkbox" name="compProductCheckbox" value="${p}" ${isChecked ? 'checked' : ''} style="accent-color: #0284C7;" />
            <span>📦 ${p}</span>
          </label>
        `;
      })
      .join('');
  }

  openNewCompanyModal() {
    this.populateHoldingSelect('');
    document.getElementById('compIdInput').value = '';
    document.getElementById('compNameInput').value = '';
    document.getElementById('compBrandSelect').value = 'Yapra.ai';
    document.getElementById('compFunnelSelect').value = 'Addressables';
    document.getElementById('compSectorInput').value = '';
    document.getElementById('compDealValueInput').value = '';
    document.getElementById('compInvoiceDateInput').value = '';
    if (document.getElementById('compContractStatusSelect')) document.getElementById('compContractStatusSelect').value = 'none';
    if (document.getElementById('compPaymentDateInput')) document.getElementById('compPaymentDateInput').value = '';
    if (document.getElementById('compDeliveryDateInput')) document.getElementById('compDeliveryDateInput').value = '';
    if (document.getElementById('compCustomProductInput')) document.getElementById('compCustomProductInput').value = '';
    this.renderModalProductsCheckboxes(['Yapra.ai']);
    document.getElementById('compCityInput').value = 'İstanbul';
    document.getElementById('compSummaryInput').value = '';
    this.openDialog('companyDialog');
  }

  openEditCompanyModal(compId) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    this.populateHoldingSelect(comp.holding_id || '');
    document.getElementById('compIdInput').value = comp.id;
    document.getElementById('compNameInput').value = comp.name;
    document.getElementById('compBrandSelect').value = comp.brand;
    document.getElementById('compFunnelSelect').value = comp.funnel_status;
    document.getElementById('compSectorInput').value = comp.sector || '';
    document.getElementById('compDealValueInput').value = comp.deal_value || '';
    document.getElementById('compInvoiceDateInput').value = comp.expected_invoice_date || '';
    if (document.getElementById('compContractStatusSelect')) {
      document.getElementById('compContractStatusSelect').value = comp.contract_status || 'none';
    }
    if (document.getElementById('compPaymentDateInput')) {
      document.getElementById('compPaymentDateInput').value = comp.payment_date || '';
    }
    if (document.getElementById('compDeliveryDateInput')) {
      document.getElementById('compDeliveryDateInput').value = comp.delivery_date || '';
    }
    if (document.getElementById('compCustomProductInput')) {
      document.getElementById('compCustomProductInput').value = '';
    }
    const prods = Array.isArray(comp.products) && comp.products.length > 0 ? comp.products : [comp.brand || 'Yapra.ai'];
    this.renderModalProductsCheckboxes(prods);
    document.getElementById('compCityInput').value = comp.city || '';
    document.getElementById('compSummaryInput').value = comp.summary_note || '';
    this.openDialog('companyDialog');
  }

  async saveCompanyModal(e) {
    e.preventDefault();
    const compId = document.getElementById('compIdInput').value;
    const holdingId = document.getElementById('compHoldingSelect').value;
    const holdingObj = this.db.holdings.find((h) => h.id === holdingId);
    const name = document.getElementById('compNameInput').value.trim();
    const brand = document.getElementById('compBrandSelect').value;
    const funnel_status = document.getElementById('compFunnelSelect').value;
    const sector = document.getElementById('compSectorInput').value.trim();
    const deal_value = Number(document.getElementById('compDealValueInput').value || 0);
    const expected_invoice_date = document.getElementById('compInvoiceDateInput').value;
    const contract_status = document.getElementById('compContractStatusSelect')?.value || 'none';
    const payment_date = document.getElementById('compPaymentDateInput')?.value || '';
    const delivery_date = document.getElementById('compDeliveryDateInput')?.value || '';
    const checkedProducts = Array.from(document.querySelectorAll('input[name="compProductCheckbox"]:checked')).map(
      (cb) => cb.value
    );
    const customProd = (document.getElementById('compCustomProductInput')?.value || '').trim();
    if (customProd && !checkedProducts.includes(customProd)) {
      checkedProducts.push(customProd);
    }
    const products = checkedProducts.length > 0 ? checkedProducts : [brand];
    const city = document.getElementById('compCityInput').value.trim();
    const summary_note = document.getElementById('compSummaryInput').value.trim();

    if (compId) {
      const comp = this.db.companies.find((c) => c.id === compId);
      if (comp) {
        Object.assign(comp, {
          holding_id: holdingId || null,
          holding_name: holdingObj ? holdingObj.name : 'Bağımsız Şirket',
          name,
          brand,
          products,
          funnel_status,
          sector,
          deal_value,
          expected_invoice_date,
          payment_date,
          delivery_date,
          contract_status,
          city,
          summary_note
        });
      }
    } else {
      const newComp = {
        id: 'c-' + Date.now(),
        owner_id: this.currentSeller.id,
        owner_name: this.currentSeller.name,
        owner_email: this.currentSeller.email,
        is_private: false,
        holding_id: holdingId || null,
        holding_name: holdingObj ? holdingObj.name : 'Bağımsız Şirket',
        name,
        brand,
        products,
        funnel_status: 'Addressables',
        stage: 1,
        sector,
        deal_value,
        expected_invoice_date,
        payment_date,
        delivery_date,
        contract_status,
        deliveries: [],
        city,
        summary_note,
        manual_red_flags: [],
        buyers: [],
        actions: [],
        timeline: []
      };
      this.db.companies.unshift(newComp);
      this.activeCompanyId = newComp.id;
      this.currentView = 'room';
    }

    this.closeDialog('companyDialog');
    await this.persistDatabase();
    this.render();
  }

  openHoldingModal() {
    document.getElementById('holdingNameInput').value = '';
    document.getElementById('holdingSectorInput').value = '';
    document.getElementById('holdingNotesInput').value = '';
    this.openDialog('holdingDialog');
  }

  async saveHoldingModal(e) {
    e.preventDefault();
    const name = document.getElementById('holdingNameInput').value.trim();
    const sector = document.getElementById('holdingSectorInput').value.trim();
    const notes = document.getElementById('holdingNotesInput').value.trim();
    if (!name) return;

    this.db.holdings.push({
      id: 'h-' + Date.now(),
      name,
      sector,
      notes
    });

    this.closeDialog('holdingDialog');
    await this.persistDatabase();
    this.render();
  }

  async deleteCompany(compId) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    if (!confirm(`"${comp.name}" müşteri odasını Çöp Kutusu'na taşımak istediğinize emin misiniz?`)) return;
    const backup = JSON.parse(JSON.stringify(comp));
    this.db.companies = (this.db.companies || []).filter((c) => c.id !== compId);
    if (this.activeCompanyId === compId) {
      this.activeCompanyId = null;
      this.currentView = 'funnel';
    }
    await this.moveToTrash(
      {
        item_type: 'company',
        item_title: `🏢 Müşteri Odası: ${backup.name}`,
        company_id: backup.id,
        company_name: backup.name,
        payload: backup
      },
      { delete_company_id: compId }
    );
    this.render();
  }

  interpolateTemplateForCompany(rawText, comp) {
    if (!rawText) return '';
    if (!comp) return rawText;
    const decisionMaker = (comp.buyers || [])[0] || comp.contact_person || { name: 'Yetkili', email: '' };
    const stageName = STAGES_9[(comp.stage || 1) - 1]?.label || 'İlk Temas';
    const openActs = (comp.actions || []).filter((a) => !a.completed);
    const actsText =
      openActs.length > 0
        ? openActs.map((a) => `- ${a.title} (Hedef: ${a.due_date || 'Bu hafta'})`).join('\n')
        : '- Uygun olduğunuz takvim aralığında bir sonraki değerlendirme görüşmesinin planlanması';

    return rawText
      .replace(/\{\{musteri_adi\}\}/g, comp.name || 'Şirketiniz')
      .replace(/\{\{holding_adi\}\}/g, comp.holding_name || comp.name || '')
      .replace(/\{\{yetkili_adi\}\}/g, decisionMaker.name || 'Yetkili')
      .replace(/\{\{marka\}\}/g, comp.brand || 'Yapra.ai & ArdicTech')
      .replace(/\{\{asama\}\}/g, stageName)
      .replace(/\{\{satici_adi\}\}/g, this.currentSeller ? this.currentSeller.name : 'Satış Ekibi')
      .replace(/\{\{satici_email\}\}/g, this.currentSeller ? this.currentSeller.email : '')
      .replace(/\{\{acik_aksiyonlar\}\}/g, actsText);
  }

  openMessageDraftModal(compId, preselectedArchiveId = null) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    this.draftAttachedArchiveItem = null;
    const decisionMaker = (comp.buyers || [])[0] || comp.contact_person || { name: 'Yetkili', email: '' };
    const stageName = STAGES_9[(comp.stage || 1) - 1].label;
    const openActs = (comp.actions || []).filter((a) => !a.completed);

    let subject = `${comp.name} & ${comp.brand} — ${stageName} Süreci ve Sonraki Adımlar`;
    let body = `Merhaba ${decisionMaker.name || 'Yetkili'} Bey/Hanım,\n\n${comp.name} bünyesinde yürüttüğümüz ${comp.brand} çalışmamızda "${stageName}" aşamasındaki değerli katkılarınız için teşekkür ederiz.\n\n${
      openActs.length > 0
        ? 'Toplantımız sonrası planladığımız aksiyonlarımız:\n' +
          openActs.map((a) => `- ${a.title} (Hedef: ${a.due_date || 'Bu hafta'})`).join('\n')
        : 'Sürecin bir sonraki adımı için uygun olduğunuz takvim aralığını paylaşabilirseniz memnun oluruz.'
    }\n\nSaygılarımızla,\n${this.currentSeller ? this.currentSeller.name : ''}\n${this.currentSeller ? this.currentSeller.email : ''}`;

    if (preselectedArchiveId) {
      const arc = (this.db.archive_items || []).find((a) => a.id === preselectedArchiveId);
      if (arc) {
        this.draftAttachedArchiveItem = arc;
        subject = this.interpolateTemplateForCompany(arc.subject || arc.title, comp);
        if (arc.category === 'email_template') {
          body = this.interpolateTemplateForCompany(arc.content || '', comp);
        } else {
          const catMeta = ARCHIVE_CATEGORIES[arc.category] || { label: 'Doküman' };
          body = `Merhaba ${decisionMaker.name || 'Yetkili'} Bey/Hanım,\n\n${comp.name} ile yürüttüğümüz ${comp.brand} görüşmelerimiz kapsamında "${arc.title}" (${catMeta.label}) içeriğimizi ve detaylarını aşağıda bilgilerinize sunarız:\n\n----------------------------------------\n📌 ${arc.title}\n${this.interpolateTemplateForCompany(arc.content || '', comp)}${
            arc.file_url ? `\n\n🔗 Dosya Bağlantısı: ${arc.file_url}` : arc.file_name ? `\n\n📎 Ek Dosya: ${arc.file_name}` : ''
          }\n----------------------------------------\n\nSorularınız veya bir sonraki adım için uygun olduğunuz zaman aralığını paylaşabilirseniz memnun oluruz.\n\nSaygılarımızla,\n${this.currentSeller ? this.currentSeller.name : ''}\n${this.currentSeller ? this.currentSeller.email : ''}`;
        }
      }
    }

    const archiveOptionsHtml = (this.db.archive_items || [])
      .map((arc) => {
        const catMeta = ARCHIVE_CATEGORIES[arc.category] || { label: '📚 Arşiv' };
        const sel = preselectedArchiveId === arc.id ? 'selected' : '';
        return `<option value="${arc.id}" ${sel}>${catMeta.label} (${arc.brand}) — ${arc.title}</option>`;
      })
      .join('');

    const mailtoUrl = `mailto:${decisionMaker.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    document.getElementById('messageDraftBody').innerHTML = `
      <div style="margin-bottom: 12px; padding: 12px; background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; gap: 8px; flex-wrap: wrap;">
          <label style="font-size: 0.8rem; font-weight: 800; color: #0369A1;">
            📚 Kurumsal Arşivden Şablon / Sunum / Fiyat Listesi / Case Study Seç:
          </label>
          <button
            type="button"
            class="btn btn-outline btn-sm"
            style="background: #FFFFFF; padding: 3px 10px; font-size: 0.74rem;"
            onclick="window.app.closeDialog('messageDraftDialog'); window.app.openArchiveModal('${comp.id}');"
          >
            📚 Tüm Arşivi Gör ➔
          </button>
        </div>
        <select
          id="draftArchivePickerSelect"
          class="select-field"
          style="width: 100%; background: #FFFFFF;"
          onchange="window.app.applyArchiveToMessageDraft('${comp.id}', this.value)"
        >
          <option value="">-- Standart Toplantı Özeti veya Arşivden Seçin (Sunum, Email Şablonu, Fiyat Listesi, Case Study) --</option>
          ${archiveOptionsHtml}
        </select>
        <div id="draftArchiveAttachmentBadge" style="margin-top: 6px; font-size: 0.76rem; color: #0D1B3E; font-weight: 600;">
          ${
            this.draftAttachedArchiveItem && this.draftAttachedArchiveItem.file_name
              ? `📎 Ekli Arşiv Dosyası: ${this.draftAttachedArchiveItem.file_name} (${this.draftAttachedArchiveItem.file_size || 'Bulut'})`
              : ''
          }
        </div>
      </div>

      <div style="margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <div>
          <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted);">Alıcı (Müşteri Yetkilisi):</label>
          <div style="font-weight: 700; font-size: 0.9rem; color: #0D1B3E;">
            🏢 ${comp.name} — 👤 ${decisionMaker.name || 'Yetkili'} (${decisionMaker.email || 'E-posta tanımlı değil'})
          </div>
        </div>
      </div>
      <div style="margin-bottom: 10px;">
        <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted);">E-posta Konusu:</label>
        <input type="text" class="input-field" style="width: 100%; background: #FFFFFF;" value="${subject.replace(/"/g, '&quot;')}" id="draftSubjectField" oninput="window.app.updateDraftMailtoLink('${decisionMaker.email || ''}')" />
      </div>
      <div style="margin-bottom: 14px;">
        <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted);">Mesaj &amp; Şablon İçeriği (Müşteriye Özel Otomatik Dolduruldu):</label>
        <textarea class="input-field" style="width: 100%; min-height: 185px; background: #FFFFFF;" id="draftBodyField" oninput="window.app.updateDraftMailtoLink('${decisionMaker.email || ''}')">${body}</textarea>
      </div>
      <div style="display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
        <button class="btn btn-outline btn-sm" style="background: #FFFFFF;" onclick="navigator.clipboard.writeText(document.getElementById('draftBodyField').value); window.app.showToast('📋 E-posta metni panoya kopyalandı!');">
          📋 Metni Kopyala
        </button>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <a href="${mailtoUrl}" id="draftMailtoAnchor" class="btn btn-outline btn-sm" style="background: #FFFFFF;">✉️ E-posta İstemcisinde Aç</a>
          <button class="btn btn-primary btn-sm" onclick="window.app.saveDraftToTimeline('${comp.id}')">
            📥 Odaya Kaydet &amp; Gönderildi İşaretle
          </button>
        </div>
      </div>
    `;

    this.openDialog('messageDraftDialog');
  }

  applyArchiveToMessageDraft(compId, archiveId) {
    this.openMessageDraftModal(compId, archiveId || null);
  }

  updateDraftMailtoLink(recipientEmail) {
    const subj = document.getElementById('draftSubjectField')?.value || '';
    const body = document.getElementById('draftBodyField')?.value || '';
    const anchor = document.getElementById('draftMailtoAnchor');
    if (anchor) {
      anchor.href = `mailto:${recipientEmail}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    }
  }

  async saveDraftToTimeline(compId) {
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!comp) return;
    const subj = document.getElementById('draftSubjectField').value;
    const body = document.getElementById('draftBodyField').value;
    const arc = this.draftAttachedArchiveItem;

    let entryType = 'email';
    if (arc) {
      if (arc.category === 'price_list') entryType = 'proposal';
      else if (arc.category === 'presentation' || arc.category === 'case_study' || arc.category === 'document')
        entryType = 'document';
    }

    comp.timeline = comp.timeline || [];
    comp.timeline.unshift({
      id: 't-' + Date.now(),
      type: entryType,
      title: subj,
      content: body,
      file_name: arc ? arc.file_name || '' : '',
      file_size: arc ? arc.file_size || '' : '',
      file_url: arc ? arc.file_url || '' : '',
      author: this.currentSeller ? this.currentSeller.name : 'Satıcı',
      created_at: new Date().toLocaleString('tr-TR').slice(0, 16)
    });
    this.draftAttachedArchiveItem = null;
    this.autoEvaluateCompanyFunnel(comp);
    this.closeDialog('messageDraftDialog');
    await this.persistDatabase();
    this.render();
  }

  // ============================================================================
  // 📚 KURUMSAL ARŞİV & ŞABLON KÜTÜPHANESİ (HER EKRANDAN ULAŞILABİLİR)
  // Kategoriler: Sunumlar, Email Şablonları, Dokümanlar, Fiyat Listeleri, Case Studies
  // ============================================================================
  openArchiveModal(targetCompId = null, initialCategory = null) {
    if (targetCompId) {
      this.archiveTargetCompanyId = targetCompId;
    } else if (this.activeCompanyId) {
      this.archiveTargetCompanyId = this.activeCompanyId;
    } else if (!this.archiveTargetCompanyId) {
      const visible = this.getVisibleCompanies();
      if (visible.length > 0) this.archiveTargetCompanyId = visible[0].id;
    }

    if (initialCategory) {
      this.archiveCategoryFilter = initialCategory;
    }
    this.showArchiveForm = false;
    this.editingArchiveId = null;
    this.renderArchiveModalBody();
    this.openDialog('archiveDialog');
  }

  setArchiveCategory(cat) {
    this.archiveCategoryFilter = cat;
    this.renderArchiveModalBody();
  }

  setArchiveBrand(brand) {
    this.archiveBrandFilter = brand;
    this.renderArchiveModalBody();
  }

  setArchiveSearch(q) {
    this.archiveSearchQuery = q;
    this.renderArchiveModalGridOnly();
  }

  setArchiveTargetCompany(compId) {
    this.archiveTargetCompanyId = compId;
    this.renderArchiveModalBody();
  }

  toggleArchiveForm(editId = null) {
    if (editId) {
      this.editingArchiveId = editId;
      this.showArchiveForm = true;
    } else {
      this.editingArchiveId = null;
      this.showArchiveForm = !this.showArchiveForm;
    }
    this.renderArchiveModalBody();
  }

  getFilteredArchiveItems() {
    const items = this.db.archive_items || [];
    const q = (this.archiveSearchQuery || '').trim().toLowerCase();
    return items.filter((item) => {
      if (this.archiveCategoryFilter !== 'ALL' && item.category !== this.archiveCategoryFilter) return false;
      if (
        this.archiveBrandFilter !== 'ALL' &&
        item.brand !== this.archiveBrandFilter &&
        item.brand !== 'Her İkisi'
      ) {
        return false;
      }
      if (q) {
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchSubj = (item.subject || '').toLowerCase().includes(q);
        const matchContent = (item.content || '').toLowerCase().includes(q);
        const matchTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchSubj && !matchContent && !matchTags) return false;
      }
      return true;
    });
  }

  renderArchiveCardsHtml() {
    const filtered = this.getFilteredArchiveItems();
    const targetComp = this.db.companies.find((c) => c.id === this.archiveTargetCompanyId);

    if (filtered.length === 0) {
      return `
        <div style="grid-column: 1 / -1; padding: 32px; text-align: center; background: #FFFFFF; border: 1px dashed #CBD5E1; border-radius: 14px; color: var(--text-muted);">
          Bu filtrede henüz arşiv kaydı bulunmuyor. Sağ üstteki <strong>"➕ Yeni Şablon / Dosya Ekle"</strong> butonuyla hemen ekleyebilirsiniz.
        </div>
      `;
    }

    return filtered
      .map((item) => {
        const catMeta = ARCHIVE_CATEGORIES[item.category] || { label: '📄 Doküman', badge: 'badge-neutral' };
        const tagsHtml = (item.tags || [])
          .map(
            (tg) =>
              `<span style="font-size: 0.7rem; padding: 2px 8px; border-radius: 999px; background: #F1F5F9; color: #475569; font-weight: 600;">#${tg}</span>`
          )
          .join('');

        return `
          <div class="archive-card">
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <span class="badge ${catMeta.badge}" style="background: #FFFFFF;">${catMeta.label}</span>
                  ${this.getBrandBadgeHtml(item.brand)}
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                  <button
                    type="button"
                    class="btn btn-outline btn-sm"
                    style="padding: 2px 8px; font-size: 0.72rem; background: #FFFFFF;"
                    onclick="window.app.toggleArchiveForm('${item.id}')"
                    title="Düzenle"
                  >✏️</button>
                  <button
                    type="button"
                    class="btn btn-outline btn-sm"
                    style="padding: 2px 8px; font-size: 0.72rem; background: #FFFFFF; color: #DC2626;"
                    onclick="window.app.deleteArchiveItem('${item.id}')"
                    title="Arşivden Sil"
                  >🗑️</button>
                </div>
              </div>

              <h4 style="font-size: 0.96rem; font-weight: 800; color: #0D1B3E; margin-bottom: 4px; line-height: 1.3;">
                ${item.title}
              </h4>

              ${
                item.subject
                  ? `<div style="font-size: 0.78rem; font-weight: 600; color: #0369A1; margin-bottom: 6px;">
                      ✉️ Konu: ${this.interpolateTemplateForCompany(item.subject, targetComp)}
                    </div>`
                  : ''
              }

              <div class="archive-content-box">${this.interpolateTemplateForCompany(item.content || '', targetComp)}</div>

              ${
                item.file_name
                  ? `<div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px; font-size: 0.76rem;">
                      <span style="font-weight: 700; color: #0369A1;">📎 ${item.file_name} ${item.file_size ? `(${item.file_size})` : ''}</span>
                      ${
                        item.file_url
                          ? `<a href="${item.file_url}" target="_blank" rel="noopener" style="font-weight: 700; color: #0284C7; text-decoration: underline;">Dosyayı Aç ↗</a>`
                          : `<span style="color: #64748B;">Hazır Kurumsal Dosya</span>`
                      }
                    </div>`
                  : ''
              }

              ${tagsHtml ? `<div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px;">${tagsHtml}</div>` : ''}
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; flex-wrap: wrap; padding-top: 10px; border-top: 1px solid #F1F5F9; margin-top: 4px;">
              <button
                type="button"
                class="btn btn-outline btn-sm"
                style="background: #FFFFFF; font-size: 0.75rem; padding: 5px 10px;"
                onclick="window.app.copyArchiveItemText('${item.id}')"
              >
                📋 Metni Kopyala
              </button>
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  style="background: #FFFFFF; font-size: 0.75rem; padding: 5px 10px; border-color: #16B5EA; color: #0D1B3E; font-weight: 700;"
                  onclick="window.app.attachArchiveToCompanyTimeline('${item.id}')"
                  title="Seçili müşterinin Deal Room tarihçesine (Timeline) doğrudan ekler"
                >
                  📥 Müşteri Odasına Ekle
                </button>
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  style="font-size: 0.75rem; padding: 5px 11px;"
                  onclick="window.app.useArchiveInEmail('${item.id}')"
                  title="Seçili müşteriye özel e-posta taslağını bu şablon/doküman ile açar"
                >
                  ✉️ Müşteriye Gönder ➔
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  renderArchiveModalGridOnly() {
    const gridEl = document.getElementById('archiveItemsGridContainer');
    if (gridEl) {
      gridEl.innerHTML = this.renderArchiveCardsHtml();
    }
  }

  renderArchiveModalBody() {
    const bodyEl = document.getElementById('archiveDialogBody');
    if (!bodyEl) return;

    const allItems = this.db.archive_items || [];
    const visibleCompanies = this.getVisibleCompanies();
    const editingItem = this.editingArchiveId
      ? allItems.find((a) => a.id === this.editingArchiveId)
      : null;

    const countByCat = (cat) =>
      cat === 'ALL' ? allItems.length : allItems.filter((i) => i.category === cat).length;

    const customerOptionsHtml =
      visibleCompanies.length === 0
        ? `<option value="">Henüz müşteri bulunmuyor</option>`
        : visibleCompanies
            .map(
              (c) =>
                `<option value="${c.id}" ${c.id === this.archiveTargetCompanyId ? 'selected' : ''}>🏢 ${c.name} (${c.holding_name || 'Bağımsız'} • ${c.brand})</option>`
            )
            .join('');

    bodyEl.innerHTML = `
      <!-- ÜST MÜŞTERİ BAĞLAMI & YENİ İÇERİK EKLEME ÇUBUĞU -->
      <div class="archive-toolbar">
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex: 1;">
          <label style="font-size: 0.8rem; font-weight: 800; color: #0D1B3E; white-space: nowrap;">
            🎯 Gönderilecek / Eklenecek Müşteri:
          </label>
          <select
            class="select-field"
            style="min-width: 250px; background: #FFFFFF; font-weight: 700;"
            onchange="window.app.setArchiveTargetCompany(this.value)"
          >
            ${customerOptionsHtml}
          </select>
          <span style="font-size: 0.74rem; color: var(--text-muted);">
            (Şablonlardaki <code>{{musteri_adi}}</code> ve <code>{{yetkili_adi}}</code> seçili müşteriye göre canlı güncellenir)
          </span>
        </div>

        <button
          type="button"
          class="btn ${this.showArchiveForm ? 'btn-outline' : 'btn-logo-gradient'} btn-sm"
          style="padding: 8px 14px; font-weight: 700;"
          onclick="window.app.toggleArchiveForm()"
        >
          ${this.showArchiveForm ? '✕ Formu Kapat' : '➕ Yeni Sunum / Şablon / Fiyat Listesi / Case Study Ekle'}
        </button>
      </div>

      <!-- YENİ ARŞİV KAYDI / ŞABLON EKLEME VEYA DÜZENLEME FORMU -->
      ${
        this.showArchiveForm
          ? `
        <form
          onsubmit="window.app.saveArchiveItem(event)"
          style="background: #F8FAFC; border: 1.5px solid #16B5EA; border-radius: 14px; padding: 16px; margin-bottom: 16px;"
        >
          <div style="font-weight: 800; font-size: 0.92rem; color: #0D1B3E; margin-bottom: 12px;">
            ${editingItem ? `✏️ Arşiv Kaydını Düzenle: ${editingItem.title}` : '➕ Kurumsal Arşive Yeni İçerik / Şablon / Dosya Ekle'}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1.5fr; gap: 10px; margin-bottom: 10px;">
            <div>
              <label style="font-size: 0.76rem; font-weight: 700; display: block; margin-bottom: 4px;">Kategori *</label>
              <select id="arcCategoryInput" class="select-field" style="width: 100%; background: #FFFFFF;" required>
                <option value="presentation" ${editingItem?.category === 'presentation' ? 'selected' : ''}>📊 Sunum (Pitch Deck / Demo)</option>
                <option value="email_template" ${editingItem?.category === 'email_template' ? 'selected' : ''}>✉️ E-posta Şablonu (Template)</option>
                <option value="price_list" ${editingItem?.category === 'price_list' ? 'selected' : ''}>💰 Fiyat Listesi &amp; Paketler</option>
                <option value="case_study" ${editingItem?.category === 'case_study' ? 'selected' : ''}>🏆 Case Study (Başarı Hikayesi)</option>
                <option value="document" ${editingItem?.category === 'document' ? 'selected' : ''}>📄 Teknik Doküman / Sözleşme (NDA)</option>
              </select>
            </div>
            <div>
              <label style="font-size: 0.76rem; font-weight: 700; display: block; margin-bottom: 4px;">Marka *</label>
              <select id="arcBrandInput" class="select-field" style="width: 100%; background: #FFFFFF;" required>
                <option value="Her İkisi" ${editingItem?.brand === 'Her İkisi' ? 'selected' : ''}>✨ Her İkisi (Ortak)</option>
                <option value="Yapra.ai" ${editingItem?.brand === 'Yapra.ai' ? 'selected' : ''}>🌱 Yapra.ai</option>
                <option value="ArdicTech" ${editingItem?.brand === 'ArdicTech' ? 'selected' : ''}>⚙️ ArdicTech</option>
              </select>
            </div>
            <div>
              <label style="font-size: 0.76rem; font-weight: 700; display: block; margin-bottom: 4px;">Başlık / Doküman Adı *</label>
              <input
                type="text"
                id="arcTitleInput"
                class="input-field"
                style="width: 100%; background: #FFFFFF;"
                required
                placeholder="Örn: Yapra.ai 2026 Enterprise Fiyat Listesi veya Cold Intro Şablonu"
                value="${(editingItem?.title || '').replace(/"/g, '&quot;')}"
              />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 10px; margin-bottom: 10px;">
            <div>
              <label style="font-size: 0.76rem; font-weight: 700; display: block; margin-bottom: 4px;">
                Varsayılan E-posta Konusu (Müşteriye gönderirken otomatik kullanılır)
              </label>
              <input
                type="text"
                id="arcSubjectInput"
                class="input-field"
                style="width: 100%; background: #FFFFFF;"
                placeholder="Örn: {{musteri_adi}} & {{marka}} — Kurumsal Teklif ve Fiyat Paketlerimiz"
                value="${(editingItem?.subject || '').replace(/"/g, '&quot;')}"
              />
            </div>
            <div>
              <label style="font-size: 0.76rem; font-weight: 700; display: block; margin-bottom: 4px;">
                Etiketler (Virgülle ayırın)
              </label>
              <input
                type="text"
                id="arcTagsInput"
                class="input-field"
                style="width: 100%; background: #FFFFFF;"
                placeholder="Örn: Fiyat Listesi, PoC, ROI, C-Level"
                value="${(editingItem?.tags || []).join(', ').replace(/"/g, '&quot;')}"
              />
            </div>
          </div>

          <div style="margin-bottom: 10px;">
            <label style="font-size: 0.76rem; font-weight: 700; display: block; margin-bottom: 4px;">
              İçerik / E-posta Şablon Metni / Fiyat Tablosu / Case Study Özeti *
              <span style="font-weight: 500; color: var(--text-muted);">
                (Kullanılabilir değişkenler: <code>{{musteri_adi}}</code>, <code>{{yetkili_adi}}</code>, <code>{{marka}}</code>, <code>{{satici_adi}}</code>, <code>{{acik_aksiyonlar}}</code>)
              </span>
            </label>
            <textarea
              id="arcContentInput"
              class="input-field"
              style="width: 100%; min-height: 110px; background: #FFFFFF;"
              required
              placeholder="E-posta şablon metnini, fiyat paketlerini, case study metriklerini veya sunum özetini buraya yazın..."
            >${editingItem?.content || ''}</textarea>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 10px; background: #FFFFFF; padding: 8px 12px; border: 1px solid #E2E8F0; border-radius: 8px;">
              <span style="font-size: 0.78rem; font-weight: 600; color: #334155;">
                📎 Dosya Yükle (PDF, PPTX, DOCX — İsteğe Bağlı):
              </span>
              <input type="file" id="arcFileInput" style="font-size: 0.76rem;" />
              ${
                editingItem?.file_name
                  ? `<span style="font-size: 0.74rem; color: #0369A1;">Mevcut: ${editingItem.file_name}</span>`
                  : ''
              }
            </div>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="btn btn-outline btn-sm" style="background: #FFFFFF;" onclick="window.app.toggleArchiveForm()">İptal</button>
              <button type="submit" class="btn btn-primary btn-sm">💾 Arşive Kaydet (Bulut Senkron)</button>
            </div>
          </div>
        </form>
      `
          : ''
      }

      <!-- KATEGORİ SEKMELERİ + MARKA FİLTRESİ + ARAMA -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;">
        <div class="archive-category-tabs" style="margin-bottom: 0;">
          <button
            type="button"
            class="archive-cat-btn ${this.archiveCategoryFilter === 'ALL' ? 'active' : ''}"
            onclick="window.app.setArchiveCategory('ALL')"
          >
            📚 Tümü (${countByCat('ALL')})
          </button>
          <button
            type="button"
            class="archive-cat-btn ${this.archiveCategoryFilter === 'presentation' ? 'active' : ''}"
            onclick="window.app.setArchiveCategory('presentation')"
          >
            📊 Sunumlar (${countByCat('presentation')})
          </button>
          <button
            type="button"
            class="archive-cat-btn ${this.archiveCategoryFilter === 'email_template' ? 'active' : ''}"
            onclick="window.app.setArchiveCategory('email_template')"
          >
            ✉️ Email Şablonları (${countByCat('email_template')})
          </button>
          <button
            type="button"
            class="archive-cat-btn ${this.archiveCategoryFilter === 'price_list' ? 'active' : ''}"
            onclick="window.app.setArchiveCategory('price_list')"
          >
            💰 Fiyat Listeleri (${countByCat('price_list')})
          </button>
          <button
            type="button"
            class="archive-cat-btn ${this.archiveCategoryFilter === 'case_study' ? 'active' : ''}"
            onclick="window.app.setArchiveCategory('case_study')"
          >
            🏆 Case Studies (${countByCat('case_study')})
          </button>
          <button
            type="button"
            class="archive-cat-btn ${this.archiveCategoryFilter === 'document' ? 'active' : ''}"
            onclick="window.app.setArchiveCategory('document')"
          >
            📄 Doküman &amp; NDA (${countByCat('document')})
          </button>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <select
            class="select-field"
            style="background: #FFFFFF; font-size: 0.78rem; padding: 6px 10px;"
            onchange="window.app.setArchiveBrand(this.value)"
          >
            <option value="ALL" ${this.archiveBrandFilter === 'ALL' ? 'selected' : ''}>Tüm Markalar</option>
            <option value="Yapra.ai" ${this.archiveBrandFilter === 'Yapra.ai' ? 'selected' : ''}>🌱 Sadece Yapra.ai</option>
            <option value="ArdicTech" ${this.archiveBrandFilter === 'ArdicTech' ? 'selected' : ''}>⚙️ Sadece ArdicTech</option>
          </select>
          <input
            type="search"
            class="input-field"
            style="background: #FFFFFF; font-size: 0.78rem; padding: 6px 12px; width: 210px;"
            placeholder="🔍 Arşivde ara (Fiyat, ROI, NDA...)"
            value="${(this.archiveSearchQuery || '').replace(/"/g, '&quot;')}"
            oninput="window.app.setArchiveSearch(this.value)"
          />
        </div>
      </div>

      <!-- ARŞİV KARTLARI LİSTESİ -->
      <div id="archiveItemsGridContainer" class="archive-grid">
        ${this.renderArchiveCardsHtml()}
      </div>
    `;
  }

  async saveArchiveItem(e) {
    e.preventDefault();
    const category = document.getElementById('arcCategoryInput').value;
    const brand = document.getElementById('arcBrandInput').value;
    const title = document.getElementById('arcTitleInput').value.trim();
    const subject = document.getElementById('arcSubjectInput').value.trim();
    const content = document.getElementById('arcContentInput').value.trim();
    const tagsRaw = document.getElementById('arcTagsInput').value.trim();
    const fileInput = document.getElementById('arcFileInput');

    if (!title) return;

    const tags = tagsRaw
      ? tagsRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const existing = this.editingArchiveId
      ? (this.db.archive_items || []).find((a) => a.id === this.editingArchiveId)
      : null;

    let fileName = existing ? existing.file_name || '' : '';
    let fileSize = existing ? existing.file_size || '' : '';
    let fileUrl = existing ? existing.file_url || '' : '';

    const fileObj = fileInput && fileInput.files && fileInput.files[0];
    if (fileObj) {
      fileName = fileObj.name;
      fileSize = Math.round(fileObj.size / 1024) + ' KB';
      const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const objectPath = `archive/${safeName}`;
      const bucket = this.sbBucket || 'deal-documents';

      if (this.sbUrl && this.sbKey) {
        try {
          const sbUpRes = await fetch(`${this.sbUrl}/storage/v1/object/${bucket}/${objectPath}`, {
            method: 'POST',
            headers: {
              apikey: this.sbKey,
              Authorization: `Bearer ${this.accessToken || this.sbKey}`,
              'Content-Type': fileObj.type || 'application/octet-stream',
              'x-upsert': 'true'
            },
            body: fileObj
          });
          if (sbUpRes.ok) {
            fileUrl = `${this.sbUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
          }
        } catch (err) {
          console.warn('Archive storage direct upload warning:', err);
        }
      }

      if (!fileUrl) {
        try {
          const base64Data = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(fileObj);
          });
          const upRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName,
              base64Data,
              contentType: fileObj.type || 'application/octet-stream',
              companyId: 'archive'
            })
          });
          const upJson = await upRes.json();
          if (upJson.url) fileUrl = upJson.url;
        } catch (err) {
          console.warn('Archive upload API fallback warning:', err);
        }
      }
    }

    if (existing) {
      Object.assign(existing, {
        category,
        brand,
        title,
        subject,
        content,
        file_name: fileName,
        file_size: fileSize,
        file_url: fileUrl,
        tags,
        updated_at: new Date().toISOString()
      });
    } else {
      this.db.archive_items = this.db.archive_items || [];
      this.db.archive_items.unshift({
        id: 'arc-' + Date.now(),
        category,
        brand,
        title,
        subject,
        content,
        file_name: fileName,
        file_size: fileSize,
        file_url: fileUrl,
        tags,
        author_name: this.currentSeller ? this.currentSeller.name : 'Satış Ekibi',
        author_email: this.currentSeller ? this.currentSeller.email : '',
        updated_at: new Date().toISOString()
      });
    }

    this.showArchiveForm = false;
    this.editingArchiveId = null;
    this.renderArchiveModalBody();
    await this.persistDatabase();
  }

  async deleteArchiveItem(archiveId) {
    const target = (this.db.archive_items || []).find((a) => a.id === archiveId);
    if (!target) return;
    this.db.archive_items = (this.db.archive_items || []).filter((a) => a.id !== archiveId);
    this.renderArchiveModalBody();
    await this.moveToTrash(
      {
        item_type: 'archive_item',
        item_title: `📚 Arşiv: ${target.title}`,
        company_id: '',
        company_name: target.brand || 'Kurumsal Arşiv',
        payload: target
      },
      { delete_archive_id: archiveId }
    );
  }

  // ============================================================================
  // 🗑️ ÇÖP KUTUSU (TRASHCAN) & SADECE ADMİN KALICI SİLME YETKİSİ
  // ============================================================================
  isAdminUser() {
    if (!this.currentSeller) return false;
    if (this.currentSeller.is_admin === true) return true;
    const email = (this.currentSeller.email || '').toLowerCase();
    const name = (this.currentSeller.name || '').toLowerCase();
    return email.includes('hulya') || name.includes('hulya') || name.includes('hülya');
  }

  updateTrashCountBadge() {
    const badge = document.getElementById('trashTopCountBadge');
    if (!badge) return;
    const count = (this.db.trash_items || []).length;
    badge.textContent = String(count);
  }

  async moveToTrash(itemMeta, extraPersist = {}) {
    this.db.trash_items = Array.isArray(this.db.trash_items) ? this.db.trash_items : [];
    const trashEntry = {
      id: 'trash-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      item_type: itemMeta.item_type || 'record',
      item_title: itemMeta.item_title || 'Silinen Kayıt',
      company_id: itemMeta.company_id || '',
      company_name: itemMeta.company_name || '',
      deleted_by_name: this.currentSeller ? this.currentSeller.name : 'Satıcı',
      deleted_by_email: this.currentSeller ? this.currentSeller.email : '',
      deleted_at: new Date().toLocaleString('tr-TR').slice(0, 16),
      payload: itemMeta.payload || {}
    };
    this.db.trash_items.unshift(trashEntry);
    this.updateTrashCountBadge();
    this.showToast(`🗑️ "${trashEntry.item_title}" Çöp Kutusu'na taşındı.`);
    await this.persistDatabase(extraPersist);
  }

  openTrashModal() {
    this.renderTrashModalBody();
    this.openDialog('trashDialog');
  }

  renderTrashModalBody() {
    const bodyEl = document.getElementById('trashDialogBody');
    if (!bodyEl) return;
    const items = this.db.trash_items || [];
    const isAdmin = this.isAdminUser();

    const typeLabels = {
      company: '🏢 Müşteri Odası',
      buyer: '👤 Alıcı & Win',
      action: '⚡ Aksiyon',
      timeline: '📂 Timeline / Email / Teklif',
      competitor: '⚔️ Rakip',
      red_flag: '🚩 Red Flag',
      delivery: '📦 Teslimat',
      archive_item: '📚 Kurumsal Arşiv'
    };

    bodyEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 16px; border-radius: 10px; margin-bottom: 16px; background: ${
        isAdmin ? '#FEF2F2' : '#F8FAFC'
      }; border: 1px solid ${isAdmin ? '#FECACA' : '#E2E8F0'};">
        <div>
          <div style="font-size: 0.86rem; font-weight: 800; color: #0D1B3E;">
            ${
              isAdmin
                ? `👑 Admin Yetkisi Aktif (${this.currentSeller?.name || 'Hulya Kahveci'}) — Kayıtları geri yükleyebilir veya Çöp Kutusu'ndan kalıcı olarak silebilirsiniz.`
                : `🔒 Standart Satıcı Görünümü (${this.currentSeller?.name || ''}) — Silinen kayıtları geri yükleyebilirsiniz. Kalıcı silme yetkisi yalnızca Admin'dedir.`
            }
          </div>
          <div style="font-size: 0.76rem; color: #64748B; margin-top: 2px;">
            Silinen hiçbir veri doğrudan kaybolmaz; önce buraya gelir. Toplam <strong>${items.length}</strong> kayıt Çöp Kutusu'nda bekliyor.
          </div>
        </div>
        ${
          isAdmin && items.length > 0
            ? `<button
                type="button"
                class="btn btn-outline btn-sm"
                style="background: #DC2626; color: #FFFFFF; border-color: #DC2626; font-weight: 800;"
                onclick="window.app.emptyTrashcan()"
              >
                🔥 Çöp Kutusunu Boşalt (Admin)
              </button>`
            : ''
        }
      </div>

      ${
        items.length === 0
          ? `<div style="padding: 40px 20px; text-align: center; color: #94A3B8; font-size: 0.9rem; border: 1px dashed #CBD5E1; border-radius: 12px; background: #FFFFFF;">
              🗑️ Çöp Kutusu şu anda boş.
            </div>`
          : `<div style="display: flex; flex-direction: column; gap: 10px;">
              ${items
                .map((item) => {
                  const badgeText = typeLabels[item.item_type] || '📄 Kayıt';
                  return `
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; flex-wrap: wrap;">
                      <div style="flex: 1; min-width: 240px;">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                          <span class="badge badge-neutral">${badgeText}</span>
                          <strong style="font-size: 0.92rem; color: #0D1B3E;">${item.item_title}</strong>
                          ${
                            item.company_name
                              ? `<span style="font-size: 0.76rem; color: #0369A1; font-weight: 700;">(${item.company_name})</span>`
                              : ''
                          }
                        </div>
                        <div style="font-size: 0.75rem; color: #64748B; margin-top: 4px;">
                          Silen: <strong>${item.deleted_by_name || 'Satıcı'}</strong> • Tarih: ${item.deleted_at || '-'}
                        </div>
                      </div>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <button
                          type="button"
                          class="btn btn-outline btn-sm"
                          style="background: #ECFDF5; color: #047857; border-color: #6EE7B7; font-weight: 700;"
                          onclick="window.app.restoreTrashItem('${item.id}')"
                        >
                          ↩️ Geri Yükle
                        </button>
                        ${
                          isAdmin
                            ? `<button
                                type="button"
                                class="btn btn-outline btn-sm"
                                style="background: #FEF2F2; color: #DC2626; border-color: #FECACA; font-weight: 700;"
                                onclick="window.app.permanentlyDeleteTrashItem('${item.id}')"
                              >
                                ❌ Kalıcı Sil
                              </button>`
                            : `<span style="font-size: 0.72rem; color: #94A3B8; padding: 4px 8px; border: 1px dashed #E2E8F0; border-radius: 6px;" title="Kalıcı silme yetkisi sadece Admin'dedir">🔒 Sadece Admin Silebilir</span>`
                        }
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>`
      }
    `;
  }

  async restoreTrashItem(trashId) {
    const item = (this.db.trash_items || []).find((t) => t.id === trashId);
    if (!item) return;
    const p = item.payload || {};

    if (item.item_type === 'company' && p.id) {
      this.db.companies = this.db.companies || [];
      if (!this.db.companies.some((c) => c.id === p.id)) {
        this.db.companies.unshift(p);
      }
    } else if (item.item_type === 'archive_item' && p.id) {
      this.db.archive_items = this.db.archive_items || [];
      if (!this.db.archive_items.some((a) => a.id === p.id)) {
        this.db.archive_items.unshift(p);
      }
    } else {
      const comp = (this.db.companies || []).find((c) => c.id === item.company_id);
      if (!comp) {
        alert(`Bu kaydın bağlı olduğu "${item.company_name || 'Müşteri'}" odası bulunamadı. Önce müşteri odasını geri yükleyin.`);
        return;
      }
      if (item.item_type === 'buyer') {
        comp.buyers = comp.buyers || [];
        comp.buyers.push(p);
      } else if (item.item_type === 'action') {
        comp.actions = comp.actions || [];
        comp.actions.unshift(p);
      } else if (item.item_type === 'timeline') {
        comp.timeline = comp.timeline || [];
        comp.timeline.unshift(p);
      } else if (item.item_type === 'competitor') {
        comp.competitors = comp.competitors || [];
        comp.competitors.unshift(p);
      } else if (item.item_type === 'delivery') {
        comp.deliveries = comp.deliveries || [];
        comp.deliveries.unshift(p);
      } else if (item.item_type === 'red_flag' && p.text) {
        comp.manual_red_flags = comp.manual_red_flags || [];
        comp.manual_red_flags.push(p.text);
      }
    }

    this.db.trash_items = (this.db.trash_items || []).filter((t) => t.id !== trashId);
    this.updateTrashCountBadge();
    this.renderTrashModalBody();
    this.showToast(`↩️ "${item.item_title}" başarıyla geri yüklendi!`);
    await this.persistDatabase({ delete_trash_id: trashId });
    this.render();
  }

  async permanentlyDeleteTrashItem(trashId) {
    if (!this.isAdminUser()) {
      alert('Kalıcı silme işlemi yalnızca Admin yetkisine sahip kullanıcılar tarafından yapılabilir.');
      return;
    }
    const item = (this.db.trash_items || []).find((t) => t.id === trashId);
    if (!item) return;
    if (!confirm(`"${item.item_title}" kaydını Çöp Kutusu'ndan KALICI OLARAK silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      return;
    }
    this.db.trash_items = (this.db.trash_items || []).filter((t) => t.id !== trashId);
    this.updateTrashCountBadge();
    this.renderTrashModalBody();
    await this.persistDatabase({ delete_trash_id: trashId });
    this.render();
  }

  async emptyTrashcan() {
    if (!this.isAdminUser()) {
      alert('Çöp Kutusunu boşaltma işlemi yalnızca Admin yetkisine sahip kullanıcılar tarafından yapılabilir.');
      return;
    }
    if (!confirm('Çöp Kutusu içindeki TÜM kayıtları kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
      return;
    }
    this.db.trash_items = [];
    this.updateTrashCountBadge();
    this.renderTrashModalBody();
    await this.persistDatabase({ empty_trash: true });
    this.render();
  }

  copyArchiveItemText(archiveId) {
    const item = (this.db.archive_items || []).find((a) => a.id === archiveId);
    if (!item) return;
    const comp = this.db.companies.find((c) => c.id === this.archiveTargetCompanyId);
    const text = this.interpolateTemplateForCompany(item.content || item.title, comp);
    navigator.clipboard.writeText(text);
    this.showToast(`📋 "${item.title}" metni panoya kopyalandı!`);
    this.render();
  }

  useArchiveInEmail(archiveId) {
    const compId = this.archiveTargetCompanyId || this.activeCompanyId || (this.getVisibleCompanies()[0]?.id || '');
    if (!compId) {
      alert('Lütfen önce bir müşteri seçin veya müşteri odası oluşturun.');
      return;
    }
    this.closeDialog('archiveDialog');
    this.openMessageDraftModal(compId, archiveId);
  }

  async attachArchiveToCompanyTimeline(archiveId) {
    const item = (this.db.archive_items || []).find((a) => a.id === archiveId);
    const compId = this.archiveTargetCompanyId || this.activeCompanyId;
    const comp = this.db.companies.find((c) => c.id === compId);
    if (!item || !comp) {
      alert('Lütfen üstteki listeden eklenecek müşteriyi seçin.');
      return;
    }

    const catMeta = ARCHIVE_CATEGORIES[item.category] || { tlType: 'document', label: 'Doküman' };
    let tlType = catMeta.tlType || 'document';
    if (item.category === 'document' && item.title.toLowerCase().includes('nda')) {
      tlType = 'contract';
    }

    comp.timeline = comp.timeline || [];
    comp.timeline.unshift({
      id: 't-' + Date.now(),
      type: tlType,
      title: `${catMeta.label}: ${this.interpolateTemplateForCompany(item.subject || item.title, comp)}`,
      content: this.interpolateTemplateForCompany(item.content || '', comp),
      file_name: item.file_name || '',
      file_size: item.file_size || '',
      file_url: item.file_url || '',
      author: this.currentSeller ? this.currentSeller.name : 'Satıcı',
      created_at: new Date().toLocaleString('tr-TR').slice(0, 16)
    });

    this.autoEvaluateCompanyFunnel(comp);
    this.closeDialog('archiveDialog');
    this.showToast(`📚 "${item.title}" arşivi "${comp.name}" müşteri odasına eklendi!`);
    await this.persistDatabase();
    this.openCompanyRoom(comp.id);
  }

  goHomeDashboard() {
    if (!this.currentSeller) {
      this.currentView = 'auth';
      this.render();
      return;
    }
    this.activeCompanyId = null;
    this.currentView = 'funnel';
    this.render();
  }

  async handleSignOut() {
    if (this.supabaseClient) {
      try {
        await this.supabaseClient.auth.signOut();
      } catch (e) {
        console.warn('Sign out warning:', e);
      }
    }
    this.accessToken = null;
    this.currentSeller = null;
    this.currentView = 'auth';
    document.getElementById('topbar').style.display = 'none';
    document.getElementById('aiFabBtn').style.display = 'none';
    this.render();
  }

  openAuthModal() {
    this.handleSignOut();
  }

  updateUserHeader() {
    const el = document.getElementById('activeUserEmail');
    if (el && this.currentSeller) {
      el.textContent = `${this.currentSeller.name} (Çıkış Yap)`;
    }
  }

  toggleAiDrawer() {
    const dr = document.getElementById('aiDrawer');
    if (!dr) return;
    dr.style.display = dr.style.display === 'none' ? 'flex' : 'none';
  }

  renderAiWelcome() {
    const box = document.getElementById('aiMessages');
    if (!box) return;
    box.innerHTML = `
      <div class="ai-bubble agent">
        Merhaba! Ben <strong>DealRoom AI Asistanı</strong>. Holdingler, alt şirketler, Red Flag'ler, eksik bilgiler, fatura tarihleri ve açık aksiyonlar hakkında Türkçe sorular sorabilirsiniz.
      </div>
    `;
  }

  askAiPreset(question) {
    document.getElementById('aiInput').value = question;
    this.processAiQuestion(question);
  }

  handleAiSubmit(e) {
    e.preventDefault();
    const inp = document.getElementById('aiInput');
    const q = inp.value.trim();
    if (!q) return;
    this.processAiQuestion(q);
    inp.value = '';
  }

  processAiQuestion(q) {
    const box = document.getElementById('aiMessages');
    box.innerHTML += `<div class="ai-bubble user">${q}</div>`;

    const visible = this.getVisibleCompanies();
    const lower = q.toLowerCase();
    let reply = '';

    if (lower.includes('red flag') || lower.includes('risk') || lower.includes('eksik')) {
      const flagged = visible
        .map((c) => ({ comp: c, flags: this.computeRedFlags(c), missing: this.computeMissingInfo(c) }))
        .filter((x) => x.flags.length > 0 || x.missing.length > 0);
      if (flagged.length === 0) {
        reply = 'Şu an hiçbir müşteri odasında aktif Red Flag veya eksik bilgi bulunmuyor.';
      } else {
        reply =
          `<strong>🚩 Red Flag &amp; Eksik Bilgi Raporu:</strong><br/>` +
          flagged
            .map(
              (x) =>
                `• <strong>${x.comp.name}</strong> (${x.comp.funnel_status}):<br/>` +
                (x.flags.length > 0 ? `  🚩 Riskler: ${x.flags.map((f) => f.text).join(' | ')}<br/>` : '') +
                (x.missing.length > 0 ? `  ⚠️ Eksikler: ${x.missing.join(', ')}` : '')
            )
            .join('<br/><br/>');
      }
    } else if (lower.includes('fatura') || lower.includes('tahsilat') || lower.includes('bu ay')) {
      const withInvoice = visible.filter((c) => c.expected_invoice_date);
      reply =
        `<strong>💰 Fatura Takvimi Planlanan Şirketler:</strong><br/>` +
        withInvoice
          .map(
            (c) =>
              `• <strong>${c.name}</strong> (${c.brand}): <strong>${this.formatCurrency(c.deal_value)}</strong> — Hedef: ${c.expected_invoice_date}`
          )
          .join('<br/>');
    } else {
      const total = visible.reduce((acc, c) => acc + Number(c.deal_value || 0), 0);
      reply = `
        <strong>📊 Görünür Pipeline Özeti (${this.currentSeller ? this.currentSeller.name : ''}):</strong><br/>
        • Toplam Görünür Şirket: <strong>${visible.length}</strong><br/>
        • Toplam Pipeline Hacmi: <strong>${this.formatCurrency(total)}</strong>
      `;
    }

    box.innerHTML += `<div class="ai-bubble agent">${reply}</div>`;
    box.scrollTop = box.scrollHeight;
  }
}

window.app = new DealRoomApp();
