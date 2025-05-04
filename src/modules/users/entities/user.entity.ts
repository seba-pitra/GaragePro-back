import { BeforeInsert, BeforeUpdate, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  first_name: string;

  @Column('varchar', { length: 255 })
  last_name: string;

  @Column('varchar', { length: 255, unique: true })
  email: string;

  @Column('varchar', { length: 255, select: false })
  password: string;

  @Column('text', { array: true, default: '{customer}' })
  roles: string[];

  @Column('boolean', { default: true })
  is_active: boolean;

  @Column('boolean', { default: false })
  is_regular_customer: boolean;

  @Column('varchar', { length: 255, nullable: true })
  phone: string;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @BeforeInsert()
  checkFieldBeforeInsert() {
    this.email = this.email.toLocaleLowerCase().trim();
  }

  @BeforeUpdate()
  checkFieldBeforeUpdate() {
    this.email = this.email.toLocaleLowerCase().trim();
  }
}
