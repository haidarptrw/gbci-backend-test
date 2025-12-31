import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types, Document } from "mongoose";

@Schema({ timestamps: true })
export class Message extends Document {
    @Prop({ type: Types.ObjectId, ref: 'Chat', required: true })
    chat!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    sender!: Types.ObjectId;

    @Prop({ required: true, trim: true })
    content!: string;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
    readBy!: Types.ObjectId[];

    @Prop({ type: Date, default: null })
    deletedAt!: Date | null;
}

export const MessageSchema = SchemaFactory.createForClass(Message);