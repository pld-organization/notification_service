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
    const reservationUrl = this.config.get('RESERVATION_SERVICE_URL');
    const internalToken = this.config.get('INTERNAL_SERVICE_TOKEN');

  
    this.logger.debug('Vérification des meetings à venir...');

    
    try {
     
      this.logger.debug('Reminder check done');
    } catch (err) {
      this.logger.error('Erreur reminder check', err);
    }
  }
}