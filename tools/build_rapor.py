"""
Toplu Raporlar ekrani icin ozet veri dosyasi olusturucu.

rooms/ altindaki her odanin settings.json'undan oda_no, ad_soyad,
giris_tarihi, hastaliklar ve ilaclar alanlarini toplayip tek bir
rooms/rapor-verisi.json dosyasina yazar. Admin panelindeki "Toplu
Raporlar" ekrani, 96 ayri dosya yerine bu TEK dosyayi okur.

NOT: admin.html uzerinden yapilan her kayit/silme isleminde bu dosya
zaten otomatik guncellenir. Bu scripti sadece:
  - ilk kurulumda (bu depo yeni olusturulduysa) veya
  - settings.json dosyalarini admin paneli DISINDA (elle/toplu) duzenlediyseniz
calistirmaniz yeterlidir.

Kullanim:
    python3 tools/build_rapor.py
"""

import json
import os

ROOMS_DIR = os.path.join(os.path.dirname(__file__), "..", "rooms")
CIKTI_YOLU = os.path.join(ROOMS_DIR, "rapor-verisi.json")


def main():
    if not os.path.isdir(ROOMS_DIR):
        raise SystemExit("rooms/ klasoru bulunamadi.")

    kayitlar = []

    for oda_kodu in sorted(os.listdir(ROOMS_DIR)):
        klasor = os.path.join(ROOMS_DIR, oda_kodu)
        dosya = os.path.join(klasor, "settings.json")

        if not os.path.isdir(klasor) or not os.path.isfile(dosya):
            continue

        try:
            with open(dosya, "r", encoding="utf-8") as f:
                veri = json.load(f)
        except (json.JSONDecodeError, OSError) as hata:
            print("UYARI: {} okunamadi ({}), atlaniyor.".format(dosya, hata))
            continue

        kayitlar.append({
            "oda_no": veri.get("oda_no") or oda_kodu,
            "ad_soyad": veri.get("ad_soyad") or "",
            "giris_tarihi": veri.get("giris_tarihi") or "",
            "hastaliklar": veri.get("hastaliklar") or [],
            "ilaclar": veri.get("ilaclar") or [],
        })

    kayitlar.sort(key=lambda k: k["oda_no"])

    with open(CIKTI_YOLU, "w", encoding="utf-8") as f:
        json.dump(kayitlar, f, ensure_ascii=False, indent=2)

    print("{} oda rapor-verisi.json icine yazildi -> {}".format(len(kayitlar), CIKTI_YOLU))


if __name__ == "__main__":
    main()
