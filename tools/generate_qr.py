"""
Odalar için QR kod üretici.

Kullanim:
    pip install qrcode[pil]
    python3 tools/generate_qr.py https://kullaniciadi.github.io/repo-adi/

Bu script, rooms/ klasorundeki her oda alt klasoru icin
    <base_url>/index.html?oda=<oda_no>
adresine yonlenen bir QR kod uretir ve
    rooms/<oda_no>/qr-<oda_no>.png
olarak kaydeder. Bu PNG dosyalari yazdirilip odalarin kapisina
asilabilir; siteye eklenmesi zorunlu degildir.
"""

import sys
import os

try:
    import qrcode
except ImportError:
    sys.exit("Once 'pip install qrcode[pil]' calistirin.")

ROOMS_DIR = os.path.join(os.path.dirname(__file__), "..", "rooms")


def main():
    if len(sys.argv) < 2:
        sys.exit("Kullanim: python3 generate_qr.py <site-taban-url>\n"
                  "Ornek:   python3 generate_qr.py https://kullaniciadi.github.io/huzurevi-bilgi/")

    base_url = sys.argv[1].rstrip("/")

    if not os.path.isdir(ROOMS_DIR):
        sys.exit("rooms/ klasoru bulunamadi.")

    oda_listesi = sorted(
        d for d in os.listdir(ROOMS_DIR)
        if os.path.isdir(os.path.join(ROOMS_DIR, d))
    )

    if not oda_listesi:
        sys.exit("rooms/ klasoru altinda oda bulunamadi.")

    for oda_no in oda_listesi:
        hedef_url = "{}/index.html?oda={}".format(base_url, oda_no)
        img = qrcode.make(hedef_url)
        cikti_yolu = os.path.join(ROOMS_DIR, oda_no, "qr-{}.png".format(oda_no))
        img.save(cikti_yolu)
        print("Olusturuldu: {}  ->  {}".format(cikti_yolu, hedef_url))


if __name__ == "__main__":
    main()
