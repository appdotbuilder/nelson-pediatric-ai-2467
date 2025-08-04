
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatSessionsTable, chatMessagesTable } from '../db/schema';
import { deleteChatSession } from '../handlers/delete_chat_session';
import { eq } from 'drizzle-orm';

describe('deleteChatSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a chat session successfully', async () => {
    // Create test chat session
    const sessionId = 'test-session-123';
    await db.insert(chatSessionsTable).values({
      id: sessionId,
      user_id: 'user-123',
      title: 'Test Session'
    }).execute();

    // Delete the session
    const result = await deleteChatSession(sessionId);

    expect(result.success).toBe(true);

    // Verify session was deleted
    const sessions = await db.select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.id, sessionId))
      .execute();

    expect(sessions).toHaveLength(0);
  });

  it('should delete chat session and all associated messages', async () => {
    // Create test chat session
    const sessionId = 'test-session-456';
    await db.insert(chatSessionsTable).values({
      id: sessionId,
      user_id: 'user-456',
      title: 'Test Session with Messages'
    }).execute();

    // Create test messages for the session
    await db.insert(chatMessagesTable).values([
      {
        id: 'msg-1',
        session_id: sessionId,
        role: 'user',
        content: 'Hello, can you help me?'
      },
      {
        id: 'msg-2',
        session_id: sessionId,
        role: 'assistant',
        content: 'Of course! How can I assist you?',
        citations: [{ source: 'Nelson Chapter 1', chunk_id: 'chunk-1' }]
      }
    ]).execute();

    // Delete the session
    const result = await deleteChatSession(sessionId);

    expect(result.success).toBe(true);

    // Verify session was deleted
    const sessions = await db.select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.id, sessionId))
      .execute();

    expect(sessions).toHaveLength(0);

    // Verify all associated messages were deleted
    const messages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.session_id, sessionId))
      .execute();

    expect(messages).toHaveLength(0);
  });

  it('should return success even when deleting non-existent session', async () => {
    const result = await deleteChatSession('nonexistent-session');

    expect(result.success).toBe(true);
  });

  it('should not affect other sessions when deleting', async () => {
    // Create two test sessions
    const sessionId1 = 'session-1';
    const sessionId2 = 'session-2';
    
    await db.insert(chatSessionsTable).values([
      {
        id: sessionId1,
        user_id: 'user-1',
        title: 'Session 1'
      },
      {
        id: sessionId2,
        user_id: 'user-1',
        title: 'Session 2'
      }
    ]).execute();

    // Create messages for both sessions
    await db.insert(chatMessagesTable).values([
      {
        id: 'msg-1-1',
        session_id: sessionId1,
        role: 'user',
        content: 'Message in session 1'
      },
      {
        id: 'msg-2-1',
        session_id: sessionId2,
        role: 'user',
        content: 'Message in session 2'
      }
    ]).execute();

    // Delete only the first session
    const result = await deleteChatSession(sessionId1);

    expect(result.success).toBe(true);

    // Verify first session is deleted
    const deletedSessions = await db.select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.id, sessionId1))
      .execute();

    expect(deletedSessions).toHaveLength(0);

    // Verify second session still exists
    const remainingSessions = await db.select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.id, sessionId2))
      .execute();

    expect(remainingSessions).toHaveLength(1);
    expect(remainingSessions[0].title).toBe('Session 2');

    // Verify messages for second session still exist
    const remainingMessages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.session_id, sessionId2))
      .execute();

    expect(remainingMessages).toHaveLength(1);
    expect(remainingMessages[0].content).toBe('Message in session 2');
  });
});
