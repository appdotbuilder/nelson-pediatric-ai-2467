
import { db } from '../db';
import { chatSessionsTable } from '../db/schema';
import { type CreateChatSessionInput, type ChatSession } from '../schema';

export const createChatSession = async (input: CreateChatSessionInput): Promise<ChatSession> => {
  try {
    // Generate unique session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Insert chat session record
    const result = await db.insert(chatSessionsTable)
      .values({
        id: sessionId,
        user_id: input.user_id,
        title: input.title
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Chat session creation failed:', error);
    throw error;
  }
};
