import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ReservationListener } from './reservation.listener';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [HttpModule, ScheduleModule.forRoot(), NotificationModule],
  providers: [ReservationListener],
})
export class EventsModule {}