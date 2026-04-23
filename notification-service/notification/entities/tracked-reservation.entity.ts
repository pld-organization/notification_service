import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('tracked_reservations')
export class TrackedReservation {
  
  @PrimaryColumn()
  reservationId: string;

  @Column()
  doctorId: string;

  @Column()
  patientId: string;

  @Column()
  meetingUrl: string;

  @Column()
  reservationDay: string;

  @Column()
  reservationTime: string;

 
  @Column({ default: false })
  reminderSent: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
