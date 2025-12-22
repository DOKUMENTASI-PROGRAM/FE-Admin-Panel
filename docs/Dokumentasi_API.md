# Dokumentasi API - FutureGuide Backend

**Versi:** 1.0.2  
**Terakhir Diperbarui:** 21 Desember 2025  
**Base URL:** `https://api.futureguide.id` atau `http://localhost:3000` (development)

---

## Daftar Isi

1. [Auth Service](#1-auth-service)
2. [Booking Service](#2-booking-service)
3. [Course Service](#3-course-service)
4. [Admin Service](#4-admin-service)
5. [Recommendation Service](#5-recommendation-service)
6. [Notification Service](#6-notification-service)
7. [API Gateway Aggregation](#7-api-gateway-aggregation)

---

## Autentikasi

Semua endpoint yang terproteksi memerlukan header Authorization:

```
Authorization: Bearer <access_token>
```

Token diperoleh dari endpoint login. Gunakan Supabase JWT untuk autentikasi.

---

## Format Response

Semua response mengikuti format standar:

```json
{
  "success": true|false,
  "data": { ... },
  "meta": {
    "timestamp": "2025-12-20T12:00:00Z"
  },
  "error": {
    "code": "ERROR_CODE",
    "message": "Pesan error"
  }
}
```

---

## 1. Auth Service

Service untuk autentikasi dan manajemen user.

### 1.1 Register User (Removed)

**Endpoint `/api/auth/register` telah dinonaktifkan di API Gateway.**
Silakan gunakan Supabase Auth Client SDK (`supabase.auth.signUp()`) di sisi frontend untuk melakukan registrasi user baru (Role: Student).
Untuk pembuatan Admin, gunakan dashboard internal Supabase.

---

### 1.2 Login

**POST** `/api/auth/login`

Autentikasi user dengan email dan password.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

| Field    | Type   | Required | Keterangan     |
| -------- | ------ | -------- | -------------- |
| email    | string | Ya       | Email valid    |
| password | string | Ya       | Min 6 karakter |

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "v1.MjAyNC0xMi0y...",
    "user": {
      "id": "uuid-user-id",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "student",
      "phone_number": "081234567890",
      "avatar_url": null,
      "created_at": "2025-12-20T12:00:00Z",
      "last_login_at": "2025-12-20T12:00:00Z"
    }
  }
}
```

**Error Response (401):**

```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

---

### 1.3 Logout

**POST** `/api/auth/logout`

Logout user dan invalidate session. **Memerlukan autentikasi.**

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

### 1.4 Get Current User

**GET** `/api/auth/me`

Mendapatkan informasi user yang sedang login. **Memerlukan autentikasi.**

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid-user-id",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "student",
    "phone_number": "081234567890",
    "avatar_url": null,
    "created_at": "2025-12-20T12:00:00Z"
  }
}
```

---

### 1.5 Reset Password

**POST** `/api/auth/reset-password`

Mengirim email reset password (menggunakan Supabase Auth).

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "message": "If an account exists with this email, a password reset link has been sent."
  }
}
```

---

### 1.6 Refresh Token (Deprecated)

**POST** `/api/auth/refresh`

**Status:** Deprecated - Returns 410 Gone

---

## 2. Booking Service

Service untuk pendaftaran kursus dan manajemen booking.

### 2.1 Register Course

**POST** `/api/booking/register-course`

Mendaftarkan siswa baru untuk kursus. **Public endpoint.**

**Request Body:**

```json
{
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440000",
  "course_id": "uuid-course-id",
  "full_name": "John Doe",
  "email": "johndoe@example.com",
  "address": "Jl. Contoh No. 123",
  "birth_place": "Jakarta",
  "birth_date": "2010-05-15",
  "school": "SMP Negeri 1",
  "class": 8,
  "guardian_name": "Jane Doe",
  "guardian_wa_number": "+6281234567890",
  "experience_level": "beginner",
  "preferred_days": ["monday", "wednesday"],
  "preferred_time_range": {
    "start": "14:00",
    "end": "16:00"
  },
  "instrument_owned": true,
  "notes": "Sudah pernah belajar gitar dasar",
  "referral_source": "instagram",
  "first_choice_slot_id": "uuid-slot-1",
  "second_choice_slot_id": "uuid-slot-2",
  "payment_proof": "https://storage.example.com/proof.jpg",
  "captcha_token": "valid-captcha-token",
  "consent": true
}
```

| Field                 | Type    | Required | Keterangan                               |
| --------------------- | ------- | -------- | ---------------------------------------- |
| idempotency_key       | uuid    | Ya       | Unique UUID key untuk mencegah duplikasi |
| course_id             | uuid    | Ya       | ID kursus yang dipilih                   |
| full_name             | string  | Ya       | Nama lengkap siswa                       |
| email                 | string  | Ya       | Email siswa                              |
| address               | string  | Ya       | Alamat lengkap                           |
| birth_place           | string  | Ya       | Tempat lahir                             |
| birth_date            | string  | Ya       | Tanggal lahir (YYYY-MM-DD)               |
| school                | string  | Ya       | Nama sekolah                             |
| class                 | number  | Ya       | Kelas (1-12)                             |
| guardian_name         | string  | Ya       | Nama orang tua/wali                      |
| guardian_wa_number    | string  | Ya       | Nomor WA wali (Format: +62...)           |
| payment_proof         | string  | Ya       | URL bukti pembayaran                     |
| captcha_token         | string  | Ya       | Token Captcha                            |
| consent               | boolean | Ya       | Persetujuan (Must be true)               |
| experience_level      | enum    | Tidak    | `beginner`, `intermediate`, `advanced`   |
| preferred_days        | array   | Tidak    | Hari preferensi                          |
| preferred_time_range  | object  | Tidak    | Rentang waktu preferensi                 |
| instrument_owned      | boolean | Tidak    | Apakah punya instrumen                   |
| notes                 | string  | Tidak    | Catatan tambahan                         |
| referral_source       | string  | Tidak    | Sumber referensi                         |
| first_choice_slot_id  | uuid    | Tidak    | Pilihan jadwal pertama                   |
| second_choice_slot_id | uuid    | Tidak    | Pilihan jadwal kedua                     |
| start_date_target     | string  | Tidak    | Target tanggal mulai                     |

**Response Success (201):**

```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "uuid-booking-id",
      "user_id": null,
      "course_id": "uuid-course-id",
      "status": "pending",
      "applicant_full_name": "John Doe",
      "applicant_email": "johndoe@example.com",
      "created_at": "2025-12-20T12:00:00Z",
      "expires_at": "2025-12-23T12:00:00Z"
    }
  }
}
```

**Error Response (409):**

```json
{
  "success": false,
  "error": {
    "code": "PENDING_BOOKING_EXISTS",
    "message": "A pending booking already exists for this email and course"
  }
}
```

---

### 2.2 Get Available Instructors

**GET** `/api/booking/available-instructors`

Mendapatkan daftar instruktur yang tersedia. **Public endpoint.**

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "instructors": [
      {
        "id": "uuid-instructor-id",
        "name": "Ahmad Rizki",
        "specialization": "Guitar, Piano",
        "bio": "Pengajar berpengalaman 10 tahun",
        "email": "ahmad@example.com",
        "wa_number": "081234567890",
        "experience_years": 5,
        "rating": 4.5,
        "available_slots": 10
      }
    ]
  },
  "meta": {
    "count": 1,
    "timestamp": "2025-12-20T12:00:00Z"
  }
}
```

---

### 2.3 Validate Preferences

**POST** `/api/booking/validate-preferences`

Memvalidasi preferensi jadwal siswa. **Public endpoint.**

**Request Body:**

```json
{
  "preferred_days": ["monday", "wednesday"],
  "preferred_time_range": {
    "start": "14:00",
    "end": "16:00"
  },
  "experience_level": "beginner"
}
```

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "preferences": {
      "preferred_days": ["monday", "wednesday"],
      "preferred_time_range": {
        "start": "14:00",
        "end": "16:00"
      },
      "experience_level": "beginner"
    }
  }
}
```

---

### 2.4 Find Available Slots

**GET** `/api/booking/availability/find-slots`

Mencari slot jadwal yang tersedia. **Public endpoint.**

**Query Parameters:**
| Parameter | Type | Required | Keterangan |
|-----------|------|----------|------------|
| instructor_id | uuid | Tidak | Filter berdasarkan instruktur |
| date | string | Tidak | Filter berdasarkan tanggal (YYYY-MM-DD) |
| duration | number | Tidak | Durasi dalam menit |

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "slots": [
      {
        "schedule_id": "uuid-schedule-id",
        "instructor_id": "uuid-instructor-id",
        "room_id": "uuid-room-id",
        "room_name": "Ruang Piano 1",
        "date": "2025-12-21",
        "start_time": "14:00",
        "end_time": "15:00",
        "duration": 60
      }
    ]
  },
  "meta": {
    "count": 5,
    "timestamp": "2025-12-20T12:00:00Z"
  }
}
```

---

### 2.5 Get All Bookings

**GET** `/api/booking/bookings`

Mendapatkan semua booking. **Memerlukan autentikasi (Admin only).**

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "uuid-booking-id",
        "user_id": "uuid-user-id",
        "course_id": "uuid-course-id",
        "status": "pending",
        "applicant_full_name": "John Doe",
        "applicant_email": "johndoe@example.com",
        "created_at": "2025-12-20T12:00:00Z",
        "courses": {
          "id": "uuid-course-id",
          "title": "Kursus Gitar Dasar",
          "description": "..."
        }
      }
    ]
  },
  "meta": {
    "count": 10,
    "timestamp": "2025-12-20T12:00:00Z"
  }
}
```

---

### 2.6 Get Booking by ID

**GET** `/api/booking/bookings/:id`

Mendapatkan detail booking berdasarkan ID. **Memerlukan autentikasi.**

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "uuid-booking-id",
      "user_id": "uuid-user-id",
      "course_id": "uuid-course-id",
      "status": "pending",
      "applicant_full_name": "John Doe",
      "applicant_email": "johndoe@example.com",
      "courses": {
        "id": "uuid-course-id",
        "title": "Kursus Gitar Dasar"
      }
    }
  }
}
```

---

### 2.7 Get User Bookings

**GET** `/api/booking/user/:userId`

Mendapatkan booking milik user tertentu. **Memerlukan autentikasi.**

**Response:** Sama dengan Get All Bookings.

---

### 2.8 Confirm Booking

**POST** `/api/booking/:id/confirm`

Konfirmasi booking (otomatis membuat record student). **Memerlukan autentikasi (Admin only).**

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "uuid-booking-id",
      "status": "confirmed",
      "updated_at": "2025-12-20T12:00:00Z"
    },
    "student": {
      "id": "uuid-student-id",
      "display_name": "John Doe",
      "email": "johndoe@example.com"
    }
  },
  "meta": {
    "studentCreated": true,
    "timestamp": "2025-12-20T12:00:00Z"
  }
}
```

---

### 2.9 Cancel Booking

**POST** `/api/booking/:id/cancel`

Membatalkan booking. **Memerlukan autentikasi.**

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "uuid-booking-id",
      "status": "cancelled",
      "updated_at": "2025-12-20T12:00:00Z"
    }
  }
}
```

---

### 2.10 Get Pending Bookings (Admin)

**GET** `/api/booking/api/admin/bookings/pending`

Mendapatkan daftar booking dengan status pending. **Memerlukan autentikasi (Admin only).**

**Response:** Sama dengan Get All Bookings, difilter status pending.

---

### 2.11 Assign Slot (Admin)

**POST** `/api/booking/api/admin/bookings/:id/assign-slot`

Assign jadwal ke booking. **Memerlukan autentikasi (Admin only).**

**Request Body:**

```json
{
  "schedule_id": "uuid-schedule-id"
}
```

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "uuid-booking-id",
      "confirmed_slot_id": "uuid-schedule-id",
      "updated_at": "2025-12-20T12:00:00Z"
    }
  }
}
```

---

### 2.12 Cancel Booking (Admin)

**POST** `/api/booking/api/admin/bookings/:id/cancel`

Membatalkan booking oleh admin. **Memerlukan autentikasi (Admin only).**

**Response:** Sama dengan Cancel Booking.

---

## 3. Course Service

Service untuk manajemen kursus.

### 3.1 Get All Courses

**GET** `/api/courses`

Mendapatkan daftar semua kursus. **Public endpoint.**

**Query Parameters:**
| Parameter | Type | Keterangan |
|-----------|------|------------|
| search | string | Cari berdasarkan judul/deskripsi |
| instructor_id | string | Filter berdasarkan instruktur |

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": "uuid-course-id",
        "title": "Kursus Gitar Dasar",
        "description": "Belajar gitar dari dasar hingga mahir",
        "level": "beginner",
        "price_per_session": 150000,
        "duration_minutes": 60,
        "max_students": 5,
        "instrument": "Guitar",
        "is_active": true,
        "created_at": "2025-12-20T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "total_pages": 3
    }
  }
}
```

---

### 3.2 Get Course by ID

**GET** `/api/courses/:id`

Mendapatkan detail kursus berdasarkan ID. **Public endpoint.**

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid-course-id",
    "title": "Kursus Gitar Dasar",
    "description": "Belajar gitar dari dasar hingga mahir",
    "level": "beginner",
    "price_per_session": 150000,
    "duration_minutes": 60,
    "max_students": 5,
    "instrument": "Guitar",
    "is_active": true
  }
}
```

---

### 3.3 Create Course

**POST** `/api/courses`

Membuat kursus baru. **Memerlukan autentikasi (Admin only).**

**Request Body:**

```json
{
  "title": "Kursus Piano Dasar",
  "description": "Belajar piano dari dasar",
  "level": "beginner",
  "price_per_session": 175000,
  "duration_minutes": 60,
  "max_students": 3,
  "instrument": "Piano"
}
```

| Field             | Type   | Required | Keterangan         |
| ----------------- | ------ | -------- | ------------------ |
| title             | string | Ya       | Judul kursus       |
| description       | string | Ya       | Deskripsi kursus   |
| level             | string | Ya       | Level kursus       |
| price_per_session | number | Ya       | Harga per sesi     |
| duration_minutes  | number | Ya       | Durasi dalam menit |
| max_students      | number | Ya       | Maksimal siswa     |
| instrument        | string | Tidak    | Nama instrumen     |

**Response Success (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid-course-id",
    "title": "Kursus Piano Dasar",
    "is_active": true,
    "created_at": "2025-12-20T12:00:00Z"
  }
}
```

---

### 3.4 Update Course

**PUT** `/api/courses/:id`

Mengupdate kursus. **Memerlukan autentikasi (Admin/Instructor).**

**Request Body:** Field yang ingin diupdate.

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid-course-id",
    "title": "Kursus Piano Intermediate",
    "updated_at": "2025-12-20T12:00:00Z"
  }
}
```

---

### 3.5 Delete Course

**DELETE** `/api/courses/:id`

Menghapus kursus. **Memerlukan autentikasi (Admin only).**

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "message": "Course 'Kursus Piano Dasar' deleted successfully",
    "deleted_course_id": "uuid-course-id"
  }
}
```

---

### 3.6 Get Instructors

**GET** `/api/courses/instructors`

Mendapatkan daftar nama instruktur. **Public endpoint.**

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "instructors": ["Ahmad Rizki", "Budi Santoso", "Citra Dewi"]
  }
}
```

---

### 3.7 Get Instruments

**GET** `/api/courses/instruments`

Mendapatkan daftar instrumen yang tersedia. **Public endpoint.**

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "instruments": ["Guitar", "Piano", "Violin", "Drums"]
  }
}
```

---

### 3.8 Get Levels

**GET** `/api/courses/levels`

Mendapatkan daftar level kursus. **Public endpoint.**

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "levels": ["beginner", "intermediate", "advanced"]
  }
}
```

---

## 4. Admin Service

Service untuk manajemen admin dashboard.

### 4.1 Get Dashboard Stats

**GET** `/api/admin/dashboard`

Mendapatkan statistik dashboard. **Memerlukan autentikasi (Admin only).**

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "userStats": { "totalUsers": 150 },
    "courseStats": { "totalCourses": 25 },
    "bookingStats": { "totalBookings": 320 },
    "recentBookings": [
      {
        "id": "uuid-booking-id",
        "status": "pending",
        "created_at": "2025-12-20T12:00:00Z",
        "users": { "full_name": "John Doe", "email": "john@example.com" },
        "courses": { "title": "Kursus Gitar" }
      }
    ]
  }
}
```

---

### 4.2 Get Users

**GET** `/api/admin/users`

Mendapatkan daftar semua user. **Memerlukan autentikasi (Admin only).**

**Query Parameters:**
| Parameter | Type | Default | Keterangan |
|-----------|------|---------|------------|
| page | number | 1 | Halaman |
| limit | number | 20 | Item per halaman |

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid-user-id",
        "email": "user@example.com",
        "full_name": "John Doe",
        "role": "student",
        "created_at": "2025-12-20T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

---

### 4.3 Get User by ID

**GET** `/api/admin/users/:id`

Mendapatkan detail user. **Memerlukan autentikasi (Admin only).**

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid-user-id",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "student",
    "bookings": [
      {
        "id": "uuid-booking-id",
        "status": "confirmed",
        "courses": { "title": "Kursus Gitar" }
      }
    ]
  }
}
```

---

### 4.4 Update User

**PUT** `/api/admin/users/:id`

Mengupdate user. **Memerlukan autentikasi (Admin only).**

**Request Body:** Field yang ingin diupdate.

---

### 4.5 Delete User

**DELETE** `/api/admin/users/:id`

Menghapus user. **Memerlukan autentikasi (Admin only).**

---

### 4.6 Get Students

**GET** `/api/admin/students`

Mendapatkan daftar semua siswa. **Memerlukan autentikasi (Admin only).**

**Query Parameters:** Sama dengan Get Users.

---

### 4.7 Get Student by ID

**GET** `/api/admin/students/:id`

Mendapatkan detail siswa. **Memerlukan autentikasi (Admin only).**

---

### 4.8 Create Student

**POST** `/api/admin/students`

Membuat siswa baru (auto-create booking confirmed). **Memerlukan autentikasi (Admin only).**

**Request Body:**

```json
{
  "display_name": "John Doe",
  "email": "johndoe@example.com",
  "course_id": "uuid-course-id",
  "first_choice_slot_id": "uuid-slot-1",
  "second_choice_slot_id": "uuid-slot-2",
  "preferred_days": ["monday", "wednesday"],
  "preferred_time_range": { "start": "14:00", "end": "16:00" },
  "instrument": "Guitar",
  "level": "beginner",
  "has_instrument": true,
  "guardian_name": "Jane Doe",
  "guardian_wa_number": "081234567890"
}
```

**Response Success (201):**

```json
{
  "success": true,
  "data": {
    "student": {
      "id": "uuid-student-id",
      "display_name": "John Doe",
      "email": "johndoe@example.com"
    },
    "booking": {
      "id": "uuid-booking-id",
      "status": "confirmed"
    }
  },
  "meta": {
    "message": "Student and booking created successfully"
  }
}
```

---

### 4.9 Update Student

**PUT** `/api/admin/students/:id`

Mengupdate siswa. **Memerlukan autentikasi (Admin only).**

---

### 4.10 Delete Student

**DELETE** `/api/admin/students/:id`

Menghapus siswa. **Memerlukan autentikasi (Admin only).**

---

### 4.11 Get Instructors

**GET** `/api/admin/instructor`

Mendapatkan daftar instruktur. **Memerlukan autentikasi (Admin only).**

---

### 4.12 Get Instructor by ID

**GET** `/api/admin/instructor/:id`

Mendapatkan detail instruktur. **Memerlukan autentikasi (Admin only).**

---

### 4.13 Create Instructor

**POST** `/api/admin/instructor`

Membuat instruktur baru. **Memerlukan autentikasi (Admin only).**

**Request Body:**

```json
{
  "email": "instructor@example.com",
  "full_name": "Ahmad Rizki",
  "phone_number": "081234567890",
  "wa_number": "081234567890",
  "bio": "Pengajar musik berpengalaman",
  "specialization": "Guitar, Piano"
}
```

**Response Success (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-user-id",
      "email": "instructor@example.com",
      "full_name": "Ahmad Rizki",
      "role": "instructor"
    },
    "profile": {
      "user_id": "uuid-user-id",
      "full_name": "Ahmad Rizki",
      "specialization": "Guitar, Piano"
    },
    "message": "Instructor created successfully"
  }
}
```

---

### 4.14 Update Instructor

**PUT** `/api/admin/instructor/:id`

Mengupdate instruktur. **Memerlukan autentikasi (Admin only).**

---

### 4.15 Delete Instructor

**DELETE** `/api/admin/instructor/:id`

Menghapus instruktur. **Memerlukan autentikasi (Admin only).**

---

### 4.16 Get Rooms

**GET** `/api/admin/rooms`

Mendapatkan daftar ruangan.

---

### 4.17 Create Room

**POST** `/api/admin/rooms`

Membuat ruangan baru.

---

### 4.18 Delete Room

**DELETE** `/api/admin/rooms/:id`

Menghapus ruangan.

---

### 4.19 Set Room Availability

**POST** `/api/admin/rooms/:id/availability`

Mengatur ketersediaan ruangan.

---

### 4.20 Get Schedules

**GET** `/api/admin/schedules`

Mendapatkan daftar jadwal.

---

### 4.21 Create Schedule

**POST** `/api/admin/schedules`

Membuat jadwal baru.

---

### 4.22 Update Schedule

**PUT** `/api/admin/schedules/:id`

Mengupdate jadwal.

---

## 5. Recommendation Service

Service untuk assessment dan rekomendasi instrumen.

### 5.1 Submit Assessment

**POST** `/api/assessment`

Submit data assessment untuk mendapatkan rekomendasi. Menggunakan session-based authentication.

**Request Body:**

```json
{
  "assessment_data": {
    "name": "John Doe",
    "age": 12,
    "preferred_genre": "pop",
    "physical_attributes": {
      "hand_size": "medium",
      "arm_length": "average"
    },
    "learning_style": "visual",
    "budget": "medium",
    "time_availability": "weekends"
  }
}
```

**Response Success (201):**

```json
{
  "success": true,
  "assessment_id": "uuid-assessment-id",
  "status": "submitted",
  "message": "Assessment submitted successfully. AI analysis in progress."
}
```

---

### 5.2 Get Results

**GET** `/api/results`

Mendapatkan hasil assessment. Menggunakan session-based authentication.

**Query Parameters:**
| Parameter | Type | Keterangan |
|-----------|------|------------|
| assessment_id | uuid | ID assessment (opsional jika sudah ada session) |

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "assessment": {
      "id": "uuid-assessment-id",
      "session_id": "session-id",
      "assessment_data": { ... },
      "status": "completed"
    },
    "result": {
      "id": "uuid-result-id",
      "recommended_instrument": "Guitar",
      "confidence_score": 0.85,
      "reasoning": "Based on your preferences and physical attributes...",
      "alternative_instruments": ["Ukulele", "Bass"]
    }
  },
  "message": "Results retrieved successfully"
}
```

---

## 6. Notification Service

Service untuk menangani notifikasi (RabbitMQ Worker).

### 6.1 Health Check

**GET** `/health`

Mengecek status service.

**Response Success (200):**

```json
{
  "status": "ok",
  "service": "notification-service",
  "mode": "rabbitmq-worker"
}
```

---

## 7. API Gateway Aggregation

Endpoint agregasi dari API Gateway.

### 7.1 Dashboard Stats

**GET** `/api/dashboard/stats`

Agregasi statistik dashboard. **Memerlukan autentikasi (Admin only).**

---

### 7.2 Admin Dashboard

**GET** `/api/dashboard/api/admin`

Agregasi dashboard admin lengkap. **Memerlukan autentikasi (Admin only).**

---

### 7.3 User Profile Full

**GET** `/api/profile/:userId/full`

Agregasi profil user lengkap dengan booking. **Memerlukan autentikasi.**

---

## Error Codes

| Code                            | HTTP Status | Keterangan                |
| ------------------------------- | ----------- | ------------------------- |
| `VALIDATION_ERROR`              | 400         | Data validasi tidak valid |
| `AUTH_MISSING_TOKEN`            | 401         | Token tidak ada           |
| `AUTH_INVALID_TOKEN`            | 401         | Token tidak valid         |
| `AUTH_INVALID_CREDENTIALS`      | 401         | Email/password salah      |
| `AUTH_UNAUTHORIZED`             | 401         | Tidak terautentikasi      |
| `AUTH_INSUFFICIENT_PERMISSIONS` | 403         | Tidak punya akses         |
| `NOT_FOUND`                     | 404         | Resource tidak ditemukan  |
| `COURSE_NOT_FOUND`              | 404         | Kursus tidak ditemukan    |
| `DUPLICATE_REQUEST`             | 409         | Request duplikat          |
| `PENDING_BOOKING_EXISTS`        | 409         | Booking pending sudah ada |
| `EMAIL_ALREADY_EXISTS`          | 409         | Email sudah terdaftar     |
| `DATABASE_ERROR`                | 500         | Error database            |
| `INTERNAL_SERVER_ERROR`         | 500         | Error internal server     |

---

## Rate Limiting

API Gateway menerapkan rate limiting:

- **Public endpoints:** 100 requests per menit
- **Authenticated endpoints:** 500 requests per menit
- **Admin endpoints:** 1000 requests per menit

---

## Changelog

### v1.0.1 (2025-12-20)

- Update dokumentasi payload booking service (captcha_token, consent, dll)
- Update date reference to 2025
- Validasi eksistensi endpoint terhadap service code

### v1.0.0 (2024-12-20)

- Initial release
- Migrasi dari Firebase Auth ke Supabase Native Auth
- Integrasi RabbitMQ untuk notification service
- Supabase Realtime untuk update jadwal
