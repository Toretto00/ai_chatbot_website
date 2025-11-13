import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Conversation } from '../../chat/entities/conversation.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ nullable: true })
  first_name: string;

  @Column({ nullable: true })
  middle_name: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  avatar_url: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  account_type: string;

  @Column({ nullable: true })
  role: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true })
  code_id: string;

  @Column({ nullable: true })
  code_expire: Date;

  @OneToMany(() => Conversation, (conversation) => conversation.user)
  conversations: Conversation[];
}
