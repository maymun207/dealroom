# DealRoom — Yapra.ai & ArdicTech Kurumsal Satış ve Müşteri Deal Room Platformu

**DealRoom**, **Yapra.ai** ve **ArdicTech** ekipleri için tasarlanmış; saf beyaz (`#FFFFFF`) estetikte, ultra sade, hızlı ve responsive (Mac, PC, iPad ve Mobil uyumlu) bir B2B Kurumsal Satış ve Müşteri Deal Room uygulamasıdır.

## ✨ Temel Özellikler

### 1. Ekran 0 — Giriş & Hızlı Kayıt (Login / Register)
- Saf beyaz zemin üzerinde 3 halkalı **DealRoom** logosu ve tek bir e-posta giriş alanı.
- Kayıtlı satıcıları otomatik tanır; yeni e-posta girildiğinde anında profil oluşturup kişisel DealRoom ekranına yönlendirir.

### 2. Ekran 1 — Satıcının Kişisel DealRoom Ekranı (Dashboard)
- **Üst Bar (Hover Card Hunisi):** `🎯 Addressables`, `📩 Contacted` ve `🤝 Engaged` aşamalarındaki müşterileri sayılarıyla birlikte ince beyaz butonlarda gösterir. Üzerine gelindiğinde veya tıklandığında açılan **Hover Card** içinden müşteri seçilerek doğrudan Deal Room sayfasına gidilir.
- **Görünüm Filtresi:** Sağ üstte `👤 Benimkiler` ve `🌐 Benimkiler + Public` geçişi.
- **Merkez Hero CTA:** Müşteri adı girilerek mevcut odaya anında geçiş yapılır; listede olmayan bir müşteri girildiğinde açılan **Hover Card** ile *Holding*, *Kontak Kişi*, *Marka (Yapra.ai / ArdicTech)* ve *Public/Private* seçilerek `Addressables` altına kaydedilir.
- **Alt 3 İnce Kutu (`Hover Card` + `⤢ Genişlet`):**
  - `🚩 Red Flag Uyarıları`
  - `⚡ Açık Aksiyonlar`
  - `💰 Son Gönderilen Teklifler` (Hover Card'da son 5 teklif, `⤢` ile arka planı flu yaparak tüm teklifler).

### 3. Ekran 2 — Müşteri Deal Room Sayfası
- **En Üst İnce Satış Seviyesi Şeridi:** 9 aşamalı interaktif satış hunisi (*1. İlk Temas ➔ 2. Engagement ➔ 3. Doküman Paylaşımı ➔ 4. Teknik Demo ➔ 5. Pilot/PoC ➔ 6. İlk Teklif ➔ 7. Revize Teklif ➔ 8. Sözleşme ➔ 9. Kazanıldı*).
- **Merkez Müşteri Tanıtım Kartı:** Şirket, Holding, Marka ve Görünürlük bilgileri ile alt kısmında yan yana **Teklif / Fırsat Hacmi**, **Hedef Fatura Tarihi** ve **Red Flag & Eksik** özet kutuları.
- **Alt 5 İnce Kutu (`Hover Card` + `⤢ Genişlet`):**
  1. `👥 Alıcılar & Win'ler`: 6 sabit alıcı rolü (*Karar Verici, Finansal Alıcı, Kullanıcı Alıcı, Teknik Alıcı, Şampiyon, Engelleyici*), iletişim bilgileri (`Title`, `Email`, `Tel`), Win durumu ve **14 Standart Win + ✍️ Elle Özel Win Ekleme** açılır menüsü.
  2. `🚩 Red Flag & Eksik Bilgiler`: Otomatik kurallar ve manuel risk/eksik bilgi takibi.
  3. `⚡ Toplantı Sonrası Aksiyonlar`: Sorumlu kişi ve termin tarihli aksiyon listesi.
  4. `📂 Teklifler, Notlar & Dosyalar`: Sürükle-bırak dosya yükleme ve filtreli zaman tüneli.
  5. `⚔️ Rakipler`: Rakip analizi, güçlü/zayıf yönler ve strateji kartları.

## 🚀 Kurulum ve Çalıştırma

```bash
node server.js
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde (ve yerel ağdaki iPad/mobil cihazlar için yerel IP üzerinden) çalışır.
