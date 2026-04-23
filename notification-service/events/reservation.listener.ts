import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '../notification/notification.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ReservationListener {
  private readonly logger = new Logger(ReservationListener.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly notificationService: NotificationService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkUpcomingMeetings() {
    const reservationUrl = this.config.get<string>('RESERVATION_SERVICE_URL');

    this.logger.debug('Vérification des meetings à venir...');

    try {
      
      const tracked =
        await this.notificationService.getAllTrackedReservations();

      if (!tracked.length) {
        this.logger.debug('Aucune réservation à surveiller.');
        return;
      }

      
      for (const reservation of tracked) {
        try {
          const response = await firstValueFrom(
            this.httpService.get(
              `${reservationUrl}/reservation/upcoming/doctor/${reservation.doctorId}`,
            ),
          );

          const upcomingList: any[] = response.data ?? [];

          
          const isImminent = upcomingList.some(
            (item: any) => item.id === reservation.reservationId,
          );

          if (!isImminent) {
            continue;
          }

          
          await this.notificationService.notifyMeetingReminder({
            reservationId: reservation.reservationId,
            userId: reservation.patientId,
            meetingUrl: reservation.meetingUrl,
            minutesBefore: 15,
            day: reservation.reservationDay,
            startTime: reservation.reservationTime,
          });

         
          await this.notificationService.notifyMeetingReminder({
            reservationId: reservation.reservationId,
            userId: reservation.doctorId,
            meetingUrl: reservation.meetingUrl,
            minutesBefore: 15,
            day: reservation.reservationDay,
            startTime: reservation.reservationTime,
          });

         
          await this.notificationService.markReminderSent(
            reservation.reservationId,
          );

          this.logger.log(
            ` Rappel envoyé — réservation ${reservation.reservationId} ` +
              `(doctor: ${reservation.doctorId}, patient: ${reservation.patientId})`,
          );
        } catch (err: any) {
          this.logger.error(
            `Erreur pour la réservation ${reservation.reservationId}`,
            err?.message,
          );
        }
      }

      this.logger.debug('Reminder check done');
    } catch (err) {
      this.logger.error('Erreur reminder check', err);
    }
  }
}
