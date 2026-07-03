

PRD: Terminal Workspace
Manager untuk Vibecoder
Platform: Windows (Rust + Tauri)
Status: Draft v0.1
## Tanggal: 18 Juni 2026
## 1. Ringkasan
Aplikasi desktop native Windows berbasis Rust +
Tauri yang mengorganisir banyak sesi terminal
ke dalam unit bernama "Workspace". Setiap
workspace bisa menampung hingga 9 terminal
sekaligus dalam grid layout, punya identitas
visual sendiri (nama, warna, font), dan bisa
dipindah ke window terpisah untuk setup multi-
monitor.
Target user adalah vibecoder: developer yang
banyak melakukan AI-assisted coding (Claude
Code, Cursor, agent CLI lain), menjalankan
banyak proses paralel per proyek (dev server, AI

agent, test watcher, log tail, git), dan berpindah-
pindah proyek dengan frekuensi tinggi dalam
sehari.
- Masalah yang Diselesaikan
MasalahKondisi saat ini
## Konteks-switching
antar proyek lambat
Harus buka ulang
terminal, cd manual,
jalankan ulang
command tiap pindah
proyek
Sulit membedakan
proyek secara visual
Semua jendela
terminal terlihat
identik, gampang salah
ketik command di
proyek yang salah
Tmux/Windows
Terminal terlalu rumit
untuk workflow cepat
Pane splitting manual,
tidak ada konsep
"workspace" yang
reusable
AI agent + dev server
+ log butuh banyak
Tidak ada cara cepat
menata 6–9 proses

MasalahKondisi saat ini
terminal sekaligussekaligus dalam satu
layar
[Likely, berdasarkan riset lapangan Maret–
April 2026] Dua masalah tambahan yang
muncul spesifik di workflow multi-agent
paralel, dikonfirmasi independen oleh praktisi
(artikel workflow git worktree + AI agent) dan
pembuat tool orkestrasi agent (Batty,
supervisor berbasis tmux untuk Claude Code):
File stomping: dua agent AI yang jalan paralel
di repo yang sama bisa saling menimpa file
yang sedang diedit, tanpa ada yang sadar
sampai terlambat
User jadi "dispatcher" manual: dengan
banyak agent jalan bersamaan, manusia jadi
bottleneck karena harus terus-menerus cek
satu-satu agent mana yang selesai, mana
yang stuck, mana yang "bilang selesai"
padahal test-nya gagal
## 3. Target Pengguna

Persona: "Vibecoder"
Solo developer / indie hacker / small team
Coding berbasis iterasi cepat dengan AI
assistant sebagai co-pilot utama
Menjalankan 3–9 proses simultan per proyek:
AI agent terminal, dev server, test runner, log
tail, git, build watcher
Berpindah 3–10 proyek per hari
[Likely] Mulai terbiasa menjalankan tiap AI
agent di git worktree terpisah
(branch+direktori sendiri) justru untuk
MENGHINDARI file stomping — pola ini baru
muncul kuat di kalangan power-user
vibecoder awal 2026
Lebih mengutamakan kecepatan visual &
keyboard-first daripada konfigurasi
mendalam ala power-user tmux
Bukan target (eksplisit):
Sysadmin yang butuh SSH ke ratusan server
Tim enterprise yang butuh audit log & SSO
Pengguna Linux/Mac (di luar scope MVP)

## 4. Tujuan Produk
## Goals:
Switch antar workspace < 100ms, tanpa
kehilangan state
Setup ulang lingkungan kerja (9 terminal +
posisi + command) dalam < 5 detik via
template
Footprint memori jauh lebih ringan dari
kompetitor berbasis Electron
Identitas visual workspace langsung dikenali
tanpa membaca teks
Non-Goals (MVP):
Tidak cross-platform (Mac/Linux ditunda)
Tidak ada SSH/remote terminal
Tidak ada plugin marketplace
Tidak ada cloud sync
## 5. Lanskap Kompetitif (singkat)

ProdukKekuatan
Celah yang bisa
dieksploitasi
## Warp
AI-native,
blocks,
populer
Berat (Electron-
ish), bukan Rust
native, cross-
platform generik
## Wave
## Terminal
## Workspace
concept
sudah ada
UX kompleks,
belum fokus grid-
## 9
## Windows
## Terminal
## Native,
ringan
Tidak ada konsep
workspace
bernama +
warna, tidak ada
template
WezTerm
## Cepat,
scriptable
(Lua)
Kurva belajar
tinggi, tidak
vibecoder-
friendly
Catatan kritis: grid 9-terminal dan workspace
berwarna itu table stakes, bukan diferensiasi.
Diferensiasi nyata harus datang dari
kombinasi: kecepatan native Rust + template
startup command + (opsional) integrasi

langsung dengan AI agent state.
Pertimbangkan ini sebelum commit ke MVP.
Tambahan kategori adjacent (bukan
kompetitor langsung): muncul tool seperti
Batty — supervisor orkestrasi multi-agent
berbasis tmux untuk Claude Code, dengan
hierarki architect/manager/engineer dan
kanban board, tapi murni CLI tanpa GUI. Ini
bukan pesaing grid-terminal — justru sinyal
bahwa kebutuhan "mengelola banyak agent
paralel" itu nyata dan orang rela pakai tool
tambahan demi itu. [Guessing] Peluang: app
ini bisa jadi "cockpit visual" di atas pola kerja
yang sama, tanpa harus membangun
orkestrasi agent-nya sendiri di MVP.
- Fitur Inti (MVP — Wajib Ada)
- Manajemen Workspace: create, rename,
delete, reorder workspace
- Grid Terminal: hingga 9 terminal per
workspace, preset layout (1/2/4/6/9)
- PTY native Windows: dukungan cmd,
PowerShell, WSL, Git Bash via ConPTY

- Switching cepat: sidebar/tab + shortcut
keyboard (Alt+1..9 — bukan Ctrl+1..9, demi
konsistensi dengan prinsip passthrough di
## Section 17)
- Identitas visual workspace: nama, warna
aksen, font per workspace
- State persistence: working directory & layout
terminal dipulihkan saat app dibuka ulang
- Copy/paste & scrollback standar
- Spawn/close terminal individual dalam slot
grid
- Terminal passthrough default: shortcut app-
level TIDAK menimpa kombinasi umum
CLI/readline (Ctrl+P/N/F/B/R, dll) — lihat
Section 17 untuk arsitektur lengkap
- Autosave state berkala: snapshot layout +
cwd + startup command setiap 5–10 detik
untuk crash recovery — lihat Section 19 untuk
detail
- Fitur Penting (V1 — Harus Ada
Setelah MVP)

- Multi-window: drag workspace keluar jadi
window OS terpisah (multi-monitor)
- Resize grid manual (drag divider), bukan
cuma preset
- Startup command per workspace: auto-run
command saat terminal dibuka (mis. claude
code, npm run dev)
- Workspace template: simpan layout + startup
command sebagai template, reuse untuk
proyek baru
- Search scrollback dalam terminal
- Global hotkey show/hide app (quake-style)
## 8. Fitur Utilitas
Command palette (Ctrl+Shift+P): jump
workspace, spawn terminal, jalankan snippet
Snippet library: simpan command yang
sering dipakai
Status indikator proses per terminal slot
## (running/idle/exited)
Export/import config workspace (JSON)
untuk backup/share antar mesin
Auto-restart shell jika crash

- Fitur Pendukung (Nice-to-Have
## / V2+)
Import color scheme eksternal (iTerm2/Warp
theme)
Notifikasi saat output cocok pola tertentu
(build selesai, test gagal)
Integrasi AI: "jelaskan error ini" langsung dari
output terminal
Cloud sync settings & workspace
Remote terminal (SSH)
Plugin system
- Fitur Diadopsi dari Kompetitor
(Warp / Wave Terminal /
WezTerm)
Ini fitur yang sudah terbukti dipakai di kompetitor
— masuk akal diadopsi karena sudah tervalidasi
pasar, bukan sekadar ikut-ikutan.
## Dari Warp:

Blocks-based output: setiap command +
output-nya dikelompokkan jadi satu unit yang
bisa di-collapse, di-copy, atau di-share —
bukan stream teks mentah yang terus
menggulung
Project rules file: workspace otomatis
membaca file aturan proyek (mis.
AGENTS.md/CLAUDE.md) di root direktori dan
menampilkannya sebagai konteks, supaya
semua AI agent yang dijalankan di terminal
lain dalam workspace yang sama tahu
konvensi proyek
Rich multiline input: opsi Ctrl+Enter untuk
newline (Enter untuk submit) — penting saat
compose prompt panjang ke AI agent tanpa
nyangkut ke command sebelumnya
Vertical tabs sidebar: alternatif layout selain
grid, untuk workspace dengan banyak
terminal tapi user mau fokus satu-satu
secara berurutan
## Dari Wave Terminal:
Inline rendering: kalau command
menghasilkan gambar/diff/markdown,
tampilkan langsung di dalam block, bukan
cuma teks

Workspace-scoped widgets: panel kecil
custom per workspace (mis. quick links ke
dokumentasi proyek, dashboard status) yang
menempel ke workspace tertentu, hilang saat
pindah workspace lain
Universal searchable history: pencarian
command lintas semua terminal & semua
workspace dalam satu kotak pencarian,
bukan per-pane
Dari WezTerm:
Quick Select mode: highlight pola teks (path,
URL, hash) di scrollback dan pilih dengan
keyboard tanpa mouse — krusial untuk
vibecoder yang sering copy path/error dari
output AI agent
Config hot-reload: edit file config teks,
langsung ter-apply tanpa restart aplikasi
CLI scripting interface: command-line tool
eksternal (app-cli spawn, app-cli send-
text, dst.) supaya workspace bisa dikontrol
dari script luar — fondasi untuk
automasi/integrasi custom

## 11. Fitur Diferensiasi Orisinal
(Belum Ada di Warp / Wave /
WezTerm)
Ini bagian yang sebenarnya menjawab tantangan
"apa yang bikin orang pindah". Statusnya masih
ide — perlu divalidasi ke calon user sebelum
masuk roadmap pasti.
- Attention Inbox(prioritas tertinggi — sekarang
[Likely], bukan lagi murni tebakan) — daftar
terpusat di luar grid yang menampilkan
terminal mana saja yang sedang "menunggu
input" (AI agent nanya konfirmasi, command
berhenti karena error, prompt y/n) ATAU
"selesai tapi bermasalah" (exit code≠0, output
cocok pola test-failure umum seperti
FAILED/Error:). Klik item → langsung
fokus ke pane itu. Validasi: riset lapangan
Maret–April 2026 mengonfirmasi user yang
menjalankan agent paralel benar-benar
mengalami masalah "jadi dispatcher manual"
dan "agent bilang selesai padahal test gagal"
— persis dua kondisi yang coba diselesaikan
fitur ini. Tidak ada satupun dari 3 kompetitor

yang punya agregator lintas-pane semacam
ini.
- Broadcast Input Selektif — kirim satu ketikan
ke beberapa terminal sekaligus, dengan
checkbox memilih pane mana yang ikut
menerima (bukan all-or-nothing seperti tmux
synchronize-panes). Berguna untuk git
pull ke beberapa repo paralel, atau
mengirim prompt yang sama ke beberapa AI
agent untuk membandingkan jawaban (A/B
testing prompt).
- Token/Cost Meter per Workspace — agregasi
estimasi token & biaya API dari semua AI
agent CLI yang berjalan di terminal dalam
satu workspace (parsing baris usage dari
Claude Code/Cursor CLI), ditampilkan
sebagai counter kecil di header workspace.
Vibecoder yang menjalankan banyak agent
paralel rawan kebobolan biaya tanpa sadar.
- Agent Edit Diff Strip — saat AI agent di salah
satu pane menulis/mengubah file (terdeteksi
via file-watcher di working directory pane
tsb), tampilkan strip diff mini di samping
pane itu, klik untuk expand jadi full diff. Beda

dari editor manual Wave — ini reaktif
otomatis terhadap perubahan dari agent.
- Workspace Health Strip — satu baris
ringkasan di atas grid: jumlah pane idle,
jumlah error/exit-code≠0, jumlah masih
running — mini dashboard tanpa harus scan 9
kotak satu per satu.
Catatan: kelima ide ini belum tervalidasi user
riset. Sebelum masuk MVP/V1, minimal
lakukan 5–10 wawancara dengan vibecoder
asli untuk konfirmasi Attention Inbox dan
Token Meter benar-benar pain point, bukan
asumsi gue semata.
- Workspace-to-Worktree Auto-Binding(baru,
ditambahkan berdasarkan riset) — saat
membuat workspace baru, opsi "Bind ke Git
Worktree": app otomatis menjalankan git
worktree add + buat branch baru, lalu
semua terminal di workspace itu otomatis
cd ke direktori worktree tsb. Ini secara
struktural mencegah file stomping (tiap agent
kerja di direktori fisik terpisah) tanpa user
harus hafal command worktree manual.
Opsional, bukan wajib — fallback ke direktori

biasa kalau user tidak pakai git atau tidak
butuh isolasi.
Catatan: fitur #6 ini paling kuat didukung bukti
riset dari kelima ide — naikkan prioritasnya ke
V1, bukan V2.
- UI/UX Flow & Prinsip HCI
Bagian ini paling kritis dari seluruh PRD — kalau
fitur di Section 6–11 benar tapi flow-nya
membingungkan, user coba 5 menit lalu balik ke
## Warp.
## 12.1 Core User Flows
Flow A — First Launch (Onboarding)
- App dibuka pertama kali → langsung tampil 1
workspace default ("Workspace 1") dengan 1
terminal aktif, BUKAN layar onboarding
kosong/wizard panjang. Vibecoder mau
langsung kerja.
- Tooltip singkat (dismissable, sekali muncul)
menunjuk ke tombol "+ Workspace" dan
shortcut terminal baru.

- Tidak ada form wajib diisi (nama, akun, dll)
sebelum bisa pakai terminal pertama.
## Flow B — Membuat Workspace Baru
- Klik "+" di sidebar atau shortcut → workspace
baru langsung dibuat dengan nama default
"Workspace N" dan 1 terminal kosong, fokus
otomatis ke command-line.
- Rename: klik nama (inline-edit, bukan modal
dialog terpisah) → ketik nama baru →
Enter/blur untuk simpan. Swatch warna kecil
di sebelahnya, klik untuk buka color picker
ringan.
- Tidak ada tombol "Save" terpisah — semua
perubahan workspace tersimpan otomatis
saat itu juga (lihat Section 19).
## Flow C — Switch Workspace
- Klik tab/sidebar item ATAU shortcut Alt+1..9
→ transisi instan (<100ms), animasi (kalau
ada) maksimum 100–150ms supaya tidak
menghalangi.
- Scroll position & fokus pane terakhir di
workspace tsb dipertahankan persis seperti
saat ditinggalkan.

Flow D — Menutup Workspace (Tombol Silang)
- Klik "x" pada tab workspace → JANGAN
langsung tutup tanpa konfirmasi kalau ada
proses aktif (PTY masih running, bukan idle
shell kosong).
- Konfirmasi ringan: "Tutup Workspace 'X'? 3
terminal masih berjalan." dengan opsi
[Simpan & Tutup] [Tutup Tanpa Simpan]
[Batal] — fokus default ke opsi paling aman.
- Kalau semua terminal di workspace itu
idle/kosong, tutup langsung tanpa dialog —
penerapan "jangan minta konfirmasi untuk
aksi non-destruktif".
Flow E — Force-Close / Crash Recovery
- App di-kill paksa (Task Manager, power loss,
crash) → saat dibuka lagi, app mendeteksi
shutdown tidak normal dari lockfile yang
belum dibersihkan.
- Tampilkan banner non-blocking: "Sesi
sebelumnya berakhir tidak normal. [Pulihkan
Layout] [Mulai Baru]" — bukan modal yang
memaksa pilihan sebelum bisa pakai app.
- PENTING (detail teknis di Section 19): yang
dipulihkan adalah layout, working directory,

dan startup command — BUKAN state proses
yang sedang berjalan persis sebelum crash.
Ini harus dikomunikasikan jujur di UI, bukan
dijanjikan sebagai "pulih 100%".
12.2 Prinsip HCI yang Diterapkan
PrinsipPenerapan Konkret di App
Visibility of
system status
(Nielsen #1)
## Workspace Health Strip
(Section 11) selalu terlihat
tanpa harus klik apa pun;
warna tab berubah subtle
kalau ada error di dalamnya
User control &
freedom
(Nielsen #3)
Aksi destruktif (tutup
workspace dengan proses
aktif) punya jalan keluar
singkat — toast "Workspace
ditutup [Undo]" 5 detik
sebelum benar-benar
dibuang dari state
## Consistency &
standards
(Nielsen #4)
Shortcut default ikuti
konvensi OS Windows
(Ctrl+T, Ctrl+W, Ctrl+Tab) —
bukan skema asing buatan
sendiri

PrinsipPenerapan Konkret di App
Error prevention
(Nielsen #5)
Konfirmasi hanya muncul
untuk aksi benar-benar
destruktif (proses aktif) —
mencegah "dialog fatigue"
yang bikin user asal klik OK
## Recognition
rather than
recall (Nielsen
## #6)
Identitas visual workspace
## (warna+nama) + Attention
Inbox menghilangkan
kebutuhan mengingat
"terminal mana lagi ngapain"
## Flexibility &
efficiency of
use (Nielsen
## #7)
Power user dapat full
keyboard-only flow
(command palette, shortcut
grid); user baru bisa full
mouse — keduanya tidak
saling menghalangi
## Aesthetic &
minimalist
design (Nielsen
## #8)
Default UI tidak
menampilkan semua setting
sekaligus; advanced
settings di balik toggle
"Advanced"
Help users
recognize &
Shell crash/exit code≠0
tidak langsung

PrinsipPenerapan Konkret di App
recover from
errors (Nielsen
## #9)
menghilangkan pane —
tampilkan exit code +
tombol "Restart Shell" di
tempat
## Fitts's Law
Target klik kritis (tombol
close pane, tab) punya hit-
area minimum 32×32px
meski elemen visual lebih
kecil
## Hick's Law
Command palette pakai
fuzzy search, bukan menu
bertingkat — mengurangi
waktu keputusan saat
pilihan banyak
Catatan kritis: prinsip di atas gampang ditulis
di PRD tapi gampang dilanggar saat
implementasi terburu-buru. Wajib jadi
acceptance criteria di tiap user story, bukan
dokumentasi yang dilupakan setelah sprint 1.
## 12.3 Flow Tambahan
Flow F — Membuat Workspace dari Git Worktree

- Saat klik "+ Workspace", muncul opsi
sekunder (bukan wajib diisi): "Bind ke Git
Worktree?" dengan field repo path (auto-
detect dari direktori kerja terakhir) dan nama
branch (auto-suggest dari nama workspace).
- Kalau dipilih, app jalankan git worktree
add di background dengan indikator progress
kecil, lalu workspace otomatis terbuka
dengan cwd di worktree baru.
- Kalau gagal (mis. branch sudah ada),
tampilkan error inline di form — bukan dialog
terpisah yang memutus alur.
## Flow G — Mengubah Settings
- Settings dibuka sebagai panel sliding dari
samping (bukan window/modal terpisah
yang menutupi seluruh app) — supaya user
masih bisa lihat terminal di belakang sambil
ubah setting dan langsung lihat efeknya.
- Perubahan diterapkan langsung (live
preview), bukan butuh tombol "Apply"/"Save"
— kecuali untuk perubahan yang berisiko
(mis. ganti default shell) yang butuh
konfirmasi ringan.

Flow H — Kustomisasi Keybind dengan Conflict
## Warning
- User buka Settings → Keybindings → klik
shortcut yang mau diubah → tekan
kombinasi baru.
- Kalau kombinasi terdeteksi umum dipakai
CLI/readline (lihat Section 17), tampilkan
inline warning kuning di bawah field
SEBELUM disimpan: "Ctrl+P umum dipakai
untuk command history/autocomplete di
banyak CLI tool. Tetap pakai?" dengan opsi
[Tetap Pakai] [Batal] — bukan blocking
otomatis, karena user power-user mungkin
memang sengaja.
- Setelah disimpan, langsung aktif tanpa
restart app.
Flow I — Detach Workspace ke Window Baru
(Multi-Window)
- Drag tab workspace ke luar batas window
utama → preview ghost window muncul
mengikuti cursor → lepas mouse → window
baru terbentuk berisi workspace itu.
- Workspace yang sama tidak bisa ada di 2
window sekaligus (state tunggal, bukan

duplikasi) — kalau user drag balik ke window
utama, otomatis menyatu lagi sebagai tab.
Flow J — Resize/Rearrange Grid
- Hover di antara 2 pane → cursor berubah jadi
resize-handle, divider sedikit highlight
(signifier visual sebelum interaksi, bukan baru
muncul saat drag dimulai).
- Drag-and-drop pane untuk menukar posisi
dalam grid juga didukung — drop-zone
highlight muncul saat pane lain di-drag di
atasnya.
12.4 Information Architecture (Peta
## Navigasi)
## App Window
## ├─ Sidebar (persisten)
│   ├─ Daftar Workspace (nama + swatch
warna)
## │   ├─ Tombol "+ Workspace"
│   └─ Attention Inbox (badge count,
expand on click)
## ├─ Header Workspace Aktif
│   ├─ Nama (inline-editable) + warna
+ font
## │   ├─ Workspace Health Strip
(idle/error/running count)

│   └─ Token/Cost Meter (jika ada
agent CLI terdeteksi)
├─ Grid Terminal (1–9 pane, resizable)
└─ Command Palette (overlay, muncul via
shortcut, tidak permanen di layout)
Settings (panel sliding, bukan halaman
terpisah)
## ├─ General
## ├─ Appearance
## ├─ Terminal
## ├─ Keybindings
└─ Advanced (di balik toggle, lihat
Nielsen #8 di 12.2)
Prinsip IA: maksimal 2 level kedalaman untuk
mencapai aksi apa pun dari grid utama (klik
sekali untuk buka, klik kedua untuk aksi spesifik)
— selaras dengan target switch <100ms di
Section 14, karena navigasi dalam tidak boleh
jadi bottleneck performa persepsi.
12.5 Prinsip HCI Tambahan
PrinsipPenerapan Konkret
## Gestalt —
## Proximity &
Pane dalam grid yang sama
dikelompokkan visual dengan
border/background tipis per

PrinsipPenerapan Konkret
## Common
## Region
workspace, supaya mata
langsung tahu batas satu
workspace tanpa baca label
## Gestalt —
## Similarity
Pane dengan status sama
(mis. semua "running") pakai
indikator visual (warna dot)
yang konsisten di seluruh
grid, bukan beda-beda per
pane
## Miller's Law
## (7±2)
Sidebar workspace yang lebih
dari ~9 item otomatis dapat
search/filter box di atasnya —
jangan biarkan scroll panjang
tanpa bantuan cari
## Progressive
## Disclosure
Setting lanjutan (mis. opsi
worktree binding di Flow F)
disembunyikan di balik "opsi
lanjutan", bukan tampil semua
di form pertama
## Doherty
## Threshold
Semua respons UI ditarget
<400ms supaya terasa "tanpa
jeda" — di atas itu, WAJIB ada
loading indicator eksplisit

PrinsipPenerapan Konkret
(bukan UI yang diam
membingungkan)
## Jakob's Law
Pola interaksi ikut konvensi
yang sudah familiar (tab
seperti browser, sidebar
seperti VS Code/Slack) —
mengurangi kurva belajar
karena user sudah punya
model mental dari app lain
Peak-End
## Rule
Momen crash recovery (Flow
E) adalah momen paling
diingat user — desain banner
recovery harus jadi
pengalaman paling tenang &
jelas di seluruh app, bukan
yang paling membingungkan
## Affordance &
## Signifier
Setiap elemen yang bisa di-
drag (divider, tab) punya
sinyal visual SEBELUM
interaksi dimulai (cursor
berubah, sedikit highlight) —
bukan baru kelihatan
fungsinya setelah dicoba

PrinsipPenerapan Konkret
## Keyboard
## Accessibility
## (WCAG-
aligned)
Seluruh app bisa dinavigasi
tanpa mouse, fokus elemen
punya outline yang jelas
terlihat (bukan dihilangkan
demi estetika)
- Arsitektur Teknis (Ringkas)
## Backend: Rust + Tauri 2.x
PTY: crate portable-pty (ConPTY di
## Windows)
Frontend: React/Svelte + xterm.js untuk
rendering terminal
State/config: file JSON lokal atau SQLite
ringan di %APPDATA%
IPC: streaming I/O terminal via Tauri
command/event channel
Risiko teknis utama: render 9 PTY aktif sekaligus
dengan output tinggi bisa membebani xterm.js
di sisi frontend — perlu throttling/batching render
dari awal, bukan ditambal belakangan.

## 14. Performance & Non-
## Functional Requirements
"Performance penting" itu klaim kosong tanpa
angka. Berikut budget konkret yang jadi
acceptance criteria, bukan aspirasi:
MetrikTargetCatatan
Cold start (icon
→ siap pakai)
## <
## 800ms
## Termasuk
restore
workspace
terakhir
## Switch
workspace
## <
## 100ms
Detail dari
target di
## Section 4
Spawn terminal
baru dalam grid
## <
## 150ms
Dari klik
sampai prompt
siap terima
input
Idle CPU (9
terminal idle)
## < 1%
total
PTY idle tidak
boleh polling
agresif
Memori per
terminal pane
< 15MBTermasuk
buffer

MetrikTargetCatatan
aktifscrollback
default
Memori total 9
terminal + app
shell
## <
## 200MB
## Pembanding:
setup serupa di
app Electron-
based bisa
## 400MB+
Render output
saat log deras
## (npm
install/build)
## Tidak
drop
frame
Perlu batching
render, bukan
render per-
baris langsung
Frame rate UI
saat resize grid
## ≥ 60fps
## Drag-resize
divider harus
terasa native
Strategi teknis:
Lazy-render pane yang sedang tidak
fokus/visible di workspace lain
Backpressure pada PTY read loop — jangan
dorong batch render baru kalau frontend
belum selesai memproses batch sebelumnya
Hindari re-render seluruh grid saat hanya 1
pane berubah ukuran/konten

Rencana pengukuran (bukan cuma target di
kertas):
Profiling rutin pakai cargo flamegraph
untuk backend Rust dan Windows
Performance Recorder untuk sisi sistem
(handle, GPU, memory)
Perf budget di atas di-gate di CI: build gagal
kalau cold start atau memory footprint
regresi >10% dari baseline rilis sebelumnya
Uji beban nyata: 9 terminal dengan campuran
agent AI aktif (bukan idle shell kosong)
sebagai skenario uji utama, bukan skenario
kosong yang tidak representatif
- UX & Layout Grid
Preset layout: 1, 2, 4, 6, 9 (grid otomatis
menyesuaikan jumlah terminal aktif)
Resize manual antar pane (V1)
Responsive: window resize → grid reflow, ada
batas minimum ukuran pane sebelum
collapse/scroll
Warna workspace tampil di sidebar/tab agar
identifikasi visual instan saat banyak proyek

terbuka
- Pengaturan (Settings)
General: restore session saat startup, default
shell, default working directory
Appearance: tema (dark/light/custom), font
global, ukuran font, cursor style, opacity/acrylic
Per-workspace override: nama, warna, font,
shell, startup command
Terminal: ukuran scrollback buffer, bell behavior,
copy-on-select, konfirmasi paste multiline
Keybindings: dapat dikustomisasi
Hotkey global: toggle show/hide
Multi-window: ingat posisi window per monitor
## 17. Keybind & Passthrough
## Architecture
Ini masalah nyata yang sering bikin orang
berhenti pakai terminal app baru: app meng-
intercept shortcut yang seharusnya dikirim ke
program di dalam terminal (CLI tool, TUI app, AI
agent). Contoh yang disebutkan: opencode

pakai Ctrl+P untuk fungsinya sendiri — kalau app
meniru perilaku Termius yang men-hardcode
Ctrl+P untuk "buka tab lain", shortcut opencode
tidak pernah sampai ke program tsb.
[Likely, berdasarkan riset] Ini juga keluhan nyata
di Warp — beberapa laporan di GitHub issue
tracker mereka menyebut Warp memblokir
shortcut yang seharusnya diteruskan ke program
di dalamnya (termasuk saat dipakai bareng
tmux), dan user terpaksa cari workaround atau
berhenti pakai harian.
Prinsip desain:
- Default: minimal interception. Hanya
shortcut yang jarang dipakai aplikasi CLI
yang jadi default app-level shortcut (mis.
Ctrl+Shift+T, Ctrl+Shift+W). Hindari
mengklaim kombinasi umum seperti
Ctrl+P/N/F/B/R yang lazim dipakai
readline/vim/banyak CLI tool.
- Tiga lapis prioritas (top-down):
Layer 1 — Global Hotkey (OS-level):
hanya show/hide app, didefinisikan
eksplisit, tidak overlap dengan apa pun di
dalam terminal

Layer 2 — App-level shortcut (switch
workspace, spawn/close pane, command
palette): default ke kombinasi jarang
dipakai CLI tool (Alt+1..9, Ctrl+Shift+*,
bukan Ctrl+1..9/Ctrl+P polos)
Layer 3 — Terminal passthrough
(default): semua input lain diteruskan
mentah ke PTY/shell/program di
dalamnya — app tidak ikut campur
- Per-pane "Passthrough Mode" toggle
eksplisit: saat aktif (indikator visual kecil di
border pane), SEMUA app-level shortcut
nonaktif untuk pane itu — bahkan Layer 2 —
supaya TUI app seperti vim/opencode/tmux
di dalamnya dapat kontrol penuh. Toggle via
shortcut unik yang nyaris mustahil bentrok
(mis. Ctrl+Shift+Esc).
- Conflict detector saat kustomisasi keybind:
kalau user assign shortcut app-level ke
kombinasi yang terdeteksi umum dipakai
shell/CLI populer (daftar
readline/emacs/vim-mode bawaan),
tampilkan warning eksplisit sebelum
disimpan — bukan diam-diam menimpa.

- Per-shell-profile override: user bisa set
"untuk profile X (mis. WSL dengan opencode),
nonaktifkan shortcut app-level berikut" —
supaya tidak perlu toggle manual tiap buka
project yang sama.
Risiko kalau diabaikan: ini persis alasan
kenapa user di GitHub issue Warp bilang
masalah ini "prevents me from using Warp
daily" — keybind passthrough bukan nice-to-
have, ini blocker adopsi.
Contoh default keymap (Layer 2 — App-level):
AksiDefaultAlasan dipilih
## Switch
workspace
## 1–9
## Alt+1..9
## Ctrl+1..9
terlalu sering
dipakai
CLI/editor
untuk hal lain
## Workspace
baru
Ctrl+Shift+T
## Konsisten
dengan
konvensi
browser/OS,
jarang
dipakai CLI

AksiDefaultAlasan dipilih
Tutup paneCtrl+Shift+W
## Sama
alasannya,
hindari
Ctrl+W polos
## (dipakai
readline:
hapus kata)
## Command
palette
Ctrl+Shift+P
Sudah jadi
konvensi luas
(VS Code,
Warp), risiko
bentrok CLI
rendah
## Toggle
## Passthrough
## Mode
Ctrl+Shift+Esc
## Kombinasi
langka, nyaris
mustahil
dipakai
program lain
## Global
show/hide
Sesuai pilihan
user saat
setup
Tidak ada
default
hardcoded —
wajib
dikonfigurasi
user di first-

AksiDefaultAlasan dipilih
run agar
tidak bentrok
app lain di
sistemnya
Smart-default onboarding [Guessing, ide]: saat
app mendeteksi proses yang umum dikenal
"rakus shortcut" sedang berjalan di sebuah pane
(mis. vim, nvim, tmux, opencode —
dicocokkan dari nama proses, bukan parsing isi),
tampilkan saran ringan satu kali: "Terdeteksi
opencode di pane ini — aktifkan Passthrough
Mode supaya shortcut bawaannya tidak
bentrok?" dengan opsi [Aktifkan] [Nanti]. Ini
menjawab langsung skenario Ctrl+P yang
disebutkan — bukan user yang harus tahu duluan
soal Passthrough Mode, app yang menawarkan
di saat yang tepat.
- Multi-Window Workspace
Workspace bisa "dilepas" dari window utama
menjadi window OS independen (berguna untuk
setup multi-monitor: workspace A di monitor 1,

workspace B di monitor 2). Window terpisah
tetap sinkron dengan state aplikasi utama
(rename/warna ter-update di semua window).
## 19. Workspace & Window State
Persistence (Detail)
[Certain, keterbatasan teknis universal] Ada
batas fundamental yang harus jujur disampaikan
ke user dari awal: app BISA memulihkan layout,
working directory, command history, dan
scrollback buffer — tapi TIDAK BISA memulihkan
state proses yang sedang berjalan persis seperti
sebelum crash (progress build yang sedang
jalan, state interaktif vim yang belum di-save,
posisi cursor di REPL). Ini bukan keterbatasan
implementasi yang bisa "dikerjain lebih keras" —
ini batas fisik bagaimana proses OS bekerja, dan
ini diakui secara eksplisit bahkan oleh tim
Windows Terminal di tracker mereka sendiri.
Tiga skenario penutupan, tiga perilaku berbeda:
- Force-kill (Task Manager / power loss /
crash)

Tidak ada kesempatan app menyimpan
state final saat itu
Mitigasi: autosave snapshot (layout + cwd
+ startup command, BUKAN live buffer
proses) setiap 5–10 detik ke disk lokal,
bukan hanya saat aksi eksplisit
Saat dibuka lagi: deteksi shutdown
abnormal via lockfile, tawarkan restore
dari snapshot terakhir (Flow E, Section
## 12)
- Tutup Workspace via tombol silang
App tahu ini terjadi (bukan crash) →
proses graceful: simpan state penuh yang
tersedia, tanya konfirmasi kalau ada
proses aktif (Flow D, Section 12)
Workspace yang ditutup tersimpan
sebagai "recently closed" (mirip "reopen
closed tab" browser) selama sesi aplikasi
berjalan — bisa di-undo
## 3. Tutup Window (multi-window)
Hanya window-nya yang hilang;
workspace di dalamnya TETAP ada di
state aplikasi (bisa dibuka lagi sebagai

window terpisah) — bukan berarti
workspace ikut terhapus
Beda dengan menutup workspace itu
sendiri (yang menghapus workspace dari
daftar)
Yang disimpan dalam snapshot:
Layout grid (posisi & ukuran tiap pane)
Working directory tiap terminal
Startup command workspace (untuk re-run
otomatis, bukan restore proses)
N baris terakhir scrollback (default 1000
baris, demi ukuran file & startup time)
Nama, warna, font workspace
Yang TIDAK bisa disimpan (komunikasikan ke
user, jangan dijanjikan):
State memori proses yang sedang berjalan
(variable REPL, progress build)
Output yang masih akan datang dari proses
panjang yang terputus
Contoh struktur data snapshot (ringkas):
## {
## "workspace_id": "ws_3f9a",

"name": "Backend API",
"color": "#5B8DEF",
"font": "Cascadia Code",
## "worktree_path":
"C:\\repo\\.worktrees\\backend-api",
## "panes": [
## { "id": "p1", "cwd":
"C:\\repo\\.worktrees\\backend-api",
## "shell": "pwsh", "startup_cmd": "claude
code" },
## { "id": "p2", "cwd":
"C:\\repo\\.worktrees\\backend-api",
## "shell": "pwsh", "startup_cmd": "npm
run dev" }
## ],
## "layout": "grid_2x1",
"last_saved": "2026-06-18T14:32:05Z"
## }
Autosave bukan brute-force tiap N detik: [Likely,
demi performa & umur SSD] pakai pendekatan
debounce + diff — snapshot baru hanya ditulis ke
disk kalau ada PERUBAHAN nyata (layout
berubah, cwd berubah, pane baru/hilang) dalam
window 5–10 detik terakhir, bukan menulis ulang
file yang sama terus-menerus walau tidak ada
perubahan apa pun.

## 20. Metrik Keberhasilan
Waktu switch workspace < 100ms
Cold start < 1 detik
Memori dengan 9 terminal aktif: target
signifikan lebih rendah dari Warp/Electron-
based competitor
Retensi harian di kalangan target user
## (vibecoder)
## 21. Risiko & Pertanyaan Terbuka
Apakah "vibecoder" sebagai segmen cukup
besar untuk standalone product, atau lebih
cocok jadi fitur di tools yang sudah ada?
Batasan ConPTY/WSL edge case di Windows
Belum ada validasi user riset langsung —
persona masih asumsi
Diferensiasi vs Warp/Wave belum cukup
tajam (lihat Section 5)
Keybind passthrough yang salah desain
berisiko jadi alasan churn hari-1 (lihat
keluhan nyata di GitHub issue tracker Warp

soal shortcut yang diblokir/bentrok dengan
program di dalam terminal)
Autosave/restore state butuh pengujian
ekstensif lintas skenario crash (Task
Manager kill, BSOD, power loss) sebelum bisa
diklaim "reliable" ke user — klaim "save
semua state" yang ternyata cuma layout+cwd
bisa bikin kecewa kalau tidak
dikomunikasikan jujur di UI
Worktree Auto-Binding (Section 11 #6)
berisiko membingungkan user yang tidak
familiar git worktree — wajib ada fallback
"skip" yang jelas dan tidak terasa seperti fitur
wajib
Smart-default onboarding untuk Passthrough
Mode (Section 17) butuh deteksi nama
proses yang akurat lintas shell
(cmd/PowerShell/WSL) — kalau salah
deteksi, malah jadi noise/gangguan, bukan
bantuan
## 22. Roadmap Bertahap
- MVP: Section 6 — workspace + grid terminal
+ PTY + persistence dasar + passthrough

keybind default + autosave snapshot
(debounced, lihat Section 19)
## 2. V1: Section 7 + Section 10 + Section 11 #6
(Worktree Auto-Binding) + Section 17
(passthrough mode per-pane, conflict
detector, smart onboarding) + Section 19
(recovery flow lengkap)
- V2: Section 9 + Section 11 #1–5 (Attention
## Inbox, Broadcast Input, Token Meter, Agent
## Edit Diff, Health Strip)
- Out of Scope (Eksplisit)
Cross-platform (Mac/Linux)
SSH/remote terminal
Plugin marketplace
Tim/enterprise features (SSO, audit log)

---

## 23. Implementasi Status (per 19 Juni 2026)

Status implementasi MVP relatif terhadap roadmap di atas. Dipakai untuk sinkronisasi plan/task antar agent.

| Area PRD | Status | Catatan |
| :--- | :--- | :--- |
| Section 6 — Workspace CRUD + grid | ✅ MVP | Create/rename/delete/reorder aktif di sidebar, state dipersist via autosave snapshot / SQLite. |
| Section 6 — Grid 1/2/4/6/9 + preset | ✅ MVP baseline | Preset aktif, splitter manual 2-pane dan 4-pane aktif. |
| Section 6 — PTY native Windows | ✅ MVP | portable-pty, ConPTY, spawn/write/resize/close/ack, reader thread batching, exit watcher. |
| Section 6 — Switch cepat | ✅ Store | Sidebar + Zustand switch < 100ms di perf smoke. |
| Section 6 — Identitas visual | ✅ MVP | Warna aksen + nama workspace. |
| Section 6 — State persistence | ✅ MVP baseline | SQLite aktif dengan fallback JSON snapshot, autosave 5s aktif. |
| Section 6 — Copy/paste & scrollback | ⏳ Dasar | xterm default; paste handler khusus belum. |
| Section 6 — Spawn/close per pane | ✅ MVP | Spawn/close/restart per pane aktif. |
| Section 6 — Passthrough default | 📅 Planned | Keybind layer belum diimpl. |
| Section 6/19 — Autosave snapshot | ✅ MVP | Debounced 5s, diff-based, skip unchanged. |
| Section 8 — Auto-restart shell | ⏳ Sebagian | Manual restart + one-shot auto-restart exit≠0 aktif. Policy configurable + loop guard lanjutan belum. |
| Section 19 — Crash recovery | ✅ MVP baseline | Lockfile detection, restore snapshot, dan banner `[Pulihkan Layout] [Mulai Baru]` aktif. |
| Section 12 — Log viewer | ✅ MVP | Panel log reader/filter level + refresh aktif. |
| Section 13 — Perf budget | ⏳ Sebagian | jsdom/perf smoke ada; native spawn/CPU/mem/60fps belum. |
| Section 8 — Export / Import config | ✅ MVP | Export/import JSON config aktif dari UI dan backend command. |
| Section 8 — Auto-update | ⏳ In Progress | Update check/install hook aktif, butuh signing + release manifest production. |
| Repo public readiness | ⏳ In Progress | README, changelog, contributing, license, workflows, templates sudah dibuat; final release wiring masih pending. |

### Next Task Queue (prioritas)
1. Native perf harness Tauri runtime (spawn/idle/mem/render 9 pane).
2. Keybind passthrough + conflict handling.
3. E2E runtime nyata untuk updater, recovery, import/export, multi-pane stress.
4. Release signing, updater pubkey, dan publish flow GitHub Releases final.
5. Multi-window support.
6. Workspace template.
