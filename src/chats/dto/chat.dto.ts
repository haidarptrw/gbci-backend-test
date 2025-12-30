import { createZodDto } from "nestjs-zod";
import z from "zod";

export const CreateChatSchema = z.object({
  // For 1-on-1, just send the other user's ID
  // For Group, send array of IDs
  userId: z.string().optional(), 
  userIds: z.array(z.string()).optional(),
  
  // Only for groups
  isGroupChat: z.boolean().optional(),
  name: z.string().optional(),
});

export class CreateChatDto extends createZodDto(CreateChatSchema) {}

// ========== SEND MESSAGE ===============
export const SendMessageSchema = z.object({
  chatId: z.string(),
  senderId: z.string(),
  content: z.string().min(1),
});


export class SendMessageDto extends createZodDto(SendMessageSchema) {}