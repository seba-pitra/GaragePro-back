import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Reservation } from './reservation.entity';
import { ParkingSlot } from '@/modules/parking-slots/entities/parking-slot.entity';

@Entity('reservations_slots')
export class ReservationSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Reservation, (reservation) => reservation.reservation_slot, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation;

  @ManyToOne(() => ParkingSlot, (parkingSlot) => parkingSlot.reservation_slot)
  @JoinColumn({ name: 'parking_slot_id' })
  parking_slot: ParkingSlot;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
