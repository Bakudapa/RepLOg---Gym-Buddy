# Laporan Akhir — RepLog Landing Page

Tanggal: 30 Oktober 2026. Semua fase (0–8) di PRD bagian 16 sudah dikerjakan. Setiap fase punya commit sendiri di branch `main`.

| Commit            | Fase                        |
| ----------------- | --------------------------- |
| `a224ee3`         | 0 — Setup                   |
| `769f50f`         | 1 — Layout statis           |
| `9a05f9c`         | 2 — Kalkulator              |
| `7e30ee9`         | 3 — Interaksi client        |
| `dbfaec1`         | 4 — Database                |
| `84d281f`         | 5 — Waitlist                |
| `1bcb632`         | 6 — Feedback                |
| `d322df1`         | 7 — Admin                   |
| (commit terakhir) | 8 — Polishing + laporan ini |

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
