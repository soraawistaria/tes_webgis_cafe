# CafeYuk!

**CafeYuk!** adalah website WebGIS interaktif untuk menemukan cafe di Kalimantan Selatan yang cocok untuk nongkrong, belajar, atau WFC. Proyek ini memakai langsung data dan layer batas wilayah dari ekspor QGIS, lalu menyajikannya lewat peta Leaflet yang ramah untuk anak sekolah sampai pekerja remote.

## Fitur

- **Peta interaktif** sebaran 1.043 cafe di 13 kabupaten/kota Kalimantan Selatan.
- **Hover tooltip** untuk melihat nama dan alamat cafe, **klik marker** untuk popup detail.
- **Pencarian** nama cafe, area, atau alamat.
- **Quick filter** di bawah kolom pencarian: Nongkrong, Belajar, WFC, Buka 24 Jam, dan Rating 4.5+.
- **Filter lengkap** lewat dialog: lokasi, jenis tempat, rating minimal, suasana, dan status buka sekarang.
- **Daftar cafe** yang bisa diurutkan (relevansi, rating, ulasan, nama A–Z), lengkap dengan rating, jumlah ulasan, area, status buka, dan label suasana.
- **Marker clustering** dan auto-fit peta mengikuti hasil filter.
- **Halaman Tentang Kami** berisi cerita proyek, ringkasan data, mini-map cakupan, dan profil pembuat.
- Desain retro/playful, responsif, mendukung keyboard focus, `aria` labels, dan `prefers-reduced-motion`.

## Cara menjalankan

Tidak ada build step atau package manager. Semua aset disajikan sebagai file statis.

1. Buka folder proyek.
2. Jalankan server statis sederhana, misalnya:

   ```bash
   npx serve .
   ```

   atau

   ```bash
   python -m http.server 8000
   ```

3. Buka `http://localhost:3000` (sesuaikan dengan port server).

Membuka `index.html` langsung lewat browser juga bisa, tetapi server statis lebih disarankan agar semua aset dan tile peta dimuat konsisten.

## Struktur

```text
.
├─ index.html                  # Beranda: hero, pencarian, filter, peta, daftar cafe
├─ about.html                  # Tentang proyek, data, dan pembuat
├─ assets/
│  ├─ css/style.css            # Seluruh desain retro/playful + override Leaflet
│  └─ js/
│     ├─ catalog.js            # Normalisasi data QGIS, jam buka, wilayah, label suasana
│     ├─ app.js                # Peta utama, clustering, pencarian, filter, daftar cafe
│     ├─ about-map.js          # Mini-map cakupan di halaman About
│     └─ site.js               # Navigasi mobile, sticky header, tahun footer
└─ qgis2web_2026_11_01-12_33_45_135385/
   ├─ data/                    # Layer cafe & batas kabupaten/kota (GeoJSON JS)
   ├─ js/                      # Leaflet + markercluster
   └─ css/                     # CSS dasar Leaflet & markercluster
```

## Data

- Sumber utama: ekspor QGIS `qgis2web_2026_11_01-12_33_45_135385`.
- Layer cafe: **1.044 fitur** awal. Satu fitur kategori *Convenience store* dikeluarkan sehingga tersisa **1.043 titik cafe**.
- Layer batas wilayah: **13 kabupaten/kota** di Kalimantan Selatan.
- Kategori yang dipakai: Coffee shop, Cafe, dan Restaurant.
- Wilayah tiap cafe ditentukan dengan *point-in-polygon* terhadap layer batas, dengan fallback pola alamat.
- Label suasana (`Nongkrong`, `Belajar`, `WFC`, `Buka 24 Jam`, `Hidden gem`, `Favorit warga`) diturunkan dari rating, jumlah ulasan, jam buka, jam ramai, dan kategori.
- Jam buka diurai dari format ekspor QGIS, termasuk `Closed`, `Open 24 hours`, dan format `9.00 am–12.00 am`.
- Rating, ulasan, dan jam operasional dapat berubah di lapangan. Data ini adalah titik awal, bukan jaminan kondisi terkini.

Basemap memakai tile **CARTO Voyager** di atas **OpenStreetMap**. Layer batas QGIS tetap ditampilkan sebagai overlay. Jika tile online tidak tersedia, titik cafe dan batas wilayah tetap muncul di atas latar polos.

## Teknologi

- HTML, CSS, dan JavaScript vanilla.
- Leaflet + Leaflet.markercluster dari folder ekspor QGIS.
- Google Fonts: Fraunces, DM Sans, Caveat.
- Tanpa framework, tanpa login, tanpa database.

## Pembuat

**Amalia Soraya**
- Instagram: [@soraawistaria](https://www.instagram.com/soraawistaria/)
- Mulai proyek: **1 November 2026**
- Wilayah: Kalimantan Selatan

## Lisensi & catatan

Proyek ini dibuat untuk keperluan pembelajaran dan portofolio WebGIS. Data cafe berasal dari dataset yang diekspor melalui QGIS. Basemap mengikuti ketentuan atribusi OpenStreetMap dan CARTO. Sebelum menggunakan data untuk keperluan komersial, periksa kembali sumber dan izin dataset aslinya.
