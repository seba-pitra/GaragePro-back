import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '@/modules/auth/entities/user.entity';
import { ReservationSlot } from './reservation-slot.entity';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('integer', { default: 1, nullable: true })
  duration_in_minutes: number;

  @Column('timestamp', { nullable: true })
  actual_entry_time: Date;

  @Column('timestamp', { nullable: true })
  actual_exit_time: Date;

  @Column('numeric', { precision: 10, scale: 2, nullable: false })
  basic_cost: number;

  @Column('numeric', { precision: 10, scale: 2, nullable: true })
  penalty: number;

  @Column('numeric', { precision: 10, scale: 2, nullable: true })
  total_cost: number;

  @Column('boolean', { nullable: true })
  is_paid: boolean;

  @Column('timestamp', { nullable: true, default: () => 'CURRENT_TIMESTAMP' })
  booking_date: Date;

  @OneToMany(() => ReservationSlot, (reservationSlot) => reservationSlot.reservation)
  reservation_slot: ReservationSlot[];

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
