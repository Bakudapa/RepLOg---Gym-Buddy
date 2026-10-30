# PRD Tambahan — RepLog App (v2.0)

| | |
|---|---|
| **Versi** | 2.0 |
| **Tanggal** | 30 Oktober 2026 |
| **Pemilik** | Dafa Wahyu Ananta |
| **Dasar** | `docs/PRD.md` v1.1 (landing page) |

Dokumen ini **menambah dan mengubah** `docs/PRD.md`. Semua aturan di PRD v1.1 tetap berlaku (terutama validasi, rate limit, NFR2 responsif, NFR8 desain visual, dan aturan keamanan), **kecuali** yang secara eksplisit diubah di sini. Jika ada pertentangan, dokumen ini yang berlaku.

---

## 1. Ringkasan Perubahan

RepLog bukan lagi produk fiktif. Pengunjung bisa **mendaftar, login, dan benar-benar mencatat latihan**: sesi, exercise, set, reps, dan beban, lalu melihat riwayat, progres, dan personal record (PR).

| Bagian | PRD v1.1 | PRD v2.0 |
|---|---|---|
| Aplikasi RepLog | Fiktif, label "soon" | Berfungsi penuh di `/app` |
| Akun pengunjung | Tidak ada | Sign up, login, lupa password, hapus akun |
| Sign-up Supabase | Dinonaktifkan | **Diaktifkan** |
| Waitlist | Form + tabel + tab admin | **Dihapus**, diganti CTA sign up |
| Counter Hero | Jumlah pendaftar waitlist | Jumlah total set yang tercatat |
| Akun demo | Tidak ada | Akun demo read-only berisi data contoh |
| Admin | Baca waitlist + feedback | Statistik agregat + baca feedback |
| Fitur yang diklaim di landing page | Termasuk yang belum ada | **Hanya yang benar-benar ada** |

---

## 2. Scope

### In scope

- Autentikasi pengguna: sign up, konfirmasi email, login, logout, lupa password, reset password
- Mencatat sesi latihan: mulai sesi, tambah/edit/hapus set, selesaikan sesi
- Ringkasan sesi setelah selesai (total set, total volume, PR baru)
- Riwayat sesi
- Halaman progres per exercise: grafik estimasi 1RM dan daftar PR
- Dashboard pengguna
- Rest timer (murni client)
- Akun demo read-only untuk recruiter/pengunjung
- Pengaturan akun: ubah nama tampilan, hapus akun
- Penyesuaian landing page dan admin

### Out of scope

- Login sosial (Google, GitHub) untuk pengguna
- Template program (PPL, Upper/Lower) yang bisa dipakai otomatis
- Mode offline / PWA
- Satuan selain kg
- Berbagi sesi ke pengguna lain, fitur sosial
- Aplikasi mobile native
- Ekspor data

---

## 3. Tech Stack

Sama dengan PRD v1.1. Tambahan:

- Grafik progres dibuat **sendiri dengan SVG**, tanpa library chart
- Tidak ada dependency baru yang diizinkan selain yang sudah ada di PRD v1.1 bagian 3

---

## 4. Arsitektur dan Keamanan

```
Browser
  │
  ├── Landing page (publik)
  ├── /signup, /login, /forgot-password, /reset-password, /auth/callback
  ├── /app/*   (wajib login)
  ├── /admin/* (wajib login + role admin)
  │
  ├── Server Actions / Route Handlers
  │      1. rate limit
  │      2. validasi Zod
  │      3. cek sesi user
  │      4. query dengan SESI USER (anon key + cookie) → RLS berlaku
  ▼
Supabase (PostgreSQL + Auth + RLS)
```

### Prinsip

- **Semua data latihan dibaca dan ditulis memakai sesi user**, bukan service role, sehingga RLS selalu menjadi lapis pengaman terakhir
- Service role hanya dipakai untuk: rate limit, insert feedback dari pengunjung anonim (seperti PRD v1.1), dan menghapus akun
- Setiap tabel milik user punya kolom `user_id`, dan RLS memastikan user hanya bisa menyentuh barisnya sendiri
- Pengguna yang login secara teknis bisa memanggil REST API Supabase langsung dengan JWT-nya. Ini diterima karena RLS membatasi ke data miliknya sendiri, dan constraint + trigger di database (bagian 9) membatasi penyalahgunaan seperti spam baris
- Admin **tidak** bisa membaca data latihan pengguna. Admin hanya mendapat angka agregat lewat fungsi khusus

---

## 5. Alur User

### 5.1 Pengunjung baru

```
Landing page → "Get started — it's free" → /signup
   → isi email + password → cek email → klik link konfirmasi
   → /auth/callback → /app (dashboard kosong dengan ajakan "Start your first workout")
```

### 5.2 Pengunjung yang hanya ingin melihat (recruiter)

```
Landing page → "Try the demo" → login otomatis ke akun demo
   → /app berisi data latihan contoh ±6 minggu
   → banner "Demo is read-only — sign up to log your own workouts"
```

### 5.3 Mencatat latihan

```
/app → "Start workout" → (nama sesi opsional)
   → layar sesi aktif:
        pilih exercise (combobox) → isi beban & reps → "Add set"
        ulangi; tombol "Repeat last set"; rest timer otomatis mulai
        edit / hapus set jika salah
   → "Finish workout" → konfirmasi
   → ringkasan sesi (total set, total volume, PR baru)
   → kembali ke dashboard
```

### 5.4 Melihat progres

```
/app/history → pilih sesi → detail sesi (bisa diedit)
/app/exercises → pilih exercise → grafik estimasi 1RM + daftar PR
```

---

## 6. Functional Requirements

Penomoran melanjutkan PRD v1.1. FR yang diubah ditandai **(diubah)**.

### FR11 (diubah) — Waitlist dihapus, counter diganti

- Hapus form waitlist, `POST /api/waitlist`, `GET /api/admin/waitlist`, dan tab waitlist di admin
- Section waitlist di landing page diganti section CTA: "Start logging your workouts — free" dengan tombol **Get started** dan **Try the demo**
- Counter Hero menampilkan **jumlah total set yang tercatat** semua pengguna (tidak termasuk akun demo), lewat RPC `get_total_sets_logged()`, revalidasi tiap 60 detik
- Jika jumlah < 100, counter disembunyikan. Jika RPC gagal, counter disembunyikan

### FR3 dan FR8 (diubah) — Klaim fitur harus jujur

Daftar Features dan tabel Comparison hanya boleh menyebut fitur yang benar-benar ada di aplikasi:

- Quick set logging
- Progress charts (estimasi 1RM per exercise)
- Automatic personal records
- Rest timer
- Workout history
- Free

Hapus klaim "Program templates" dan "Works offline". Semua label "soon" atau "coming soon" dihapus.

### FR17 — Sign Up

- Halaman `/signup`: nama tampilan, email, password, konfirmasi password
- Password minimal 8 karakter, maksimal 72
- Dijalankan lewat Server Action yang memanggil `supabase.auth.signUp`
- Konfirmasi email **aktif**. Setelah submit, tampilkan "Check your email to confirm your account"
- Pesan setelah submit selalu sama, baik email sudah terdaftar maupun belum (tidak membocorkan email terdaftar)
- Rate limit: 5 percobaan / 60 menit / IP
- Profil dibuat otomatis oleh trigger database saat user baru terdaftar (bagian 9)

### FR18 — Konfirmasi Email dan Callback

- Route `/auth/callback` menukar kode dari link email menjadi sesi, lalu redirect ke `/app`
- Jika kode tidak valid atau kedaluwarsa, tampilkan halaman error dengan tombol kembali ke `/login`
- Parameter redirect hanya boleh berupa path internal (diawali `/`, bukan `//`) untuk mencegah open redirect

### FR19 — Login dan Logout Pengguna

- Halaman `/login`: email + password, link ke `/signup` dan `/forgot-password`
- Pesan gagal selalu "Invalid email or password."
- Jika email belum dikonfirmasi, tampilkan pesan yang menjelaskan hal itu
- Rate limit: 10 percobaan / 15 menit / IP
- Logout lewat Server Action, redirect ke landing page
- `/admin/login` tetap terpisah seperti PRD v1.1. Admin dan pengguna biasa memakai sistem Supabase Auth yang sama; yang membedakan adalah tabel `admins`

### FR20 — Lupa dan Reset Password

- `/forgot-password`: input email. Pesan selalu "If an account exists, we've sent a reset link."
- Rate limit: 3 percobaan / 60 menit / IP
- `/reset-password`: password baru + konfirmasi, hanya bisa diakses dengan sesi recovery yang valid
- Setelah berhasil, redirect ke `/app`

### FR21 — Proteksi Route Aplikasi

- Middleware (atau `proxy.ts`) meredirect request ke `/app/*` yang belum login ke `/login?next=<path>`
- User yang sudah login dan membuka `/login` atau `/signup` diarahkan ke `/app`
- Setiap Server Action dan Route Handler di `/app` memeriksa sesi sendiri (tidak bergantung hanya pada middleware). Tanpa sesi → 401

### FR22 — Dashboard (`/app`)

- Jika ada sesi aktif: kartu "Continue workout" di posisi paling atas
- Jika tidak: tombol besar "Start workout"
- Statistik minggu ini (minggu dimulai Senin, zona waktu perangkat pengguna): jumlah sesi, jumlah set, total volume (kg)
- 5 PR terbaru
- 3 sesi terakhir dengan link ke detail
- Keadaan kosong (pengguna baru) dengan ajakan memulai sesi pertama

### FR23 — Mulai Sesi

- Nama sesi opsional, maks 60 karakter. Default: "Workout — {tanggal}"
- Hanya boleh **satu sesi aktif** per pengguna (dijaga oleh unique index di database)
- Jika masih ada sesi aktif, tombol "Start workout" membuka sesi itu, bukan membuat baru

### FR24 — Layar Sesi Aktif (`/app/workout/[id]`)

**Form tambah set**

| Field | Aturan |
|---|---|
| Exercise | Wajib. Memakai `ExerciseCombobox` dari FR6. Saran juga mencakup exercise yang pernah dipakai pengguna, ditampilkan paling atas |
| Beban (kg) | Wajib. 0–1000, kelipatan 0.5. Nilai 0 untuk latihan bodyweight |
| Reps | Wajib. Bilangan bulat 1–100 |

- Setelah memilih exercise, beban dan reps terisi otomatis dari set terakhir exercise tersebut (di sesi ini, atau di sesi sebelumnya jika belum ada)
- Tombol **Repeat last set**
- Set dikelompokkan per exercise, berurutan sesuai waktu, dengan nomor set (1, 2, 3, …) yang dihitung dari urutan
- Setiap set bisa diedit atau dihapus. Hapus memakai konfirmasi
- Set yang merupakan PR baru diberi penanda kecil "PR"
- Penambahan set memakai optimistic update. Jika gagal, set ditandai gagal dengan tombol coba lagi

**Rest timer**

- Otomatis mulai setelah set ditambahkan
- Pilihan durasi 60, 90, 120, 180 detik (default 90), disimpan di localStorage
- Tombol +15 detik, -15 detik, dan stop
- Getar (`navigator.vibrate`) dan bunyi pendek saat selesai, jika didukung perangkat

**Mobile**

- Layar ini dirancang untuk dipakai di gym dengan satu tangan: form tambah set menempel di bagian bawah layar (sticky) di HP, target sentuh besar
- Keyboard angka muncul untuk beban dan reps (lihat NFR2)

**Selesai**

- Tombol **Finish workout** dengan konfirmasi
- Sesi tanpa set tidak disimpan: konfirmasi berubah menjadi "Discard empty workout?" dan sesi dihapus

### FR25 — Ringkasan Sesi

Ditampilkan setelah sesi selesai, dan bisa dibuka lagi dari riwayat:

- Durasi
- Jumlah exercise, jumlah set, total volume (Σ beban × reps)
- Daftar PR baru yang dicapai di sesi ini

### FR26 — Personal Record

Dua jenis PR per exercise (dikelompokkan berdasarkan `exercise_key`):

- **Estimated 1RM**: nilai Epley tertinggi (rumus FR5, reps > 12 tetap dihitung tetapi ditandai "estimate less reliable")
- **Heaviest weight**: beban tertinggi untuk minimal 1 rep

Sebuah set dihitung PR jika nilainya **lebih tinggi** dari semua set sebelumnya (berdasarkan waktu) untuk exercise yang sama. Set pertama untuk sebuah exercise tidak dihitung sebagai PR. Perhitungan dilakukan di database (fungsi atau view dengan `security invoker` agar RLS berlaku) atau di server, bukan di client.

### FR27 — Riwayat (`/app/history`)

- Daftar sesi selesai, terbaru di atas, 20 per halaman
- Tiap baris: nama, tanggal, durasi, jumlah set, total volume
- Klik → detail sesi (`/app/history/[id]`) berisi ringkasan (FR25) dan daftar set
- Di detail, set bisa diedit dan dihapus. Nama dan catatan sesi bisa diubah. Sesi bisa dihapus dengan konfirmasi
- Mengakses id sesi milik orang lain menghasilkan 404 (bukan 403, agar tidak membocorkan keberadaan data)

### FR28 — Progres Exercise (`/app/exercises`)

- Daftar semua exercise yang pernah dicatat pengguna, dengan tanggal terakhir dan PR estimasi 1RM
- Halaman detail (`/app/exercises/[key]`):
  - **Grafik garis SVG**: estimasi 1RM terbaik per sesi dari waktu ke waktu
  - Filter rentang: 4 minggu, 12 minggu, semua
  - Titik PR ditandai dengan warna aksen
  - Grafik responsif, punya label sumbu, dan punya alternatif tabel untuk screen reader
  - Daftar PR (kedua jenis) dengan tanggal
  - 10 set terakhir
- Jika baru ada satu titik data, tampilkan pesan bahwa grafik muncul setelah dua sesi

### FR29 — Pengaturan Akun (`/app/settings`)

- Ubah nama tampilan (1–40 karakter)
- Tampilkan email (tidak bisa diubah di versi ini)
- **Hapus akun**:
  - Wajib mengetik ulang password untuk konfirmasi
  - Dijalankan di Server Action: verifikasi password, lalu hapus user lewat service role (`auth.admin.deleteUser`)
  - Semua data latihan ikut terhapus lewat `on delete cascade`
  - Setelah berhasil: logout dan redirect ke landing page dengan pesan konfirmasi

### FR30 — Akun Demo

- Tombol **Try the demo** di landing page menjalankan Server Action yang login ke akun demo memakai kredensial dari environment variable (`DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD`)
- Rate limit: 20 / 60 menit / IP
- Akun demo ditandai `profiles.is_demo = true`
- **Read-only**: RLS menolak insert, update, dan delete untuk akun demo (bagian 9). UI juga menonaktifkan tombol yang mengubah data dan menampilkan banner "Demo is read-only — sign up to log your own workouts" dengan tombol Sign up
- Akun demo tidak bisa mengubah nama atau menghapus akun
- **Seed data**: file `supabase/seed/demo.sql` berisi ±6 minggu latihan realistis (3–4 sesi per minggu, pola Push/Pull/Legs, beban naik bertahap sehingga ada PR dan grafik terlihat menarik). File ini menerima UID akun demo sebagai parameter yang diganti manual
- Data demo tidak dihitung di counter Hero dan statistik admin

### FR16 (diubah) — Dashboard Admin

- Tab Waitlist dihapus
- Ringkasan baru lewat RPC `get_admin_stats()` (hanya bisa dipanggil admin): total pengguna, pengguna baru 7 hari terakhir, total sesi, total set, total feedback per kategori. Akun demo tidak dihitung
- Tab Feedback tetap seperti PRD v1.1
- Admin **tidak** melihat email, sesi, atau set milik pengguna

---

## 7. Validasi (tambahan untuk `lib/validation/schemas.ts`)

| Skema | Field | Aturan |
|---|---|---|
| `signUpSchema` | `displayName` | trim, 1–40 karakter |
| | `email` | trim, lowercase, format email, maks 254 |
| | `password` | 8–72 karakter |
| | `confirmPassword` | sama dengan `password` |
| `loginSchema` | (sudah ada) | dipakai juga untuk login pengguna |
| `forgotPasswordSchema` | `email` | format email |
| `resetPasswordSchema` | `password`, `confirmPassword` | seperti sign up |
| `startSessionSchema` | `name` | opsional, trim, 1–60 karakter |
| `updateSessionSchema` | `name` | trim, 1–60 |
| | `notes` | opsional, trim, maks 500 |
| `setSchema` | `exerciseName` | trim, 1–40 karakter |
| | `weightKg` | number, 0–1000, kelipatan 0.5 |
| | `reps` | integer, 1–100 |
| `displayNameSchema` | `displayName` | trim, 1–40 |
| `deleteAccountSchema` | `password` | 1–72 |
| `progressRangeSchema` | `range` | enum `4w` \| `12w` \| `all`, default `12w` |

Semua id dari URL (`[id]`) divalidasi sebagai UUID sebelum dipakai. Tidak valid → 404.

---

## 8. Rate Limit (tambahan)

Memakai mekanisme yang sama dengan PRD v1.1 bagian 8.

| Aksi | Batas | Key |
|---|---|---|
| `signup` | 5 / 60 menit | IP |
| `login` | 10 / 15 menit | IP |
| `forgot-password` | 3 / 60 menit | IP |
| `demo-login` | 20 / 60 menit | IP |
| `app-write` (semua tambah/edit/hapus set dan sesi) | 120 / 1 menit | **user id** |
| `delete-account` | 3 / 60 menit | user id |

Untuk aksi milik pengguna yang login, key memakai hash user id (bukan IP), agar pengguna di jaringan yang sama (misalnya Wi-Fi gym) tidak saling memblokir.

---

## 9. Database

File migrasi baru: `supabase/migrations/0002_app.sql`. **Jangan mengubah `0001_init.sql`.**

### 9.1 Hapus waitlist

```sql
drop function if exists public.get_waitlist_count();
drop table if exists public.waitlist;
```

### 9.2 Tabel

```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  notes text check (notes is null or char_length(notes) <= 500),
  started_at timestamptz not null default now(),
  ended_at timestamptz check (ended_at is null or ended_at >= started_at),
  created_at timestamptz not null default now()
);

-- Hanya satu sesi aktif per pengguna
create unique index workout_sessions_one_active_per_user
  on public.workout_sessions (user_id) where ended_at is null;

create index workout_sessions_user_started_idx
  on public.workout_sessions (user_id, started_at desc);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_name text not null check (char_length(btrim(exercise_name)) between 1 and 40),
  exercise_key text generated always as (lower(btrim(exercise_name))) stored,
  weight_kg numeric(5,1) not null
    check (weight_kg >= 0 and weight_kg <= 1000 and mod(weight_kg * 2, 1) = 0),
  reps integer not null check (reps between 1 and 100),
  performed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index workout_sets_session_idx on public.workout_sets (session_id, performed_at);
create index workout_sets_user_exercise_idx on public.workout_sets (user_id, exercise_key, performed_at);
```

### 9.3 Trigger

- **Profil otomatis**: trigger `after insert on auth.users` membuat baris `profiles` dengan `display_name` dari `raw_user_meta_data->>'display_name'` (fallback: bagian email sebelum `@`, dipotong ke 40 karakter). Fungsi trigger `security definer` dengan `search_path` dikunci
- **Batas set per sesi**: trigger `before insert on workout_sets` menolak insert jika sesi sudah punya 100 set
- **Batas sesi per hari**: trigger `before insert on workout_sessions` menolak jika pengguna sudah membuat 20 sesi dalam 24 jam terakhir
- **Konsistensi pemilik**: trigger atau policy memastikan `workout_sets.user_id` sama dengan `user_id` sesi induknya

### 9.4 Fungsi

```sql
-- Apakah user yang login adalah akun demo?
create or replace function public.is_demo()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_demo from public.profiles where id = auth.uid()), false);
$$;

-- Counter landing page: total set semua pengguna non-demo
create or replace function public.get_total_sets_logged()
returns bigint
language sql stable security definer set search_path = public
as $$
  select count(*)
  from public.workout_sets s
  join public.profiles p on p.id = s.user_id
  where p.is_demo = false;
$$;
```

`get_admin_stats()`: `security definer`, memanggil `public.is_admin()` di awal dan melempar error jika false. Mengembalikan angka agregat saja (bagian FR16).

Fungsi/view untuk PR dan progres (FR26, FR28) dibuat dengan **`security invoker`** agar RLS pengguna tetap berlaku. Bentuk persisnya diserahkan ke implementasi.

### 9.5 Hak akses dan RLS

```sql
alter table public.profiles         enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets     enable row level security;

-- profiles
create policy "read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and not public.is_demo());
-- Pengguna hanya boleh mengubah display_name, bukan is_demo
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- workout_sessions
create policy "read own sessions" on public.workout_sessions
  for select to authenticated using (user_id = auth.uid());
create policy "insert own sessions" on public.workout_sessions
  for insert to authenticated
  with check (user_id = auth.uid() and not public.is_demo());
create policy "update own sessions" on public.workout_sessions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and not public.is_demo());
create policy "delete own sessions" on public.workout_sessions
  for delete to authenticated
  using (user_id = auth.uid() and not public.is_demo());

-- workout_sets
create policy "read own sets" on public.workout_sets
  for select to authenticated using (user_id = auth.uid());
create policy "insert own sets" on public.workout_sets
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not public.is_demo()
    and exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );
create policy "update own sets" on public.workout_sets
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and not public.is_demo()
    and exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );
create policy "delete own sets" on public.workout_sets
  for delete to authenticated
  using (user_id = auth.uid() and not public.is_demo());

-- Tidak ada policy untuk anon di ketiga tabel ini.

revoke execute on function public.get_total_sets_logged() from public;
grant  execute on function public.get_total_sets_logged() to anon, authenticated;

revoke execute on function public.is_demo() from public, anon;
grant  execute on function public.is_demo() to authenticated;
```

Seperti PRD v1.1: SQL ini adalah spesifikasi. Jika perlu disesuaikan dengan versi Supabase, sesuaikan tanpa melemahkan tujuan keamanannya, lalu catat perubahannya.

---

## 10. Struktur Folder (tambahan)

```
app/
  (auth)/
    signup/page.tsx
    login/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
    actions.ts
  auth/callback/route.ts
  app/
    layout.tsx              # cek sesi, navigasi aplikasi, banner demo
    page.tsx                # dashboard
    workout/[id]/page.tsx   # sesi aktif
    history/page.tsx
    history/[id]/page.tsx
    exercises/page.tsx
    exercises/[key]/page.tsx
    settings/page.tsx
    actions.ts              # semua Server Action aplikasi
components/
  app/                      # SetForm, SetList, RestTimer, SessionSummary, ProgressChart, StatCard, DemoBanner, AppNav
lib/
  auth/require-user.ts      # 401 jika tidak login
  workout/                  # volume, pengelompokan set, deteksi PR (fungsi murni, diuji)
  safe-redirect.ts          # validasi parameter next/redirect
supabase/
  migrations/0002_app.sql
  seed/demo.sql
```

Fitur waitlist (komponen, route, skema, test) dihapus bersih.

---

## 11. Environment Variables (tambahan)

| Nama | Lokasi | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | client + server | URL situs (untuk link email dan redirect). Lokal: `http://localhost:3000` |
| `DEMO_USER_EMAIL` | **server saja** | Email akun demo |
| `DEMO_USER_PASSWORD` | **server saja** | Password akun demo |

---

## 12. Navigasi dan UI Aplikasi

Semua aturan NFR2 (responsif) dan NFR8 (desain minimalis, daftar "Dilarang") berlaku juga di `/app`.

- **HP**: navigasi bawah (bottom tab bar) berisi Dashboard, History, Exercises, Settings. Menghormati safe area bawah
- **Tablet dan desktop**: sidebar kiri atau navbar atas
- Angka (beban, reps, volume, 1RM) memakai font mono + `tabular-nums`
- Setiap halaman punya keadaan **loading** (skeleton sederhana), **kosong**, dan **error**
- Semua aksi destruktif (hapus set, hapus sesi, hapus akun) memakai konfirmasi
- Tanggal dan waktu ditampilkan dalam zona waktu perangkat pengguna

---

## 13. Testing (tambahan)

### Unit test

- Perhitungan volume dan pengelompokan set per exercise
- Deteksi PR: set pertama bukan PR, nilai sama bukan PR, nilai lebih tinggi PR
- Skema validasi baru
- `safe-redirect`: menolak `//evil.com`, `https://evil.com`, menerima `/app/history`
- Server Action: tanpa sesi → error 401; akun demo → ditolak; input tidak valid → error validasi (Supabase di-mock)

### Checklist manual

- [ ] Sign up → email konfirmasi → login → dashboard kosong
- [ ] Email sudah terdaftar menghasilkan pesan yang sama dengan email baru
- [ ] Lupa password → email → reset → login dengan password baru
- [ ] Mulai sesi, tambah set dari HP, rest timer bergetar/berbunyi, finish, ringkasan tampil
- [ ] Tidak bisa membuat sesi aktif kedua
- [ ] PR terdeteksi dengan benar di ringkasan dan halaman progres
- [ ] Grafik progres tampil benar di HP, tablet, dan desktop
- [ ] User A tidak bisa membaca/mengubah sesi user B, baik lewat UI (404) maupun REST API Supabase langsung dengan JWT user A
- [ ] Akun demo: semua tombol ubah data nonaktif; insert langsung lewat REST API dengan JWT demo ditolak RLS
- [ ] Hapus akun menghapus semua sesi dan set
- [ ] Admin hanya melihat angka agregat, tidak bisa membaca `workout_sessions` / `workout_sets`
- [ ] Waitlist sudah tidak ada di mana pun (UI, API, admin, database)
- [ ] Landing page tidak lagi mengklaim fitur yang tidak ada

---

## 14. Tahapan Pengerjaan

| Fase | Isi | Selesai jika |
|---|---|---|
| **A1. Database** | `0002_app.sql` (hapus waitlist, tabel, trigger, fungsi, RLS) | Migrasi valid secara sintaks; semua policy sesuai bagian 9.5 |
| **A2. Auth pengguna** | FR17–FR21, `require-user`, `safe-redirect` | Alur sign up, login, logout, lupa/reset password lengkap; test lolos |
| **A3. Logging** | FR23, FR24 (termasuk rest timer) | Bisa mencatat sesi penuh dari HP; satu sesi aktif terjaga |
| **A4. Ringkasan + PR** | FR25, FR26 | Ringkasan dan deteksi PR benar; test lolos |
| **A5. Riwayat** | FR27 | Daftar, detail, edit, hapus berfungsi; id orang lain → 404 |
| **A6. Progres** | FR28 | Grafik SVG responsif + alternatif tabel |
| **A7. Dashboard** | FR22, navigasi aplikasi (bagian 12) | Dashboard lengkap termasuk keadaan kosong |
| **A8. Pengaturan** | FR29 | Ubah nama dan hapus akun berfungsi |
| **A9. Demo** | FR30, `supabase/seed/demo.sql` | Demo login berjalan, read-only di UI dan RLS |
| **A10. Landing + admin** | FR11, FR3/FR8, FR16 (diubah), hapus waitlist | Landing page jujur, counter baru, admin hanya agregat |
| **A11. Polishing** | Responsif, NFR8, Lighthouse, README | Seluruh checklist bagian 13 dan PRD v1.1 bagian 15.3 (yang masih relevan) lolos |
