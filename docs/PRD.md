# PRD — RepLog Landing Page

| | |
|---|---|
| **Versi** | 1.1 (tambah arah desain visual dan detail responsif) |
| **Tanggal** | 30 Oktober 2026 |
| **Pemilik** | Dafa Wahyu Ananta |
| **Status** | Siap dikerjakan |
| **Jenis proyek** | Portofolio (frontend-focused, dengan server logic ringan) |

---

## 1. Ringkasan

RepLog adalah aplikasi gym log **fiktif** untuk mencatat latihan beban (set, reps, beban) dan melacak progres. Proyek ini adalah **landing page** untuk produk tersebut. Aplikasi RepLog-nya sendiri tidak dibangun.

Landing page ini punya tiga tujuan untuk pengunjung:

1. Memahami produk dalam beberapa detik
2. Mencoba fitur interaktif (kalkulator 1RM dengan pencarian exercise)
3. Mendaftar waitlist atau mengirim saran dan kritik

Seluruh fitur RepLog digambarkan **gratis**, tanpa paket berbayar.

### Tujuan portofolio

Proyek ini harus memperlihatkan bahwa developer-nya (backend-focused) juga mampu:

- Membangun UI yang rapi, responsif, dan aksesibel
- Menulis logika client yang tidak sepele (combobox dengan navigasi keyboard, kalkulator, riwayat)
- Menerapkan keamanan dengan benar walaupun tanpa server terpisah: validasi dua sisi, rate limit, authentication, authorization, dan Row Level Security

---

## 2. Scope

### In scope

- Landing page satu halaman dengan section: Navbar, Hero, Features, How It Works, Kalkulator 1RM, Comparison, FAQ, Waitlist, Feedback CTA, Footer
- Kalkulator 1RM dengan input exercise berbentuk autocomplete dan riwayat di localStorage
- Form waitlist (disimpan ke database)
- Modal saran dan kritik (disimpan ke database)
- Counter jumlah pendaftar waitlist di Hero
- Dark mode
- Halaman admin (`/admin`) yang dilindungi login untuk membaca waitlist dan feedback
- Rate limit untuk semua endpoint yang menulis data dan untuk login admin

### Out of scope

- Akun atau login untuk pengunjung biasa
- Aplikasi gym log yang sebenarnya (mencatat latihan, grafik progres)
- Menyimpan riwayat kalkulator ke database
- Mengirim email ke pendaftar waitlist
- Pembayaran atau paket berbayar
- Multi-bahasa (i18n)
- Admin mengedit atau menghapus data (admin hanya membaca)

---

## 3. Tech Stack

| Bagian | Pilihan |
|---|---|
| Framework | **Next.js** (versi stabil terbaru, App Router) |
| Bahasa | **TypeScript** (`strict: true`) |
| Styling | **Tailwind CSS** |
| Database | **Supabase** (PostgreSQL), region Singapore (`ap-southeast-1`) |
| Auth | **Supabase Auth** (email + password, sign-up dinonaktifkan) |
| Validasi | **Zod** (skema dipakai bersama oleh client dan server) |
| Rate limit | Tabel + fungsi PostgreSQL di Supabase (tanpa layanan tambahan) |
| Ikon | `lucide-react` |
| Testing | **Vitest** |
| Deploy | **Vercel** |
| CI | GitHub Actions (lint, typecheck, test) |

### Dependency yang diizinkan

`next`, `react`, `react-dom`, `tailwindcss`, `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `lucide-react`, `server-only`.

Dev: `typescript`, `vitest`, `eslint`, `prettier`, dan tipe-tipe terkait.

Dependency lain **harus ditanyakan dulu** sebelum dipasang. Combobox, modal, accordion, dan dark mode dibuat sendiri tanpa library UI.

---

## 4. Arsitektur

```
Browser
  │
  ├── Halaman landing (Server Component + Client Component)
  │      └── kalkulator, combobox, riwayat, dark mode, FAQ → murni client
  │
  ├── POST /api/waitlist ─┐
  ├── POST /api/feedback ─┤
  │                       ├──► Route Handler (Vercel serverless)
  ├── /admin (login)      │       1. cek Content-Type & ukuran body
  ├── GET /api/admin/* ───┘       2. rate limit (RPC ke Supabase)
  │                               3. validasi Zod
  │                               4. authn + authz (khusus admin)
  │                               5. query ke Supabase
  ▼
Supabase (PostgreSQL + Auth + RLS)
```

### Keputusan keamanan utama

**Pengunjung tidak bisa menulis ke database secara langsung.** Anon key Supabase bersifat publik (terlihat di browser), jadi kalau role `anon` punya policy `INSERT`, siapa pun bisa mengirim data langsung ke REST API Supabase dan **melewati rate limit serta validasi** di Route Handler.

Karena itu:

- Role `anon` **tidak punya policy apa pun** di tabel `waitlist`, `feedback`, `admins`, dan `rate_limits`
- Insert dari pengunjung hanya terjadi lewat Route Handler, memakai **service role key** yang hanya ada di server
- Satu-satunya yang boleh dipanggil `anon` adalah fungsi `get_waitlist_count()`, yang hanya mengembalikan angka
- Pembacaan data admin memakai **sesi user yang login** (bukan service role), sehingga RLS tetap menjadi lapis pengaman kedua

---

## 5. Alur User

### 5.1 Pengunjung

```
Buka halaman
   │
   ▼
Hero: headline + counter "Join X lifters"
   │
   ├──► klik CTA "Join the waitlist" → scroll ke form waitlist
   │
   ▼
Features → How It Works
   │
   ▼
Kalkulator 1RM: ketik exercise (autocomplete) → isi beban & reps → hasil + tabel persentase → masuk riwayat
   │
   ▼
Comparison → FAQ
   │
   ▼
Form waitlist → submit → sukses / sudah terdaftar / error / rate limited
   │
   ▼
Feedback CTA → modal saran & kritik → submit
```

Modal saran dan kritik juga bisa dibuka kapan saja dari link di Navbar.

### 5.2 Admin

```
Buka /admin
   │
   ├── belum login ──► redirect ke /admin/login
   │                        │
   │                        ▼
   │                   email + password → (rate limit) → login
   │                        │
   │       ┌────────────────┴────────────────┐
   │       ▼                                 ▼
   │   punya role admin               tidak punya role admin
   │       │                                 │
   │       ▼                                 ▼
   └──► Dashboard admin                 Halaman 403 + logout
           ├── tab Waitlist (paginated)
           ├── tab Feedback (filter kategori, paginated)
           └── tombol Logout
```

---

## 6. Functional Requirements

### FR1 — Navbar

- Logo/nama RepLog di kiri
- Link anchor ke section: Features, Calculator, FAQ
- Link "Feedback" yang membuka modal saran dan kritik (FR10)
- Tombol toggle dark mode (FR12)
- Tombol CTA "Join the waitlist"
- Sticky saat scroll
- Di layar kecil, menu berubah menjadi tombol hamburger dengan panel yang bisa ditutup lewat `Esc`

### FR2 — Hero

- Headline, subheadline, dan CTA "Join the waitlist"
- Badge "100% free"
- Counter pendaftar (FR11)
- Mockup tampilan aplikasi yang dibuat dengan HTML + Tailwind (tanpa gambar eksternal)

### FR3 — Features

Enam fitur, masing-masing dengan judul dan deskripsi satu-dua kalimat, ditampilkan sebagai daftar bergaris pemisah (lihat NFR8):

1. Quick set logging
2. Progress charts
3. Rest timer
4. Program templates (PPL, Upper/Lower, Full Body)
5. Automatic personal records
6. Works offline

### FR4 — How It Works

Tiga langkah: pilih program → catat latihan → lihat progres.

### FR5 — Kalkulator 1RM

**Input**

| Field | Aturan |
|---|---|
| Exercise | Wajib. Lewat combobox (FR6). Maks 40 karakter setelah trim |
| Beban (kg) | Wajib. 1–500, kelipatan 0.5 |
| Reps | Wajib. Bilangan bulat 1–12 |

**Perhitungan**

- Rumus Epley: `1RM = beban × (1 + reps / 30)`
- Jika `reps = 1`, maka `1RM = beban`
- Hasil dibulatkan ke kelipatan 0.5 kg terdekat
- Logika dipisah ke `lib/one-rep-max.ts` sebagai fungsi murni dan diuji unit

**Output**

- "Estimated 1RM for {exercise}: {nilai} kg"
- Tabel persentase 95%, 90%, 85%, 80%, 75%, 70%, 65%, 60% beserta bebannya (dibulatkan ke 0.5 kg)
- Pesan error per field jika input tidak valid. Tombol hitung nonaktif selama ada field yang tidak valid

### FR6 — Exercise Combobox

Satu text field. Saat user mengetik, daftar saran muncul di bawahnya. Tidak ada dropdown atau text field terpisah.

**Data**

- File statis `lib/exercises.ts`, minimal 40 exercise yang mencakup dada, punggung, kaki, bahu, lengan, dan core
- Setiap exercise punya `name` dan `aliases` opsional. Contoh: Overhead Press → `["ohp"]`, Romanian Deadlift → `["rdl"]`, Bench Press → `["bp"]`

**Perilaku**

- Pencocokan tidak peka huruf besar/kecil, terhadap bagian mana pun dari nama atau alias
- Urutan hasil: nama yang diawali query lebih dulu, lalu yang mengandung query
- Maksimal 8 saran ditampilkan
- Bagian teks yang cocok di-highlight
- Jika field kosong dan difokus, tampilkan exercise populer: Bench Press, Squat, Deadlift, Overhead Press
- Jika tidak ada yang cocok persis, tampilkan opsi `Use "{teks yang diketik}"` agar user bisa memakai nama sendiri
- Logika filter dipisah ke fungsi murni dan diuji unit

**Keyboard**

| Tombol | Aksi |
|---|---|
| `↓` / `↑` | Pindah saran aktif (melingkar) |
| `Enter` | Pilih saran aktif |
| `Esc` | Tutup daftar |
| `Tab` | Tutup daftar, fokus pindah ke field berikutnya |

Klik di luar komponen juga menutup daftar.

**Aksesibilitas** mengikuti pola combobox WAI-ARIA APG: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-autocomplete="list"`, dan `role="listbox"` / `role="option"` pada daftar.

### FR7 — Riwayat Kalkulator

- Setiap perhitungan yang berhasil disimpan ke localStorage dengan key `replog:1rm-history`
- Data per entri: nama exercise, beban, reps, estimasi 1RM, waktu
- Jika exercise dengan nama yang sama (tidak peka huruf besar/kecil) sudah ada, entri itu diperbarui dan dipindah ke paling atas, bukan diduplikasi
- Maksimal 20 entri. Entri tertua dibuang jika lebih
- Tiap entri bisa dihapus, dan ada tombol "Clear all"
- Semua akses localStorage dibungkus `try/catch`. Jika localStorage tidak tersedia, kalkulator tetap berfungsi tanpa riwayat
- Data dari localStorage divalidasi dengan Zod sebelum dipakai. Data rusak diabaikan

### FR8 — Comparison

Tabel perbandingan RepLog vs Notes app vs Spreadsheet vs Paper notebook, dengan baris:

- Automatic progress charts
- Rest timer
- PR detection
- Program templates
- Works offline
- Free

Di layar kecil, tabel bisa di-scroll horizontal di dalam kontainernya sendiri (halaman tidak ikut melebar).

### FR9 — FAQ

- Accordion, hanya satu item terbuka dalam satu waktu
- Tombol memakai `aria-expanded` dan `aria-controls`
- Minimal 5 pertanyaan, termasuk: "Why is it free?", "What do you do with my email?", "When does it launch?", "Does it work offline?", "Can I suggest a feature?"

### FR10 — Saran dan Kritik (Feedback)

**Pemicu:** link "Feedback" di Navbar dan tombol di section Feedback CTA. Keduanya membuka modal yang sama.

**Form**

| Field | Aturan |
|---|---|
| Category | Wajib. Tombol pilihan (bukan dropdown): Feature idea (`feature`), Critique (`critique`), Bug report (`bug`) |
| Message | Wajib. 10–1000 karakter setelah trim. Ada penghitung karakter |
| Email | Opsional. Jika diisi: format valid, maks 254 karakter, di-trim dan diubah ke huruf kecil |
| `website` | Honeypot, tersembunyi dari user dan screen reader |

**Perilaku modal**

- Dibuat dengan elemen `<dialog>` native atau setara, dengan focus trap
- Bisa ditutup lewat `Esc`, tombol X, atau klik backdrop
- Jika form sudah diisi lalu user mencoba menutup, minta konfirmasi "Discard your message?"
- Setelah ditutup, fokus kembali ke tombol yang membukanya
- Saat submit: tombol nonaktif + indikator loading
- Sukses: tampilkan pesan terima kasih dan tombol tutup
- Gagal: tampilkan pesan error, isi form tidak hilang

Endpoint: `POST /api/feedback` (lihat bagian 9).

### FR11 — Waitlist dan Counter

**Form waitlist**

| Field | Aturan |
|---|---|
| Email | Wajib. Format valid, maks 254 karakter, di-trim dan diubah ke huruf kecil |
| `website` | Honeypot |

State UI yang wajib ditangani:

| Kondisi | Tampilan |
|---|---|
| Loading | Tombol nonaktif + spinner |
| Sukses (201) | "You're on the list! We'll let you know when RepLog launches." |
| Sudah terdaftar (409) | Pesan ramah, bukan error merah: "You're already on the list." |
| Validasi gagal (400) | Pesan error di bawah field |
| Rate limited (429) | "Too many attempts. Please try again in {X} minutes." |
| Error lain (500) | "Something went wrong. Please try again." |

Endpoint: `POST /api/waitlist` (lihat bagian 9).

**Counter**

- Diambil di Server Component lewat RPC `get_waitlist_count()` dengan revalidasi tiap 60 detik
- Jika jumlah 0, tampilkan "Be the first to join"
- Jika pengambilan gagal, counter disembunyikan (halaman tidak boleh error)
- Setelah user berhasil mendaftar, angka di layar langsung bertambah satu (optimistic update)

### FR12 — Dark Mode

- Tiga kondisi: light, dark, dan mengikuti sistem (default)
- Pilihan disimpan di localStorage (`replog:theme`), dibungkus `try/catch`
- Tidak boleh ada kedipan tema saat halaman pertama dimuat (pakai skrip inline kecil di `<head>`)
- Strategi Tailwind berbasis class

### FR13 — Login Admin

- Halaman `/admin/login` berisi email dan password
- Login dijalankan lewat Server Action yang memanggil Supabase Auth di server
- Rate limit: 5 percobaan per 15 menit per IP (lihat bagian 8)
- Pesan gagal selalu sama: "Invalid email or password." (tidak membocorkan apakah email terdaftar)
- Sign-up dinonaktifkan di pengaturan Supabase Auth. **Tidak ada halaman register.** Akun admin dibuat manual (lihat bagian 13)
- Logout lewat Server Action, lalu redirect ke `/admin/login`

### FR14 — Proteksi Halaman Admin (Authentication)

- Middleware Next.js (atau `proxy.ts` jika versi Next.js yang terpasang memakai konvensi itu) me-refresh sesi Supabase dan meredirect request ke `/admin/*` yang belum login ke `/admin/login`
- `/admin/login` dikecualikan dari redirect tersebut
- User yang sudah login dan membuka `/admin/login` diarahkan ke `/admin`

### FR15 — Otorisasi Admin (Authorization)

Login saja tidak cukup. Setiap akses ke data admin harus melewati pengecekan role **di server**:

- Helper `requireAdmin()` di `lib/auth/require-admin.ts` memeriksa:
  1. Ada user yang login? Jika tidak → **401**
  2. User terdaftar di tabel `admins`? Jika tidak → **403**
- Dipakai di layout `/admin` (user non-admin melihat halaman 403 dengan tombol logout) dan di setiap Route Handler `/api/admin/*`
- Lapis kedua: RLS di database hanya mengizinkan `SELECT` pada `waitlist` dan `feedback` jika `is_admin()` bernilai true
- Data admin dibaca memakai sesi user (anon key + cookie), **bukan** service role, supaya RLS tetap berlaku

### FR16 — Dashboard Admin

- Ringkasan: total waitlist, total feedback, dan jumlah feedback per kategori
- Tab **Waitlist**: tabel email + tanggal daftar, terbaru di atas, 20 baris per halaman
- Tab **Feedback**: tabel kategori, pesan, email (atau "—"), tanggal. Filter kategori. 20 baris per halaman
- Data diambil dari `GET /api/admin/waitlist` dan `GET /api/admin/feedback`
- Hanya baca. Tidak ada edit atau hapus
- Tombol logout

---

## 7. Validasi

### 7.1 Prinsip

- Satu set skema Zod di `lib/validation/schemas.ts`, dipakai oleh form (client) dan Route Handler (server)
- **Server adalah sumber kebenaran.** Validasi client hanya untuk pengalaman pengguna
- Lapis terakhir: constraint di database (`UNIQUE`, `CHECK`, `NOT NULL`)

### 7.2 Skema

| Skema | Field | Aturan |
|---|---|---|
| `waitlistSchema` | `email` | string, trim, lowercase, format email, maks 254 |
| | `website` | string opsional (honeypot) |
| `feedbackSchema` | `category` | enum `feature` \| `critique` \| `bug` |
| | `message` | string, trim, 10–1000 karakter |
| | `email` | opsional; string kosong dianggap tidak ada; jika ada: trim, lowercase, format email, maks 254 |
| | `website` | string opsional (honeypot) |
| `oneRepMaxSchema` | `exercise` | string, trim, 1–40 karakter |
| | `weight` | number, 1–500, kelipatan 0.5 |
| | `reps` | integer, 1–12 |
| `adminListQuerySchema` | `page` | integer ≥ 1, default 1 |
| | `category` | opsional, enum seperti di atas (khusus feedback) |
| `loginSchema` | `email` | format email |
| | `password` | string, 1–128 karakter |

### 7.3 Aturan request di Route Handler

Urutan pemeriksaan pada setiap endpoint yang menulis data:

1. `Content-Type` harus `application/json`. Jika tidak → **415**
2. Ukuran body maks 10 KB. Jika lebih → **413**
3. Rate limit. Jika terlampaui → **429**
4. Parse JSON. Jika gagal → **400**
5. Validasi Zod. Jika gagal → **400** dengan pesan per field
6. Honeypot terisi → balas **201** seolah sukses, tanpa menyimpan data
7. Simpan ke database

---

## 8. Rate Limit

### 8.1 Mekanisme

- Fixed window, disimpan di tabel `rate_limits` PostgreSQL dan dijalankan oleh fungsi `check_rate_limit()` secara atomik
- Fungsi hanya bisa dipanggil oleh service role
- Key: `{nama_aksi}:{hash}` dengan `hash = SHA-256(ip + RATE_LIMIT_SALT)`. **IP mentah tidak pernah disimpan**
- IP diambil dari header `x-forwarded-for` (nilai pertama) yang disediakan Vercel
- Logika di `lib/rate-limit.ts`

### 8.2 Batas

| Aksi | Batas |
|---|---|
| `waitlist` | 5 request / 60 menit / IP |
| `feedback` | 3 request / 10 menit / IP |
| `admin-login` | 5 percobaan / 15 menit / IP |
| `admin-read` | 60 request / 1 menit / IP |

### 8.3 Respons

- HTTP **429** dengan header `Retry-After` (detik) dan body error standar (bagian 9.1)
- Untuk login admin (Server Action), kembalikan pesan error yang menyebutkan waktu tunggu

### 8.4 Pembersihan

Baris `rate_limits` yang `window_start`-nya lebih tua dari 24 jam dihapus. Gunakan `pg_cron` di Supabase (jadwal harian) jika tersedia; jika tidak, dokumentasikan query pembersihan manual di README.

### 8.5 Jika rate limit gagal dicek

Jika RPC rate limit error (misalnya database tidak terjangkau), request **ditolak** dengan 503 (fail closed), karena menulis data tanpa rate limit lebih berisiko daripada menolak sementara.

---

## 9. API

### 9.1 Format error standar

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields are invalid.",
    "fields": { "email": "Please enter a valid email address." }
  }
}
```

Kode error: `VALIDATION_ERROR`, `ALREADY_REGISTERED`, `RATE_LIMITED`, `UNAUTHORIZED`, `FORBIDDEN`, `UNSUPPORTED_MEDIA_TYPE`, `PAYLOAD_TOO_LARGE`, `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`.

Pesan error ke client tidak boleh berisi detail internal (stack trace, pesan error database).

### 9.2 `POST /api/waitlist`

Request:

```json
{ "email": "user@example.com", "website": "" }
```

| Status | Kondisi |
|---|---|
| 201 | Tersimpan (atau honeypot terisi) |
| 400 | JSON tidak valid / validasi gagal |
| 409 | Email sudah terdaftar (`ALREADY_REGISTERED`, dari error PostgreSQL `23505`) |
| 413 / 415 | Body terlalu besar / Content-Type salah |
| 429 | Rate limited |
| 500 / 503 | Error server / rate limit tidak bisa dicek |

### 9.3 `POST /api/feedback`

Request:

```json
{
  "category": "feature",
  "message": "Please add a plate calculator.",
  "email": "user@example.com",
  "website": ""
}
```

Status sama seperti waitlist, tanpa 409.

### 9.4 `GET /api/admin/waitlist?page=1`

Membutuhkan sesi admin.

```json
{
  "data": [{ "id": "uuid", "email": "user@example.com", "created_at": "2026-10-30T07:00:00Z" }],
  "page": 1,
  "pageSize": 20,
  "total": 123
}
```

| Status | Kondisi |
|---|---|
| 200 | Berhasil |
| 400 | Query tidak valid |
| 401 | Belum login |
| 403 | Bukan admin |
| 429 | Rate limited |

### 9.5 `GET /api/admin/feedback?page=1&category=bug`

Membutuhkan sesi admin. Format respons sama dengan 9.4, dengan item berisi `id`, `category`, `message`, `email`, `created_at`. Status sama dengan 9.4.

---

## 10. Database

File migrasi: `supabase/migrations/0001_init.sql`.

### 10.1 Tabel

```sql
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique
    check (char_length(email) <= 254 and email = lower(email)),
  created_at timestamptz not null default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('feature', 'critique', 'bug')),
  message text not null check (char_length(message) between 10 and 1000),
  email text check (email is null or char_length(email) <= 254),
  created_at timestamptz not null default now()
);

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  primary key (key, window_start)
);

create index feedback_category_created_at_idx on public.feedback (category, created_at desc);
create index waitlist_created_at_idx on public.waitlist (created_at desc);
```

### 10.2 Fungsi

```sql
-- Apakah user yang sedang login adalah admin?
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Jumlah pendaftar waitlist (satu-satunya yang boleh dipanggil anon)
create or replace function public.get_waitlist_count()
returns bigint
language sql stable security definer set search_path = public
as $$
  select count(*) from public.waitlist;
$$;

-- Rate limit fixed window, atomik
create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_window_start timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into public.rate_limits (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
  do update set count = public.rate_limits.count + 1
  returning public.rate_limits.count into v_count;

  allowed := v_count <= p_limit;
  retry_after_seconds := case
    when allowed then 0
    else ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - now())))::integer
  end;
  return next;
end;
$$;
```

### 10.3 Hak akses dan RLS

```sql
alter table public.waitlist    enable row level security;
alter table public.feedback    enable row level security;
alter table public.admins      enable row level security;
alter table public.rate_limits enable row level security;

-- Tidak ada policy untuk anon di tabel mana pun.
-- Insert dari pengunjung hanya lewat Route Handler dengan service role.

create policy "admins can read waitlist"
  on public.waitlist for select to authenticated
  using (public.is_admin());

create policy "admins can read feedback"
  on public.feedback for select to authenticated
  using (public.is_admin());

create policy "users can read their own admin row"
  on public.admins for select to authenticated
  using (user_id = auth.uid());

-- rate_limits: tanpa policy (hanya service role).

revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant  execute on function public.check_rate_limit(text, integer, integer) to service_role;

revoke execute on function public.get_waitlist_count() from public;
grant  execute on function public.get_waitlist_count() to anon, authenticated;

revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;
```

SQL di atas adalah spesifikasi. Jika ada bagian yang tidak cocok dengan versi Supabase yang dipakai, sesuaikan tanpa mengubah tujuan keamanannya, lalu catat perubahannya.

---

## 11. Struktur Folder

```
app/
  layout.tsx
  page.tsx
  globals.css
  api/
    waitlist/route.ts
    feedback/route.ts
    admin/
      waitlist/route.ts
      feedback/route.ts
  admin/
    layout.tsx            # requireAdmin(), halaman 403 untuk non-admin
    page.tsx              # dashboard
    actions.ts            # login & logout (Server Actions)
    login/page.tsx
components/
  landing/                # Navbar, Hero, Features, HowItWorks, Comparison, Faq, WaitlistForm, FeedbackCta, Footer
  calculator/             # OneRepMaxCalculator, ExerciseCombobox, HistoryList
  feedback/               # FeedbackModal
  admin/                  # tabel dan tab admin
  ui/                     # Button, Input, ThemeToggle, dll.
lib/
  one-rep-max.ts
  exercises.ts
  exercise-search.ts      # logika filter combobox
  history.ts              # baca/tulis localStorage
  rate-limit.ts
  http.ts                 # helper respons error standar
  validation/schemas.ts
  auth/require-admin.ts
  supabase/
    server.ts             # client dengan sesi user (cookie)
    service.ts            # client service role, diawali import "server-only"
middleware.ts             # atau proxy.ts, sesuai versi Next.js
supabase/migrations/0001_init.sql
tests/
.env.example
README.md
```

---

## 12. Environment Variables

| Nama | Lokasi | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Anon/publishable key. Aman publik karena `anon` tidak punya hak di tabel |
| `SUPABASE_SERVICE_ROLE_KEY` | **server saja** | Service role/secret key. Tidak boleh diawali `NEXT_PUBLIC_` |
| `RATE_LIMIT_SALT` | **server saja** | String acak panjang untuk hash IP |

- `.env.local` masuk `.gitignore`. `.env.example` berisi nama variabel tanpa nilai
- File yang memakai service role key diawali `import "server-only"` agar build gagal jika ter-import di client

---

## 13. Setup Admin (manual, didokumentasikan di README)

1. Supabase Dashboard → Authentication → nonaktifkan sign-up publik
2. Buat user admin lewat Dashboard (Authentication → Users → Add user)
3. Jalankan di SQL Editor:
   ```sql
   insert into public.admins (user_id) values ('<uuid user admin>');
   ```

---

## 14. Non-Functional Requirements

### NFR1 — Performa

- Lighthouse (mobile) ≥ 90 untuk Performance, Accessibility, Best Practices, dan SEO
- Tidak ada gambar besar. Mockup dibuat dengan HTML/CSS. Font lewat `next/font`

### NFR2 — Responsif (HP, tablet/iPad, desktop)

Halaman harus benar-benar dirancang untuk tiap ukuran layar, bukan hanya "tidak rusak".

**Breakpoint**

| Kelas perangkat | Lebar | Contoh |
|---|---|---|
| HP | 360–767 px | Android kecil, iPhone |
| Tablet | 768–1023 px | iPad portrait (768, 810, 820, 834) |
| Desktop | ≥ 1024 px | iPad landscape (1024–1194), laptop, monitor |

Lebar yang wajib dicek: **360, 390, 768, 820, 1024, 1180, 1440 px**, dalam orientasi portrait dan landscape untuk HP dan tablet.

**Perilaku per komponen**

| Komponen | HP | Tablet | Desktop |
|---|---|---|---|
| Navbar | Logo + hamburger | Link tampil, tanpa hamburger | Link tampil |
| Hero | Satu kolom, mockup di bawah teks | Satu kolom, mockup lebih lebar | Dua kolom: teks kiri, mockup kanan |
| Features | Satu kolom | Dua kolom | Dua atau tiga kolom |
| Kalkulator | Form di atas, hasil di bawah | Form dan hasil berdampingan | Form dan hasil berdampingan |
| Comparison | Scroll horizontal di dalam kontainer, kolom pertama sticky | Muat tanpa scroll jika memungkinkan | Muat penuh |
| Modal feedback | Bottom sheet / layar penuh | Dialog di tengah | Dialog di tengah |
| Tabel admin | Berubah menjadi daftar kartu | Tabel | Tabel |

**Aturan sentuhan dan perangkat mobile**

- Target sentuh minimal 44 × 44 px
- Efek hover hanya diterapkan di `@media (hover: hover)`, supaya tidak "nyangkut" di layar sentuh
- Ukuran font input minimal 16 px agar Safari iOS tidak auto-zoom
- Input beban memakai `inputmode="decimal"`, input reps memakai `inputmode="numeric"`
- Combobox bisa dipakai penuh dengan sentuhan, dan daftar sarannya tidak tertutup keyboard virtual
- Modal dan navbar menghormati safe area (`env(safe-area-inset-*)`) dan memakai unit `dvh`, bukan `vh`
- Tidak ada scroll horizontal di level halaman pada lebar mana pun

### NFR3 — Aksesibilitas

- Semua fitur bisa dipakai dengan keyboard
- Fokus selalu terlihat (`focus-visible`)
- Kontras warna memenuhi WCAG AA di light dan dark mode
- Setiap input punya label. Pesan error dihubungkan dengan `aria-describedby`
- Animasi dimatikan jika `prefers-reduced-motion: reduce`

### NFR4 — Keamanan

- Semua yang dijelaskan di bagian 4, 7, 8, dan 10
- Security headers di `next.config`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` yang membatasi kamera/mikrofon/geolokasi
- Tidak ada secret di repository

### NFR5 — Privasi

- IP tidak disimpan mentah (hanya hash dengan salt)
- Email waitlist dan feedback tidak pernah ditampilkan di halaman publik

### NFR6 — Kualitas Kode

- TypeScript strict, tanpa `any` kecuali ada alasan tertulis
- ESLint dan Prettier lolos
- Logika murni (1RM, pencarian exercise, riwayat, skema validasi) dipisah dari komponen dan diuji dengan Vitest

### NFR7 — Animasi

- Section muncul halus saat masuk viewport (Intersection Observer)
- Counter dianimasikan naik dari 0 saat pertama terlihat

### NFR8 — Desain Visual: minimalis, bukan "AI slop"

Arah desain: **seperti buku catatan latihan yang rapi**. Tenang, banyak ruang kosong, fokus ke tipografi dan angka. Bukan template SaaS generik.

**Warna**

- Dasar netral: latar off-white (mis. `#FAFAF9`) dan teks hampir hitam (mis. `#111111`) di light mode; kebalikannya di dark mode (latar `#0F0F0F`, bukan hitam pekat)
- **Satu** warna aksen saja, dipakai hemat: tombol CTA utama, highlight teks yang cocok di combobox, dan angka hasil 1RM. Contoh: oranye tegas `#E8590C`. Tidak ada warna aksen kedua
- Abu-abu untuk teks sekunder dan garis pemisah
- Semua warna didefinisikan sebagai token (CSS variables / tema Tailwind), bukan nilai hex yang tersebar di komponen

**Tipografi**

- Satu keluarga sans-serif untuk teks (mis. IBM Plex Sans) dan pasangan monospace-nya (mis. IBM Plex Mono) **khusus untuk angka**: beban, reps, hasil 1RM, counter, tabel persentase. Ini memberi kesan "log latihan"
- Angka memakai `font-variant-numeric: tabular-nums` agar kolom rapi
- Skala tipografi terbatas (maks 6 ukuran). Hierarki dibangun dari ukuran dan ketebalan, bukan warna
- Headline singkat dan langsung, tanpa kalimat marketing berlebihan

**Layout dan bentuk**

- Lebar konten maks sekitar 1120 px, dengan ruang kosong vertikal yang lega antar section
- Pemisah memakai garis 1 px, **bukan bayangan**
- Radius sudut kecil dan konsisten (4–8 px)
- Features ditampilkan sebagai **daftar dengan garis pemisah** (judul + deskripsi), bukan grid kartu yang masing-masing punya ikon di dalam lingkaran berwarna
- Ikon `lucide-react` hanya dipakai jika membantu makna, dengan ukuran kecil dan warna teks (bukan warna aksen)

**Gerak**

- Durasi 150–250 ms, easing standar
- Hanya fade dan geser kecil (≤ 8 px). Tanpa bounce, tanpa parallax
- Dimatikan sepenuhnya jika `prefers-reduced-motion: reduce`

**Dilarang** (ciri khas UI generik buatan AI):

- Gradien di latar, teks, atau tombol
- Glassmorphism / `backdrop-blur` dekoratif
- Bayangan bercahaya (glow) atau bayangan tebal
- Palet ungu/biru/pink khas "AI startup"
- Blob, orb, partikel, atau pola latar dekoratif
- Emoji sebagai ikon, ikon "sparkles"/bintang ajaib
- Badge berkilau, teks berwarna pelangi, atau animasi yang terus bergerak
- Testimoni palsu, logo perusahaan palsu, dan statistik palsu ("10,000+ users"). Satu-satunya angka sosial adalah counter waitlist yang nyata
- Kalimat marketing klise seperti "Unlock your potential", "Revolutionize", "Supercharge", "Seamless", "Next-level"

**Mockup di Hero**

Mockup tampilan aplikasi dibuat sederhana: bingkai HP polos berisi daftar set latihan (nama exercise, beban × reps dalam font mono). Tanpa efek 3D, miring, atau bayangan dramatis.

---

## 15. Testing

### 15.1 Unit test (Vitest)

- `one-rep-max`: rumus Epley, kasus `reps = 1`, pembulatan 0.5 kg, tabel persentase
- `exercise-search`: case-insensitive, pencocokan alias, urutan prefix lebih dulu, batas 8 hasil, query kosong
- `history`: upsert berdasarkan nama, batas 20 entri, data rusak diabaikan, localStorage tidak tersedia
- `schemas`: kasus valid dan tidak valid untuk setiap skema
- `rate-limit`: pembuatan key dan hash (RPC di-mock)
- Route Handler waitlist dan feedback: status 201, 400, 409, 413, 415, 429 (Supabase di-mock)
- `requireAdmin`: 401, 403, dan lolos (Supabase di-mock)

### 15.2 CI

GitHub Actions di setiap push dan pull request: install, lint, typecheck, test.

### 15.3 Checklist manual sebelum rilis

- [ ] Waitlist: sukses, email duplikat, email tidak valid, honeypot terisi, rate limit tercapai
- [ ] Feedback: ketiga kategori, email opsional kosong dan terisi, rate limit tercapai
- [ ] Insert langsung ke REST API Supabase dengan anon key **ditolak**
- [ ] `/admin` tanpa login → redirect ke login
- [ ] Login dengan user non-admin → halaman 403
- [ ] `GET /api/admin/*` tanpa login → 401, dengan non-admin → 403
- [ ] Login gagal 6 kali → rate limited
- [ ] Combobox bisa dipakai penuh dengan keyboard
- [ ] Dark mode tanpa kedipan saat reload
- [ ] Lighthouse mobile ≥ 90 di keempat kategori
- [ ] Tampilan dicek di 360, 390, 768, 820, 1024, 1180, 1440 px (portrait dan landscape untuk HP/tablet), sesuai tabel perilaku di NFR2
- [ ] Semua fitur bisa dipakai dengan sentuhan; tidak ada auto-zoom saat mengetik di Safari iOS
- [ ] Tidak ada satu pun pola di daftar "Dilarang" NFR8

---

## 16. Tahapan Pengerjaan dan Acceptance Criteria

Setiap fase diakhiri dengan berhenti untuk review sebelum lanjut ke fase berikutnya.

| Fase | Isi | Selesai jika |
|---|---|---|
| **0. Setup** | Next.js + TypeScript + Tailwind + ESLint/Prettier + Vitest + CI, deploy kosong ke Vercel | Halaman kosong live di Vercel, CI hijau |
| **1. Layout statis** | Design token (warna, font, spacing sesuai NFR8), lalu Navbar, Hero (tanpa counter), Features, How It Works, Comparison, FAQ (statis), Footer | Semua section tampil sesuai tabel perilaku NFR2 di HP, tablet, dan desktop; tidak melanggar daftar "Dilarang" NFR8 |
| **2. Kalkulator** | FR5, FR6, FR7 + unit test | Kalkulator, combobox, dan riwayat berfungsi sesuai spesifikasi; test lolos |
| **3. Interaksi client** | FR9 (accordion), FR12 (dark mode), animasi scroll | Accordion aksesibel, dark mode tanpa kedipan, reduced motion dihormati |
| **4. Database** | Migrasi bagian 10, `lib/supabase/*`, `.env.example` | Migrasi jalan di Supabase; insert langsung dengan anon key ditolak |
| **5. Waitlist** | Skema Zod, rate limit, `POST /api/waitlist`, form, counter (FR11) | Semua status di 9.2 tertangani di API dan UI; test lolos |
| **6. Feedback** | `POST /api/feedback`, modal (FR10) | Semua status tertangani; perilaku modal sesuai FR10; test lolos |
| **7. Admin** | FR13–FR16, README setup admin | Checklist admin di 15.3 lolos |
| **8. Polishing** | Security headers, Lighthouse, README lengkap | Seluruh checklist 15.3 lolos |

---

## 17. README (isi minimal)

- Deskripsi singkat proyek dan screenshot
- Tech stack
- Diagram arsitektur (bagian 4) dan penjelasan keputusan keamanan
- Cara menjalankan lokal
- Setup Supabase (migrasi + admin)
- Environment variables
- Skor Lighthouse
- Link demo
