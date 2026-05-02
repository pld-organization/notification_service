# Notification Service

Microservice responsible for real-time notifications delivered to doctors and patients across the medical platform.

## Base URL

```
https://notification-bagz.onrender.com
```

## Authentication

All endpoints are protected by JWT. Include the token in every request:

```
Authorization: Bearer <TOKEN>
```

---

## Endpoints

### Notifications

#### Get my notifications
```
GET /notifications/me
```
Returns all notifications for the authenticated user, ordered by date descending.

#### Mark one as read
```
PATCH /notifications/:id/read
```

#### Mark all as read
```
PATCH /notifications/me/read-all
```

#### Delete a notification
```
DELETE /notifications/:id
```

---

### Reservation Events

#### Reservation created
```
POST /notifications/reservation-created
```
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

#### Reservation cancelled
```
POST /notifications/reservation-cancelled
```
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

### File Upload

Both endpoints forward the file(s) to the storage service and automatically send a notification to both the doctor and the patient.

#### Upload single file
```
POST /storage/upload/single
Content-Type: multipart/form-data
```

| Field | Type | Required |
|-------|------|----------|
| `file` | File | ✅ |
| `patientId` | string | ✅ |
| `doctorId` | string | ✅ |
| `type` | string | ✅ |

Response:
```json
{
  "filename": "file.png",
  "url": "https://storage-service-yxqy.onrender.com/files/file.png",
  "size": 204800
}
```

#### Upload multiple files
```
POST /storage/upload/multiple
Content-Type: multipart/form-data
```

| Field | Type | Required |
|-------|------|----------|
| `files` | File[] (max 10) | ✅ |
| `patientId` | string | ✅ |
| `doctorId` | string | ✅ |
| `type` | string | ✅ |

Response:
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

## Real-time WebSocket

**Namespace:** `/notifications`

Connect and register your userId to start receiving notifications in real time.

```javascript
const socket = io('https://notification-bagz.onrender.com/notifications');

socket.on('connect', () => {
  socket.emit('register', { userId: 'your-user-id' });
});

socket.on('notification', (data) => {
  console.log(data);
});
```

| Event | Direction | Description |
|-------|-----------|-------------|
| `register` | Client → Server | Register user with `{ userId }` |
| `registered` | Server → Client | Confirmation `{ success: true }` |
| `notification` | Server → Client | New notification payload |

---

## Notification Types

| Type | When |
|------|------|
| `RESERVATION_CREATED` | A reservation is confirmed |
| `RESERVATION_CANCELLED` | A reservation is cancelled |
| `MEETING_REMINDER` | 15 min before a meeting (automatic) |
| `FILE_UPLOADED` | A file is uploaded by the patient |

---

## Automatic Reminder

A cron job runs every minute. When a meeting is detected within the next 15 minutes, a reminder notification is sent to both the doctor and the patient. The reminder is sent only once per reservation.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Service port (default: `3002`) |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port |
| `DB_USER` | PostgreSQL username |
| `DB_PASS` | PostgreSQL password |
| `DB_NAME` | PostgreSQL database name |
| `JWT_SECRET` | Secret used to verify JWT tokens |
| `RESERVATION_SERVICE_URL` | URL of the reservation microservice |
| `STORAGE_SERVICE_URL` | URL of the storage microservice |
