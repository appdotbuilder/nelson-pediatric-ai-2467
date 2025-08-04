
import { db } from '../db';
import { chatSessionsTable } from '../db/schema';
import { type UpdateChatSessionInput, type ChatSession } from '../schema';
import { eq } from 'drizzle-orm';

export const updateChatSession = async (input: UpdateChatSessionInput): Promise<ChatSession> => {
  try {
    // Build update object with only provided fields
    const updateData: { title?: string; updated_at: Date } = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    // Update chat session record
    const result = await db.update(chatSessionsTable)
      .set(updateData)
      .where(eq(chatSessionsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Chat session with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Chat session update failed:', error);
    throw error;
  }
};
