# Panduan Implementasi Auth Frontend (Supabase Migration)

Dokumen ini berisi panduan teknis untuk implementasi autentikasi di sisi Frontend (Web/Mobile) yang telah dimigrasi ke **Supabase Native Auth**.

## 1. Overview Perubahan

- **Provider**: Firebase Auth digantikan sepenuhnya oleh **Supabase Auth**.
- **Registrasi**: Dilakukan **langsung di sisi Client** menggunakan Supabase SDK.
- **Login**: Dilakukan melalui **Backend API** (`/api/auth/login`) yang memproxy ke Supabase dan melakukan validasi tambahan (seperti update `last_login_at`).
- **Token**: Menggunakan **Supabase JWT** (Access Token).
- **Session**: Session harus sinkron antara Local Storage (untuk API calls) dan Supabase Client (untuk fitur RLS/Realtime).

---

## 2. Setup & Instalasi

Pastikan library client Supabase sudah terinstall.

```bash
npm install @supabase/supabase-js
```

Inisialisasi Client Supabase (biasanya di `lib/supabase.ts` atau `utils/supabase.js`):

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "YOUR_SUPABASE_URL";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 3. Alur Registrasi (Register)

**Metode:** Client-Side SDK  
**Endpoint Backend:** _Dinonaktifkan / Tidak digunakan untuk student._

Frontend langsung memanggil Supabase untuk mendaftarkan user baru. Trigger database akan otomatis membuat profil user di tabel `public.users`.

```typescript
import { supabase } from "./lib/supabase";

async function handleRegister(email, password, fullName, phoneNumber) {
  // 1. Sign Up ke Supabase
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone_number: phoneNumber,
        role: "student", // Metadata ini opsional, tapi berguna
      },
    },
  });

  if (error) {
    console.error("Registration Error:", error.message);
    throw error;
  }

  // 2. (Opsional) Tampilkan pesan sukses / minta verifikasi email
  if (data.user && !data.session) {
    return "Please check your email for verification link.";
  }

  return "Registration successful!";
}
```

---

## 4. Alur Login (Sign In)

**Metode:** Backend API  
**Endpoint:** `POST /api/auth/login`

Meskipun bisa login via SDK, disarankan menggunakan Endpoint Backend untuk memastikan konsistensi data (seperti `last_login_at`) dan validasi role server-side.

```typescript
async function handleLogin(email, password) {
  try {
    // 1. Call Backend API
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error.message);
    }

    const { accessToken, refreshToken, user } = result.data;

    // 2. Simpan Token (Local Storage / Cookie)
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem("user_data", JSON.stringify(user));

    // 3. SINKRONISASI Session ke Supabase Client (PENTING!)
    // Ini memastikan Supabase Client 'sadar' bahwa user sudah login,
    // sehingga fitur seperti RLS, Storage, dll berfungsi.
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    return user;
  } catch (error) {
    console.error("Login Failed:", error);
    throw error;
  }
}
```

---

## 5. Token Management & Request Terproteksi

Setiap request ke endpoint terproteksi **harus** menyertakan header `Authorization`.

```typescript
function getAuthHeader() {
  const token = localStorage.getItem("access_token");
  // ATAU ambil dari session supabase terkini:
  // const { data } = await supabase.auth.getSession();
  // const token = data.session?.access_token;

  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Contoh Request
async function fetchUserProfile() {
  const headers = getAuthHeader();
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
  // ...
}
```

### Auto-Refresh Token

Supabase Client (`@supabase/supabase-js`) memiliki fitur _Auto Refresh_.
Jika Anda telah melakukan `supabase.auth.setSession()` saat login, client akan otomatis memperbarui token di background.

Disarankan untuk membuat listener `onAuthStateChange` untuk memperbarui token di Local Storage agar tetap sinkron dengan Backend API:

```typescript
// Di root aplikasi (misal: App.tsx atau AuthProvider)
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
    if (session) {
      localStorage.setItem("access_token", session.access_token);
      localStorage.setItem("refresh_token", session.refresh_token);
    }
  } else if (event === "SIGNED_OUT") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_data");
  }
});
```

---

## 6. Alur Logout

**Metode:** Backend API + Client Cleanup  
**Endpoint:** `POST /api/auth/logout`

```typescript
async function handleLogout() {
  try {
    const headers = getAuthHeader();

    // 1. Call Backend Logout (Optional but recommended for server-side logging)
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { ...headers },
    });
  } catch (err) {
    console.warn("Backend logout failed, proceeding with client cleanup");
  } finally {
    // 2. Cleanup Supabase Client Session
    await supabase.auth.signOut();

    // 3. Cleanup Local Storage (Handled by onAuthStateChange if implemented, otherwise forces clear)
    localStorage.clear();

    // 4. Redirect to Login
    window.location.href = "/login";
  }
}
```

## Ringkasan Perbedaan Utama (vs Lama)

| Fitur             | Implementasi Lama (Firebase)       | Implementasi Baru (Supabase)              |
| :---------------- | :--------------------------------- | :---------------------------------------- |
| **Register**      | Backend API (`/api/auth/register`) | **Frontend SDK** (`supabase.auth.signUp`) |
| **Login**         | Backend API                        | Backend API + **Sync Session**            |
| **Token Payload** | Firebase Token                     | **Supabase JWT**                          |
| **User ID**       | Firebase UID                       | **UUID** (v4)                             |
