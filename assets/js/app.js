/* ============================================================
   Sivas Huzurevi — Sakin Bilgi Ekranı
   QR kod, index.html?oda=ODA_NUMARASI adresine yönlendirir.
   Veri kaynağı: rooms/<oda_no>/settings.json
   Fotoğraf: rooms/<oda_no>/picture-<oda_no>.(jpg|jpeg|png)
   ============================================================ */

(function () {
  "use strict";

  // Sayfa doğrudan çift tıklanarak (file://) açıldıysa fetch() ile veri
  // okunamaz. Kullanıcıyı bilgilendir ki "hiçbir oda kodu çalışmıyor"
  // sanmasın.
  if (window.location.protocol === "file:") {
    var uyari = document.getElementById("dosya-uyarisi");
    if (uyari) uyari.classList.remove("hidden");
  }

  // ---------- Oda dizini (arama / öneri için) ----------
  var ODA_DIZINI = null; // rooms/index.json yüklendiğinde doldurulur
  var odaInput = document.getElementById("oda-input");
  var oneriKutusu = document.getElementById("oneriler");
  var aktifOneriIndex = -1;

  function normalize(metin) {
    return (metin || "").toLocaleUpperCase("tr").trim();
  }

  function dizinYukle() {
    fetch("rooms/index.json", { cache: "no-store" })
      .then(function (yanit) { return yanit.ok ? yanit.json() : []; })
      .then(function (veri) { ODA_DIZINI = Array.isArray(veri) ? veri : []; })
      .catch(function () { ODA_DIZINI = []; });
  }

  function eslesenleriBul(sorgu) {
    if (!ODA_DIZINI || !sorgu) return [];
    var s = normalize(sorgu);
    return ODA_DIZINI
      .filter(function (kayit) {
        return normalize(kayit.oda_no).indexOf(s) !== -1 ||
               normalize(kayit.ad_soyad).indexOf(s) !== -1;
      })
      .slice(0, 6);
  }

  function oneriGizle() {
    oneriKutusu.classList.add("hidden");
    oneriKutusu.innerHTML = "";
    aktifOneriIndex = -1;
  }

  function oneriGoster(sonuclar) {
    oneriKutusu.innerHTML = "";
    if (!sonuclar.length) { oneriGizle(); return; }

    sonuclar.forEach(function (kayit) {
      var satir = document.createElement("div");
      satir.className = "oneri-satir";
      satir.setAttribute("role", "option");

      var ad = document.createElement("span");
      ad.className = "oneri-ad";
      ad.textContent = kayit.ad_soyad || "İsimsiz";

      var oda = document.createElement("span");
      oda.className = "oneri-oda";
      oda.textContent = kayit.oda_no;

      satir.appendChild(ad);
      satir.appendChild(oda);
      satir.addEventListener("mousedown", function (e) {
        e.preventDefault();
        gitOdaya(kayit.oda_no);
      });
      oneriKutusu.appendChild(satir);
    });

    oneriKutusu.classList.remove("hidden");
  }

  function gitOdaya(odaKodu) {
    window.location.search = "?oda=" + encodeURIComponent(odaKodu);
  }

  odaInput.addEventListener("input", function () {
    oneriGoster(eslesenleriBul(odaInput.value));
  });
  odaInput.addEventListener("focus", function () {
    if (odaInput.value) oneriGoster(eslesenleriBul(odaInput.value));
  });
  odaInput.addEventListener("blur", function () {
    // mousedown zaten tıklamayı yakaladığı için kısa gecikmeyle kapatmak güvenli
    setTimeout(oneriGizle, 100);
  });
  odaInput.addEventListener("keydown", function (e) {
    var satirlar = oneriKutusu.querySelectorAll(".oneri-satir");
    if (!satirlar.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      aktifOneriIndex = Math.min(aktifOneriIndex + 1, satirlar.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      aktifOneriIndex = Math.max(aktifOneriIndex - 1, 0);
    } else if (e.key === "Enter" && aktifOneriIndex >= 0) {
      e.preventDefault();
      satirlar[aktifOneriIndex].dispatchEvent(new Event("mousedown"));
      return;
    } else {
      return;
    }

    satirlar.forEach(function (s, i) {
      s.classList.toggle("aktif", i === aktifOneriIndex);
    });
    satirlar[aktifOneriIndex].scrollIntoView({ block: "nearest" });
  });

  var PANELS = {
    arama: document.getElementById("oda-arama"),
    yukleniyor: document.getElementById("yukleniyor"),
    hata: document.getElementById("hata"),
    icerik: document.getElementById("icerik"),
  };

  function panelGoster(ad) {
    Object.keys(PANELS).forEach(function (k) {
      PANELS[k].classList.toggle("hidden", k !== ad);
    });
  }

  // Oda kodu formatı: BLOK-KATODA  ör. A-101, A-112, A-201, B-105
  function odaNoAl() {
    var params = new URLSearchParams(window.location.search);
    var oda = params.get("oda");
    return oda ? oda.trim().toUpperCase() : null;
  }

  // Varsayılan (fotoğraf bulunamazsa) kullanılacak nötr silüet — SVG data URI
  var VARSAYILAN_FOTO =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
      '<rect width="200" height="200" fill="#EFEAE0"/>' +
      '<circle cx="100" cy="78" r="38" fill="#B9832E"/>' +
      '<path d="M30 190c0-55 40-90 70-90s70 35 70 90z" fill="#B9832E"/>' +
      "</svg>"
    );

  function fotoYukle(odaNo) {
    var uzantilar = ["jpg", "jpeg", "png"];
    var img = document.getElementById("foto");
    img.alt = "Sakin fotoğrafı";
    // Fotoğraf güncellendiğinde tarayıcı/CDN önbelleğinin eski görseli
    // göstermeye devam etmemesi için her yüklemede benzersiz bir sorgu
    // parametresi ekleniyor (dosya adı aynı kalsa da her seferinde
    // sunucudan taze kopya istenir).
    var onbellekAtlat = "?v=" + Date.now();

    function dene(i) {
      if (i >= uzantilar.length) {
        img.src = VARSAYILAN_FOTO;
        return;
      }
      var aday = new Image();
      var yol = "rooms/" + encodeURIComponent(odaNo) + "/picture-" + odaNo + "." + uzantilar[i];
      aday.onload = function () { img.src = yol + onbellekAtlat; };
      aday.onerror = function () { dene(i + 1); };
      aday.src = yol + onbellekAtlat;
    }
    dene(0);
  }

  function telSatiriOlustur(ad, telefon, etiket) {
    var satir = document.createElement("div");
    satir.className = "iletisim-satir";

    var etiketSpan = document.createElement("span");
    etiketSpan.className = "iletisim-etiket";
    etiketSpan.textContent = etiket;

    var link = document.createElement("a");
    link.className = "tel-link";
    link.href = "tel:" + telefon.replace(/\s+/g, "");
    link.textContent = ad + " · " + telefon;

    satir.appendChild(etiketSpan);
    satir.appendChild(link);
    return satir;
  }

  function listeDoldur(ulID, dizi) {
    var ul = document.getElementById(ulID);
    ul.innerHTML = "";
    (dizi || []).forEach(function (madde) {
      if (!madde) return;
      var li = document.createElement("li");
      li.textContent = madde;
      ul.appendChild(li);
    });
  }

  // İlaçlar hem eski (düz metin) hem yeni ({ad, dozaj, vakit}) formatı
  // destekler; ekranda "İlaç adı — Dozaj — Vakit: Sabah, Akşam" şeklinde gösterilir.
  function ilacListesiniDoldur(ulID, dizi) {
    var ul = document.getElementById(ulID);
    ul.innerHTML = "";
    (dizi || []).forEach(function (madde) {
      if (!madde) return;
      var li = document.createElement("li");
      if (typeof madde === "string") {
        li.textContent = madde;
      } else {
        var parcalar = [madde.ad];
        if (madde.dozaj) parcalar.push(madde.dozaj);
        if (madde.vakit && madde.vakit.length) parcalar.push("Vakit: " + madde.vakit.join(", "));
        li.textContent = parcalar.join(" — ");
      }
      ul.appendChild(li);
    });
  }

  function icerigiDoldur(veri, odaNo) {
    document.title = (veri.ad_soyad || "Sakin") + " · Oda " + odaNo;

    document.getElementById("ad-soyad").textContent = veri.ad_soyad || "—";
    document.getElementById("oda-no").textContent = veri.oda_no || odaNo;
    document.getElementById("giris-tarihi").textContent = veri.giris_tarihi || "—";

    var tcSatiri = document.getElementById("tc-kimlik-satiri");
    if (veri.tc_kimlik_no) {
      document.getElementById("tc-kimlik-no").textContent = veri.tc_kimlik_no;
      tcSatiri.classList.remove("hidden");
    } else {
      tcSatiri.classList.add("hidden");
    }

    fotoYukle(odaNo);
    qrOlustur(veri, odaNo);

    // İletişim — kendisi
    var kendisi = (veri.iletisim && veri.iletisim.kendisi) || {};
    document.getElementById("ad-kendisi").textContent = kendisi.ad || veri.ad_soyad || "—";
    document.getElementById("numara-kendisi").textContent = kendisi.telefon || "—";
    var kendisiLink = document.getElementById("tel-kendisi");
    if (kendisi.telefon) {
      kendisiLink.href = "tel:" + kendisi.telefon.replace(/\s+/g, "");
    } else {
      kendisiLink.removeAttribute("href");
    }

    // İletişim — yakınlar (en fazla 3)
    var yakinlarKutu = document.getElementById("yakinlar-liste");
    yakinlarKutu.innerHTML = "";
    var yakinlar = (veri.iletisim && veri.iletisim.yakinlar) || [];
    yakinlar.slice(0, 3).forEach(function (y, idx) {
      if (!y || (!y.ad && !y.telefon)) return;
      yakinlarKutu.appendChild(
        telSatiriOlustur(y.ad || "Yakını", y.telefon || "—", "Yakını " + (idx + 1))
      );
    });

    ilacListesiniDoldur("ilac-liste", veri.ilaclar);
    listeDoldur("hastalik-liste", veri.hastaliklar);
    listeDoldur("ameliyat-liste", veri.ameliyatlar);
    document.getElementById("notlar").textContent = veri.notlar || "Not girilmemiş.";

    panelGoster("icerik");
  }

  // ---------- QR kod: bu profil sayfasına yönlenen kod + PNG indirme ----------
  function dosyaAdiUygunHaleGetir(metin) {
    return (metin || "oda")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\p{L}\p{N}_-]/gu, "");
  }

  function qrOlustur(veri, odaNo) {
    var kutu = document.getElementById("qr-kod");
    var indirButon = document.getElementById("qr-indir-buton");
    if (!kutu || typeof QRCode === "undefined") {
      if (indirButon) indirButon.disabled = true;
      return;
    }
    kutu.innerHTML = "";

    new QRCode(kutu, {
      text: window.location.href,
      width: 150,
      height: 150,
      correctLevel: QRCode.CorrectLevel.M,
    });

    indirButon.onclick = function () {
      var canvas = kutu.querySelector("canvas");
      if (!canvas) return;
      var dosyaAdi = dosyaAdiUygunHaleGetir(veri.ad_soyad || odaNo) + "_qr.png";
      var link = document.createElement("a");
      link.download = dosyaAdi;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
  }

  function hataGoster(mesaj) {
    document.getElementById("hata-mesaji").textContent = mesaj;
    panelGoster("hata");
  }

  function basla() {
    var odaNo = odaNoAl();

    if (!odaNo) {
      panelGoster("arama");
      dizinYukle();
      return;
    }

    panelGoster("yukleniyor");

    fetch("rooms/" + encodeURIComponent(odaNo) + "/settings.json", { cache: "no-store" })
      .then(function (yanit) {
        if (!yanit.ok) throw new Error("bulunamadi");
        return yanit.json();
      })
      .then(function (veri) {
        icerigiDoldur(veri, odaNo);
      })
      .catch(function () {
        if (window.location.protocol === "file:") {
          hataGoster(
            "Veri okunamadı çünkü sayfa doğrudan dosya olarak açılmış. " +
            "Lütfen bir yerel sunucu ile açın (README'ye bakın) ya da siteyi GitHub Pages üzerinden ziyaret edin."
          );
        } else {
          hataGoster(
            "Oda " + odaNo + " için kayıtlı bilgi bulunamadı. Lütfen oda kodunu kontrol edin (örn. A-101) veya idareyle iletişime geçin."
          );
        }
      });
  }

  document.getElementById("oda-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var deger = odaInput.value.trim();
    if (!deger) return;

    var esleyenler = eslesenleriBul(deger);
    var tamEslesme = (ODA_DIZINI || []).find(function (kayit) {
      return normalize(kayit.oda_no) === normalize(deger) ||
             normalize(kayit.ad_soyad) === normalize(deger);
    });

    if (tamEslesme) {
      gitOdaya(tamEslesme.oda_no);
    } else if (esleyenler.length === 1) {
      gitOdaya(esleyenler[0].oda_no);
    } else {
      // Tek/tam eşleşme yoksa (ör. dizin henüz yüklenmediyse ya da
      // doğrudan oda kodu yazıldıysa) yazılan değeri oda kodu kabul et.
      gitOdaya(deger.toUpperCase());
    }
  });

  basla();
})();
