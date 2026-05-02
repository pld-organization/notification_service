import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { TrackedReservation } from './entities/tracked-reservation.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,

    @InjectRepository(TrackedReservation)
    private readonly trackedRepo: Repository<TrackedReservation>,

    private readonly gateway: NotificationGateway,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.repo.create(dto);
    const saved = await this.repo.save(notification);
    this.gateway.sendToUser(dto.userId, saved);
    return saved;
  }

  async findByUser(userId: string): Promise<Notification[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(id: string): Promise<void> {
    await this.repo.update(id, { isRead: true });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

 

  async saveTrackedReservation(data: {
    reservationId: string;
    doctorId: string;
    patientId: string;
    meetingUrl: string;
    reservationDay: string;
    reservationTime: string;
  }): Promise<void> {
    const tracked = this.trackedRepo.create({
      reservationId: data.reservationId,
      doctorId: data.doctorId,
      patientId: data.patientId,
      meetingUrl: data.meetingUrl,
      reservationDay: data.reservationDay,
      reservationTime: data.reservationTime,
      reminderSent: false,
    });
    await this.trackedRepo.save(tracked);
  }

  async getAllTrackedReservations(): Promise<TrackedReservation[]> {
    return this.trackedRepo.find({ where: { reminderSent: false } });
  }

  async markReminderSent(reservationId: string): Promise<void> {
    await this.trackedRepo.update({ reservationId }, { reminderSent: true });
  }

  async removeTrackedReservation(reservationId: string): Promise<void> {
    await this.trackedRepo.delete({ reservationId });
  }



  async notifyReservationCreated(data: {
    reservationId: string;
    doctorId: string;
    patientId: string;
    reservationDay: string;
    reservationTime: string;
    meetingUrl: string;
    reason: string;
  }) {
    await this.saveTrackedReservation({
      reservationId: data.reservationId,
      doctorId: data.doctorId,
      patientId: data.patientId,
      meetingUrl: data.meetingUrl,
      reservationDay: data.reservationDay,
      reservationTime: data.reservationTime,
    });

    await this.create({
      userId: data.patientId,
      type: NotificationType.RESERVATION_CREATED,
      title: '✅ Réservation confirmée',
      message: `Votre rendez-vous du ${data.reservationDay} à ${data.reservationTime} a été confirmé.`,
      payload: {
        reservationId: data.reservationId,
        meetingUrl: data.meetingUrl,
        reason: data.reason,
      },
    });

    await this.create({
      userId: data.doctorId,
      type: NotificationType.RESERVATION_CREATED,
      title: '📅 Nouvelle réservation',
      message: `Un patient a réservé un créneau le ${data.reservationDay} à ${data.reservationTime}.`,
      payload: {
        reservationId: data.reservationId,
        patientId: data.patientId,
        reason: data.reason,
      },
    });

    if (data.meetingUrl) {
      await this.create({
        userId: data.patientId,
        type: NotificationType.MEETING_REMINDER,
        title: '🔗 Lien de consultation disponible',
        message: `Votre consultation du ${data.reservationDay} à ${data.reservationTime} est en ligne. Voici votre lien de meeting.`,
        payload: {
          reservationId: data.reservationId,
          meetingUrl: data.meetingUrl,
        },
      });

      await this.create({
        userId: data.doctorId,
        type: NotificationType.MEETING_REMINDER,
        title: '🔗 Lien de consultation disponible',
        message: `Consultation du ${data.reservationDay} à ${data.reservationTime} — lien meeting prêt.`,
        payload: {
          reservationId: data.reservationId,
          meetingUrl: data.meetingUrl,
          patientId: data.patientId,
        },
      });
    }
  }

  async notifyReservationCancelled(data: {
    reservationId: string;
    doctorId: string;
    patientId: string;
    reservationDay: string;
    reservationTime: string;
  }) {
    await this.removeTrackedReservation(data.reservationId);

    const message = `Le rendez-vous du ${data.reservationDay} à ${data.reservationTime} a été annulé.`;

    await this.create({
      userId: data.patientId,
      type: NotificationType.RESERVATION_CANCELLED,
      title: '❌ Réservation annulée',
      message,
      payload: { reservationId: data.reservationId },
    });

    await this.create({
      userId: data.doctorId,
      type: NotificationType.RESERVATION_CANCELLED,
      title: '❌ Réservation annulée',
      message,
      payload: { reservationId: data.reservationId },
    });
  }

  async notifyMeetingReminder(data: {
    reservationId: string;
    userId: string;
    meetingUrl: string;
    minutesBefore: number;
    day?: string;
    startTime?: string;
  }) {
    const timeInfo =
      data.day && data.startTime ? ` (${data.day} à ${data.startTime})` : '';

    await this.create({
      userId: data.userId,
      type: NotificationType.MEETING_REMINDER,
      title: '⏰ Rappel de consultation',
      message: `Votre consultation${timeInfo} commence dans ${data.minutesBefore} minutes.`,
      payload: {
        reservationId: data.reservationId,
        meetingUrl: data.meetingUrl,
      },
    });
  }



 
  async notifyFileUploaded(data: {
    patientId: string;
    doctorId: string;
    type: string;
    files: Array<{ filename: string; url: string; size?: number }>;
  }) {
    const count = data.files.length;
    const fileLabel = count === 1 ? 'fichier' : 'fichiers';
    const firstName = data.files[0]?.filename ?? 'fichier';

    const patientMessage =
      count === 1
        ? `Votre ${fileLabel} "${firstName}" (${data.type}) a été envoyé avec succès.`
        : `${count} ${fileLabel} de type "${data.type}" ont été envoyés avec succès.`;

    const doctorMessage =
      count === 1
        ? `Un nouveau ${fileLabel} "${firstName}" (${data.type}) a été partagé par votre patient.`
        : `${count} nouveaux ${fileLabel} de type "${data.type}" ont été partagés par votre patient.`;

    
    await this.create({
      userId: data.patientId,
      type: NotificationType.FILE_UPLOADED,
      title: '📎 Fichier envoyé',
      message: patientMessage,
      payload: {
        doctorId: data.doctorId,
        fileType: data.type,
        files: data.files,
      },
    });

    await this.create({
      userId: data.doctorId,
      type: NotificationType.FILE_UPLOADED,
      title: '📂 Nouveau fichier reçu',
      message: doctorMessage,
      payload: {
        patientId: data.patientId,
        fileType: data.type,
        files: data.files,
      },
    });
  }
}
