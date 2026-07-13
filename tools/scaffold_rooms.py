"""
Toplu oda klasoru olusturucu.

Oda kodu formati: <BLOK>-<KAT><ODA>
  Z = Zemin kat        -> A-Z01 .. A-Z12
  1 = 1. kat            -> A-101 .. A-112
  2 = 2. kat             -> A-201 .. A-212

Kullanim ornekleri:

    # A ve C bloklari: Zemin + 1. + 2. kat, her katta 12 oda
    python3 tools/scaffold_rooms.py --bloklar A C --katlar Z 1 2 --oda-sayisi 12

    # B blogu: sadece 1. ve 2. kat (zemin yok), her katta 12 oda
    python3 tools/scaffold_rooms.py --bloklar B --katlar 1 2 --oda-sayisi 12

Her oda icin rooms/<oda_kodu>/settings.json BOS bir sablonla olusturulur
(isim, telefon vb. alanlar bos birakilir; alan yapisi/sablonu sabittir).
Zaten var olan klasorler/settings.json dosyalari ATLANIR, uzerine
YAZILMAZ -- yani daha once doldurulmus bir odayi bozmadan scripti
istediginiz kadar tekrar calistirabilirsiniz.

Odalari olusturduktan/doldurduktan sonra arama dizinini guncellemeyi
unutmayin: python3 tools/build_index.py
"""

import argparse
import json
import os

ROOMS_DIR = os.path.join(os.path.dirname(__file__), "..", "rooms")

BOS_SABLON = {
    "ad_soyad": "",
    "oda_no": "",
    "giris_tarihi": "",
    "tc_kimlik_no": "",
    "iletisim": {
        "kendisi": {"ad": "", "telefon": ""},
        "yakinlar": [
            {"ad": "", "telefon": ""},
            {"ad": "", "telefon": ""},
            {"ad": "", "telefon": ""},
        ],
    },
    "ilaclar": [],
    "hastaliklar": [],
    "ameliyatlar": [],
    "notlar": "",
}


def main():
    ap = argparse.ArgumentParser(description="Toplu oda klasoru olusturucu")
    ap.add_argument("--bloklar", nargs="+", required=True,
                     help="Blok harfleri, orn: A B C")
    ap.add_argument("--katlar", nargs="+", required=True,
                     help="Kat etiketleri, orn: Z 1 2  (Z = Zemin kat)")
    ap.add_argument("--oda-sayisi", type=int, default=12,
                     help="Her katta kac oda var (varsayilan: 12)")
    args = ap.parse_args()

    os.makedirs(ROOMS_DIR, exist_ok=True)
    olusturulan = 0
    atlanan = 0

    for blok in args.bloklar:
        blok = blok.strip().upper()
        for kat in args.katlar:
            kat = str(kat).strip().upper()
            for oda in range(1, args.oda_sayisi + 1):
                oda_kodu = "{}-{}{:02d}".format(blok, kat, oda)
                klasor = os.path.join(ROOMS_DIR, oda_kodu)
                dosya = os.path.join(klasor, "settings.json")

                if os.path.exists(dosya):
                    atlanan += 1
                    continue

                os.makedirs(klasor, exist_ok=True)
                veri = json.loads(json.dumps(BOS_SABLON))  # derin kopya
                veri["oda_no"] = oda_kodu
                with open(dosya, "w", encoding="utf-8") as f:
                    json.dump(veri, f, ensure_ascii=False, indent=2)
                olusturulan += 1

    print("Olusturulan oda: {}".format(olusturulan))
    print("Zaten var olan (atlanan) oda: {}".format(atlanan))


if __name__ == "__main__":
    main()
