import Cocoa
import CoreGraphics

let pdfPath = "/Users/hulyakahveci/Desktop/DEAL ROOM /DealRoom_Kullanim_ve_Fonksiyon_Kilavuzu.pdf"
let pageWidth: CGFloat = 595.28
let pageHeight: CGFloat = 841.89
var mediaBox = CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight)

guard let consumer = CGDataConsumer(url: URL(fileURLWithPath: pdfPath) as CFURL),
      let pdfContext = CGContext(consumer: consumer, mediaBox: &mediaBox, nil) else {
    fatalError("Could not create PDF context")
}

func color(_ hex: Int, alpha: CGFloat = 1.0) -> NSColor {
    let r = CGFloat((hex >> 16) & 0xFF) / 255.0
    let g = CGFloat((hex >> 8) & 0xFF) / 255.0
    let b = CGFloat(hex & 0xFF) / 255.0
    return NSColor(calibratedRed: r, green: g, blue: b, alpha: alpha)
}

func drawRoundedRect(_ ctx: CGContext, rect: CGRect, radius: CGFloat, fill: NSColor, stroke: NSColor? = nil, lineWidth: CGFloat = 1.0) {
    let path = CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil)
    ctx.saveGState()
    ctx.addPath(path)
    ctx.setFillColor(fill.cgColor)
    ctx.fillPath()
    if let strokeColor = stroke {
        ctx.addPath(path)
        ctx.setStrokeColor(strokeColor.cgColor)
        ctx.setLineWidth(lineWidth)
        ctx.strokePath()
    }
    ctx.restoreGState()
}

// Top-left coordinate helper (y from top of page)
func topRect(x: CGFloat, y: CGFloat, w: CGFloat, h: CGFloat) -> CGRect {
    return CGRect(x: x, y: pageHeight - y - h, width: w, height: h)
}

func drawText(_ text: String, x: CGFloat, y: CGFloat, w: CGFloat, h: CGFloat = 200, size: CGFloat = 10, weight: NSFont.Weight = .regular, color: NSColor = color(0x0F172A), align: NSTextAlignment = .left) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = align
    paragraph.lineSpacing = 2.5
    let font = NSFont.systemFont(ofSize: size, weight: weight)
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: color,
        .paragraphStyle: paragraph
    ]
    let attrStr = NSAttributedString(string: text, attributes: attrs)
    let rect = topRect(x: x, y: y, w: w, h: h)
    attrStr.draw(with: rect, options: [.usesLineFragmentOrigin, .usesFontLeading])
}

// ============================================================================
// SAYFA 1: GENEL BAKIŞ, 3 ANA FUNNEL KUTUSU VE DEAL ROOM 3 KUTU MİMARİSİ
// ============================================================================
pdfContext.beginPDFPage(nil)
let nsCtx1 = NSGraphicsContext(cgContext: pdfContext, flipped: false)
NSGraphicsContext.current = nsCtx1

// Header Banner
drawRoundedRect(pdfContext, rect: topRect(x: 36, y: 32, w: 523, h: 82), radius: 12, fill: color(0x0F172A))
drawText("DEAL ROOM — ÜRÜN VE FONKSİYON KILAVUZU", x: 54, y: 48, w: 380, size: 16, weight: .bold, color: .white)
drawText("Yapra.ai & ArdicTech Kurumsal B2B Satış, Alıcı (Buyer) & Win Metodolojisi Sistemi", x: 54, y: 73, w: 420, size: 9.5, weight: .medium, color: color(0xCBD5E1))

drawRoundedRect(pdfContext, rect: topRect(x: 455, y: 46, w: 88, h: 22), radius: 11, fill: color(0xECFDF5))
drawText("Yapra.ai", x: 455, y: 51, w: 88, size: 8.5, weight: .bold, color: color(0x059669), align: .center)

drawRoundedRect(pdfContext, rect: topRect(x: 455, y: 74, w: 88, h: 22), radius: 11, fill: color(0xEFF6FF))
drawText("ArdicTech", x: 455, y: 79, w: 88, size: 8.5, weight: .bold, color: color(0x1D4ED8), align: .center)

// Section 1: Deal Room Nedir?
drawRoundedRect(pdfContext, rect: topRect(x: 36, y: 128, w: 523, h: 150), radius: 10, fill: color(0xFFFFFF), stroke: color(0xE2E8F0))
drawText("1. Deal Room Nedir ve Ne İşe Yarar?", x: 50, y: 140, w: 495, size: 12, weight: .bold, color: color(0x0F172A))
drawText("Deal Room; Yapra.ai ve ArdicTech markalarının kurumsal satış süreçlerini, Holding ve Alt Şirket hiyerarşisini, müşteri içindeki karar verici mekanizmaları (6 Alıcı Tipi ve 14+1 Win kazanımı) ve satış risklerini (Otomatik Red Flag Motoru) bembeyaz, sade ve kullanımı çok kolay bir ekranda yöneten satış komuta merkezidir.", x: 50, y: 162, w: 495, size: 9.2, weight: .regular, color: color(0x334155))

// 3 Mini Feature Cards in Section 1
drawRoundedRect(pdfContext, rect: topRect(x: 50, y: 206, w: 158, h: 58), radius: 8, fill: color(0xF8FAFC), stroke: color(0xE2E8F0))
drawText("Holding & Alt Şirket Yapısı", x: 58, y: 214, w: 142, size: 8.8, weight: .bold, color: color(0x0F172A))
drawText("Holding çatısını ve altındaki kardeş şirketleri (Tüpraş, Arçelik vb.) gruplu takip eder.", x: 58, y: 228, w: 142, size: 7.8, color: color(0x475569))

drawRoundedRect(pdfContext, rect: topRect(x: 218, y: 206, w: 158, h: 58), radius: 8, fill: color(0xF8FAFC), stroke: color(0xE2E8F0))
drawText("6 Alıcı & 14+1 Win Motoru", x: 226, y: 214, w: 142, size: 8.8, weight: .bold, color: color(0x0F172A))
drawText("Her alıcının rolünü ve projeden elde edeceği kişisel/kurumsal kazanımı (Win) eşleştirir.", x: 226, y: 228, w: 142, size: 7.8, color: color(0x475569))

drawRoundedRect(pdfContext, rect: topRect(x: 386, y: 206, w: 158, h: 58), radius: 8, fill: color(0xF8FAFC), stroke: color(0xE2E8F0))
drawText("Otomatik Red Flag Denetçisi", x: 394, y: 214, w: 142, size: 8.8, weight: .bold, color: color(0x0F172A))
drawText("Win netleşmeden teklif çıkılması veya geciken aksiyonlarda otomatik uyarı üretir.", x: 394, y: 228, w: 142, size: 7.8, color: color(0x475569))

// Section 2: Ekran 1 - Üstte 3 Ana Kutu
drawRoundedRect(pdfContext, rect: topRect(x: 36, y: 292, w: 523, h: 175), radius: 10, fill: color(0xFFFFFF), stroke: color(0xE2E8F0))
drawText("2. Ekran 1 (Ana Ekran): Üstte 3 Ana Müşteri Kutusu (Funnel Başlıkları)", x: 50, y: 304, w: 495, size: 12, weight: .bold, color: color(0x0F172A))
drawText("Uygulamaya girildiğinde en üstte 3 büyük kutu yer alır. Her müşteri için uzun formlar doldurmadan üstteki 'Hızlı Ekle' satırından 10 saniyede kayıt açılır ve tek tıkla bir sonraki aşamaya taşınır:", x: 50, y: 325, w: 495, size: 9.0, color: color(0x475569))

drawRoundedRect(pdfContext, rect: topRect(x: 50, y: 362, w: 158, h: 92), radius: 8, fill: color(0xF8FAFC), stroke: color(0xCBD5E1))
drawText("1. Addressables", x: 60, y: 372, w: 138, size: 10, weight: .bold, color: color(0x0F172A))
drawText("Hedeflenen / Potansiyel Şirketler:\nHenüz temas kurulmamış ancak radarımızda olan Holding ve alt şirketler listesidir.", x: 60, y: 390, w: 138, size: 8.0, color: color(0x475569))

drawRoundedRect(pdfContext, rect: topRect(x: 218, y: 362, w: 158, h: 92), radius: 8, fill: color(0xEFF6FF), stroke: color(0x93C5FD))
drawText("2. Contacted", x: 228, y: 372, w: 138, size: 10, weight: .bold, color: color(0x1D4ED8))
drawText("Temas Kurulanlar:\nİlk e-posta, mesaj veya sunum iletilmiş, toplantı/dönüş beklenen müşterilerdir.", x: 228, y: 390, w: 138, size: 8.0, color: color(0x1E3A8A))

drawRoundedRect(pdfContext, rect: topRect(x: 386, y: 362, w: 158, h: 92), radius: 8, fill: color(0xECFDF5), stroke: color(0x6EE7B7))
drawText("3. Engaged (Aktif Odalar)", x: 396, y: 372, w: 138, size: 10, weight: .bold, color: color(0x059669))
drawText("Etkileşimdeki Sıcak Fırsatlar:\nToplantı yapılmış; Demo, PoC, Teklif ve Sözleşme sürecindeki aktif Deal Room'lardır.", x: 396, y: 390, w: 138, size: 8.0, color: color(0x065F46))

// Section 3: Ekran 2 - Müşteri Odası (Deal Room) İçindeki 3 Kutu
drawRoundedRect(pdfContext, rect: topRect(x: 36, y: 481, w: 523, h: 310), radius: 10, fill: color(0xFFFFFF), stroke: color(0xE2E8F0))
drawText("3. Ekran 2 (Müşteri Odası / Deal Room): İçerideki 3 Kutu Mimarisi", x: 50, y: 493, w: 495, size: 12, weight: .bold, color: color(0x0F172A))
drawText("Listedeki bir şirkete (örn. Tüpraş veya Enerjisa) tıklandığında açılan Deal Room ekranı 3 net kutudan oluşur:", x: 50, y: 513, w: 495, size: 9.0, color: color(0x475569))

// Box 1 inside Section 3
drawRoundedRect(pdfContext, rect: topRect(x: 50, y: 536, w: 495, h: 112), radius: 8, fill: color(0xF8FAFC), stroke: color(0xCBD5E1))
drawText("1. KUTU (Üst Boydan Boya): Müşteri & Holding Genel Kartı + 9 Aşamalı İnteraktif Stepper", x: 62, y: 546, w: 470, size: 9.6, weight: .bold, color: color(0x0F172A))
drawText("• Holding bağlantısını, aynı holdingdeki diğer kardeş şirketlere tek tıkla geçiş çiplerini, ilgili markayı (Yapra.ai / ArdicTech), teklif tutarını ($), fatura tarihini ve Red Flag özetini gösterir.\n• Alt kısmında üzerine tıklanarak ilerletilen 9 Aşamalı İnteraktif Satış Seviyesi (Stepper) yer alır:", x: 62, y: 564, w: 470, size: 8.3, color: color(0x334155))

let stages = ["1. İlk Temas", "2. Engagement", "3. Doküman", "4. Teknik Demo", "5. Pilot/PoC", "6. İlk Teklif", "7. Revize Teklif", "8. Sözleşme", "9. Kazanıldı"]
for (i, st) in stages.enumerated() {
    let sx = 62 + CGFloat(i) * 52.5
    drawRoundedRect(pdfContext, rect: topRect(x: sx, y: 612, w: 49, h: 24), radius: 5, fill: i == 8 ? color(0xECFDF5) : color(0xEFF6FF), stroke: i == 8 ? color(0x6EE7B7) : color(0xBFDBFE))
    drawText(st, x: sx + 2, y: 618, w: 45, size: 6.5, weight: .bold, color: i == 8 ? color(0x065F46) : color(0x1E40AF), align: .center)
}

// Box 2 & Box 3 inside Section 3
drawRoundedRect(pdfContext, rect: topRect(x: 50, y: 660, w: 240, h: 116), radius: 8, fill: color(0xF8FAFC), stroke: color(0xCBD5E1))
drawText("2. KUTU (Sol Orta): Alıcılar, Win'ler & Red Flags", x: 60, y: 670, w: 220, size: 9.3, weight: .bold, color: color(0x0F172A))
drawText("• 6 Alıcı Tipi (Buyer Role) dropdown seçimi\n• 14 Standart Çoklu Win + Özel Win (Elle Giriş)\n• 'Win Netleşti' veya 'Potansiyel Win' statüsü\n• Otomatik ve Manuel Red Flag uyarı paneli", x: 60, y: 688, w: 220, size: 8.2, color: color(0x334155))

drawRoundedRect(pdfContext, rect: topRect(x: 305, y: 660, w: 240, h: 116), radius: 8, fill: color(0xF8FAFC), stroke: color(0xCBD5E1))
drawText("3. KUTU (Sağ Orta): Aksiyon, Dosya & Tarihçe", x: 315, y: 670, w: 220, size: 9.3, weight: .bold, color: color(0x0F172A))
drawText("• Sabit 'Toplantı Sonrası Aksiyonlar (Next Steps)'\n• Sürükle-Bırak (Drag & Drop) Teklif, Revizyon, Sözleşme, Doküman ve Email yükleme alanı\n• 5 sekmeli filtrelenebilir Oda Tarihçesi (Timeline)", x: 315, y: 688, w: 220, size: 8.2, color: color(0x334155))

drawText("Sayfa 1 / 2 — Deal Room Kurumsal Satış Platformu (Yapra.ai & ArdicTech)", x: 36, y: 805, w: 523, size: 8, color: color(0x64748B), align: .center)

pdfContext.endPDFPage()

// ============================================================================
// SAYFA 2: 6 ALICI TİPİ, 14+1 WIN LİSTESİ, RED FLAG KURALLARI VE AKSİYON/ARAMA
// ============================================================================
pdfContext.beginPDFPage(nil)
let nsCtx2 = NSGraphicsContext(cgContext: pdfContext, flipped: false)
NSGraphicsContext.current = nsCtx2

// Section 4: 6 Alıcı Tipi ve 14+1 Win Seçenekleri
drawRoundedRect(pdfContext, rect: topRect(x: 36, y: 32, w: 523, h: 435), radius: 10, fill: color(0xFFFFFF), stroke: color(0xE2E8F0))
drawText("4. Alıcı Haritası: 6 Alıcı Tipi (Buyer Roles) ve 14+1 Win Seçenekleri", x: 50, y: 44, w: 495, size: 12, weight: .bold, color: color(0x0F172A))

drawText("A) 6 Alıcı Tipi (Dropdown Seçenekleri):", x: 50, y: 68, w: 495, size: 9.5, weight: .bold, color: color(0x1E293B))

let roles = [
    ("1. Karar Verici", "Projeye son onayı veren, stratejik ve yönetsel 'Evet' yetkisine sahip üst düzey yönetici."),
    ("2. Finansal Alıcı", "Bütçeyi, ROI hesabını, satınalma şartlarını ve fatura/ödeme planını onaylayan kişi (CFO, Satınalma)."),
    ("3. Kullanıcı Alıcı", "Yapra.ai veya ArdicTech ürününü günlük operasyonda bizzat kullanacak departman/ekip yöneticisi."),
    ("4. Teknik Alıcı", "IT altyapısı, siber güvenlik, KVKK/ISO uyumluluğu ve entegrasyon onayını veren teknik değerlendirici."),
    ("5. Şampiyon", "Müşteri içerisindeki rehberimiz; çözümümüzü içeride savunan, bilgi paylaşan ve kazanmamızı isteyen kişi."),
    ("6. Engelleyici", "Statükoyu veya eski sistemi koruyan, projeyi yavaşlatan veya itiraz eden kişi (Otomatik Red Flag üretir).")
]

for (idx, r) in roles.enumerated() {
    let ry = 88 + CGFloat(idx) * 24
    drawRoundedRect(pdfContext, rect: topRect(x: 50, y: ry, w: 495, h: 21), radius: 4, fill: idx % 2 == 0 ? color(0xF8FAFC) : color(0xFFFFFF), stroke: color(0xE2E8F0))
    drawText(r.0, x: 58, y: ry + 4, w: 115, size: 8.3, weight: .bold, color: color(0x0F172A))
    drawText(r.1, x: 175, y: ry + 4, w: 365, size: 8.0, color: color(0x334155))
}

drawText("B) 14 Standart 'Win' Seçeneği (Çoklu Seçilebilir) + Özel Win (Elle Giriş):", x: 50, y: 240, w: 495, size: 9.5, weight: .bold, color: color(0x1E293B))

let wins14 = [
    "1. Promosyon / Terfi Alma",
    "2. Zam / Prim Kazanma",
    "3. İş Kolaylığı & Konfor",
    "4. Hız ve Zaman Kazanma",
    "5. Kendini İspat Etme",
    "6. Yeni Teknolojiyi Hayata Geçirme",
    "7. Şirket İçi Görünürlüğün Artması",
    "8. Önem & Yetki Seviyesinin Artması",
    "9. Kafası Rahat Tatile Çıkabilme",
    "10. Maliyet Azaltma (Cost Saving)",
    "11. Kontrol Seviyesinin Artması",
    "12. Riskten Korunma / Denetim Uyumluluğu",
    "13. IT / Dış Tedarikçi Bağımlılığından Kurtulma",
    "14. Prestij / Holdingde Örnek Proje Çıkarma"
]

for (idx, w) in wins14.enumerated() {
    let col = idx % 2
    let row = idx / 2
    let wx = 50 + CGFloat(col) * 252
    let wy = 260 + CGFloat(row) * 21
    drawRoundedRect(pdfContext, rect: topRect(x: wx, y: wy, w: 243, h: 18), radius: 4, fill: color(0xF8FAFC), stroke: color(0xE2E8F0))
    drawText(w, x: wx + 8, y: wy + 3, w: 228, size: 8.0, color: color(0x1E293B))
}

drawText("+ Özel Win Girişi (Elle Yazma): 14 standart maddenin altında kişiye özel motivasyon serbest metin olarak eklenir.\n+ Win Durumu: Her alıcıya '✅ Win Netleşti / Yaratıldı' veya '⏳ Henüz Yaratılmadı (Potansiyel Win)' statüsü verilir.", x: 50, y: 414, w: 495, size: 8.3, weight: .medium, color: color(0x334155))

// Section 5: Otomatik Red Flag Kuralları
drawRoundedRect(pdfContext, rect: topRect(x: 36, y: 480, w: 523, h: 128), radius: 10, fill: color(0xFEF2F2), stroke: color(0xFECACA))
drawText("5. Otomatik Red Flag (Kırmızı Bayrak) Denetim Kuralları", x: 50, y: 492, w: 495, size: 11.5, weight: .bold, color: color(0xDC2626))
drawText("• KURAL 1 (Potansiyel Win ile Teklif Çıkılması): 9 aşamalı Stepper'da '6. İlk Teklif' (veya sonrası) aşamasına geçildiğinde, alıcılardan birinin durumu hâlâ '⏳ Potansiyel Win' olarak duruyorsa sistem otomatik Red Flag üretir.\n• KURAL 2 (Engelleyici Varlığı): Odada 'Engelleyici' rolünde bir alıcı varsa otomatik risk bayrağı kaldırılır.\n• KURAL 3 (Karar Verici Eksikliği): '4. Teknik Demo' ve sonrasına gelindiği halde Karar Verici yoksa uyarı verir.\n• KURAL 4 (Geciken Toplantı Aksiyonu): Termin tarihi (Due Date) geçmiş ve tamamlanmamış aksiyon varsa Red Flag üretir.", x: 50, y: 514, w: 495, size: 8.4, color: color(0x991B1B))

// Section 6: Aksiyonlar, Drag & Drop, Arama, AI Agent ve Supabase
drawRoundedRect(pdfContext, rect: topRect(x: 36, y: 622, w: 523, h: 168), radius: 10, fill: color(0xFFFFFF), stroke: color(0xE2E8F0))
drawText("6. Toplantı Sonrası Aksiyonlar, Drag & Drop, Global Arama, AI Agent ve Supabase", x: 50, y: 634, w: 495, size: 11.5, weight: .bold, color: color(0x0F172A))

drawText("• Toplantı Sonrası Aksiyonlar (Next Steps): 3. Kutunun en üstünde sabit durur. Ayrıca toplantı notu veya email metni eklenirken içindeki '- ' ile başlayan maddeler otomatik olarak Aksiyonlar listesine aktarılır.\n• Drag & Drop (Sürükle-Bırak) & 5 Filtre: Teklif PDF, Revizyon, Sözleşme, Doküman ve Email dosyaları fareyle sürüklenip bırakılır. Tarihçe; Toplantı Notları, Emailler, Teklifler & Revizyonlar, Doküman & Sözleşmeler olarak filtrelenir.\n• Global Arama (Search): Üst bardan Holding, şirket, kişi adı, teklif PDF'i veya toplantı notu kelimesi anında aranır.\n• DealRoom AI Agent & Supabase: Sağ alttaki AI asistana Türkçe sorular ('Red flag olan müşteriler hangileri?', 'Bu ay faturası kesilecekler') sorulabilir. Veriler yerel veritabanında ve Supabase PostgreSQL bulutunda çalışır.", x: 50, y: 656, w: 495, size: 8.4, color: color(0x334155))

drawText("Sayfa 2 / 2 — Canlı Uygulama Adresi: http://localhost:3000", x: 36, y: 805, w: 523, size: 8, color: color(0x64748B), align: .center)

pdfContext.endPDFPage()
pdfContext.closePDF()
print("PDF generated successfully at \(pdfPath)")
