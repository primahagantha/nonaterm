---
name: Brainstorming
description: Digunakan untuk melakukan diskusi, memecahkan masalah arsitektur, dan brainstorming fitur dengan user/agent lain secara terstruktur.
---

# Skill: Brainstorming & Architecture Discussion

Skill ini digunakan oleh AI Agent (terutama model non-thinking atau programmer junior) saat menghadapi masalah desain, pilihan arsitektur alternatif, atau instruksi yang kurang jelas (ambigu) dari pengguna.

## 💡 Kapan Menggunakan Skill Ini?
*   Pengguna memberikan instruksi yang kurang detail (misal: "buat layout dinamis").
*   Ada dua atau lebih pilihan teknologi/desain dengan trade-off yang berbeda (misal: CSS Modules vs Tailwind, JSON vs SQLite).
*   Terjadi bug misterius yang membutuhkan analisis akar penyebab (root cause analysis) terstruktur sebelum menulis kode.

## 🛠️ Alur Kerja Brainstorming (Divergensi & Konvergensi)

### Langkah 1: Kumpulkan Konteks & Alternatif (Divergensi)
Jangan langsung memilih satu solusi. Jabarkan minimal 2-3 alternatif pilihan dengan format terstruktur:
1.  **Pilihan A**: Deskripsi singkat, Cara kerja, Kelebihan, Kekurangan.
2.  **Pilihan B**: Deskripsi singkat, Cara kerja, Kelebihan, Kekurangan.
3.  **Pilihan C**: Deskripsi singkat, Cara kerja, Kelebihan, Kekurangan.

### Langkah 2: Analisis Trade-off (Metrik Penilaian)
Gunakan tabel perbandingan untuk mengevaluasi alternatif berdasarkan batasan proyek Nonaterm (lihat [AGENTS.md](file:///D:/production/Nonaterm/AGENTS.md)):
*   **Performa**: Dampak terhadap CPU, memory footprint, cold start.
*   **Kompleksitas**: Seberapa sulit diimplementasikan dan dipelihara.
*   **Risiko**: Potensi bug, security issue, atau platform dependency (Windows ConPTY).

### Langkah 3: Berikan Rekomendasi
Sebagai AI Agent yang kompeten, Anda harus memberikan rekomendasi logis:
*   *“Kami merekomendasikan Pilihan B karena...”*
*   Jelaskan mengapa pilihan tersebut paling sesuai dengan target performa/kebutuhan PRD Nonaterm.

### Langkah 4: Minta Konfirmasi Pengguna
Tanyakan pendapat pengguna secara terstruktur. Gunakan tool `ask_question` jika tersedia untuk mempermudah pengguna memilih opsi secara interaktif.

---

## 📋 Contoh Format Respon Brainstorming

```markdown
### 🧠 Opsi Solusi untuk [Nama Masalah]

#### Opsi 1: [Nama Opsi 1]
*   **Deskripsi**: ...
*   **Kelebihan**:
    *   ➕ ...
*   **Kekurangan**:
    *   ➖ ...

#### Opsi 2: [Nama Opsi 2]
*   **Deskripsi**: ...
*   **Kelebihan**:
    *   ➕ ...
*   **Kekurangan**:
    *   ➖ ...

### 📊 Perbandingan Singkat
| Opsi | Kompleksitas | Dampak Memori | Kecepatan Switch |
|---|---|---|---|
| Opsi 1 | Rendah | Tinggi | Sedang |
| Opsi 2 | Sedang | Sangat Rendah | Sangat Cepat |

### 🎯 Rekomendasi
Kami menyarankan **Opsi 2** karena...
```
