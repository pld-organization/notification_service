import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
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

  

  async notifyReservationCreated(data: {
    reservationId: string;
    doctorId: string;
    patientId: string;
    reservationDay: string;
    reservationTime: string;
    meetingUrl: string;
    reason: string;
  }) {
    
    await this.create({
      userId: data.patientId,
      type: NotificationType.RESERVATION_CREATED,
      title: ' Réservation confirmée',
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
      title: ' Nouvelle réservation',
      message: `Un patient a réservé un créneau le ${data.reservationDay} à ${data.reservationTime}.`,
      payload: {
        reservationId: data.reservationId,
        patientId: data.patientId,
        reason: data.reason,
      },
    });
  }

  async notifyReservationCancelled(data: {
    reservationId: string;
    doctorId: string;
    patientId: string;
    reservationDay: string;
    reservationTime: string;
  }) {
    const message = `Le rendez-vous du ${data.reservationDay} à ${data.reservationTime} a été annulé.`;

    await this.create({
      userId: data.patientId,
      type: NotificationType.RESERVATION_CANCELLED,
      title: ' Réservation annulée',
      message,
      payload: { reservationId: data.reservationId },
    });

    await this.create({
      userId: data.doctorId,
      type: NotificationType.RESERVATION_CANCELLED,
      title: ' Réservation annulée',
      message,
      payload: { reservationId: data.reservationId },
    });
  }

  async notifyMeetingReminder(data: {
    reservationId: string;
    userId: string;
    meetingUrl: string;
    minutesBefore: number;
  }) {
    await this.create({
      userId: data.userId,
      type: NotificationType.MEETING_REMINDER,
      title: ' Rappel de consultation',
      message: `Votre consultation commence dans ${data.minutesBefore} minutes.`,
      payload: {
        reservationId: data.reservationId,
        meetingUrl: data.meetingUrl,
      },
    });
  }
}