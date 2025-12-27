import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class Profile extends Document {
    @Prop()
    displayName?: string;

    @Prop()
    about?: string;

    @Prop()
    interest?: string;

    @Prop()
    gender?: string;

    @Prop()
    birthday?: Date;

    @Prop()
    horoscope?: string;

    @Prop()
    zodiac?: string;

    @Prop()
    bannerUrl?: string;

    @Prop()
    height?: number;

    @Prop()
    weight?: number;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);