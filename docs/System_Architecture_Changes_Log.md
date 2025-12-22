# Ringkasan Perubahan Sistem (Khusus Frontend)

**Tanggal:** 21 Desember 2025  
**Tujuan:** Panduan migrasi teknologi untuk Tim Frontend.

Dokumen ini merangkum perubahan arsitektur backend yang berdampak langsung pada implementasi Frontend.

---

## 1. Authentication: Firebase → Supabase Auth

**Perubahan:**

- **Provider:** Pindah sepenuhnya ke **Supabase Native Auth**.
- **User ID:** Berubah dari Firebase UID (String random) menjadi **UUID v4** standard.

**Dampak ke Frontend:**

1.  **Register (Perubahan Besar):**
    - **DULU:** Hit API Backend `/api/auth/register`.
    - **SEKARANG:** Panggil langsung **Supabase SDK** (`supabase.auth.signUp`).
    - _Backend tidak lagi menangani registrasi user (student)._
2.  **Login:**
    - Tetap hit API Backend `/api/auth/login`.
    - **PENTING:** Setelah login sukses dan dapat token, Frontend **WAJIB** melakukan sync session ke Supabase Client agar fitur Realtime jalan:
      ```javascript
      await supabase.auth.setSession({ access_token, refresh_token });
      ```

---

## 2. Realtime Updates: WebSocket → Supabase Realtime

**Perubahan:**

- **Teknologi:** Custom WebSocket / Socket.io dihapus. Digantikan oleh **Supabase Realtime**.

**Dampak ke Frontend:**

1.  **Hapus Library:** Uninstall `socket.io-client` atau library WebSocket lama lainnya.
2.  **Subscribe Changes:** Gunakan Supabase Client untuk mendengarkan perubahan data.
    - Contoh: Mendengarkan status booking yang berubah.
    ```javascript
    supabase
      .channel("bookings")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          console.log("Status updated:", payload.new.status);
        }
      )
      .subscribe();
    ```
3.  **Tidak Perlu Koneksi Manual:** Koneksi dihandle otomatis oleh `supabase-js`.

---

## 3. Messaging: Kafka → RabbitMQ (Backend Internal)

**Perubahan:**

- Backend mengganti Kafka dengan RabbitMQ untuk pemrosesan data di background (misal: kirim email notifikasi).

**Dampak ke Frontend:**

- **Tidak ada action code yang diperlukan.**
- Perubahan ini transparan bagi Frontend.
- Namun, expect performa notifikasi (email/WA) yang lebih stabil dan cepat setelah user melakukan booking.

---

## 4. Ringkasan Action Items (To-Do List Frontend)

1.  [ ] **Install** `@supabase/supabase-js`.
2.  [ ] **Uninstall** `firebase`, `firebase-admin`, `socket.io-client`.
3.  [ ] **Ganti Flow Register:** Gunakan `supabase.auth.signUp()`.
4.  [ ] **Update Flow Login:** Tambahkan langkah `supabase.auth.setSession()` setelah menerima response dari API.
5.  [ ] **Ganti Fitur Realtime:** Ubah logic `socket.on()` menjadi `supabase.channel().on()`.
6.  [ ] **Update Type Definitions:** Pastikan semua ID user/booking diperlakukan sebagai UUID, bukan string arbitrer.

---

_Lihat detail implementasi teknis di `FE_Auth_Implementation_Guide.md`._
