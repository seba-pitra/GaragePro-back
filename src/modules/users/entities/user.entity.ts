import { BeforeInsert, BeforeUpdate, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  firstName: string;

  @Column('varchar', { length: 255 })
  lastName: string;

  @Column('varchar', { length: 255, unique: true })
  email: string;

  @Column('varchar', { length: 255, select: false })
  password: string;

  @Column('text', { array: true, default: '{customer}' })
  roles: string[];

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('boolean', { default: false })
  isRegularCustomer: boolean;

  @Column('varchar', { length: 255, nullable: true })
  phone: string;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @BeforeInsert()
  checkFieldBeforeInsert() {
    this.email = this.email.toLocaleLowerCase().trim();
  }

  @BeforeUpdate()
  checkFieldBeforeUpdate() {
    this.email = this.email.toLocaleLowerCase().trim();
  }
}
