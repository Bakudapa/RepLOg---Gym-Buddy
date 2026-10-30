# Laporan Akhir — RepLog Landing Page

Tanggal: 30 Oktober 2026. Semua fase (0–8) di PRD bagian 16 sudah dikerjakan. Setiap fase punya commit sendiri di branch `main`.

| Commit    | Fase                        |
| --------- | --------------------------- |
| `a224ee3` | 0 — Setup                   |
| `769f50f` | 1 — Layout statis           |
| `9a05f9c` | 2 — Kalkulator              |
| `7e30ee9` | 3 — Interaksi client        |
| `dbfaec1` | 4 — Database                |
| `84d281f` | 5 — Waitlist                |
| `1bcb632` | 6 — Feedback                |
| `d322df1` | 7 — Admin                   |
| `969a328` | 8 — Polishing + laporan ini |

---

## 1. Ringkasan per fase

**Fase 0 — Setup.** Next.js 16.4.3 (App Router), React 19.3, TypeScript `strict`, Tailwind v4, ESLint (`eslint-config-next`), Prettier, dan Vitest. Script yang tersedia: `lint`, `format:check`, `typecheck` (`next typegen && tsc --noEmit`), `test`, dan `build`. CI GitHub Actions (`.github/workflows/ci.yml`) menjalankan install, lint, format check, typecheck, dan test di setiap push dan PR. Deploy ke Vercel tidak dilakukan karena dilarang di instruksi.

**Fase 1 — Layout statis.**

- Design token ada di `app/globals.css`. Palet warna, skala teks, radius, shadow, dan blur bawaan Tailwind di-reset ke `initial`, jadi komponen hanya bisa memakai token proyek. Breakpoint `sm`/`xl`/`2xl` juga dihapus. Yang tersisa hanya `md` (768) dan `lg` (1024), sesuai NFR2.
- Font IBM Plex Sans dan Plex Mono dimuat lewat `next/font`. Utility `num` memberi font mono + `tabular-nums` untuk angka.
- Komponen yang dibuat: Navbar (sticky, hamburger di HP, `Esc` menutup panel, fokus kembali ke tombol), Hero dengan mockup HP dari HTML, Features sebagai daftar bergaris, How It Works, Comparison (scroll horizontal di dalam kontainer dengan kolom pertama sticky di HP), FAQ, dan Footer.

**Fase 2 — Kalkulator.**

- `lib/one-rep-max.ts`: rumus Epley, kasus `reps = 1`, pembulatan 0.5 kg, dan tabel persentase.
- `lib/exercises.ts`: 55 exercise dengan alias.
- `lib/exercise-search.ts`: pencarian dan pengurutan saran.
- `lib/history.ts`: upsert per nama, maksimal 20 entri, validasi Zod, dan aman jika localStorage tidak tersedia.
- `ExerciseCombobox` mengikuti pola WAI-ARIA APG: ↓/↑ melingkar, Enter, Esc, Tab, klik di luar, opsi `Use "…"`, highlight, dan populer saat field kosong. Di layar sentuh, field digulir ke atas agar daftar saran tidak tertutup keyboard virtual.

**Fase 3 — Interaksi client.**

- FAQ berupa accordion yang hanya membuka satu item, dengan `aria-expanded` dan `aria-controls`.
- Dark mode punya tiga kondisi (system/light/dark) dan disimpan di `replog:theme`. Skrip inline di `<head>` memasang class `dark` sebelum paint, jadi tidak ada kedipan.
- Section muncul halus lewat IntersectionObserver (fade + geser 8 px, 250 ms). Semua animasi mati saat `prefers-reduced-motion: reduce`.

**Fase 4 — Database.**

- Migrasi `supabase/migrations/0001_init.sql` berisi tabel, fungsi, revoke/grant eksplisit, RLS, dan pg_cron opsional.
- Client Supabase: `lib/supabase/server.ts` (sesi user via cookie), `service.ts` (service role, `server-only`), dan `public.ts` (anon tanpa cookie, untuk counter). Ditambah tipe `Database` dan validasi env.
- `.env.example` berisi nama variabel tanpa nilai.
- Skrip `supabase/tests/run-local.sh` menjalankan migrasi dan uji RLS di Postgres lokal (Docker), tanpa menyentuh Supabase remote.

**Fase 5 — Waitlist.**

- Semua skema Zod ada di `lib/validation/schemas.ts`.
- `lib/http.ts` berisi format error standar, pembacaan body dengan batas 10 KB (stream dihentikan begitu melewati batas), dan header `Retry-After`.
- `lib/rate-limit.ts` berisi IP dari `x-forwarded-for`, hash SHA-256 dari ip + salt, RPC, dan fail closed.
- `lib/api/write-request.ts` menjalankan urutan pemeriksaan PRD 7.3 sekali untuk semua endpoint tulis.
- `POST /api/waitlist` menangani 201/400/409/413/415/429/500/503 dan honeypot.
- Form waitlist menangani semua state di tabel FR11.
- Counter diambil lewat RPC `get_waitlist_count()` di Server Component dengan `revalidate = 60`. Counter disembunyikan jika gagal, menampilkan "Be the first to join." jika 0, dianimasikan naik dari 0, dan langsung +1 setelah user berhasil mendaftar.

**Fase 6 — Feedback.**

- `POST /api/feedback` memakai pipeline yang sama dengan waitlist.
- `FeedbackModal` memakai `<dialog>` native dengan `showModal()` plus focus trap eksplisit.
- Modal bisa ditutup lewat Esc, tombol X, atau klik backdrop. Jika form sudah diisi, muncul konfirmasi "Discard your message?". Setelah ditutup, fokus kembali ke pemicu.
- Saat submit: tombol nonaktif + spinner. Sukses menampilkan ucapan terima kasih dan tombol Close. Gagal menampilkan pesan error dan isi form tetap ada.
- Tampil sebagai bottom sheet di HP dan dialog di tengah layar mulai tablet.
- Modal bisa dibuka dari Navbar (desktop dan menu HP) dan dari section Feedback CTA.

**Fase 7 — Admin.**

- `proxy.ts` me-refresh sesi dan meredirect `/admin/*` yang belum login ke `/admin/login`, serta user yang sudah login dari `/admin/login` ke `/admin`.
- `requireAdmin()` mengembalikan 401 tanpa sesi dan 403 jika user bukan admin. Jika pengecekan tabel `admins` error, hasilnya 403 (fail closed).
- Server Action `login`/`logout`. Login dibatasi rate limit `admin-login` dan selalu memakai pesan "Invalid email or password.".
- `GET /api/admin/waitlist` dan `GET /api/admin/feedback`: rate limit, authn/authz, validasi query, paginasi 20 baris, dan filter kategori. Data dibaca dengan sesi user sehingga RLS tetap berlaku.
- Dashboard berisi ringkasan, tab aksesibel (navigasi panah, Home/End), tabel di tablet+ dan daftar kartu di HP, paginasi, dan tombol logout. Ada juga halaman 403 dengan tombol logout.

**Fase 8 — Polishing.**

- Security headers di `next.config.ts`, plus `poweredByHeader: false`.
- `robots.txt` (disallow `/admin` dan `/api`) dan ikon SVG.
- README lengkap dan screenshot di `docs/screenshots/`.
- Lighthouse mobile lokal: 99 / 100 / 100 / 100.
- Pemeriksaan ulang NFR2 dan NFR8 (detail di bagian 4).

---

## 2. Keputusan yang saya ambil sendiri karena PRD ambigu

1. **Cache Components dimatikan.** `create-next-app` 16.4 mengaktifkan `cacheComponents` secara default. Model ini mewajibkan `<Suspense>` untuk setiap pembacaan cookie, yang rawan bermasalah di layout admin. Saya memakai model caching klasik: `export const revalidate = 60` di `app/page.tsx`, sesuai FR11 ("revalidasi tiap 60 detik").
2. **Route group untuk admin.** PRD menaruh `requireAdmin()` di `app/admin/layout.tsx`, tetapi layout itu juga akan membungkus `/admin/login` sehingga terjadi loop redirect. Karena itu layout pelindung ada di `app/admin/(dashboard)/layout.tsx` dan dashboard di `app/admin/(dashboard)/page.tsx`. URL tetap `/admin`. Saya juga menambahkan `dynamic = "force-dynamic"` supaya halaman admin tidak pernah di-prerender.
3. **Ringkasan dashboard dihitung di Server Component**, dengan sesi admin (RLS tetap berlaku) dan query `count: exact, head: true`. Tabel diambil dari `GET /api/admin/*` sesuai FR16.
4. **Urutan pemeriksaan di `/api/admin/*`:** rate limit → authn (401) → authz (403) → validasi query (400). Dengan urutan ini, pengguna anonim tidak mendapat informasi validasi.
5. **Error lookup tabel `admins` dianggap 403 (fail closed).** Ini mengikuti semangat PRD 8.5, walaupun PRD tidak menyebut kasus ini.
6. **Pesan error memakai warna teks (bukan merah) + ikon.** NFR8 melarang warna aksen kedua. Field yang tidak valid ditandai border `fg`, ikon, dan teks tebal, jadi tidak bergantung pada warna saja.
7. **Aksen hanya untuk CTA "Join the waitlist".** Tombol aksi utama lain ("Calculate 1RM", "Send feedback", "Sign in") memakai varian `solid` netral. Dengan begitu warna aksen hanya muncul di tiga tempat: CTA, highlight combobox, dan angka 1RM.
8. **Warna aksen light mode `#C2410C`, bukan `#E8590C`.** `#E8590C` di atas `#FAFAF9` hanya 3.4:1, dan teks putih di atasnya 3.6:1, keduanya gagal WCAG AA untuk teks normal. `#C2410C` mencapai 4.96:1 dan 5.18:1. Dark mode tetap memakai `#E8590C` dengan teks gelap (5.35:1). Abu-abu sekunder: `#5C5C59` (6.4:1) di light dan `#A1A19C` (7.4:1) di dark.
9. **Skala tipografi dibatasi tepat 6 ukuran:** `xs`, `sm`, `base`, `lg`, `xl`, dan `display` (pakai `clamp()` responsif). Skala bawaan Tailwind di-reset, jadi ukuran lain tidak bisa dipakai.
10. **Durasi animasi:** transisi 200 ms, reveal 250 ms, dan counter naik dalam 250 ms. Saya mematuhi batas NFR8 150–250 ms walaupun NFR7 tidak menyebut durasi counter. Spinner loading (wajib menurut FR10/FR11) berputar selama request berjalan dan dimatikan saat reduced motion. Ini satu-satunya gerakan berulang.
11. **Isi teks produk (copy)** ditulis sendiri dalam bahasa Inggris, tanpa frasa klise, testimoni, atau statistik palsu. Footer menyebut "A concept project. The app is not released yet." supaya tidak menyesatkan. README juga berbahasa Inggris untuk pembaca portofolio, sedangkan laporan ini berbahasa Indonesia.
12. **Combobox:** urutan hasil adalah nama yang diawali query → alias yang sama persis (mis. "ohp") → nama yang mengandung query → alias yang mengandung query. Tanpa aturan ini, alias "press up" (Push-Up) akan muncul di atas "Bench Press" untuk query "press". Enter tanpa saran aktif akan men-submit form.
13. **Riwayat:** klik sebuah entri mengisi ulang form dan menampilkan hasilnya. Entri yang rusak di localStorage dibuang satu per satu, tidak seluruh daftar.
14. **Theme toggle:** di desktop berupa satu tombol yang berputar System → Light → Dark. Di menu HP berupa tiga tombol berlabel (`aria-pressed`).
15. **HP landscape (780–844 px) mendapat tata letak tablet,** karena PRD mendefinisikan kelas perangkat berdasarkan lebar (tablet = 768–1023 px). Modal di lebar ini tampil sebagai dialog tengah yang bisa di-scroll.
16. **Urutan kalkulator di HP: form → hasil → riwayat.** Mulai tablet, form dan riwayat ada di kolom kiri dan hasil di kanan. Dengan begitu hasil langsung terlihat di bawah tombol hitung di HP.
17. **Format respons sukses** untuk `POST` adalah `{ "ok": true }` dengan status 201. PRD hanya menentukan status, tidak menentukan body.
18. **Header tambahan:** `Strict-Transport-Security` dan `Permissions-Policy` yang juga mematikan `payment` dan `usb`. Saya tidak memasang CSP karena skrip tema inline dan runtime Next butuh nonce atau hash. Ini bisa ditambahkan nanti.

---

## 3. Penyesuaian terhadap spesifikasi PRD

| Spesifikasi PRD                                                | Penyesuaian                                                                                                                                                                 | Alasan                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `middleware.ts`                                                | `proxy.ts` dengan fungsi `proxy`                                                                                                                                            | Next.js 16 mengganti nama konvensi ini. PRD FR14 sudah mengizinkannya.                                                                                                                                                                                                                                                                                                                                |
| Fungsi `SECURITY DEFINER` dengan `set search_path = public`    | `set search_path = ''` dan semua nama ditulis lengkap (`public.…`, `pg_catalog.now()`)                                                                                      | Rekomendasi linter Supabase untuk mencegah pembajakan `search_path`. Tujuan keamanan tetap sama, malah lebih ketat.                                                                                                                                                                                                                                                                                   |
| Hanya `enable row level security` dan policy                   | Ditambah `revoke all … from public, anon, authenticated`, lalu `grant select` ke `authenticated` saja (RLS tetap menyaring baris). `service_role` mendapat grant eksplisit. | Supabase memberi hak tabel ke `anon`/`authenticated` secara default. Dengan revoke, anon ditolak di level privilege, bukan hanya oleh RLS.                                                                                                                                                                                                                                                            |
| `auth.uid()` di policy                                         | `(select auth.uid())` dan `(select public.is_admin())`                                                                                                                      | Rekomendasi performa Supabase: nilai dihitung sekali per query.                                                                                                                                                                                                                                                                                                                                       |
| `check_rate_limit`                                             | Alias tabel `rl` di `ON CONFLICT`, validasi argumen, dan `retry_after_seconds` minimal 1                                                                                    | Lebih jelas, dan mencegah `Retry-After: 0` di batas window.                                                                                                                                                                                                                                                                                                                                           |
| `grant execute on get_waitlist_count() to anon, authenticated` | Ditambah `service_role`                                                                                                                                                     | Server bisa memanggilnya jika perlu. Ini tidak menambah hak anon.                                                                                                                                                                                                                                                                                                                                     |
| Index                                                          | Ditambah `feedback_created_at_idx` dan `rate_limits_window_start_idx`                                                                                                       | Untuk list feedback tanpa filter dan untuk query pembersihan.                                                                                                                                                                                                                                                                                                                                         |
| pg_cron "jika tersedia"                                        | Blok `DO` yang membuat ekstensi dan jadwal hanya jika `pg_cron` tersedia. Jika tidak, hanya muncul `NOTICE`. Query manual ada di README.                                    | Supaya migrasi tidak gagal di project yang belum mengaktifkan pg_cron.                                                                                                                                                                                                                                                                                                                                |
| Dependency yang diizinkan                                      | Ada tiga dev dependency di luar daftar: `@tailwindcss/turbopack`, `eslint-config-next`, `@types/*`                                                                          | `@tailwindcss/turbopack` adalah integrasi resmi Tailwind v4 yang dipasang `create-next-app` 16.4 (pengganti `@tailwindcss/postcss`). Tanpanya Tailwind tidak jalan. `eslint-config-next` adalah konfigurasi ESLint resmi Next. `@types/*` termasuk "tipe-tipe terkait". Tidak ada dependency runtime di luar daftar. Lighthouse dijalankan lewat `npx` di folder sementara, bukan sebagai dependency. |
| `@types/node` ^20 (bawaan scaffold)                            | ^24                                                                                                                                                                         | Vitest 5 butuh peer `@types/node` ≥22.                                                                                                                                                                                                                                                                                                                                                                |
| Login lewat `signInWithPassword`                               | Rate limit dicek **sebelum** validasi input                                                                                                                                 | Supaya setiap percobaan dihitung, termasuk input yang tidak valid.                                                                                                                                                                                                                                                                                                                                    |
| `requireAdmin()`                                               | Memakai `auth.getUser()`, bukan `getSession()`                                                                                                                              | `getUser()` memvalidasi token ke Supabase Auth. Cookie saja tidak dipercaya.                                                                                                                                                                                                                                                                                                                          |
| Ringkasan dashboard dari API                                   | Dihitung di Server Component dengan sesi admin                                                                                                                              | Lihat keputusan 3. Pengaman tetap sama (`requireAdmin` + RLS).                                                                                                                                                                                                                                                                                                                                        |
| Halaman di luar PDF/PRD                                        | Ditambah `app/robots.ts`, `app/icon.svg`, `vitest.config.mts`, dan `supabase/tests/*`                                                                                       | Untuk SEO, Best Practices (tanpa 404 favicon), dan verifikasi.                                                                                                                                                                                                                                                                                                                                        |

Hasil verifikasi migrasi di Postgres 16 lokal dengan stub role/skema `auth` (`bash supabase/tests/run-local.sh`):

- Service role berhasil insert, dan rate limit menolak request ke-3 dengan `retry_after`.
- Duplikat email menghasilkan `23505`. Email huruf besar ditolak oleh `CHECK`.
- Anon: `get_waitlist_count()` berhasil. Insert, select, `check_rate_limit`, dan `is_admin` semuanya _permission denied_.
- Authenticated non-admin: 0 baris dan tidak bisa insert.
- Admin bisa membaca, tetapi delete dan update ditolak.

---

## 4. Hasil lint, typecheck, test, dan build terakhir

Dijalankan setelah commit Fase 8 terakhir:

```
npm run lint          → lolos (0 error, 0 warning)
npm run format:check  → All matched files use Prettier code style!
npm run typecheck     → next typegen ✓, tsc --noEmit tanpa error
npm test              → Test Files 12 passed (12), Tests 121 passed (121)
npm run build         → ✓ Compiled successfully
    ○ /                 (Revalidate 1m)
    ƒ /admin            ○ /admin/login
    ƒ /api/admin/feedback   ƒ /api/admin/waitlist
    ƒ /api/feedback         ƒ /api/waitlist
    ○ /icon.svg   ○ /robots.txt   ƒ Proxy (Middleware)
```

Cakupan test (`tests/`):

- `one-rep-max`, `exercise-search`, `history`, dan `schemas` (semua skema).
- `rate-limit`: key, hash, RPC di-mock, fail closed.
- Route Handler waitlist dan feedback: 201/400/409/413/415/429/500/503 dan honeypot.
- `requireAdmin`: 401/403/lolos.
- API admin: 401/403/200/400/429, paginasi, filter.
- Server Action login/logout.
- Security headers.
- Pemeriksaan statis migrasi: tidak ada policy atau grant tulis untuk anon.

**Lighthouse 12 (mobile, build produksi lokal):**

- `/` → Performance 99, Accessibility 100, Best Practices 100, SEO 100.
- `/admin/login` → 99 / 100 / 100.

**Pemeriksaan otomatis di browser** (Brave headless via CDP, skrip di luar repo):

- **NFR2.** Dicek di 360×780, 390×844, 780×360, 844×390, 768×1024, 1024×768, 820×1180, 1180×820, 1024×1366, 1366×1024, dan 1440×900:
  - Navbar: hamburger di bawah 768 px, link tampil mulai 768 px.
  - Hero: satu kolom sampai 1023 px (mockup 340 px di HP, 460 px di tablet), dua kolom mulai 1024 px.
  - Features: 1/2/3 kolom.
  - Kalkulator: bertumpuk di HP, berdampingan mulai tablet.
  - Comparison: scroll + kolom sticky di HP, muat tanpa scroll di tablet dan desktop.
  - Modal: bottom sheet di HP, dialog di tengah mulai 768 px.
  - Tabel admin: kartu di HP, tabel di tablet (dicek dengan API di-stub di halaman preview sementara yang sudah dihapus).
  - Scroll horizontal di level halaman: **tidak ada** di semua ukuran.
  - Target sentuh < 44 px: **tidak ada**.
  - Font input < 16 px: **tidak ada**.
  - Unit `vh`: tidak dipakai (`dvh` dan `env(safe-area-inset-*)` dipakai di navbar, modal, dan footer).
  - Semua `:hover` di CSS hasil build terbungkus `@media (hover:hover)`.
- **NFR8.**
  - Di kode dan CSS hasil build tidak ada gradien, `backdrop-filter`, `box-shadow` (selain `none`), `ring`, ungu/pink, `rounded-full`/`xl`, emoji, ikon sparkles, atau frasa klise.
  - Warna aksen hanya dipakai di tombol CTA, `<mark>` combobox, dan angka 1RM.
  - Ukuran teks yang dipakai tepat 6. Semua warna berasal dari token.
  - Satu-satunya nilai hex di luar `globals.css` adalah `themeColor` di metadata (`<meta>` tidak bisa memakai CSS variable) dan isian ikon SVG.
- **Interaksi.** Combobox penuh dengan keyboard dan mouse, riwayat localStorage, dark mode tanpa kedipan (skrip ada di `<head>`, class terpasang sebelum render), accordion, menu HP + Esc, modal (Esc/X/backdrop/konfirmasi/focus trap/fokus kembali), dan semua state form waitlist dan feedback (dengan `fetch` di-stub).
- **Tanpa env Supabase.** `/admin` → 307 ke `/admin/login`. `POST /api/waitlist` → 503 (fail closed). Content-Type salah → 415. Body 12 KB → 413. `GET /api/waitlist` → 405.

---

## 5. Item checklist 15.3 yang belum bisa diverifikasi tanpa database live atau deploy

`.env.local` **tidak ada** di folder proyek saat pengerjaan. Karena itu tidak ada satu pun request yang benar-benar sampai ke Supabase. Item berikut perlu dicek manual setelah migrasi dan deploy:

| Item                                                                        | Status sekarang                                                                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Waitlist: sukses, email duplikat, email tidak valid, honeypot, rate limit   | Lolos di unit test (Supabase di-mock) dan di UI (fetch di-stub). **Belum** diuji end-to-end ke database.                 |
| Feedback: ketiga kategori, email kosong/terisi, rate limit                  | Sama seperti di atas.                                                                                                    |
| Insert langsung ke REST API Supabase dengan anon key **ditolak**            | Lolos di Postgres lokal dengan stub role. **Belum** di project Supabase asli.                                            |
| `/admin` tanpa login → redirect                                             | **Lolos** di build produksi lokal (307). Perlu dicek ulang di Vercel.                                                    |
| Login user non-admin → halaman 403                                          | Logika lolos di unit test. Butuh user Supabase asli.                                                                     |
| `GET /api/admin/*` tanpa login → 401, non-admin → 403                       | Lolos di unit test. Tanpa env, endpoint menjawab 503 karena rate limit dicek lebih dulu. Butuh database live.            |
| Login gagal 6 kali → rate limited                                           | Logika lolos di unit test. Butuh database live.                                                                          |
| Combobox penuh dengan keyboard                                              | **Lolos** (diuji dengan event keyboard nyata).                                                                           |
| Dark mode tanpa kedipan                                                     | **Lolos** di browser lokal.                                                                                              |
| Lighthouse mobile ≥ 90                                                      | **Lolos** secara lokal (99/100/100/100). Perlu diukur ulang di URL Vercel.                                               |
| Tampilan di 7 lebar wajib, portrait/landscape                               | **Lolos** di emulasi Chromium. Belum dicek di perangkat fisik (Safari iOS, Android).                                     |
| Semua fitur bisa dipakai dengan sentuhan; tidak ada auto-zoom di Safari iOS | Font input ≥ 16 px dan target ≥ 44 px sudah diverifikasi. Auto-zoom dan keyboard virtual **perlu dicek di iPhone asli**. |
| Tidak ada pola "Dilarang" NFR8                                              | **Lolos** (pemeriksaan kode, CSS build, dan visual).                                                                     |

---

## 6. Langkah manual yang perlu Anda lakukan (berurutan)

### A. Siapkan environment lokal

1. Buat project Supabase di region **Singapore (`ap-southeast-1`)** jika belum ada.
2. Salin `.env.example` ke `.env.local`, lalu isi keempat variabel dari Supabase Dashboard → Project Settings → API (URL, anon/publishable key, service role/secret key). Untuk `RATE_LIMIT_SALT`, buat string acak dengan `openssl rand -base64 32`.

### B. Jalankan migrasi di Supabase

3. (Opsional, disarankan) Aktifkan **pg_cron** di Database → Extensions, supaya pembersihan `rate_limits` terjadwal otomatis.
4. Buka **SQL Editor**, tempel seluruh isi `supabase/migrations/0001_init.sql`, lalu Run. Cara lain dengan CLI: `supabase link --project-ref <ref>` lalu `supabase db push`.
   - Jika muncul NOTICE "pg_cron not available", jalankan ulang blok `do $do$ … $do$` di akhir file setelah pg_cron aktif, atau jalankan query pembersihan di README secara berkala.
5. Verifikasi bahwa anon ditolak. Jalankan perintah berikut (ganti URL dan key). Hasil yang diharapkan adalah **401/403** dengan pesan _permission denied_:
   ```bash
   curl -i -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/waitlist" \
     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
     -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" -d '{"email":"test@example.com"}'
   ```
   Lalu pastikan RPC counter berfungsi (hasilnya sebuah angka):
   ```bash
   curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/get_waitlist_count" \
     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d '{}'
   ```

### C. Setup admin (PRD bagian 13)

6. Supabase Dashboard → **Authentication → Sign In / Providers** → nonaktifkan **Allow new users to sign up**.
7. **Authentication → Users → Add user**: buat user admin dengan email dan password kuat, lalu salin UUID-nya.
8. Di **SQL Editor**:
   ```sql
   insert into public.admins (user_id) values ('<uuid user admin>');
   ```
9. (Untuk uji 403) Buat juga satu user biasa tanpa baris di `admins`.
10. Jalankan `npm run dev`, lalu uji: `/admin` tanpa login, login admin, login non-admin, 6 kali login gagal, dan buka `/api/admin/waitlist` di tab tanpa login.

### D. Deploy ke Vercel

11. Push repo ke GitHub (`git remote add origin …`, lalu `git push -u origin main`). CI akan berjalan otomatis.
12. Vercel → **Add New Project** → import repo. Framework terdeteksi Next.js, setting default tidak perlu diubah.
13. Di **Settings → Environment Variables**, isi keempat variabel untuk Production (dan Preview jika perlu). `SUPABASE_SERVICE_ROLE_KEY` dan `RATE_LIMIT_SALT` **tidak boleh** diberi awalan `NEXT_PUBLIC_`.
14. Deploy, lalu jalankan seluruh checklist 15.3 di URL produksi:
    - Waitlist dan feedback end-to-end, termasuk rate limit.
    - Insert langsung dengan anon key.
    - Alur admin.
    - Lighthouse mobile di URL Vercel.
    - Cek di iPhone (Safari) dan Android: auto-zoom, keyboard virtual saat combobox dipakai, dan bottom sheet modal.
15. Isi link demo dan skor Lighthouse dari URL produksi di README.

---

# Laporan v2.0 — RepLog App

Tanggal: 30 Oktober 2026. Dasar: `docs/PRD-app.md` v2.0 (menambah dan mengubah `docs/PRD.md` v1.1). Fase A1–A11 (PRD-app bagian 14) dikerjakan berurutan, masing-masing dengan commit sendiri.

| Commit            | Fase                                    |
| ----------------- | --------------------------------------- |
| `9a37f38`         | A1 — Database (`0002_app.sql`)          |
| `3e72b57`         | A2 — Auth pengguna                      |
| `4a03203`         | A3 — Pencatatan latihan + rest timer    |
| `eb61cbb`         | A4 — Ringkasan sesi + PR                |
| `0c54a18`         | A5 — Riwayat                            |
| `06b6605`         | A6 — Progres exercise                   |
| `8cd05df`         | A7 — Dashboard + navigasi               |
| `aa65019`         | A8 — Pengaturan akun                    |
| `3ae3d85`         | A9 — Akun demo                          |
| `02e9e6e`         | A10 — Landing + admin, waitlist dihapus |
| (commit terakhir) | A11 — Polishing, README, laporan ini    |

## v2.1 Ringkasan per fase

**A1 — Database.** `supabase/migrations/0002_app.sql`:

- Menghapus `waitlist` dan `get_waitlist_count()`.
- Tabel baru `profiles`, `workout_sessions`, `workout_sets` dengan RLS per user. Semua policy tulis menolak akun demo.
- Grant per kolom: user tidak bisa menulis `user_id`, `is_demo`, atau timestamp.
- Trigger: profil otomatis untuk user baru, maksimal 100 set per sesi, maksimal 20 sesi per 24 jam, dan pemilik set harus sama dengan pemilik sesinya.
- Backfill profil untuk user yang sudah ada sebelum migrasi (misalnya admin).
- Fungsi `is_demo()`, `get_total_sets_logged()`, dan `get_admin_stats()` (hanya admin, angka agregat saja).
- Empat view `security_invoker`: `workout_set_records` (estimasi 1RM dan deteksi PR per set), `workout_session_summaries`, `exercise_summaries`, dan `exercise_session_bests`.
- Divalidasi dengan 54 assertion di Postgres lokal (`supabase/tests/app-checks.sql`).

**A2 — Auth pengguna.**

- Halaman `/signup`, `/login`, `/forgot-password`, `/reset-password`, dan `/auth/error`.
- Route `/auth/callback` mendukung dua jenis link email: `code` (PKCE) dan `token_hash`.
- Server Action auth dengan rate limit dan pesan yang tidak membocorkan apakah email terdaftar.
- Helper baru: `requireUser()`, `safeRedirect()`, dan `routeRedirect()`. `proxy.ts` kini juga melindungi `/app/*`.
- `AuthForm` dipakai bersama oleh semua form auth, termasuk login admin; form login admin yang lama dihapus.
- `limitAction()` dipakai bersama oleh semua Server Action. Untuk aksi milik user yang login, rate limit dihitung per user id.

**A3 — Pencatatan latihan.**

- Server Action `startWorkout`, `addSet`, `updateSet`, `deleteSet`, dan `finishWorkout`, semuanya lewat satu guard bersama `withWriter()`.
- Layar sesi aktif `/app/workout/[id]`:
  - Set dikelompokkan per exercise dan diberi nomor urut, dengan tanda PR.
  - Edit inline, dan hapus dengan konfirmasi.
  - Tambah set memakai optimistic update; jika gagal, set ditandai dengan tombol Retry dan Discard.
- `ExerciseCombobox` diperluas (bukan dibuat versi kedua):
  - saran dari exercise yang pernah dicatat user, ditampilkan paling atas;
  - `onSelect` untuk mengisi beban/reps otomatis;
  - daftar saran membuka ke atas di HP.
- `RestTimer`: 60/90/120/180 detik (disimpan di localStorage), ±15 detik, stop, getar, dan bunyi.
- `ConfirmDialog` dan `LocalTime` (zona waktu perangkat) dibuat generik dan dipakai di banyak halaman.
- Di HP, form tambah set dan timer menempel di bawah layar.

**A4 — Ringkasan dan PR.**

- Deteksi PR dilakukan di database (view A1).
- `lib/workout/summary.ts` menyusun ringkasan: durasi, jumlah exercise dan set, volume, dan PR terbaik per exercise per jenis. Set dengan reps > 12 diberi tanda "estimate less reliable".
- Komponen `SessionSummary` dan `StatCard`.
- Setelah "Finish", user diarahkan ke `/app/history/[id]?finished=1`.
- Job CI baru `database` menjalankan semua assertion SQL di Postgres sementara.

**A5 — Riwayat.**

- `/app/history`: 20 per halaman, dengan keadaan kosong.
- Detail sesi: ubah nama dan catatan, hapus sesi dengan konfirmasi.
- Sesi milik orang lain menghasilkan 404.
- `Pagination` dipindah ke `components/ui` dan kini mendukung callback maupun link.

**A6 — Progres.**

- `/app/exercises`: daftar semua exercise yang pernah dicatat.
- `/app/exercises/[key]`:
  - grafik garis SVG buatan sendiri yang lebarnya mengikuti kontainer, titik PR berwarna aksen, dan tabel alternatif;
  - filter 4 minggu / 12 minggu / semua;
  - daftar PR kedua jenis, 10 set terakhir, dan pesan khusus jika baru ada satu sesi.

**A7 — Dashboard dan navigasi.**

- Dashboard: kartu "Continue workout", statistik minggu ini (mulai Senin, zona waktu perangkat), 5 PR terbaru, 3 sesi terakhir, dan keadaan kosong untuk pengguna baru.
- Navigasi: tab bar bawah di HP (menghormati safe area), navbar atas di tablet dan desktop.
- `DemoBanner` untuk akun demo.

**A8 — Pengaturan.**

- Ubah nama tampilan.
- Hapus akun: password diketik ulang di dalam dialog konfirmasi, diverifikasi dengan klien tanpa cookie, lalu user dihapus dengan `auth.admin.deleteUser` dan semua datanya ikut terhapus lewat cascade. Setelah itu user dikeluarkan dan landing page menampilkan pesan konfirmasi.

**A9 — Demo.**

- Server Action `demoLogin` dan komponen `DemoButton`.
- `supabase/seed/demo.sql`: 24 sesi, 368 set, 15 exercise, 88 PR. Seed ini idempoten dan tanggalnya relatif terhadap `now()`. Divalidasi oleh `supabase/tests/demo-checks.sql`.

**A10 — Landing page dan admin.**

- Waitlist dihapus bersih: komponen, route, skema, rate limit, tipe, kode error, test, dan tab admin.
- CTA baru "Get started — it's free" dan "Try the demo".
- Counter Hero menampilkan total set yang tercatat (hanya pengguna non-demo, disembunyikan jika di bawah 100).
- Features, Comparison, FAQ, How It Works, dan footer kini jujur (tanpa "Program templates" dan "Works offline").
- Admin hanya melihat angka agregat dan tab Feedback.

**A11 — Polishing.**

- Pemeriksaan NFR2 otomatis di 8 ukuran layar untuk semua halaman `/app`, landing, dan auth. Perbaikan: kartu statistik meluap 6 px di 360 px, dan tiga target sentuh kurang dari 44 px.
- Pemeriksaan NFR8 di seluruh kode.
- Lighthouse.
- Halaman `/login` dan `/signup` dibuat bisa diindeks, dan `robots.txt` diperbarui.
- README ditulis ulang dan screenshot diganti.

## v2.2 Keputusan yang saya ambil sendiri karena PRD ambigu

1. **Di mana PR dihitung.** PRD mengizinkan database atau server. Saya pilih database (view `workout_set_records`, `security_invoker`). Alasannya, dashboard butuh "5 PR terbaru" dari seluruh riwayat, dan PostgREST membatasi 1000 baris per request, jadi menghitung di server akan bermasalah. TypeScript hanya merangkum flag PR dari database. Test "set pertama bukan PR, nilai sama bukan PR, lebih tinggi PR" ada di `supabase/tests/app-checks.sql` dan dijalankan oleh job CI `database`.
2. **Urutan guard Server Action `/app`:** sesi (401) → demo (403) → rate limit → Zod (400) → query. PRD menulis rate limit → Zod → sesi, tetapi rate limit per user id membutuhkan sesi lebih dulu.
3. **Hasil Server Action** berbentuk `ActionResult` dengan `status` 400/401/403/404/409/429/500/503. Ini meniru kode HTTP agar mudah diuji.
4. **Nama sesi default** ("Workout — 30 Oct") dibuat di browser supaya tanggalnya sesuai zona waktu perangkat. Jika tidak ada, server memakai tanggal UTC.
5. **Layar sesi aktif menyembunyikan tab bar** di HP supaya form tambah set bisa menempel di bawah layar. Di tablet dan desktop, form ada di kolom samping yang sticky. Daftar saran combobox membuka ke atas hanya di HP.
6. **Isian otomatis** memakai set terakhir exercise tersebut: di sesi ini jika ada, kalau tidak dari sesi sebelumnya (diambil dari 500 set terakhir).
7. **Ringkasan sesi dan detail riwayat adalah halaman yang sama** (`/app/history/[id]`). Setelah "Finish" ditambah `?finished=1` untuk menampilkan "Workout saved." Sesi tanpa set dihapus dan user kembali ke dashboard.
8. **Statistik minggu ini** hanya menghitung sesi yang sudah selesai. Server mengambil data 8 hari, lalu browser memfilter mulai Senin 00:00 waktu lokal.
9. **PR di ringkasan:** hanya set terbaik per exercise per jenis yang ditampilkan, supaya tidak ada banyak baris untuk exercise yang sama.
10. **Latihan bodyweight (0 kg)** tidak pernah menghasilkan PR, karena kedua jenis PR berbasis beban. Ini keterbatasan yang mengikuti definisi FR26.
11. **Reset password:** callback dengan `type=recovery` memasang cookie httpOnly `replog_recovery` selama 15 menit. `/reset-password` membutuhkan sesi dan cookie tersebut. Tidak ada rate limit tambahan karena link recovery hanya bisa dipakai sekali.
12. **Sign up:** pesan sukses selalu sama. Pengecualiannya hanya `weak_password` (ditampilkan di field) dan `over_email_send_rate_limit`; keduanya tidak membocorkan apakah email sudah terdaftar.
13. **`/auth/callback` menerima `code` dan `token_hash`.** Template email default Supabase (PKCE) hanya berfungsi jika link dibuka di browser yang sama. README menjelaskan template `token_hash` agar link bisa dibuka dari perangkat lain.
14. **Demo belum dikonfigurasi** (env kosong): tombol demo menampilkan pesan umum "The demo isn't available right now." tanpa menjelaskan penyebabnya.
15. **Teks counter:** "X sets logged by lifters so far". Ambang 100 dicek di server.
16. **FAQ:** pertanyaan wajib dari PRD v1.1 tetap ada dengan jawaban jujur ("Does it work offline?" → "No…", "When does it launch?" → "It's live…"). Ditambah dua pertanyaan: demo dan hapus data.
17. **Comparison:** baris "Workout history" dengan nilai "Scroll back" (aplikasi catatan) dan "Flip back" (buku tulis).
18. **SEO:** `/login` dan `/signup` bisa diindeks karena merupakan halaman masuk publik. `/reset-password`, `/auth/error`, `/app`, dan `/admin` diberi noindex dan masuk daftar disallow di `robots.txt`.
19. **Dashboard admin** tidak lagi memakai komponen tab, karena hanya tersisa satu tab (Feedback).
20. **`pageQuerySchema`** diturunkan dari `adminListQuerySchema` (bukan skema kedua). Halaman yang tidak valid jatuh ke halaman 1.
21. **Segmen URL `[key]`** di halaman progres harus sama persis dengan bentuk ternormalisasi (lowercase, trim). Jika tidak, hasilnya 404.
22. **Grafik:** sumbu X proporsional terhadap waktu, sehingga jeda antar sesi terlihat. Titik PR memakai warna aksen (diizinkan PRD-app). Tabel alternatif ditaruh di `<details>` yang terlihat, sehingga bisa dipakai semua orang, bukan hanya pembaca layar.
23. **Seed demo:** 4 sesi per minggu, rotasi Push/Pull/Legs, dan minggu ke-5 dibuat lebih ringan (−10%) supaya grafik tidak lurus sempurna. Tanggal relatif terhadap `now()`, jadi menjalankan ulang seed akan menyegarkan data.
24. **Tombol "Sign up" di banner demo** memakai warna aksen karena merupakan CTA utama. Tombol aksi lain di `/app` memakai varian netral `solid` sesuai NFR8.
25. **Uji visual halaman `/app`** dilakukan dengan Supabase tiruan lokal: server HTTP kecil yang meniru Auth dan PostgREST, berisi data contoh. Tujuannya agar halaman yang asli bisa dicek tanpa menyentuh database remote. Kodenya tidak masuk repo.

## v2.3 Penyesuaian terhadap spesifikasi PRD-app

| Spesifikasi                                                      | Penyesuaian                                                                                                                                                                       | Alasan                                                                                               |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Fungsi `security definer` dengan `set search_path = public`      | `set search_path = ''` dan semua nama ditulis lengkap                                                                                                                             | Rekomendasi linter Supabase. Lebih ketat.                                                            |
| Grant tabel tidak dijelaskan selain `profiles`                   | `revoke all` lalu grant per kolom: insert `(name, notes)` / `(session_id, exercise_name, weight_kg, reps)`, update `(name, notes, ended_at)` / `(exercise_name, weight_kg, reps)` | `user_id` selalu dari `default auth.uid()`. Timestamp dan `is_demo` tidak bisa dipalsukan lewat API. |
| `auth.uid()` dan `public.is_demo()` dipanggil langsung di policy | `(select auth.uid())` dan `(select public.is_demo())`                                                                                                                             | Dievaluasi sekali per query (rekomendasi Supabase).                                                  |
| Trigger batas set dan sesi                                       | Fungsi trigger `security definer` dengan kunci: `FOR UPDATE` pada sesi induk dan `pg_advisory_xact_lock` per user                                                                 | Agar batas 100 dan 20 tetap tepat saat ada insert bersamaan.                                         |
| Konsistensi pemilik "trigger atau policy"                        | Keduanya: policy insert/update memeriksa sesi milik user, dan trigger `enforce_set_rules` memeriksa juga saat `update of session_id, user_id`                                     | Pertahanan berlapis, termasuk untuk insert dengan hak istimewa (seed).                               |
| Fungsi PR/progres "diserahkan ke implementasi"                   | Empat view `security_invoker = true`                                                                                                                                              | Lihat keputusan 1.                                                                                   |
| `get_admin_stats()` "angka agregat"                              | `returns table` berisi 7 kolom; feedback per kategori sebagai kolom terpisah; `total_users` = profil non-demo                                                                     | Satu baris mudah dipakai di UI. Profil mencakup semua user setelah backfill.                         |
| Grant fungsi                                                     | `get_total_sets_logged` dan `is_demo` juga diberikan ke `service_role`; `execute` fungsi trigger dicabut dari semua role API                                                      | Fungsi trigger tidak boleh dipanggil langsung lewat RPC.                                             |
| Index                                                            | Ditambah `workout_sessions(user_id, created_at)` dan `workout_sets(user_id, performed_at desc)`                                                                                   | Untuk trigger 24 jam, dashboard, dan isian otomatis.                                                 |
| Profil hanya dibuat oleh trigger                                 | Ditambah backfill untuk `auth.users` yang sudah ada                                                                                                                               | Admin dan akun lama perlu baris profil.                                                              |
| Struktur `app/admin/layout.tsx` (v1)                             | Tetap memakai route group `(dashboard)` dari v1                                                                                                                                   | Mencegah loop redirect di `/admin/login`.                                                            |
| `(auth)/layout.tsx`                                              | Tidak ada                                                                                                                                                                         | Tidak dibutuhkan setelah aturan noindex dipindah per halaman.                                        |
| Kode error `ALREADY_REGISTERED` (PRD v1.1 9.1)                   | Dihapus bersama waitlist                                                                                                                                                          | Hanya dipakai oleh waitlist.                                                                         |
| Dependency                                                       | Tidak ada dependency baru                                                                                                                                                         | Grafik dibuat sendiri dengan SVG.                                                                    |

## v2.4 Hasil lint, typecheck, test, dan build terakhir

```
npm run lint          → lolos (0 error, 0 warning)
npm run format:check  → All matched files use Prettier code style!
npm run typecheck     → next typegen ✓, tsc --noEmit tanpa error
npm test              → Test Files 22 passed (22), Tests 241 passed (241)
npm run build         → ✓ Compiled successfully
    ○ /  (revalidate 1m)   ○ /signup   ○ /forgot-password   ○ /auth/error   ○ /admin/login
    ƒ /login   ƒ /reset-password   ƒ /auth/callback
    ƒ /app   ƒ /app/workout/[id]   ƒ /app/history   ƒ /app/history/[id]
    ƒ /app/exercises   ƒ /app/exercises/[key]   ƒ /app/settings
    ƒ /admin   ƒ /api/feedback   ƒ /api/admin/feedback   ƒ Proxy (Middleware)
bash supabase/tests/run-local.sh → exit 0, 63 assertion PASS
    (54 app-checks + 9 demo-checks), "ALL APP CHECKS PASSED", "ALL DEMO CHECKS PASSED"
```

Cakupan test Vitest yang baru:

- Skema v2.0, `safe-redirect`, aturan route proxy.
- Aksi auth (sign up dengan pesan sama, login, unconfirmed, forgot, reset, demo), `/auth/callback`, dan `requireUser`.
- Server Action `/app`:
  - tanpa sesi → 401;
  - demo → 403;
  - input tidak valid → 400;
  - bukan UUID atau milik orang lain → 404;
  - rate limit per user, batas 100 set, satu sesi aktif, sesi kosong dibuang;
  - ubah/hapus sesi, ubah nama, hapus akun.
- `lib/workout` (pengelompokan, volume, ringkasan, grafik, minggu, kunci exercise) dan pencarian exercise dengan riwayat.

**Lighthouse 12, mobile, build produksi lokal:**

- `/`, `/login`, `/signup`: 99 / 100 / 100 / 100.
- `/app` dan `/app/exercises/[key]`: 99 / 100 / 100. SEO tidak relevan karena halaman noindex. Diukur dengan Supabase tiruan.

**Pemeriksaan di browser** (Brave headless via CDP):

- **NFR2.** Semua halaman `/app` (sesi aktif, dashboard, riwayat, detail, exercise, grafik, pengaturan), landing, dan auth diperiksa di 360×780, 390×844, 844×390, 768×1024, 820×1180, 1024×768, 1180×820, dan 1440×900. Hasilnya: tidak ada scroll horizontal, tidak ada target sentuh di bawah 44 px, tidak ada font input di bawah 16 px. Tab bar muncul di HP, navbar atas mulai tablet.
- **Alur end-to-end** (dengan Supabase tiruan):
  - mulai latihan → combobox menampilkan exercise milik user di atas → isian otomatis 77,5 × 5 → tambah set (optimistic "Saving…", timer mulai) → PR tampil;
  - "Repeat last set" → edit → hapus dengan konfirmasi → Finish → ringkasan;
  - set yang gagal disimpan menampilkan Retry/Discard;
  - timer ±15 detik dan stop berfungsi, durasi tersimpan di localStorage.
- **Mode demo:** banner tampil, dan di semua halaman `/app` hanya tombol "Log out" yang aktif.
- **NFR8:**
  - tidak ada gradien, blur, shadow, ring, ungu/pink, `rounded-full`, emoji, atau frasa klise;
  - tepat 6 ukuran teks;
  - warna aksen hanya di CTA "Get started/Sign up", highlight combobox, angka 1RM, dan titik PR grafik;
  - hex di luar `globals.css` hanya `themeColor` metadata dan ikon SVG;
  - tidak ada unit `vh`.

## v2.5 Item checklist yang belum bisa diverifikasi tanpa database live atau deploy

Migrasi `0002_app.sql` **belum dijalankan** di Supabase remote (sesuai aturan kerja). Semua alur yang memerlukan Supabase Auth atau email asli baru diuji dengan mock, Postgres lokal, atau Supabase tiruan.

| Checklist (PRD-app bagian 13 / PRD v1.1 15.3)                                     | Status sekarang                                                                                                              |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Sign up → email konfirmasi → login → dashboard kosong                             | Logika lolos unit test. Keadaan kosong dashboard sudah dibuat. **Perlu Supabase dan email asli.**                            |
| Email terdaftar menghasilkan pesan yang sama dengan email baru                    | Lolos unit test. Perlu dicek ulang di Supabase asli.                                                                         |
| Lupa password → email → reset → login dengan password baru                        | Logika dan callback lolos unit test. **Perlu email asli.**                                                                   |
| Mulai sesi, tambah set dari HP, rest timer bergetar/berbunyi, finish, ringkasan   | Alur lolos di browser emulasi. **Getar dan bunyi perlu HP fisik.**                                                           |
| Tidak bisa membuat sesi aktif kedua                                               | Lolos di Postgres lokal (unique index) dan unit test (aksi membuka sesi yang ada).                                           |
| PR terdeteksi benar di ringkasan dan halaman progres                              | Lolos di Postgres lokal (view) dan di UI dengan Supabase tiruan.                                                             |
| Grafik progres benar di HP, tablet, desktop                                       | Lolos di emulasi. Perlu dicek di perangkat fisik.                                                                            |
| User A tidak bisa membaca/mengubah sesi user B (UI 404 dan REST API langsung)     | RLS lolos di Postgres lokal. 404 lolos unit test. **Perlu dicek dengan dua akun asli dan JWT di REST API.**                  |
| Akun demo: tombol nonaktif; insert lewat REST dengan JWT demo ditolak             | UI lolos. RLS lolos di Postgres lokal. **Perlu dicek di Supabase asli.**                                                     |
| Hapus akun menghapus semua sesi dan set                                           | Cascade lolos di Postgres lokal. Aksi lolos unit test. **Perlu dicek di Supabase asli.**                                     |
| Admin hanya melihat agregat, tidak bisa membaca `workout_sessions`/`workout_sets` | Lolos di Postgres lokal. Perlu dicek dengan akun admin asli.                                                                 |
| Waitlist tidak ada di mana pun (UI, API, admin, database)                         | UI, API, dan admin **lolos** (kode dan browser). Di database baru hilang setelah `0002` dijalankan.                          |
| Landing tidak mengklaim fitur yang tidak ada                                      | **Lolos.**                                                                                                                   |
| Lighthouse ≥ 90                                                                   | Lolos lokal. Perlu diukur ulang di Vercel.                                                                                   |
| Tidak ada auto-zoom di Safari iOS; semua fitur bisa dipakai dengan sentuhan       | Font ≥ 16 px dan target ≥ 44 px terverifikasi. **Perlu iPhone fisik** (keyboard virtual dengan form yang menempel di bawah). |
| Feedback, rate limit feedback/login admin (v1.1)                                  | Tidak berubah dari v1.1. Tetap lolos unit test.                                                                              |

## v2.6 Langkah manual berurutan

### A. Supabase

1. **Backup** (disarankan): Database → Backups, atau pastikan data feedback tidak penting. `0002` menghapus tabel `waitlist` beserta isinya.
2. **SQL Editor** → tempel seluruh isi `supabase/migrations/0002_app.sql` → Run. Hasilnya harus "Success".
3. Verifikasi dengan anon key, misalnya `curl` ke `/rest/v1/rpc/get_total_sets_logged` (hasilnya angka), lalu insert ke `/rest/v1/workout_sets` dengan anon key (harus ditolak `42501`).
4. **Authentication → Sign In / Providers → Email**: nyalakan **Allow new users to sign up** dan pastikan **Confirm email** aktif. (Di v1.1 sign-up dimatikan; v2.0 menyalakannya.)
5. **Authentication → URL Configuration**:
   - Site URL = URL Vercel (setelah deploy; sementara `http://localhost:3000`).
   - Redirect URLs: `http://localhost:3000/auth/callback` dan `https://<domain-vercel>/auth/callback`.
6. (Disarankan) **Authentication → SMTP Settings**: pasang SMTP sendiri, karena email bawaan Supabase dibatasi beberapa email per jam.
7. (Opsional) **Authentication → Email Templates**: ganti link "Confirm signup" dan "Reset password" ke bentuk `token_hash` yang tertulis di README, supaya link bisa dibuka dari perangkat lain.
8. **Akun demo**:
   - Authentication → Users → Add user (email demo, password kuat, centang **Auto Confirm User**) → salin UUID.
   - Buka `supabase/seed/demo.sql`, ganti `00000000-0000-0000-0000-000000000000` dengan UUID tersebut, lalu jalankan di SQL Editor. Harus muncul NOTICE "Demo data: 24 workouts, 368 sets."
   - Jangan commit file seed yang sudah berisi UUID asli. Cukup ganti UUID di SQL Editor saja.
9. **Admin**: baris admin dari v1.1 tetap berlaku, dan profilnya otomatis dibuat oleh backfill. Untuk admin baru: `insert into public.admins (user_id) select id from auth.users where email = '...';`

### B. Lokal

10. Tambahkan ke `.env.local`: `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, `DEMO_USER_EMAIL=...`, `DEMO_USER_PASSWORD=...`.
11. `npm run dev`, lalu coba:
    - sign up dengan email asli → klik link konfirmasi → dashboard kosong;
    - mulai latihan di HP (atau lewat devtools) → finish → riwayat dan grafik;
    - "Try the demo";
    - lupa password;
    - hapus akun tes.

### C. Vercel

12. Push ke GitHub (`git push -u origin main`). CI menjalankan lint, test, dan job `database`.
13. Vercel → Add New → Project → import repo.
14. **Settings → Environment Variables**, untuk Production (dan Preview jika perlu):
    - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `NEXT_PUBLIC_SITE_URL=https://<domain-vercel>`
    - `SUPABASE_SERVICE_ROLE_KEY`, `RATE_LIMIT_SALT`, `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD` (semuanya server-only, tanpa awalan `NEXT_PUBLIC_`)
15. Deploy. Lalu perbarui **Site URL** dan **Redirect URLs** di Supabase (langkah 5) dengan domain final, dan redeploy jika `NEXT_PUBLIC_SITE_URL` berubah.
16. Jalankan checklist v2.5 di URL produksi, terutama:
    - dua akun asli untuk uji isolasi data (UI dan REST dengan JWT);
    - insert lewat REST dengan JWT demo;
    - getar dan bunyi rest timer serta keyboard virtual di iPhone dan Android;
    - Lighthouse di URL Vercel.
17. Isi link demo dan skor Lighthouse produksi di README.
