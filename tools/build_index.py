"""
Oda dizini olusturucu.

rooms/ altindaki her klasordeki settings.json dosyasini okuyup
isim + oda kodundan olusan tek bir rooms/index.json dosyasi uretir.
Bu dosya, arama kutusundaki "yazarken oneri" (autocomplete) ozelligi
icin kullanilir.

ONEMLI: Yeni oda eklediginizde / bir odanin ismini degistirdiginizde
bu scripti tekrar calistirip index.json'u guncellemeniz gerekir:

    python3 tools/build_index.py

Sonra index.json dosyasini da diger dosyalarla birlikte GitHub'a
push etmeyi unutmayin.
"""

import json
import os

ROOMS_DIR = os.path.join(os.path.dirname(__file__), "..", "rooms")
CIKTI_YOLU = os.path.join(ROOMS_DIR, "index.json")


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
        })

    kayitlar.sort(key=lambda k: k["oda_no"])

    with open(CIKTI_YOLU, "w", encoding="utf-8") as f:
        json.dump(kayitlar, f, ensure_ascii=False, indent=2)

    print("{} oda index.json icine yazildi -> {}".format(len(kayitlar), CIKTI_YOLU))


if __name__ == "__main__":
    main()
