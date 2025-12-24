# Panduan Implementasi Refresh Token untuk Frontend (Supabase)

Dokumen ini berisi penjelasan lengkap mengenai bagaimana Frontend (Web/Mobile) harus mengatur dan menangani **Refresh Token** dari Supabase Auth untuk memastikan sesi pengguna tetap aktif dan aman.

---

## 1. Konsep Dasar: Session dan Token

Supabase Auth menggunakan dua jenis token untuk mengelola sesi pengguna:

### 1.1 Access Token (JWT)

- **Jenis**: JSON Web Token (JWT)
- **Masa Berlaku**: Sangat singkat, biasanya 1 jam (default Supabase)
- **Fungsi**: Digunakan untuk mengautentikasi setiap request ke API
- **Format**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

Access token disertakan dalam header `Authorization` setiap request:

```http
Authorization: Bearer <access_token>
```

### 1.2 Refresh Token

- **Jenis**: String unik (bukan JWT)
- **Masa Berlaku**: Tidak kedaluwarsa, TETAPI hanya bisa digunakan **SATU KALI**
- **Fungsi**: Digunakan untuk mendapatkan Access Token baru setelah Access Token lama kedaluwarsa
- **Format**: String random, contoh: `abc123xyz789...`

> **PENTING**: Setiap kali refresh token digunakan, Supabase akan memberikan refresh token **baru**. Refresh token lama tidak bisa digunakan lagi (one-time use).

---

## 2. Alur Refresh Token

Berikut adalah alur bagaimana refresh token bekerja:

```
┌─────────────────────────────────────────────────────────────────┐
│                          ALUR REFRESH TOKEN                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User Login                                                   │
│     │                                                            │
│     ▼                                                            │
│  [Backend API /api/auth/login]                                   │
│     │                                                            │
│     ├── access_token (berlaku 1 jam)                             │
│     └── refresh_token (one-time use)                             │
│                                                                  │
│  2. User Melakukan Request ke API                                │
│     │                                                            │
│     ▼                                                            │
│  [API Request dengan header Authorization: Bearer <access_token>]│
│                                                                  │
│  3. Access Token Kedaluwarsa (setelah ~1 jam)                    │
│     │                                                            │
│     ▼                                                            │
│  [Supabase Client Otomatis Refresh di Background]                │
│     │                                                            │
│     ├── access_token BARU                                        │
│     └── refresh_token BARU                                       │
│                                                                  │
│  4. Event "TOKEN_REFRESHED" Di-trigger                           │
│     │                                                            │
│     ▼                                                            │
│  [Update localStorage dengan token baru]                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Sinkronisasi Session dengan Supabase Client

Agar fitur auto-refresh bekerja, session dari backend **HARUS** disinkronkan ke Supabase Client menggunakan `setSession()`.

### 3.1 Saat Login

Setelah menerima token dari backend, sinkronkan ke Supabase Client:

```typescript
import { supabase } from "./lib/supabase";

async function handleLogin(email: string, password: string) {
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

  // 2. Simpan Token ke Local Storage
  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("refresh_token", refreshToken);
  localStorage.setItem("user_data", JSON.stringify(user));

  // 3. SINKRONISASI ke Supabase Client (WAJIB!)
  // Ini mengaktifkan fitur auto-refresh
  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return user;
}
```

> **PERINGATAN**: Tanpa langkah `setSession()`, Supabase Client tidak akan mengetahui bahwa user sudah login dan fitur auto-refresh **TIDAK AKAN BEKERJA**.

---

## 4. Mengaktifkan Auto-Refresh Token

### 4.1 Auto-Refresh di Web Browser

Untuk aplikasi web yang berjalan di browser, Supabase Client **secara otomatis** melakukan refresh ketika:

- Access token hampir kedaluwarsa (biasanya 30 detik sebelum expired)
- Tab browser aktif dan aplikasi sedang berjalan
- Session telah diset dengan `setSession()` atau login via SDK

Auto-refresh berjalan otomatis di background **tanpa konfigurasi tambahan**.

### 4.2 Auto-Refresh di React Native / Mobile

Untuk aplikasi mobile, auto-refresh harus dikontrol secara manual berdasarkan state aplikasi:

```typescript
import { AppState } from "react-native";
import { supabase } from "./lib/supabase";

// Daftarkan listener HANYA SATU KALI saat aplikasi start
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    // Aplikasi dibuka / di-foreground
    supabase.auth.startAutoRefresh();
  } else {
    // Aplikasi di-background atau ditutup
    supabase.auth.stopAutoRefresh();
  }
});
```

**Penjelasan:**

- `startAutoRefresh()`: Mengaktifkan timer untuk refresh token secara berkala
- `stopAutoRefresh()`: Menghentikan timer untuk menghemat resource saat aplikasi di background

---

## 5. Mendengarkan Perubahan Session (onAuthStateChange)

Untuk memastikan token di Local Storage selalu terbaru, gunakan listener `onAuthStateChange`:

### 5.1 Setup Listener di Root Aplikasi

Letakkan kode ini di root aplikasi (misalnya `App.tsx`, `main.tsx`, atau `AuthProvider.tsx`):

```typescript
import { supabase } from "./lib/supabase";

// Jalankan di root aplikasi
supabase.auth.onAuthStateChange((event, session) => {
  console.log("Auth Event:", event);

  switch (event) {
    case "SIGNED_IN":
      // User baru saja login
      if (session) {
        localStorage.setItem("access_token", session.access_token);
        localStorage.setItem("refresh_token", session.refresh_token);
      }
      break;

    case "TOKEN_REFRESHED":
      // Token sudah di-refresh secara otomatis
      if (session) {
        console.log("Token refreshed successfully!");
        localStorage.setItem("access_token", session.access_token);
        localStorage.setItem("refresh_token", session.refresh_token);
      }
      break;

    case "SIGNED_OUT":
      // User logout
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_data");
      break;

    case "USER_UPDATED":
      // Data user diperbarui
      if (session) {
        localStorage.setItem("access_token", session.access_token);
      }
      break;
  }
});
```

### 5.2 Daftar Event yang Bisa Ditangani

| Event               | Kapan Terjadi                                     |
| :------------------ | :------------------------------------------------ |
| `SIGNED_IN`         | User berhasil login                               |
| `SIGNED_OUT`        | User logout atau session dihapus                  |
| `TOKEN_REFRESHED`   | Access token di-refresh menggunakan refresh token |
| `USER_UPDATED`      | Data user diperbarui (misal: password changed)    |
| `PASSWORD_RECOVERY` | User mengklik link reset password                 |

---

## 6. Mengambil Session Terkini

Untuk mendapatkan session dan token terkini, gunakan `getSession()`:

```typescript
async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Error getting session:", error.message);
    return null;
  }

  if (!data.session) {
    console.log("No active session");
    return null;
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: data.session.user,
    expiresAt: data.session.expires_at, // Unix timestamp
  };
}
```

---

## 7. Menangani Token di HTTP Request

### 7.1 Mengambil Token untuk Request

```typescript
async function getAuthHeader() {
  // Opsi 1: Dari Supabase Client (Recommended - selalu fresh)
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  // Opsi 2: Dari Local Storage (Backup)
  // const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error("User not authenticated");
  }

  return { Authorization: `Bearer ${token}` };
}
```

### 7.2 Menggunakan dalam Fetch Request

```typescript
async function fetchProtectedData() {
  const headers = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/protected-endpoint`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  if (response.status === 401) {
    // Token expired dan gagal di-refresh
    // Redirect ke halaman login
    window.location.href = "/login";
    return;
  }

  return response.json();
}
```

---

## 8. Inisialisasi Session saat Aplikasi Start

Saat aplikasi pertama kali diload (page refresh), perlu dilakukan inisialisasi session:

```typescript
// Di root aplikasi (App.tsx atau AuthProvider.tsx)
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

function AuthProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 1. Cek session yang sudah ada
    async function initializeAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // Session valid, update state
        setUser(session.user);
        localStorage.setItem("access_token", session.access_token);
        localStorage.setItem("refresh_token", session.refresh_token);
      } else {
        // Coba restore dari localStorage jika ada
        const storedAccess = localStorage.getItem("access_token");
        const storedRefresh = localStorage.getItem("refresh_token");

        if (storedAccess && storedRefresh) {
          // Coba set session dari stored tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: storedAccess,
            refresh_token: storedRefresh,
          });

          if (data.session) {
            setUser(data.session.user);
          } else {
            // Token tidak valid, clear storage
            localStorage.clear();
          }
        }
      }

      setIsLoading(false);
    }

    initializeAuth();

    // 2. Setup listener untuk perubahan auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        localStorage.setItem("access_token", session.access_token);
        localStorage.setItem("refresh_token", session.refresh_token);
      } else {
        setUser(null);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_data");
      }
    });

    // Cleanup subscription saat unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return children;
}
```

---

## 9. Penanganan Session Expired

### 9.1 Kapan Session Dianggap Expired

Session dianggap expired ketika:

1. Access token kedaluwarsa DAN refresh token gagal digunakan
2. User melakukan logout dari device lain (jika fitur single session aktif)
3. Admin merevoke session dari dashboard
4. Refresh token sudah pernah digunakan sebelumnya (replay attack protection)

### 9.2 Mendeteksi Session Expired

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT" && !session) {
    // Session expired atau user logout
    // Redirect ke login page
    window.location.href = "/login";
  }
});
```

### 9.3 Handling Error 401 pada API Request

```typescript
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers = await getAuthHeader();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Token tidak valid
    // Coba refresh manual
    const { data, error } = await supabase.auth.refreshSession();

    if (error || !data.session) {
      // Refresh gagal, redirect ke login
      await supabase.auth.signOut();
      window.location.href = "/login";
      throw new Error("Session expired. Please login again.");
    }

    // Retry request dengan token baru
    const newHeaders = { Authorization: `Bearer ${data.session.access_token}` };
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...newHeaders,
        ...options.headers,
      },
    });
  }

  return response;
}
```

---

## 10. Best Practices

### ✅ Yang Harus Dilakukan

1. **Selalu sinkronkan session** dengan `setSession()` setelah login via backend
2. **Setup `onAuthStateChange` listener** di root aplikasi untuk menjaga token tetap sinkron
3. **Gunakan `getSession()`** untuk mengambil token terkini sebelum request
4. **Handle error 401** dengan baik dan redirect ke login jika diperlukan
5. **Untuk mobile apps**, gunakan `startAutoRefresh()` dan `stopAutoRefresh()` sesuai app state

### ❌ Yang Harus Dihindari

1. **Jangan menyimpan refresh token** di tempat yang tidak aman (misal: URL parameter)
2. **Jangan menggunakan refresh token** yang sama lebih dari sekali
3. **Jangan lupa cleanup** subscription `onAuthStateChange` saat component unmount
4. **Jangan hardcode token** - selalu ambil dari session terkini

---

## 11. Contoh Implementasi Lengkap: AuthService

Berikut contoh implementasi lengkap AuthService untuk mengelola refresh token:

```typescript
// services/AuthService.ts
import { supabase } from "../lib/supabase";

class AuthService {
  private static instance: AuthService;
  private initialized = false;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async initialize() {
    if (this.initialized) return;

    // Setup auth state listener
    supabase.auth.onAuthStateChange((event, session) => {
      this.handleAuthChange(event, session);
    });

    // Check existing session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      this.updateLocalStorage(session);
    }

    this.initialized = true;
  }

  private handleAuthChange(event: string, session: any) {
    console.log(`[AuthService] Event: ${event}`);

    if (session) {
      this.updateLocalStorage(session);
    } else if (event === "SIGNED_OUT") {
      this.clearLocalStorage();
    }
  }

  private updateLocalStorage(session: any) {
    localStorage.setItem("access_token", session.access_token);
    localStorage.setItem("refresh_token", session.refresh_token);
    localStorage.setItem("user_data", JSON.stringify(session.user));
  }

  private clearLocalStorage() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_data");
  }

  async getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  }

  async logout() {
    await supabase.auth.signOut();
    this.clearLocalStorage();
  }
}

export const authService = AuthService.getInstance();
```

---

## 12. Referensi

- [Supabase Auth Sessions Documentation](https://supabase.com/docs/guides/auth/sessions)
- [Supabase JavaScript Client - Auth](https://supabase.com/docs/reference/javascript/auth-api)
- [Panduan Implementasi Auth Frontend (FE_Auth_Implementation_Guide.md)](./FE_Auth_Implementation_Guide.md)

---

**Terakhir diperbarui**: Desember 2024
