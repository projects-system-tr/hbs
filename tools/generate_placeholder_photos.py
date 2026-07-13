"""
Yer tutucu (placeholder) profil fotografi olusturucu.

rooms/ altindaki, henuz gercek fotografi olmayan her oda icin notr bir
siluet PNG'si olusturur (picture-<oda_kodu>.png). Gercek fotograf
eklendiginde bu dosyanin uzerine yazmaniz yeterlidir (ayni isimle).

Kullanim:
    pip install pillow
    python3 tools/generate_placeholder_photos.py

Not: Zaten bir picture-*.jpg/.jpeg/.png dosyasi olan odalar ATLANIR,
gercek fotograflarin uzerine yazilmaz.
"""

import os

try:
    from PIL import Image, ImageDraw
except ImportError:
    raise SystemExit("Once 'pip install pillow' calistirin.")

ROOMS_DIR = os.path.join(os.path.dirname(__file__), "..", "rooms")

# Sitenin renk paletiyle uyumlu (assets/css/style.css --primer / --primer-tint)
BG = (228, 242, 238)
FG = (15, 109, 92)


def make_avatar():
    size = 400
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)
    d.ellipse((140, 70, 260, 190), fill=FG)               # bas
    d.pieslice((80, 210, 320, 470), 180, 360, fill=FG)     # govde
    return img


def foto_var_mi(klasor, oda_kodu):
    for uzanti in ("jpg", "jpeg", "png"):
        if os.path.isfile(os.path.join(klasor, "picture-{}.{}".format(oda_kodu, uzanti))):
            return True
    return False


def main():
    if not os.path.isdir(ROOMS_DIR):
        raise SystemExit("rooms/ klasoru bulunamadi.")

    avatar = make_avatar()
    olusturulan = 0
    atlanan = 0

    for oda_kodu in sorted(os.listdir(ROOMS_DIR)):
        klasor = os.path.join(ROOMS_DIR, oda_kodu)
        if not os.path.isdir(klasor):
            continue
        if not os.path.isfile(os.path.join(klasor, "settings.json")):
            continue

        if foto_var_mi(klasor, oda_kodu):
            atlanan += 1
            continue

        avatar.save(os.path.join(klasor, "picture-{}.png".format(oda_kodu)))
        olusturulan += 1

    print("Olusturulan placeholder foto: {}".format(olusturulan))
    print("Zaten fotografi olan (atlanan) oda: {}".format(atlanan))


if __name__ == "__main__":
    main()
