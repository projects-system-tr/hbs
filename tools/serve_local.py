"""
Yerelde test etmek icin basit HTTP sunucusu.

Neden gerekli? Bu siteyi bilgisayarinizda dosyaya cift tiklayarak
(file://...) actiginizda, tarayicilar guvenlik nedeniyle rooms/ altindaki
JSON dosyalarini okumaya izin vermez ve "oda bulunamadi" hatasi alirsiniz.
Bu script basit bir web sunucusu baslatarak bu sorunu cozer.

Kullanim:
    python3 tools/serve_local.py

Sonra tarayicida acin:
    http://localhost:8000/index.html?oda=A-101
"""

import http.server
import os
import socketserver

PORT = 8000
KOK_DIZIN = os.path.join(os.path.dirname(__file__), "..")


def main():
    os.chdir(KOK_DIZIN)
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print("Sunucu calisiyor: http://localhost:{}/index.html?oda=A-101".format(PORT))
        print("Durdurmak icin Ctrl+C")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
