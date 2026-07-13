/* ============================================================
   Sivas Huzurevi — Yönetim Paneli
   Sunucu yoktur: her "kaydet" işlemi, GitHub'ın Contents API'si
   üzerinden ilgili rooms/<oda>/settings.json (ve gerekirse
   rooms/index.json, picture-<oda>.*) dosyasına doğrudan commit
   atar. Token yalnızca bu sekmenin belleğinde (veya kullanıcı
   isterse sessionStorage'da) tutulur, hiçbir sunucuya gönderilmez.
   ============================================================ */

(function () {
  "use strict";

  // ---------- Durum ----------
  var GH = { owner: "", repo: "", branch: "main", token: "" };
  var ODA_DIZINI = [];       // rooms/index.json içeriği
  var INDEX_SHA = null;      // index.json'un mevcut sha'sı (güncelleme için gerekli)
  var SECILI_ODA = null;     // şu an düzenlenen oda kodu
  var SETTINGS_SHA = null;   // düzenlenen odanın settings.json sha'sı
  var YENI_FOTO = null;      // { base64, ext, mime } — kaydedilmeyi bekleyen yeni fotoğraf

  // ---------- Yardımcılar: UTF-8 uyumlu base64 ----------
  function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (_, p1) {
      return String.fromCharCode("0x" + p1);
    }));
  }
  function b64DecodeUnicode(str) {
    return decodeURIComponent(atob(str.replace(/\n/g, "")).split("").map(function (c) {
      return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(""));
  }

  // ---------- GitHub Contents API sarmalayıcı ----------
  function ghUrl(path) {
    return "https://api.github.com/repos/" + GH.owner + "/" + GH.repo + "/contents/" + path;
  }

  function ghGet(path) {
    return fetch(ghUrl(path) + "?ref=" + encodeURIComponent(GH.branch), {
      headers: {
        "Authorization": "Bearer " + GH.token,
        "Accept": "application/vnd.github+json",
      },
    }).then(function (yanit) {
      if (yanit.status === 404) return null;
      if (!yanit.ok) return yanit.json().then(function (j) { throw new Error(hataMesajiOlustur(yanit.status, j)); });
      return yanit.json();
    });
  }

  function ghPut(path, base64Content, mesaj, sha) {
    var govde = { message: mesaj, content: base64Content, branch: GH.branch };
    if (sha) govde.sha = sha;
    return fetch(ghUrl(path), {
      method: "PUT",
      headers: {
        "Authorization": "Bearer " + GH.token,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(govde),
    }).then(function (yanit) {
      if (!yanit.ok) return yanit.json().then(function (j) { throw new Error(hataMesajiOlustur(yanit.status, j)); });
      return yanit.json();
    });
  }

  function ghDelete(path, mesaj, sha) {
    return fetch(ghUrl(path), {
      method: "DELETE",
      headers: {
        "Authorization": "Bearer " + GH.token,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: mesaj, sha: sha, branch: GH.branch }),
    }).then(function (yanit) {
      if (!yanit.ok) return yanit.json().then(function (j) { throw new Error(hataMesajiOlustur(yanit.status, j)); });
      return yanit.json();
    });
  }

  function hataMesajiOlustur(durumKodu, gövde) {
    var mesaj = (gövde && gövde.message) || "Bilinmeyen hata";
    if (durumKodu === 401) return "Token geçersiz veya süresi dolmuş (401). Lütfen tekrar bağlanın.";
    if (durumKodu === 403) return "Erişim reddedildi (403): " + mesaj + " — token'ın bu depo için 'Contents: Read and write' izni olduğundan emin olun.";
    if (durumKodu === 404) return "Bulunamadı (404): " + mesaj + " — kullanıcı adı/depo adı/dal adını kontrol edin.";
    if (durumKodu === 409) return "Çakışma (409): Dosya sizden önce başka biri tarafından güncellenmiş olabilir. Sayfayı yenileyip tekrar deneyin.";
    return "Hata (" + durumKodu + "): " + mesaj;
  }

  function durumGoster(el, mesaj, tur) {
    el.textContent = mesaj;
    el.className = "durum-mesaji " + (tur || "bilgi");
    el.classList.remove("hidden");
  }
  function durumGizle(el) { el.classList.add("hidden"); }

  // ---------- 1) Bağlantı ----------
  var baglantiForm = document.getElementById("baglanti-form");
  var baglanButon = document.getElementById("baglan-buton");
  var baglantiDurum = document.getElementById("baglanti-durum");

  // Daha önce "hatırla" seçildiyse doldur
  try {
    var kayitli = sessionStorage.getItem("gh_admin_ayar");
    if (kayitli) {
      var k = JSON.parse(kayitli);
      document.getElementById("gh-owner").value = k.owner || "";
      document.getElementById("gh-repo").value = k.repo || "";
      document.getElementById("gh-branch").value = k.branch || "main";
      document.getElementById("gh-token").value = k.token || "";
      document.getElementById("gh-hatirla").checked = true;
    }
  } catch (e) { /* sessionStorage kullanılamıyorsa sessizce yok say */ }

  baglantiForm.addEventListener("submit", function (e) {
    e.preventDefault();
    GH.owner = document.getElementById("gh-owner").value.trim();
    GH.repo = document.getElementById("gh-repo").value.trim();
    GH.branch = document.getElementById("gh-branch").value.trim() || "main";
    GH.token = document.getElementById("gh-token").value.trim();

    if (document.getElementById("gh-hatirla").checked) {
      try {
        sessionStorage.setItem("gh_admin_ayar", JSON.stringify(GH));
      } catch (e) { /* yok say */ }
    } else {
      try { sessionStorage.removeItem("gh_admin_ayar"); } catch (e) { /* yok say */ }
    }

    baglanButon.disabled = true;
    durumGoster(baglantiDurum, "Bağlanılıyor…", "bilgi");

    ghGet("rooms/index.json")
      .then(function (dosya) {
        if (!dosya) throw new Error("rooms/index.json bulunamadı — kullanıcı adı/depo/dal bilgilerini kontrol edin.");
        ODA_DIZINI = JSON.parse(b64DecodeUnicode(dosya.content));
        INDEX_SHA = dosya.sha;
        durumGoster(baglantiDurum, "Bağlandı — " + ODA_DIZINI.length + " oda bulundu.", "basarili");
        document.getElementById("baglanti-paneli").classList.add("hidden");
        document.getElementById("oda-secim-paneli").classList.remove("hidden");
      })
      .catch(function (err) {
        durumGoster(baglantiDurum, err.message, "hata");
      })
      .finally(function () {
        baglanButon.disabled = false;
      });
  });

  document.getElementById("baglanti-degistir").addEventListener("click", function () {
    document.getElementById("oda-secim-paneli").classList.add("hidden");
    document.getElementById("duzenle-paneli").classList.add("hidden");
    document.getElementById("raporlar-paneli").classList.add("hidden");
    document.getElementById("baglanti-paneli").classList.remove("hidden");
    durumGizle(baglantiDurum);
  });

  // ---------- 2) Oda arama / seçim ----------
  var odaInput = document.getElementById("admin-oda-input");
  var oneriKutusu = document.getElementById("admin-oneriler");

  function normalize(metin) { return (metin || "").toLocaleUpperCase("tr").trim(); }

  function eslesenleriBul(sorgu) {
    if (!sorgu) return [];
    var s = normalize(sorgu);
    return ODA_DIZINI.filter(function (k) {
      return normalize(k.oda_no).indexOf(s) !== -1 || normalize(k.ad_soyad).indexOf(s) !== -1;
    }).slice(0, 8);
  }

  function oneriGizle() { oneriKutusu.classList.add("hidden"); oneriKutusu.innerHTML = ""; }

  function oneriGoster(sonuclar) {
    oneriKutusu.innerHTML = "";
    if (!sonuclar.length) { oneriGizle(); return; }
    sonuclar.forEach(function (kayit) {
      var satir = document.createElement("div");
      satir.className = "oneri-satir";
      var ad = document.createElement("span");
      ad.className = "oneri-ad";
      ad.textContent = kayit.ad_soyad || "(boş — isim girilmemiş)";
      var oda = document.createElement("span");
      oda.className = "oneri-oda";
      oda.textContent = kayit.oda_no;
      satir.appendChild(ad);
      satir.appendChild(oda);
      satir.addEventListener("mousedown", function (e) {
        e.preventDefault();
        odaInput.value = kayit.oda_no;
        oneriGizle();
        odaSec(kayit.oda_no);
      });
      oneriKutusu.appendChild(satir);
    });
    oneriKutusu.classList.remove("hidden");
  }

  odaInput.addEventListener("input", function () { oneriGoster(eslesenleriBul(odaInput.value)); });
  odaInput.addEventListener("focus", function () { if (odaInput.value) oneriGoster(eslesenleriBul(odaInput.value)); });
  odaInput.addEventListener("blur", function () { setTimeout(oneriGizle, 100); });

  document.getElementById("secimi-temizle").addEventListener("click", function () {
    document.getElementById("duzenle-paneli").classList.add("hidden");
    document.getElementById("oda-secim-paneli").classList.remove("hidden");
    odaInput.value = "";
    odaInput.focus();
  });

  // ---------- 3) Oda verisini yükleyip formu doldurma ----------
  var kaydetDurum = document.getElementById("kaydet-durum");
  var fotoInput = document.getElementById("f-foto");
  var fotoOnizleme = document.getElementById("f-foto-onizleme");
  var fotoDurum = document.getElementById("f-foto-durum");

  var BOS_SABLON = {
    ad_soyad: "", oda_no: "", giris_tarihi: "", tc_kimlik_no: "",
    iletisim: { kendisi: { ad: "", telefon: "" }, yakinlar: [{ ad: "", telefon: "" }, { ad: "", telefon: "" }, { ad: "", telefon: "" }] },
    ilaclar: [], hastaliklar: [], ameliyatlar: [], notlar: "",
  };

  function odaSec(odaKodu) {
    SECILI_ODA = odaKodu;
    YENI_FOTO = null;
    fotoInput.value = "";
    fotoOnizleme.classList.add("hidden");
    durumGizle(kaydetDurum);
    document.getElementById("duzenle-baslik").textContent = "Oda " + odaKodu + " Bilgilerini Düzenle";
    document.getElementById("oda-secim-paneli").classList.add("hidden");
    document.getElementById("duzenle-paneli").classList.remove("hidden");
    fotoDurum.textContent = "Fotoğraf yükleniyor…";

    ghGet("rooms/" + encodeURIComponent(odaKodu) + "/settings.json")
      .then(function (dosya) {
        var veri = dosya ? JSON.parse(b64DecodeUnicode(dosya.content)) : JSON.parse(JSON.stringify(BOS_SABLON));
        SETTINGS_SHA = dosya ? dosya.sha : null;
        veri.oda_no = veri.oda_no || odaKodu;
        formuDoldur(veri);
      })
      .catch(function (err) {
        durumGoster(kaydetDurum, err.message, "hata");
      });

    fotoyuYukle(odaKodu);
  }

  function fotoyuYukle(odaKodu) {
    var uzantilar = ["jpg", "jpeg", "png"];
    function dene(i) {
      if (i >= uzantilar.length) {
        fotoOnizleme.classList.add("hidden");
        fotoDurum.textContent = "Henüz fotoğraf yok (varsayılan görsel gösterilecek).";
        return;
      }
      var yol = "rooms/" + encodeURIComponent(odaKodu) + "/picture-" + odaKodu + "." + uzantilar[i];
      ghGet(yol).then(function (dosya) {
        if (!dosya) { dene(i + 1); return; }
        var mime = uzantilar[i] === "png" ? "image/png" : "image/jpeg";
        fotoOnizleme.src = "data:" + mime + ";base64," + dosya.content.replace(/\n/g, "");
        fotoOnizleme.classList.remove("hidden");
        fotoDurum.textContent = "Mevcut fotoğraf (" + uzantilar[i] + ")";
      }).catch(function () { dene(i + 1); });
    }
    dene(0);
  }

  fotoInput.addEventListener("change", function () {
    var dosya = fotoInput.files[0];
    if (!dosya) { YENI_FOTO = null; return; }
    if (!/^image\/(jpeg|png)$/.test(dosya.type)) {
      durumGoster(kaydetDurum, "Sadece JPG veya PNG dosyası yükleyebilirsiniz.", "hata");
      fotoInput.value = "";
      return;
    }
    kirpmaBaslat(dosya);
  });

  // ---------- Fotoğraf kırpma ----------
  var kirpmaPanel = document.getElementById("kirpma-panel");
  var kirpmaCanvas = document.getElementById("kirpma-canvas");
  var kirpmaCtx = kirpmaCanvas.getContext("2d");
  var kirpmaZoom = document.getElementById("kirpma-zoom");
  var KIRPMA_BOYUT = kirpmaCanvas.width;
  var kirpmaState = null;

  function kirpmaCiz() {
    var s = kirpmaState;
    kirpmaCtx.clearRect(0, 0, KIRPMA_BOYUT, KIRPMA_BOYUT);
    var w = s.img.naturalWidth * s.scale;
    var h = s.img.naturalHeight * s.scale;
    var dx = KIRPMA_BOYUT / 2 - w / 2 + s.offsetX;
    var dy = KIRPMA_BOYUT / 2 - h / 2 + s.offsetY;
    kirpmaCtx.drawImage(s.img, dx, dy, w, h);
  }

  function kirpmaSinirlaOffset() {
    var s = kirpmaState;
    var w = s.img.naturalWidth * s.scale;
    var h = s.img.naturalHeight * s.scale;
    var maxX = Math.max(0, (w - KIRPMA_BOYUT) / 2);
    var maxY = Math.max(0, (h - KIRPMA_BOYUT) / 2);
    s.offsetX = Math.min(maxX, Math.max(-maxX, s.offsetX));
    s.offsetY = Math.min(maxY, Math.max(-maxY, s.offsetY));
  }

  function kirpmaBaslat(dosya) {
    var okuyucu = new FileReader();
    okuyucu.onload = function () {
      var img = new Image();
      img.onload = function () {
        var minScale = Math.max(KIRPMA_BOYUT / img.naturalWidth, KIRPMA_BOYUT / img.naturalHeight);
        kirpmaState = {
          img: img, scale: minScale,
          offsetX: 0, offsetY: 0,
          mimeTuru: dosya.type === "image/png" ? "image/png" : "image/jpeg",
        };
        kirpmaZoom.min = minScale.toFixed(3);
        kirpmaZoom.max = (minScale * 3).toFixed(3);
        kirpmaZoom.step = 0.001;
        kirpmaZoom.value = minScale.toFixed(3);
        kirpmaCiz();
        kirpmaPanel.classList.remove("hidden");
      };
      img.src = okuyucu.result;
    };
    okuyucu.readAsDataURL(dosya);
  }

  var suruklemeAktif = false;
  var suruklemeBaslangic = { x: 0, y: 0, offsetX: 0, offsetY: 0 };

  kirpmaCanvas.addEventListener("pointerdown", function (e) {
    suruklemeAktif = true;
    suruklemeBaslangic = { x: e.clientX, y: e.clientY, offsetX: kirpmaState.offsetX, offsetY: kirpmaState.offsetY };
    kirpmaCanvas.setPointerCapture(e.pointerId);
  });
  kirpmaCanvas.addEventListener("pointermove", function (e) {
    if (!suruklemeAktif) return;
    kirpmaState.offsetX = suruklemeBaslangic.offsetX + (e.clientX - suruklemeBaslangic.x);
    kirpmaState.offsetY = suruklemeBaslangic.offsetY + (e.clientY - suruklemeBaslangic.y);
    kirpmaSinirlaOffset();
    kirpmaCiz();
  });
  kirpmaCanvas.addEventListener("pointerup", function () { suruklemeAktif = false; });
  kirpmaCanvas.addEventListener("pointercancel", function () { suruklemeAktif = false; });

  kirpmaZoom.addEventListener("input", function () {
    kirpmaState.scale = parseFloat(kirpmaZoom.value);
    kirpmaSinirlaOffset();
    kirpmaCiz();
  });

  document.getElementById("kirpma-iptal").addEventListener("click", function () {
    kirpmaPanel.classList.add("hidden");
    fotoInput.value = "";
    kirpmaState = null;
  });

  document.getElementById("kirpma-uygula").addEventListener("click", function () {
    var ext = kirpmaState.mimeTuru === "image/png" ? "png" : "jpg";
    var dataUrl = kirpmaCanvas.toDataURL(kirpmaState.mimeTuru, 0.92);
    var base64 = dataUrl.split(",")[1];
    YENI_FOTO = { base64: base64, ext: ext };
    fotoOnizleme.src = dataUrl;
    fotoOnizleme.classList.remove("hidden");
    fotoDurum.textContent = "Yeni seçilen fotoğraf (kaydedince yüklenecek)";
    kirpmaPanel.classList.add("hidden");
    kirpmaState = null;
  });

  function formuDoldur(veri) {
    document.getElementById("f-ad-soyad").value = veri.ad_soyad || "";
    document.getElementById("f-giris-tarihi").value = veri.giris_tarihi || "";
    document.getElementById("f-tc-kimlik-no").value = veri.tc_kimlik_no || "";

    var kendisi = (veri.iletisim && veri.iletisim.kendisi) || {};
    document.getElementById("f-kendisi-ad").value = kendisi.ad || "";
    document.getElementById("f-kendisi-tel").value = kendisi.telefon || "";

    var yakinlar = (veri.iletisim && veri.iletisim.yakinlar) || [];
    for (var i = 0; i < 3; i++) {
      var y = yakinlar[i] || {};
      document.getElementById("f-yakin" + (i + 1) + "-ad").value = y.ad || "";
      document.getElementById("f-yakin" + (i + 1) + "-tel").value = y.telefon || "";
    }

    // Geriye dönük uyumluluk: eski kayıtlarda ilaçlar düz metin (string)
    // dizisiydi; yeni yapıda {ad, dozaj, vakit} nesnesi. İkisini de kabul et.
    currentIlaclar = (veri.ilaclar || []).map(function (madde) {
      if (typeof madde === "string") return { ad: madde, dozaj: "", vakit: [] };
      return { ad: madde.ad || "", dozaj: madde.dozaj || "", vakit: madde.vakit || [] };
    });
    currentHastaliklar = (veri.hastaliklar || []).slice();
    ilacCipleriCiz();
    hastalikCipleriCiz();

    document.getElementById("f-ameliyatlar").value = (veri.ameliyatlar || []).join("\n");
    document.getElementById("f-notlar").value = veri.notlar || "";
  }

  function satirlaraAyir(metin) {
    return metin.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function formdanVeriTopla() {
    var yakinlar = [];
    for (var i = 1; i <= 3; i++) {
      yakinlar.push({
        ad: document.getElementById("f-yakin" + i + "-ad").value.trim(),
        telefon: document.getElementById("f-yakin" + i + "-tel").value.trim(),
      });
    }
    return {
      ad_soyad: document.getElementById("f-ad-soyad").value.trim(),
      oda_no: SECILI_ODA,
      giris_tarihi: document.getElementById("f-giris-tarihi").value.trim(),
      tc_kimlik_no: document.getElementById("f-tc-kimlik-no").value.trim(),
      iletisim: {
        kendisi: {
          ad: document.getElementById("f-kendisi-ad").value.trim(),
          telefon: document.getElementById("f-kendisi-tel").value.trim(),
        },
        yakinlar: yakinlar,
      },
      ilaclar: currentIlaclar,
      hastaliklar: currentHastaliklar,
      ameliyatlar: satirlaraAyir(document.getElementById("f-ameliyatlar").value),
      notlar: document.getElementById("f-notlar").value.trim(),
    };
  }

  // ---------- İlaç / Hastalık: akıllı arama + çip listesi ----------
  var currentIlaclar = [];
  var currentHastaliklar = [];
  var ILAC_LISTESI = [];
  var HASTALIK_LISTESI = [];

  function akilliAramaBagla(inputEl, oneriEl, liste) {
    function goster() {
      var s = normalize(inputEl.value);
      var sonuclar = !s ? [] : liste.filter(function (k) { return normalize(k).indexOf(s) !== -1; }).slice(0, 8);
      oneriEl.innerHTML = "";
      if (!sonuclar.length) { oneriEl.classList.add("hidden"); return; }
      sonuclar.forEach(function (isim) {
        var satir = document.createElement("div");
        satir.className = "oneri-satir";
        var ad = document.createElement("span");
        ad.className = "oneri-ad";
        ad.textContent = isim;
        satir.appendChild(ad);
        satir.addEventListener("mousedown", function (e) {
          e.preventDefault();
          inputEl.value = isim;
          oneriEl.classList.add("hidden");
        });
        oneriEl.appendChild(satir);
      });
      oneriEl.classList.remove("hidden");
    }
    inputEl.addEventListener("input", goster);
    inputEl.addEventListener("focus", goster);
    inputEl.addEventListener("blur", function () { setTimeout(function () { oneriEl.classList.add("hidden"); }, 100); });
  }

  var ilacArama = document.getElementById("f-ilac-arama");
  var hastalikArama = document.getElementById("f-hastalik-arama");

  fetch("assets/data/ilac-listesi.json").then(function (r) { return r.ok ? r.json() : []; }).then(function (d) {
    ILAC_LISTESI = d;
    akilliAramaBagla(ilacArama, document.getElementById("ilac-oneriler"), ILAC_LISTESI);
  }).catch(function () {
    akilliAramaBagla(ilacArama, document.getElementById("ilac-oneriler"), []);
  });
  fetch("assets/data/hastalik-listesi.json").then(function (r) { return r.ok ? r.json() : []; }).then(function (d) {
    HASTALIK_LISTESI = d;
    akilliAramaBagla(hastalikArama, document.getElementById("hastalik-oneriler"), HASTALIK_LISTESI);
  }).catch(function () {
    akilliAramaBagla(hastalikArama, document.getElementById("hastalik-oneriler"), []);
  });

  function ilacCipleriCiz() {
    var kutu = document.getElementById("ilac-cip-liste");
    kutu.innerHTML = "";
    currentIlaclar.forEach(function (ilac, idx) {
      var detay = [ilac.dozaj, (ilac.vakit || []).join(", ")].filter(Boolean).join(" · ");
      var cip = document.createElement("span");
      cip.className = "cip";
      cip.innerHTML = "";
      var metin = document.createElement("span");
      metin.textContent = ilac.ad + (detay ? " (" + detay + ")" : "");
      var silBtn = document.createElement("button");
      silBtn.type = "button";
      silBtn.className = "cip-sil";
      silBtn.setAttribute("aria-label", "Kaldır");
      silBtn.textContent = "×";
      silBtn.addEventListener("click", function () {
        currentIlaclar.splice(idx, 1);
        ilacCipleriCiz();
      });
      cip.appendChild(metin);
      cip.appendChild(silBtn);
      kutu.appendChild(cip);
    });
  }

  function hastalikCipleriCiz() {
    var kutu = document.getElementById("hastalik-cip-liste");
    kutu.innerHTML = "";
    currentHastaliklar.forEach(function (isim, idx) {
      var cip = document.createElement("span");
      cip.className = "cip";
      var metin = document.createElement("span");
      metin.textContent = isim;
      var silBtn = document.createElement("button");
      silBtn.type = "button";
      silBtn.className = "cip-sil";
      silBtn.setAttribute("aria-label", "Kaldır");
      silBtn.textContent = "×";
      silBtn.addEventListener("click", function () {
        currentHastaliklar.splice(idx, 1);
        hastalikCipleriCiz();
      });
      cip.appendChild(metin);
      cip.appendChild(silBtn);
      kutu.appendChild(cip);
    });
  }

  document.getElementById("ilac-ekle-buton").addEventListener("click", function () {
    var ad = ilacArama.value.trim();
    if (!ad) return;
    var dozaj = document.getElementById("f-ilac-dozaj").value;
    var vakit = Array.prototype.slice.call(document.querySelectorAll(".vakit-secenek input:checked")).map(function (c) { return c.value; });
    currentIlaclar.push({ ad: ad, dozaj: dozaj, vakit: vakit });
    ilacCipleriCiz();
    ilacArama.value = "";
    document.querySelectorAll(".vakit-secenek input").forEach(function (c) { c.checked = false; });
  });

  document.getElementById("hastalik-ekle-buton").addEventListener("click", function () {
    var isim = hastalikArama.value.trim();
    if (!isim) return;
    currentHastaliklar.push(isim);
    hastalikCipleriCiz();
    hastalikArama.value = "";
  });

  // ---------- 4) Kaydet ----------
  var kaydetButon = document.getElementById("kaydet-buton");

  document.getElementById("duzenle-form").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!SECILI_ODA) return;

    var veri = formdanVeriTopla();

    if (veri.tc_kimlik_no && !/^\d{11}$/.test(veri.tc_kimlik_no)) {
      durumGoster(kaydetDurum, "T.C. Kimlik No 11 haneli rakamdan oluşmalıdır.", "hata");
      return;
    }

    kaydetButon.disabled = true;
    durumGoster(kaydetDurum, "Kaydediliyor…", "bilgi");

    var settingsYolu = "rooms/" + encodeURIComponent(SECILI_ODA) + "/settings.json";
    var settingsIcerik = b64EncodeUnicode(JSON.stringify(veri, null, 2));
    var mesaj = "Oda " + SECILI_ODA + " bilgileri güncellendi";

    ghPut(settingsYolu, settingsIcerik, mesaj, SETTINGS_SHA)
      .then(function (sonuc) {
        SETTINGS_SHA = sonuc.content.sha;
        return fotoKaydetGerekliyse();
      })
      .then(function () {
        return indexGuncelle(SECILI_ODA, veri.ad_soyad);
      })
      .then(function () {
        return raporGuncelle(SECILI_ODA, veri);
      })
      .then(function () {
        durumGoster(kaydetDurum, "Kaydedildi ✓ — değişiklik birkaç dakika içinde sitede görünür.", "basarili");
      })
      .catch(function (err) {
        durumGoster(kaydetDurum, err.message, "hata");
      })
      .finally(function () {
        kaydetButon.disabled = false;
      });
  });

  function fotoKaydetGerekliyse() {
    if (!YENI_FOTO) return Promise.resolve();
    var yol = "rooms/" + encodeURIComponent(SECILI_ODA) + "/picture-" + SECILI_ODA + "." + YENI_FOTO.ext;
    return ghGet(yol).then(function (mevcut) {
      var sha = mevcut ? mevcut.sha : null;
      return ghPut(yol, YENI_FOTO.base64, "Oda " + SECILI_ODA + " fotoğrafı güncellendi", sha);
    }).then(function () { YENI_FOTO = null; });
  }

  function indexGuncelle(odaKodu, adSoyad) {
    return ghGet("rooms/index.json").then(function (dosya) {
      var dizin = dosya ? JSON.parse(b64DecodeUnicode(dosya.content)) : [];
      var sha = dosya ? dosya.sha : INDEX_SHA;
      var bulundu = false;
      dizin = dizin.map(function (k) {
        if (k.oda_no === odaKodu) { bulundu = true; return { oda_no: odaKodu, ad_soyad: adSoyad }; }
        return k;
      });
      if (!bulundu) dizin.push({ oda_no: odaKodu, ad_soyad: adSoyad });
      dizin.sort(function (a, b) { return a.oda_no.localeCompare(b.oda_no); });

      var icerik = b64EncodeUnicode(JSON.stringify(dizin, null, 2));
      return ghPut("rooms/index.json", icerik, "Arama dizini güncellendi: " + odaKodu, sha).then(function (sonuc) {
        ODA_DIZINI = dizin;
        INDEX_SHA = sonuc.content.sha;
      });
    });
  }

  // rooms/rapor-verisi.json — Toplu Raporlar ekranının okuduğu tek dosya.
  // Her kayıt/silme işleminde ilgili odanın satırı güncellenir; böylece
  // rapor ekranı 96 ayrı dosya yerine tek dosyayı okur, çok daha hızlı olur.
  function raporGuncelle(odaKodu, veri) {
    return ghGet("rooms/rapor-verisi.json").then(function (dosya) {
      var liste = dosya ? JSON.parse(b64DecodeUnicode(dosya.content)) : [];
      var sha = dosya ? dosya.sha : null;
      var yeniKayit = {
        oda_no: odaKodu,
        ad_soyad: veri.ad_soyad || "",
        giris_tarihi: veri.giris_tarihi || "",
        hastaliklar: veri.hastaliklar || [],
        ilaclar: veri.ilaclar || [],
      };
      var bulundu = false;
      liste = liste.map(function (k) {
        if (k.oda_no === odaKodu) { bulundu = true; return yeniKayit; }
        return k;
      });
      if (!bulundu) liste.push(yeniKayit);
      liste.sort(function (a, b) { return a.oda_no.localeCompare(b.oda_no); });

      var icerik = b64EncodeUnicode(JSON.stringify(liste, null, 2));
      return ghPut("rooms/rapor-verisi.json", icerik, "Rapor verisi güncellendi: " + odaKodu, sha);
    });
  }

  // ---------- 5) Sakin bilgilerini silme (oda boş şablona döner) ----------
  var silModal = document.getElementById("sil-modal");
  var silButon = document.getElementById("sil-buton");
  var silOnayla = document.getElementById("sil-onayla");

  silButon.addEventListener("click", function () {
    if (!SECILI_ODA) return;
    silModal.classList.remove("hidden");
  });
  document.getElementById("sil-iptal").addEventListener("click", function () {
    silModal.classList.add("hidden");
  });
  silModal.addEventListener("click", function (e) {
    if (e.target === silModal) silModal.classList.add("hidden");
  });

  silOnayla.addEventListener("click", function () {
    if (!SECILI_ODA) return;
    var odaKodu = SECILI_ODA;
    silOnayla.disabled = true;
    silModal.classList.add("hidden");
    durumGoster(kaydetDurum, "Siliniyor…", "bilgi");

    var bosVeri = JSON.parse(JSON.stringify(BOS_SABLON));
    bosVeri.oda_no = odaKodu;
    var settingsYolu = "rooms/" + encodeURIComponent(odaKodu) + "/settings.json";
    var settingsIcerik = b64EncodeUnicode(JSON.stringify(bosVeri, null, 2));

    ghPut(settingsYolu, settingsIcerik, "Oda " + odaKodu + " sakin bilgileri silindi", SETTINGS_SHA)
      .then(function (sonuc) {
        SETTINGS_SHA = sonuc.content.sha;
        return fotograflariSil(odaKodu);
      })
      .then(function () { return indexGuncelle(odaKodu, ""); })
      .then(function () { return raporGuncelle(odaKodu, bosVeri); })
      .then(function () {
        formuDoldur(bosVeri);
        fotoOnizleme.classList.add("hidden");
        fotoDurum.textContent = "Henüz fotoğraf yok (varsayılan görsel gösterilecek).";
        durumGoster(kaydetDurum, "Sakin bilgileri silindi ✓ — oda boş şablona döndü.", "basarili");
      })
      .catch(function (err) {
        durumGoster(kaydetDurum, err.message, "hata");
      })
      .finally(function () {
        silOnayla.disabled = false;
      });
  });

  function fotograflariSil(odaKodu) {
    var uzantilar = ["jpg", "jpeg", "png"];
    var zincir = Promise.resolve();
    uzantilar.forEach(function (ext) {
      var yol = "rooms/" + encodeURIComponent(odaKodu) + "/picture-" + odaKodu + "." + ext;
      zincir = zincir.then(function () {
        return ghGet(yol).then(function (dosya) {
          if (!dosya) return;
          return ghDelete(yol, "Oda " + odaKodu + " fotoğrafı silindi", dosya.sha);
        });
      });
    });
    return zincir;
  }

  // ---------- 6) Sekmeler: Oda Düzenle / Toplu Raporlar ----------
  var sekmeDuzenle = document.getElementById("sekme-duzenle");
  var sekmeRaporlar = document.getElementById("sekme-raporlar");
  var raporlarPaneli = document.getElementById("raporlar-paneli");
  var RAPOR_VERISI = null;

  sekmeDuzenle.addEventListener("click", function () {
    sekmeDuzenle.classList.add("sekme-aktif");
    sekmeRaporlar.classList.remove("sekme-aktif");
    raporlarPaneli.classList.add("hidden");
    document.getElementById("oda-secim-paneli").classList.remove("hidden");
  });

  sekmeRaporlar.addEventListener("click", function () {
    sekmeRaporlar.classList.add("sekme-aktif");
    sekmeDuzenle.classList.remove("sekme-aktif");
    document.getElementById("oda-secim-paneli").classList.add("hidden");
    document.getElementById("duzenle-paneli").classList.add("hidden");
    raporlarPaneli.classList.remove("hidden");
    raporYukle();
  });

  function raporYukle() {
    var durum = document.getElementById("rapor-durum");
    durumGoster(durum, "Rapor verisi yükleniyor…", "bilgi");
    ghGet("rooms/rapor-verisi.json")
      .then(function (dosya) {
        RAPOR_VERISI = dosya ? JSON.parse(b64DecodeUnicode(dosya.content)) : [];
        durumGizle(durum);
        raporCiz();
      })
      .catch(function (err) {
        durumGoster(durum, err.message, "hata");
      });
  }

  function raporCiz() {
    var odaFiltre = normalize(document.getElementById("rapor-filtre-oda").value);
    var hastalikFiltre = normalize(document.getElementById("rapor-filtre-hastalik").value);
    var ilacFiltre = normalize(document.getElementById("rapor-filtre-ilac").value);

    var govde = document.getElementById("rapor-govde");
    govde.innerHTML = "";

    (RAPOR_VERISI || [])
      .filter(function (k) {
        if (!k.ad_soyad) return false; // boş odaları raporda gösterme
        if (odaFiltre && normalize(k.oda_no).indexOf(odaFiltre) === -1) return false;
        if (hastalikFiltre) {
          var hEslesme = (k.hastaliklar || []).some(function (h) { return normalize(h).indexOf(hastalikFiltre) !== -1; });
          if (!hEslesme) return false;
        }
        if (ilacFiltre) {
          var iEslesme = (k.ilaclar || []).some(function (i) {
            var ad = typeof i === "string" ? i : i.ad;
            return normalize(ad).indexOf(ilacFiltre) !== -1;
          });
          if (!iEslesme) return false;
        }
        return true;
      })
      .forEach(function (k) {
        var tr = document.createElement("tr");

        var tdAd = document.createElement("td");
        tdAd.textContent = k.ad_soyad;

        var tdOda = document.createElement("td");
        tdOda.textContent = k.oda_no;

        var tdHastalik = document.createElement("td");
        tdHastalik.textContent = (k.hastaliklar || []).join(", ") || "—";

        var tdIlac = document.createElement("td");
        tdIlac.textContent = (k.ilaclar || []).map(function (i) {
          if (typeof i === "string") return i;
          var detay = [i.dozaj, (i.vakit || []).join("/")].filter(Boolean).join(", ");
          return i.ad + (detay ? " (" + detay + ")" : "");
        }).join("; ") || "—";

        tr.appendChild(tdAd);
        tr.appendChild(tdOda);
        tr.appendChild(tdHastalik);
        tr.appendChild(tdIlac);
        govde.appendChild(tr);
      });
  }

  ["rapor-filtre-oda", "rapor-filtre-hastalik", "rapor-filtre-ilac"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", raporCiz);
  });

  document.getElementById("rapor-yazdir").addEventListener("click", function () {
    window.print();
  });
})();
