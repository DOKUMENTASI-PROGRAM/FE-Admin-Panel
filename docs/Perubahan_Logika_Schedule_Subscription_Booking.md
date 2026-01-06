# Dokumen Perubahan Logika Schedule: Sistem Booking Subscription/Permanen

## 📋 Ringkasan Eksekutif

Dokumen ini menjelaskan perubahan dari sistem **Date-Range Scheduling** ke sistem **Subscription/Permanent Booking**. Dalam sistem baru, ketika pendaftar memilih jadwal (hari + sesi + ruang), slot tersebut akan menjadi milik pendaftar secara permanen untuk semua minggu selanjutnya.

---

## 🔄 Perbandingan Sistem Lama vs Baru

### Sistem Lama (Date-Range Based)

```json
// Request Body Lama
{
  "course_id": "uuid",
  "instructor_id": "uuid",
  "room_id": "uuid",
  "start_date": "2025-12-24", // ❌ DIHAPUS
  "end_date": "2025-12-30", // ❌ DIHAPUS
  "max_students": 1,
  "schedule": [
    {
      "day_of_week": "monday",
      "start_time": "09:00",
      "end_time": "10:00",
      "duration": 60
    }
  ]
}
```

**Karakteristik Sistem Lama:**

- Schedule di-generate untuk tanggal spesifik dalam date range
- `start_time` dan `end_time` berupa timestamp lengkap (`2025-12-24T09:00:00Z`)
- Pendaftar booking jadwal untuk periode tertentu saja
- Jadwal yang sama bisa dibooking oleh pendaftar berbeda di tanggal berbeda

### Sistem Baru (Subscription/Permanent)

```json
// Request Body Baru
{
  "course_id": "uuid",
  "instructor_id": "uuid",
  "room_id": "uuid",
  "max_students": 1, // ✅ TETAP - jumlah maks pendaftar per slot
  "schedule": [
    {
      "day_of_week": "monday",
      "start_time": "09:00",
      "end_time": "10:00",
      "duration": 60
    }
  ]
}
```

**Karakteristik Sistem Baru:**

- Schedule adalah template mingguan (bukan tanggal spesifik)
- `start_time` dan `end_time` berupa waktu saja (TIME), bukan timestamp
- Pendaftar "memiliki" slot secara permanen setiap minggu
- `max_students` menentukan kapasitas maksimal slot tersebut

---

## 📊 Perubahan Database Schema

### Tabel `class_schedules` - Kolom Baru/Modifikasi

| Kolom          | Tipe Lama     | Tipe Baru     | Keterangan                                 |
| -------------- | ------------- | ------------- | ------------------------------------------ |
| `start_time`   | `TIMESTAMPTZ` | `TIME`        | Hanya waktu, tanpa tanggal                 |
| `end_time`     | `TIMESTAMPTZ` | `TIME`        | Hanya waktu, tanpa tanggal                 |
| `day_of_week`  | - (tidak ada) | `VARCHAR(10)` | Hari dalam seminggu (monday, tuesday, dll) |
| `max_students` | - (tidak ada) | `INTEGER`     | Kapasitas maksimal pendaftar per slot      |

### Kolom yang Tetap

| Kolom           | Tipe          | Keterangan                            |
| --------------- | ------------- | ------------------------------------- |
| `id`            | `UUID`        | Primary key                           |
| `course_id`     | `UUID`        | FK ke courses                         |
| `instructor_id` | `UUID`        | FK ke instructor_profiles             |
| `room_id`       | `UUID`        | FK ke rooms                           |
| `booking_id`    | `UUID`        | FK ke bookings (untuk single booking) |
| `created_at`    | `TIMESTAMPTZ` | Timestamp pembuatan                   |
| `updated_at`    | `TIMESTAMPTZ` | Timestamp update                      |

### Tabel Baru: `schedule_enrollments`

Tabel ini menghubungkan schedule dengan multiple bookings (untuk `max_students > 1`).

| Kolom         | Tipe          | Keterangan                        |
| ------------- | ------------- | --------------------------------- |
| `id`          | `UUID`        | Primary key                       |
| `schedule_id` | `UUID`        | FK ke class_schedules             |
| `booking_id`  | `UUID`        | FK ke bookings                    |
| `enrolled_at` | `TIMESTAMPTZ` | Kapan pendaftar masuk ke slot ini |
| `status`      | `VARCHAR(20)` | 'active', 'cancelled'             |

---

## 🔧 Perubahan API Endpoints

### 1. `POST /api/admin/schedules` - Create Schedule

**Request Body Lama:**

```json
{
   "course_id": "uuid",
   "instructor_id": "uuid",
   "room_id": "uuid",
   "start_date": "2025-12-24",
   "end_date": "2025-12-30",
   "max_students": 1,
   "schedule": [...]
}
```

**Request Body Baru:**

```json
{
  "course_id": "uuid",
  "instructor_id": "uuid",
  "room_id": "uuid",
  "max_students": 1,
  "schedule": [
    {
      "day_of_week": "monday",
      "start_time": "09:00",
      "end_time": "10:00",
      "duration": 60
    }
  ]
}
```

**Perubahan:**

- `start_date` dan `end_date` **DIHAPUS**
- Validasi baru: tidak boleh ada schedule dengan kombinasi (day_of_week + start_time + end_time + room_id) yang sama

---

### 2. `GET /api/booking/availability/find-slots` - Find Available Slots

Request dengan include_all=true
GET /api/booking/availability/find-slots?include_all=true
GET /api/booking/availability/find-slots?include_all=true&course_id=xxx
GET /api/booking/availability/find-slots?include_all=true&instructor_id=xxx

**Response Baru:**

```json
{
  "success": true,
  "data": {
    "slots": [
      {
        "schedule_id": "02dfdf34-ef97-4989-9b49-92a42d1f6cb9",
        "instructor_id": "6e01bbc4-8582-48b6-beb6-0adbb81daa44",
        "instructor_name": "John Doe",
        "room_id": "79abf668-62d0-4779-aa2a-e96530e18983",
        "room_name": "Studio D",
        "course_id": "5a00426e-3849-4410-8e21-afe455e9d450",
        "day_of_week": "monday",
        "start_time": "09:00:00",
        "end_time": "10:00:00",
        "max_students": 1,
        "current_enrollments": 0,
        "pending_count": 0,
        "confirmed_count": 0,
        "available_capacity": 1,
        "is_available": true,
        "status": "available"
      },
      {
        "schedule_id": "13f6d519-8390-49c9-b909-44f2b04e35fa",
        "instructor_id": "6e01bbc4-8582-48b6-beb6-0adbb81daa44",
        "instructor_name": "John Doe",
        "room_id": "79abf668-62d0-4779-aa2a-e96530e18983",
        "room_name": "Studio D",
        "course_id": "5a00426e-3849-4410-8e21-afe455e9d450",
        "day_of_week": "wednesday",
        "start_time": "09:00:00",
        "end_time": "10:00:00",
        "max_students": 1,
        "current_enrollments": 1,
        "pending_count": 1,
        "confirmed_count": 0,
        "available_capacity": 0,
        "is_available": false,
        "status": "pending"
      },
      {
        "schedule_id": "abc12345-...",
        "day_of_week": "friday",
        "start_time": "14:00:00",
        "end_time": "15:00:00",
        "max_students": 1,
        "current_enrollments": 1,
        "pending_count": 0,
        "confirmed_count": 1,
        "available_capacity": 0,
        "is_available": false,
        "status": "occupied"
      }
    ]
  },
  "meta": {
    "count": 3,
    "available_count": 1,
    "pending_count": 1,
    "occupied_count": 1,
    "total_schedules": 3,
    "include_all": true,
    "timestamp": "2025-12-24T09:41:49.000Z"
  }
}
```

**Perubahan:**

- Menambahkan `max_students`, `current_enrollments`, `available_capacity`
- Format waktu berubah (tidak lagi pakai tanggal)
- `is_available` dikalkulasi dari `current_enrollments < max_students`

---

### 3. `POST /api/booking/admin/bookings/:id/assign-slot` - Assign Slot

**Validasi Baru:**

1. Cek apakah schedule masih ada kapasitas (`current_enrollments < max_students`)
2. Cek apakah booking ini sudah punya slot yang sama
3. Jika sukses, buat entry di `schedule_enrollments`

**Logic Perubahan:**

```typescript
// Sebelum
// Cek: scheduleSlot.booking_id !== null → slot sudah dipakai

// Sesudah
// Cek: COUNT schedule_enrollments WHERE schedule_id = X
//      AND status IN ('confirmed', 'pending') >= max_students
//      → slot penuh
```

---

## 🎯 Validasi Logika Baru

### Saat Membuat Schedule

1. **Unique Constraint**: Kombinasi (day_of_week + start_time + end_time + instructor_id + room_id) harus unik
2. **Conflict Check**:
   - Instructor tidak boleh punya schedule overlap di hari yang sama
   - Room tidak boleh punya schedule overlap di hari yang sama

### Saat Booking Schedule

1. **Capacity Check**:

   ```sql
   SELECT COUNT(*) FROM schedule_enrollments se
   JOIN bookings b ON se.booking_id = b.id
   WHERE se.schedule_id = :schedule_id
   AND se.status = 'active'
   AND b.status IN ('pending', 'confirmed')
   ```

   - Jika count >= max_students → TOLAK booking

2. **Duplicate Check**:
   - Pendaftar tidak bisa booking slot yang sama dua kali

### Saat Membatalkan Booking

1. Update `schedule_enrollments.status` = 'cancelled'
2. Slot menjadi tersedia untuk pendaftar lain

---

## 📁 File yang Harus Diubah

### Backend - Admin Service

| File                                       | Perubahan                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `admin/src/controllers/adminController.ts` | Ubah `createSchedule()` - hapus logika date range, tambah max_students |
| `admin/src/controllers/adminController.ts` | Ubah `updateSchedule()` - sesuaikan dengan schema baru                 |
| `admin/src/controllers/adminController.ts` | Ubah `getSchedules()` - format response baru                           |

### Backend - Booking Service

| File                                           | Perubahan                                                |
| ---------------------------------------------- | -------------------------------------------------------- |
| `booking/src/controllers/bookingController.ts` | Ubah `assignSlot()` - validasi capacity, buat enrollment |
| `booking/src/controllers/bookingController.ts` | Ubah `findAvailableSlots()` - return capacity info       |
| `booking/src/controllers/bookingController.ts` | Ubah `cancelBooking()` - release enrollment              |

### Database - Migrations

| File                                                           | Perubahan            |
| -------------------------------------------------------------- | -------------------- |
| `supabase/migrations/YYYYMMDD_subscription_booking_schema.sql` | DDL perubahan schema |

---

## 🔍 Contoh Flow Booking Baru

### Skenario: Schedule dengan max_students = 2

1. **Admin membuat schedule:**

   - Senin 09:00-10:00, Room A, Instructor A, max_students=2

2. **Pendaftar A booking slot ini:**

   - Cek: current_enrollments (0) < max_students (2) ✅
   - Insert ke schedule_enrollments
   - current_enrollments sekarang = 1

3. **Pendaftar B booking slot yang sama:**

   - Cek: current_enrollments (1) < max_students (2) ✅
   - Insert ke schedule_enrollments
   - current_enrollments sekarang = 2

4. **Pendaftar C mencoba booking slot yang sama:**

   - Cek: current_enrollments (2) < max_students (2) ❌
   - TOLAK booking dengan error: "Slot ini sudah penuh"

5. **Pendaftar A membatalkan booking:**
   - Update schedule_enrollments.status = 'cancelled'
   - current_enrollments sekarang = 1
   - Slot tersedia lagi untuk 1 pendaftar

---

## ⚠️ Breaking Changes

1. **API Contract Change**: Request body `createSchedule` berubah (hilang start_date, end_date)
2. **Response Format Change**: `findAvailableSlots` mengembalikan format berbeda
3. **Database Schema Change**: Tipe data kolom berubah, tabel baru ditambahkan
4. **Frontend Impact**: Form pembuatan jadwal harus diubah

---

## ✅ Checklist Implementasi

- [ ] Buat migration SQL untuk perubahan schema
- [ ] Update `createSchedule()` di admin controller
- [ ] Update `updateSchedule()` di admin controller
- [ ] Update `getSchedules()` di admin controller
- [ ] Update `findAvailableSlots()` di booking controller
- [ ] Update `assignSlot()` di booking controller
- [ ] Update `cancelBooking()` untuk release slot
- [ ] Tambah validasi capacity di booking flow
- [ ] Update integration tests
- [ ] Update API documentation
- [ ] Koordinasi dengan tim Frontend untuk perubahan form

---

_Dokumen dibuat: 2025-12-24_
_Versi: 1.0_
