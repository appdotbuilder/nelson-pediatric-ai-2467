
import { db } from '../db';
import { chatMessagesTable } from '../db/schema';
import { type ChatMessage } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getChatMessages = async (sessionId: string): Promise<ChatMessage[]> => {
  try {
    const results = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.session_id, sessionId))
      .orderBy(asc(chatMessagesTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get chat messages:', error);
    throw error;
  }
};
