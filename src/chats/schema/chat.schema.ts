import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types, Document} from "mongoose";

@Schema({ timestamps: true })
export class Chat extends Document {
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  members!: Types.ObjectId[];
  
  @Prop({ type: Types.ObjectId, ref: 'Message' })
  latestMessage?: Types.ObjectId; // Only Store the ID of the last message sent for optimization

  @Prop()
  name?: string;

  @Prop()
  groupAdmin?: Types.ObjectId;

  @Prop({ default: false })
  isGroupChat!: boolean;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);