import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import type { Request } from 'express';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // Déclencher une notification (appelé par le Reservation Service)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationService.create(dto);
  }

  // Toutes les notifications de l'utilisateur connecté
  @Get('me')
  getMyNotifications(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.notificationService.findByUser(userId);
  }

  // Marquer une notification comme lue
  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  // Marquer toutes comme lues
  @Patch('me/read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllAsRead(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.notificationService.markAllAsRead(userId);
  }

  // Supprimer une notification
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.notificationService.remove(id);
  }

  // Endpoint interne : notifier création de réservation
  // Appelé par le Reservation Service via HTTP
  @Post('reservation-created')
  @HttpCode(HttpStatus.CREATED)
  onReservationCreated(@Body() data: any) {
    return this.notificationService.notifyReservationCreated(data);
  }

  // Endpoint interne : notifier annulation
  @Post('reservation-cancelled')
  @HttpCode(HttpStatus.CREATED)
  onReservationCancelled(@Body() data: any) {
    return this.notificationService.notifyReservationCancelled(data);
  }
}