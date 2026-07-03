---
name: Multi-Brain Collaboration
description: Mengorkestrasi dan berkolaborasi dengan beberapa subagent terspesialisasi (multi-brain) untuk menyelesaikan tugas pengembangan yang kompleks secara paralel.
---

# Skill: Multi-Brain Collaboration & Orchestration

Skill ini digunakan untuk membagi tugas pengembangan software yang besar ke dalam beberapa subagent spesialis (disebut "brains") agar pekerjaan selesai lebih cepat, lebih fokus, dan menghindari degradasi context window.

## 🤝 Kapan Menggunakan Multi-Brain?
*   Ketika Anda perlu menulis backend (Rust) dan frontend (React) secara bersamaan.
*   Ketika Anda perlu melakukan riset mendalam sambil tetap menjaga fokus penulisan kode di chat utama.
*   Ketika dokumen yang perlu ditulis sangat besar (seperti SDD atau TDD) sehingga melebihi kapasitas output satu putaran model.

## ⚙️ Cara Mengorkestrasi Subagents (Multi-Brain Workflow)

### Langkah 1: Bagi Tugas (Task Decomposition)
Bagi proyek menjadi komponen-komponen independen. Contoh pada Nonaterm:
1.  **Rust Backend Brain**: Menangani implementasi `portable-pty` dan Tauri commands.
2.  **React Frontend Brain**: Menangani implementasi xterm.js dan Zustand stores.
3.  **Docs/TDD Writer Brain**: Menulis dokumentasi teknis atau pengujian.

### Langkah 2: Definisikan & Panggil Subagent
Gunakan tool `define_subagent` untuk membuat tipe subagent baru jika belum ada, lalu panggil menggunakan `invoke_subagent`. Berikan prompt awal yang sangat spesifik dan batasan file yang boleh diedit.

### Langkah 3: Komunikasi & Pengumpulan Hasil
*   Gunakan tool `send_message` untuk menanyakan status perkembangan subagent.
*   Jangan melakukan polling berulang-ulang secara sia-sia. Hentikan pemanggilan tool untuk membiarkan subagent bekerja, sistem akan membangunkan Anda secara reaktif ketika ada pesan balasan.
*   Gabungkan dan review hasil kerja subagent sebelum digabungkan ke branch utama (`develop` atau `main`).

---

## ⚠️ Aturan Penting Multi-Brain
1.  **Pemisahan Tugas yang Jelas (Siloing)**: Jangan biarkan dua subagent mengedit file yang sama secara bersamaan untuk mencegah *file stomping* (konflik modifikasi file).
2.  **Inherit vs Branch Workspace**: Gunakan workspace `inherit` untuk subagent yang hanya membaca file atau melakukan edit kecil. Gunakan `branch` jika subagent akan menjalankan kompilasi terpisah atau melakukan eksperimen yang berisiko merusak state kerja Anda saat ini.
3.  **Review Code**: Anda bertindak sebagai **Lead Architect**. Hasil kerja subagent harus di-review, diuji (menjalankan tests), dan dipastikan bebas lint errors sebelum dilaporkan kepada user.
