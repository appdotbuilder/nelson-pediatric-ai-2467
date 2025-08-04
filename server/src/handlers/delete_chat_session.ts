
import { db } from '../db';
import { chatSessionsTable, chatMessagesTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteChatSession(sessionId: string): Promise<{ success: boolean }> {
  try {
    // Delete all chat messages associated with the session first (to handle foreign key constraints)
    await db.delete(chatMessagesTable)
      .where(eq(chatMessagesTable.session_id, sessionId))
      .execute();

    // Delete the chat session
    const result = await db.delete(chatSessionsTable)
      .where(eq(chatSessionsTable.id, sessionId))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Chat session deletion failed:', error);
    throw error;
  }
}
