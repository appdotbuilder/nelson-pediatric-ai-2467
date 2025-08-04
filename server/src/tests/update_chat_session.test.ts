
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatSessionsTable } from '../db/schema';
import { type UpdateChatSessionInput } from '../schema';
import { updateChatSession } from '../handlers/update_chat_session';
import { eq } from 'drizzle-orm';

describe('updateChatSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update chat session title', async () => {
    // Create test chat session directly in database
    const sessionId = 'test-session-123';
    await db.insert(chatSessionsTable)
      .values({
        id: sessionId,
        user_id: 'user123',
        title: 'Original Title'
      })
      .execute();

    // Update the session
    const updateInput: UpdateChatSessionInput = {
      id: sessionId,
      title: 'Updated Title'
    };
    const result = await updateChatSession(updateInput);

    // Verify updated fields
    expect(result.id).toEqual(sessionId);
    expect(result.user_id).toEqual('user123');
    expect(result.title).toEqual('Updated Title');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updates to database', async () => {
    // Create test chat session directly in database
    const sessionId = 'test-session-456';
    const originalDate = new Date();
    await db.insert(chatSessionsTable)
      .values({
        id: sessionId,
        user_id: 'user123',
        title: 'Original Title',
        created_at: originalDate,
        updated_at: originalDate
      })
      .execute();

    // Update the session
    const updateInput: UpdateChatSessionInput = {
      id: sessionId,
      title: 'Database Updated Title'
    };
    await updateChatSession(updateInput);

    // Query database to verify update
    const sessions = await db.select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.id, sessionId))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].title).toEqual('Database Updated Title');
    expect(sessions[0].user_id).toEqual('user123');
    expect(sessions[0].updated_at.getTime()).toBeGreaterThan(originalDate.getTime());
  });

  it('should update only provided fields', async () => {
    // Create test chat session directly in database
    const sessionId = 'test-session-789';
    const originalDate = new Date();
    await db.insert(chatSessionsTable)
      .values({
        id: sessionId,
        user_id: 'user123',
        title: 'Original Title',
        created_at: originalDate,
        updated_at: originalDate
      })
      .execute();

    // Update with partial data (only title)
    const updateInput: UpdateChatSessionInput = {
      id: sessionId,
      title: 'Partial Update Title'
    };
    const result = await updateChatSession(updateInput);

    // Verify only title was updated, other fields remain unchanged
    expect(result.title).toEqual('Partial Update Title');
    expect(result.user_id).toEqual('user123');
    expect(result.created_at).toEqual(originalDate);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalDate.getTime());
  });

  it('should throw error for non-existent session', async () => {
    const updateInput: UpdateChatSessionInput = {
      id: 'non-existent-id',
      title: 'New Title'
    };

    await expect(updateChatSession(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should update updated_at timestamp even without other changes', async () => {
    // Create test chat session directly in database
    const sessionId = 'test-session-update-time';
    const originalDate = new Date();
    await db.insert(chatSessionsTable)
      .values({
        id: sessionId,
        user_id: 'user123',
        title: 'Original Title',
        created_at: originalDate,
        updated_at: originalDate
      })
      .execute();

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update without changing any fields (empty update)
    const updateInput: UpdateChatSessionInput = {
      id: sessionId
    };
    const result = await updateChatSession(updateInput);

    // Verify updated_at was changed even without field updates
    expect(result.title).toEqual('Original Title');
    expect(result.user_id).toEqual('user123');
    expect(result.created_at).toEqual(originalDate);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalDate.getTime());
  });
});
