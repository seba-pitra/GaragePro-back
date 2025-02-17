import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ReservationSlot } from '@/modules/parking/entities/reservation-slot.entity';

@Entity('parking_slots')
export class ParkingSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { unique: true, nullable: false, length: 10 })
  slot_code: string;

  @Column('boolean', { nullable: false, default: false })
  is_pre_reserved: boolean;

  @Column('boolean', { nullable: false, default: false })
  is_reserved: boolean;

  @OneToMany(() => ReservationSlot, (reservationSlot) => reservationSlot.parking_slot)
  reservation_slot: ReservationSlot[];

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
