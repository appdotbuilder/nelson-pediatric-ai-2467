
import { db } from '../db';
import { chatMessagesTable } from '../db/schema';
import { type CreateChatMessageInput, type ChatMessage } from '../schema';

export const createChatMessage = async (input: CreateChatMessageInput): Promise<ChatMessage> => {
  try {
    // Generate unique message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Insert chat message record
    const result = await db.insert(chatMessagesTable)
      .values({
        id: messageId,
        session_id: input.session_id,
        role: input.role,
        content: input.content,
        citations: input.citations || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Chat message creation failed:', error);
    throw error;
  }
};
