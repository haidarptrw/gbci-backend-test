// users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Profile, ProfileSchema } from './profile.schema';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ unique: true, required: true })
  userName!: string;

  @Prop({ unique: true, required: true })
  email!: string;

  @Prop({ required: true, select: false })
  password!: string;


  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  @Prop({ type: String, default: null })
  refreshToken!: string | null;

  @Prop({ type: ProfileSchema, select: false, default: {} })
  profile!: Profile;

}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ deletedAt: 1 });