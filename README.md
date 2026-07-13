# Sivas Huzurevi — QR Kodlu Sakin Bilgi Ekranı

T.C. Aile ve Sosyal Hizmetler Bakanlığı — Sivas Huzurevi Yaşlı Bakım ve Rehabilitasyon
Merkezi Müdürlüğü için hazırlanmış, oda kapılarına asılan QR kod / barkod okutulduğunda
o odada kalan kişinin sağlık ve iletişim bilgilerini gösteren statik web sitesi.

Sunucu veya veritabanı gerektirmez; tamamen statik dosyalardan oluşur ve
**GitHub Pages** üzerinde ücretsiz olarak yayınlanabilir.

## Oda kodlama sistemi

Kurumda toplam **96 oda** vardır ve odalar **BLOK-KATODA** formatında kodlanır
(Z = Zemin kat):

```
A Blok (36 oda):  A-Z01 .. A-Z12   → Zemin Kat
                  A-101 .. A-112   → 1. Kat
                  A-201 .. A-212   → 2. Kat

B Blok (24 oda):  B-101 .. B-112   → 1. Kat
                  B-201 .. B-212   → 2. Kat   (B Blokta zemin kat yok)

C Blok (36 oda):  C-Z01 .. C-Z12   → Zemin Kat
                  C-101 .. C-112   → 1. Kat
                  C-201 .. C-212   → 2. Kat
```

36 + 24 + 36 = **96 oda**. Bu kod hem `rooms/` altındaki klasör adı, hem QR
kodun yönlendirdiği adres, hem de ekranda görünen oda rozeti olarak
kullanılır. Bu depoda **96 odanın tamamı için klasör ve boş `settings.json`
şablonu hazır** — her odaya ayrıca nötr bir **yer tutucu fotoğraf** da
konmuştur. Yapmanız gereken sadece isim/sağlık bilgilerini girip gerçek
fotoğrafı eklemeniz
yeterli (bkz. "Tek tek yeni oda / sakin eklemek").

## Kişi sayfasından aramaya dönmek

Bir odanın bilgi ekranı açıldığında sayfanın üstünde **"← Aramaya Dön"**
butonu bulunur; buna dokunmak sizi doğrudan oda arama ekranına geri
götürür.

## ⚠️ Yerelde test ederken dikkat

Bu dosyaya bilgisayarınızda **çift tıklayıp** tarayıcıda açarsanız
(`file://...` ile başlayan bir adres), oda bilgileri **yüklenmez** ve hangi
oda kodunu girerseniz girin "bulunamadı" hatası alırsınız. Bunun sebebi
tarayıcıların güvenlik politikası gereği `file://` üzerinden yerel JSON
dosyalarını okumaya izin vermemesidir — kodda bir hata değildir.

Yerelde doğru test etmek için basit bir sunucu başlatın:

```bash
python3 tools/serve_local.py
```

ve tarayıcıda `http://localhost:8000/index.html?oda=A-101` adresini açın.
Site GitHub Pages üzerinden yayınlandığında bu sorun zaten oluşmaz.

## Nasıl çalışır?

- `index.html` sabittir, tüm odalar için **aynı sayfa** kullanılır.
- Görüntülenecek oda, adres çubuğundaki parametre ile belirlenir:
  ```
  index.html?oda=A-101
  ```
- Sayfa açıldığında `rooms/A-101/settings.json` dosyası okunur ve ekrana basılır.
- Fotoğraf `rooms/A-101/picture-A-101.jpg` (veya `.png` / `.jpeg`) dosyasından
  otomatik yüklenir; dosya yoksa nötr bir silüet gösterilir.
- Odaya asılan QR kod, doğrudan `.../index.html?oda=A-101` adresine yönlendirir —
  personel telefonuyla okuttuğunda direkt o odanın bilgi ekranı açılır.
- Oda kodu girilmeden `index.html` açılırsa, test amaçlı basit bir "oda kodu gir"
  ekranı çıkar.

## Klasör yapısı

```
├── index.html                  ← Tek ve sabit bilgi ekranı sayfası
├── admin.html                  ← Yönetim paneli (bilgileri GitHub'a commit ederek günceller)
├── assets/
│   ├── css/style.css
│   ├── css/admin.css
│   ├── js/app.js                ← Bilgi ekranı mantığı
│   └── js/admin.js              ← Yönetim paneli / GitHub API mantığı
├── rooms/                       ← 96 oda, her biri için bir alt klasör
│   ├── A-Z01/ .. A-Z12/          ← A Blok Zemin Kat
│   ├── A-101/ .. A-112/          ← A Blok 1. Kat
│   ├── A-201/ .. A-212/          ← A Blok 2. Kat
│   ├── B-101/ .. B-112/          ← B Blok 1. Kat
│   ├── B-201/ .. B-212/          ← B Blok 2. Kat
│   ├── C-Z01/ .. C-Z12/          ← C Blok Zemin Kat
│   ├── C-101/ .. C-112/          ← C Blok 1. Kat
│   ├── C-201/ .. C-212/          ← C Blok 2. Kat
│   │     each folder contains:
│   │       settings.json        ← Odadaki kişinin tüm bilgileri (şimdilik boş şablon)
│   │       picture-<oda_kodu>.png  ← Fotoğraf (şu an yer tutucu; gerçek fotoğrafla değiştirin)
│   └── index.json                ← Arama/öneri için oda kodu + isim dizini
└── tools/
    ├── generate_qr.py           ← Odalar için QR kod üretme scripti
    ├── scaffold_rooms.py        ← Blok/kat/oda sayısına göre toplu klasör oluşturur
    ├── build_index.py           ← rooms/index.json dosyasını günceller
    ├── generate_placeholder_photos.py  ← Eksik odalara yer tutucu fotoğraf ekler
    └── serve_local.py           ← Yerelde test için basit sunucu
```

## Tüm oda klasörlerini tek seferde oluşturmak

Bu depoda 96 odanın tamamı zaten hazır. İleride yeni bir blok/kat eklemeniz
gerekirse aynı yöntemi kullanabilirsiniz — bu site şu iki komutla üretildi:

```bash
# A ve C blokları: Zemin + 1. + 2. kat, her katta 12 oda
python3 tools/scaffold_rooms.py --bloklar A C --katlar Z 1 2 --oda-sayisi 12

# B blogu: sadece 1. ve 2. kat (zemin kat yok)
python3 tools/scaffold_rooms.py --bloklar B --katlar 1 2 --oda-sayisi 12
```

Daha sonra her klasördeki `settings.json` dosyasını doldurmanız ve fotoğrafı
eklemeniz yeterlidir. **Var olan klasörlerin üzerine yazılmaz**, script
güvenle tekrar tekrar çalıştırılabilir. Odaları doldurduktan sonra arama
dizinini güncellemeyi unutmayın: `python3 tools/build_index.py`

## Oda kodu veya isimle arama (yazarken öneri)

Ana ekrandaki arama kutusuna hem **oda kodu** (`A-101`) hem de **sakinin adı**
(`Ahmet Yılmaz`) yazılabilir; yazarken eşleşen kayıtlar otomatik olarak
öneri listesinde çıkar, birine dokunmak direkt o odayı açar.

Bu özellik `rooms/index.json` dosyasındaki oda kodu + isim listesine göre
çalışır. **Yeni bir oda eklediğinizde veya bir ismi değiştirdiğinizde**, bu
dizini yeniden oluşturmanız gerekir:

```bash
python3 tools/build_index.py
```

Bu komut `rooms/` altındaki tüm `settings.json` dosyalarını tarar ve
`rooms/index.json` dosyasını günceller. **Bu dosyayı da diğerleriyle
birlikte GitHub'a `push` etmeyi unutmayın**, aksi halde arama/öneri
özelliği güncel odaları göremez. (Not: `index.json` yalnızca oda kodu ve
isim içerir; sağlık/iletişim bilgileri bu dosyaya yazılmaz, onlar hâlâ
ilgili odanın kendi `settings.json` dosyasında kalır ve yalnızca o oda
açıldığında okunur.)

## Bir odanın sakin bilgisini doldurmak

96 odanın tamamı için klasör ve boş `settings.json` şablonu zaten hazır.
Bir sakini sisteme girmek için:

1. `rooms/<oda_kodu>/settings.json` dosyasını açın, örn. `rooms/B-105/settings.json`.
2. Şablondaki alanları doldurun:

   ```json
   {
     "ad_soyad": "Ad Soyad",
     "oda_no": "B-105",
     "giris_tarihi": "GG.AA.YYYY",
     "tc_kimlik_no": "12345678901",
     "iletisim": {
       "kendisi": { "ad": "Ad Soyad", "telefon": "05XXXXXXXXX" },
       "yakinlar": [
         { "ad": "Yakını Adı (Yakınlık Derecesi)", "telefon": "05XXXXXXXXX" },
         { "ad": "", "telefon": "" },
         { "ad": "", "telefon": "" }
       ]
     },
     "ilaclar": [
       { "ad": "Coumadin 5mg", "dozaj": "1 Tablet", "vakit": ["Akşam"] }
     ],
     "hastaliklar": ["Hastalık adı"],
     "ameliyatlar": ["Yıl - Ameliyat adı"],
     "notlar": "Serbest metin."
   }
   ```

   - `yakinlar` dizisinde en fazla **3 kişi** gösterilir; boş bırakılan kayıtlar
     otomatik olarak ekranda gizlenir.
   - `ilaclar`, `hastaliklar`, `ameliyatlar` alanları listedir; kayıt yoksa
     `[]` (boş dizi) bırakılabilir.

3. Klasörde zaten bir **yer tutucu fotoğraf** (`picture-B-105.png`) var.
   Gerçek fotoğrafı aynı klasöre `picture-B-105.jpg` (veya `.jpeg`) olarak
   eklemeniz yeterli — site `.jpg`/`.jpeg` dosyasını otomatik olarak yer
   tutucu `.png` dosyasından önce gösterir, ayrıca eski dosyayı silmenize
   gerek yoktur. (Gerçek fotoğrafı da `.png` olarak eklerseniz, doğrudan
   yer tutucunun üzerine yazılır.)
4. Arama/öneri dizinini güncelleyin: `python3 tools/build_index.py`
5. Değişiklikleri (settings.json, fotoğraf, güncellenmiş `rooms/index.json`)
   GitHub'a `push` edin — GitHub Pages otomatik olarak güncellenir.

## QR kod üretimi

Her odanın kapısına asılacak QR kodu üretmek için:

```bash
cd tools
pip install -r requirements.txt
python3 generate_qr.py https://kullaniciadi.github.io/repo-adi/
```

Bu komut, `rooms/<oda_kodu>/qr-<oda_kodu>.png` dosyalarını üretir (örn.
`rooms/A-101/qr-A-101.png`). Bu görseller yazdırılıp odanın kapısına
asılabilir. (İsterseniz herhangi bir online QR kod üretici ile de
`.../index.html?oda=A-101` linkini QR koda çevirebilirsiniz.)

## GitHub Pages ile yayınlama

1. Bu klasörü bir GitHub deposuna (repo) yükleyin.
2. Depo ayarlarında **Settings → Pages** bölümüne gidin.
3. "Branch" olarak `main` (veya kullandığınız dal) ve klasör olarak `/ (root)`
   seçin, kaydedin.
4. Birkaç dakika içinde siteniz `https://kullaniciadi.github.io/repo-adi/`
   adresinde yayında olacaktır.
5. QR kodları oluştururken bu adresi kullanın (bkz. yukarıdaki QR kod üretimi).

## Tasarım

Sade, tek vurgu renkli (koyu teal) ve yüksek okunurluklu bir arayüz:

- Üstte fotoğraf, isim, oda kodu rozeti ve giriş tarihinin yer aldığı tek
  bir kimlik kartı.
- Her bilgi bölümü (İletişim, İlaç, Hastalık, Ameliyat, Not) aynı sade kart
  stilinde, ikon rozetiyle ayrılmış şekilde alt alta sıralanır.
- **112 acil çağrı butonu, ekranın alt ortasında sabit dairesel bir buton**
  olarak durur; sayfa kaydırılsa bile her zaman aynı yerde (en altta, ortada)
  kalır ve tek dokunuşla arar. Dikkat çekmesi için kırmızı renkte ve hafif
  nabız animasyonuyla tasarlanmıştır.
- Kişi bilgi ekranının üstünde **"← Aramaya Dön"** butonu bulunur, tek
  dokunuşla oda arama ekranına geri döner.

## Özellikler

- 🏠 **96 odanın tamamı** (A/B/C blok, zemin+1.+2. kat) için hazır klasör ve
  boş `settings.json` şablonu — sadece bilgi girip fotoğraf eklemeniz yeterli.
- 🔎 Oda kodu veya isimle **yazarken öneri** (autocomplete) ile arama.
- ← Kişi sayfasından tek dokunuşla oda arama ekranına dönüş.
- 📷 **2 sütunlu profil düzeni**: solda büyütülmüş fotoğraf + o odaya özel
  **QR kod** (ve "QR Kodu İndir" butonu), sağda tüm bilgiler.
- 🪪 İsim, oda kodu, giriş tarihi ve (girildiyse) T.C. Kimlik No.
- ☎️ İletişim bilgileri: sakinin kendi numarası + en fazla 3 yakınının adı ve
  numarası; numaraya dokunulduğunda telefon direkt arar (`tel:` linki).
- 🚑 Ekranın alt ortasında sabit duran, tek dokunuşla **112**'yi arayan
  "Acil Çağrı 112" butonu.
- 💊 İlaç bilgileri, 🩺 hastalık bilgileri, 🏥 geçmiş ameliyat bilgileri,
  📝 notlar bölümleri.
- 🎛️ **Yönetim paneli** (`admin.html`): form ile bilgi güncelleme, fotoğraf
  yükleme + kırpma, **ilaç/hastalık için akıllı arama + dozaj/vakit seçimi**,
  onay modalı ile **sakin bilgilerini silme** (oda boş şablona döner).
- 📊 **Toplu Raporlar** sekmesi: tüm sakinleri filtrelenebilir tabloda
  gösterir, tek tuşla yazdırma/PDF kaydetme.
- 🎨 Kurumsal kırmızı renk paleti, logo/favicon alanları hazır (dosyaları
  kurumdan temin edip `assets/` klasörüne eklemeniz yeterli).
- Veritabanı / sunucu gerektirmez, tamamen statik ve ücretsiz barındırılabilir.
- Mobil uyumlu (personel QR kodu telefonla okutarak açar).

## İlaç / Hastalık akıllı arama ve toplu rapor

Admin panelinde ilaç ve hastalık artık düz metin yerine **arama kutusu +
listeden seçme / yeni isim ekleme** şeklinde giriliyor:

- Yazmaya başladığınızda `assets/data/ilac-listesi.json` /
  `assets/data/hastalik-listesi.json` içindeki isimler önerilir — bunlar
  **resmi bir ilaç veritabanı değil**, sadece hızlı giriş için hazırlanmış
  küçük bir referans listesidir. Listede olmayan bir isim yazıp yine de
  "Ekle" diyebilirsiniz.
- İlaçlar için ayrıca **dozaj** (0,5 / 1 / 2 / 3 Tablet) ve **vakit**
  (Sabah/Öğle/Akşam/Gece, birden fazla seçilebilir) belirtiliyor.
- Eklenen her kayıt bir "çip" olarak listelenir, çarpıya basarak kaldırılır.

Bu listeleri kurumun kendi ihtiyaçlarına göre büyütmek isterseniz, ilgili
JSON dosyalarını doğrudan düzenleyebilirsiniz (basit bir metin listesi).

**Toplu Raporlar:** Admin panelinde üstteki **"Toplu Raporlar"** sekmesi,
tüm sakinleri Ad Soyadı / Oda No / Hastalıklar / Aktif İlaçlar sütunlarıyla
tek bir tabloda gösterir. Oda/kat, hastalık veya ilaca göre filtrelenebilir;
**"Yazdır / PDF Kaydet"** butonu yalnızca temiz tabloyu yazdırır (menüler,
butonlar otomatik gizlenir).

Bu ekran, hız için `rooms/rapor-verisi.json` adlı **tek bir özet dosyayı**
okur (96 ayrı dosya yerine). Bu dosya, admin panelinden yapılan her
kayıt/silme işleminde **otomatik güncellenir** — elle bir şey yapmanıza
gerek yok. Yalnızca `settings.json` dosyalarını admin paneli **dışında**
(elle/toplu) düzenlerseniz, özet dosyayı yeniden oluşturmak için:

```bash
python3 tools/build_rapor.py
```

## Yönetim paneli (admin.html) — bilgileri pratik şekilde güncelleme

`settings.json` dosyalarını elle düzenlemek yerine, tarayıcıdan form
doldurarak güncelleyebileceğiniz bir yönetim paneli eklendi: **`admin.html`**.

**Bu nasıl çalışıyor?** GitHub Pages tamamen statiktir, yani bir sunucu veya
veritabanı yoktur. Bu panel, sizin yerinize **GitHub'ın kendi API'sini**
kullanarak formdaki bilgileri doğrudan ilgili `settings.json` dosyasına
(gerekirse fotoğrafa ve `rooms/index.json`'a) bir **commit** olarak yazar.
Yani "admin panelinden kaydet" dediğinizde aslında GitHub'a bir commit
atılmış olur ve birkaç dakika içinde GitHub Pages siteyi otomatik günceller.
Ekstra sunucu, veritabanı veya barındırma maliyeti gerekmez — sadece
statik dosyalarla ve tarayıcıdan çalışır.

### Kurulum: Erişim Token'ı oluşturma

Panelin GitHub'a yazabilmesi için bir **Personal Access Token** gerekir:

1. GitHub'da **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token** yolunu izleyin.
2. **Repository access** kısmında **"Only select repositories"**'i seçip
   **yalnızca bu depoyu** seçin (tüm hesaba erişim vermeyin).
3. **Permissions → Repository permissions** altında **Contents** iznini
   **Read and write** yapın. Başka izin vermeyin.
4. Bir **son kullanma tarihi (expiration)** belirleyin (örn. 90 gün) ve
   token'ı oluşturun.
5. Oluşan token'ı (yalnızca bir kez gösterilir) güvenli bir yere not edin —
   bu, panele giriş yaparken kullanacağınız "şifre" gibidir.

### Kullanım

1. Siteniz yayına alındıktan sonra `https://kullaniciadi.github.io/repo-adi/admin.html`
   adresini açın (veya yerelde `python3 tools/serve_local.py` ile test edin).
2. GitHub kullanıcı adınızı, depo adınızı, dal adını (`main`) ve token'ı girip
   **Bağlan**'a basın.
3. Arama kutusuna oda kodu veya isim yazıp odayı seçin.
4. Formu doldurun, isterseniz fotoğraf yükleyin, **Kaydet**'e basın.
5. Kaydedince değişiklik doğrudan GitHub'a commit'lenir; site birkaç dakika
   içinde günceli gösterir.

### ⚠️ Token güvenliği hakkında önemli uyarılar

- Bu token, girildiği tarayıcı sekmesinin belleğinde tutulur ve hiçbir
  yere (bize, üçüncü bir sunucuya) gönderilmez — yalnızca doğrudan GitHub'a
  gider. **"Bu cihazda hatırla"** kutusunu işaretlerseniz tarayıcının
  `sessionStorage`'ında tutulur (sekme kapanınca silinir); bunu yalnızca
  kendi/kilitli bilgisayarınızda kullanın, ortak/paylaşımlı cihazlarda
  **işaretlemeyin**.
- Token'ı kimseyle paylaşmayın, koda/repoya **asla commit etmeyin**.
  Kaybettiğinizi veya sızdığını düşünürseniz GitHub ayarlarından hemen
  **iptal edin (revoke)** ve yenisini oluşturun.
- Token'ı yalnızca bu depoya ve yalnızca "Contents: Read and write" iznine
  sınırlı tutarsanız, sızması durumunda oluşacak zarar da bu depoyla
  sınırlı kalır.
- Panele erişebilen ve geçerli bir token'a sahip olan herkes odaların
  bilgilerini değiştirebilir; bu URL'yi yalnızca yetkili personelle
  paylaşın.

## Güvenlik notu

Bu depo GitHub Pages üzerinden **herkese açık** yayınlanırsa, buradaki kişisel
sağlık bilgileri de herkese açık hale gelir — bu durum yalnızca bilgi
ekranı (`index.html`) için değil, yönetim paneli üzerinden **okunan**
veriler için de geçerlidir (panelin kendisi token olmadan yazma yapamaz,
ama repo herkese açıksa veriler zaten herkese açık okunabilir demektir).
Gerçek kullanımda deponun **private** (gizli) tutulması ve GitHub Pages'in
kurum içi/özel bir domainde ya da erişimi kısıtlı bir sunucuda
barındırılması önerilir. Alternatif olarak GitHub Enterprise / kurumsal bir
sunucuya (Nginx/Apache ile statik dosya sunumu) taşınabilir; kodun tamamı
statik olduğu için herhangi bir web sunucusunda değişiklik yapmadan çalışır.
