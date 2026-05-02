# 🔔 Notification Service

A NestJS microservice responsible for real-time notifications, meeting reminders, and file upload events across the medical platform.

---

## 📁 Modified & New Files

| File | Status | Description |
|------|--------|-------------|
| `src/notification/entities/notification.entity.ts` | ✏️ Modified | Added `FILE_UPLOADED` to `NotificationType` enum |
| `src/notification/notification.service.ts` | ✏️ Modified | Added `notifyFileUploaded()` method |
| `src/events/events.module.ts` | ✏️ Modified | Registered `StorageController` and `StorageListener` |
| `src/events/storage.listener.ts` | 🆕 New | Forwards files to the storage service and triggers notifications |
| `src/events/storage.controller.ts` | 🆕 New | Exposes `POST /storage/upload/single` and `POST /storage/upload/multiple` |
| `main.ts` | ✏️ Modified | Open CORS configuration for all origins |
| `package.json` | ✏️ Modified | Added `form-data`, `multer`, `@types/multer`, `@types/form-data` |

---

## 🚀 Base URL

```
https://notification-bagz.onrender.com
```

---

## 🔐 Authentication

All endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <TOKEN>
```

---

## 📡 API Endpoints

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/notifications` | ✅ | Create a notification manually |
| `GET` | `/notifications/me` | ✅ | Get all notifications for the logged-in user |
| `PATCH` | `/notifications/:id/read` | ✅ | Mark a notification as read |
| `PATCH` | `/notifications/me/read-all` | ✅ | Mark all notifications as read |
| `DELETE` | `/notifications/:id` | ✅ | Delete a notification |
| `POST` | `/notifications/reservation-created` | ✅ | Trigger notifications for a new reservation |
| `POST` | `/notifications/reservation-cancelled` | ✅ | Trigger notifications for a cancelled reservation |

---

### File Upload

#### `POST /storage/upload/single`

Upload a single file to the storage service. Automatically notifies both the patient and the doctor.

**Headers:**
```
Authorization: Bearer <TOKEN>
Content-Type: multipart/form-data
```

**Form Data:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ | The file to upload |
| `patientId` | string | ✅ | ID of the patient |
| `doctorId` | string | ✅ | ID of the doctor |
| `type` | string | ✅ | File type (e.g. `scan`, `ordonnance`, `document`) |

**Example:**
```bash
curl -X POST https://notification-bagz.onrender.com/storage/upload/single \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/path/to/file.png" \
  -F "patientId=123" \
  -F "doctorId=456" \
  -F "type=scan"
```

**Response `201`:**
```json
{
  "filename": "file.png",
  "url": "https://storage-service-yxqy.onrender.com/files/file.png",
  "size": 204800
}
```

---

#### `POST /storage/upload/multiple`

Upload multiple files (max 10) to the storage service. Automatically notifies both the patient and the doctor.

**Headers:**
```
Authorization: Bearer <TOKEN>
Content-Type: multipart/form-data
```

**Form Data:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `files` | File[] | ✅ | The files to upload (max 10) |
| `patientId` | string | ✅ | ID of the patient |
| `doctorId` | string | ✅ | ID of the doctor |
| `type` | string | ✅ | File type (e.g. `scan`, `ordonnance`, `document`) |

**Example:**
```bash
curl -X POST https://notification-bagz.onrender.com/storage/upload/multiple \
  -H "Authorization: Bearer <TOKEN>" \
  -F "files=@/path/to/file1.png" \
  -F "files=@/path/to/file2.pdf" \
  -F "patientId=123" \
  -F "doctorId=456" \
  -F "type=ordonnance"
```

**Response `201`:**
```json
[
  {
    "filename": "file1.png",
    "url": "https://storage-service-yxqy.onrender.com/files/file1.png",
    "size": 204800
  },
  {
    "filename": "file2.pdf",
    "url": "https://storage-service-yxqy.onrender.com/files/file2.pdf",
    "size": 153600
  }
]
```

---

### Reservation Events (Internal)

#### `POST /notifications/reservation-created`

```json
{
  "reservationId": "uuid",
  "doctorId": "uuid",
  "patientId": "uuid",
  "reservationDay": "2026-05-10",
  "reservationTime": "14:00",
  "meetingUrl": "https://meet.example.com/abc",
  "reason": "Consultation générale"
}
```

#### `POST /notifications/reservation-cancelled`

```json
{
  "reservationId": "uuid",
  "doctorId": "uuid",
  "patientId": "uuid",
  "reservationDay": "2026-05-10",
  "reservationTime": "14:00"
}
```

---

## 🔔 Notification Types

| Type | Trigger |
|------|---------|
| `RESERVATION_CREATED` | New reservation confirmed |
| `RESERVATION_CANCELLED` | Reservation cancelled |
| `MEETING_REMINDER` | 15 minutes before a meeting (automated cron) |
| `FILE_UPLOADED` | Single or multiple file uploaded |

---

## 🔄 Real-time WebSocket

**Namespace:** `/notifications`

**Events:**

| Event | Direction | Description |
|-------|-----------|-------------|
| `register` | Client → Server | Register the user socket with `{ userId }` |
| `registered` | Server → Client | Confirmation `{ success: true }` |
| `notification` | Server → Client | New notification pushed in real time |

**Example (JavaScript):**
```javascript
const socket = io('https://notification-bagz.onrender.com/notifications');

socket.on('connect', () => {
  socket.emit('register', { userId: 'your-user-id' });
});

socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});
```

---

## ⏰ Automated Reminder (Cron)

A cron job runs **every minute** and checks tracked reservations. If a meeting is starting within **15 minutes**, it sends a `MEETING_REMINDER` notification to both the doctor and the patient, then marks the reminder as sent.

---

## 🛠️ Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Service port | `3002` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | PostgreSQL user | `postgres` |
| `DB_PASS` | PostgreSQL password | `secret` |
| `DB_NAME` | PostgreSQL database name | `notifications` |
| `JWT_SECRET` | Secret key for JWT validation | `my-secret` |
| `RESERVATION_SERVICE_URL` | URL of the reservation microservice | `https://reservation-service.onrender.com` |
| `STORAGE_SERVICE_URL` | URL of the storage microservice | `https://storage-service-yxqy.onrender.com` |

---

## 📦 Tech Stack

- **Framework:** NestJS 10
- **Database:** PostgreSQL + TypeORM
- **Auth:** JWT via Passport
- **Real-time:** Socket.IO (WebSocket)
- **HTTP Client:** Axios (`@nestjs/axios`)
- **Scheduler:** `@nestjs/schedule` (Cron)
- **File Upload:** Multer (memory storage)
- **Multipart Forwarding:** `form-data`
