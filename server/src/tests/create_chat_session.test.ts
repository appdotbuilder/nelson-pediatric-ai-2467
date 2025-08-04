
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatSessionsTable } from '../db/schema';
import { type CreateChatSessionInput } from '../schema';
import { createChatSession } from '../handlers/create_chat_session';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateChatSessionInput = {
  user_id: 'user_123',
  title: 'Test Chat Session'
};

describe('createChatSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a chat session', async () => {
    const result = await createChatSession(testInput);

    // Basic field validation
    expect(result.user_id).toEqual('user_123');
    expect(result.title).toEqual('Test Chat Session');
    expect(result.id).toBeDefined();
    expect(result.id).toMatch(/^session_\d+_[a-z0-9]+$/);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save chat session to database', async () => {
    const result = await createChatSession(testInput);

    // Query using proper drizzle syntax
    const sessions = await db.select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.id, result.id))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].user_id).toEqual('user_123');
    expect(sessions[0].title).toEqual('Test Chat Session');
    expect(sessions[0].created_at).toBeInstanceOf(Date);
    expect(sessions[0].updated_at).toBeInstanceOf(Date);
  });

  it('should generate unique session IDs', async () => {
    const result1 = await createChatSession(testInput);
    const result2 = await createChatSession(testInput);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.id).toMatch(/^session_\d+_[a-z0-9]+$/);
    expect(result2.id).toMatch(/^session_\d+_[a-z0-9]+$/);
  });

  it('should handle different user IDs and titles', async () => {
    const input1: CreateChatSessionInput = {
      user_id: 'user_456',
      title: 'Pediatric Emergency Cases'
    };

    const input2: CreateChatSessionInput = {
      user_id: 'user_789',
      title: 'Nelson Chapter Discussion'
    };

    const result1 = await createChatSession(input1);
    const result2 = await createChatSession(input2);

    expect(result1.user_id).toEqual('user_456');
    expect(result1.title).toEqual('Pediatric Emergency Cases');
    expect(result2.user_id).toEqual('user_789');
    expect(result2.title).toEqual('Nelson Chapter Discussion');

    // Verify both are saved to database
    const allSessions = await db.select()
      .from(chatSessionsTable)
      .execute();

    expect(allSessions).toHaveLength(2);
  });
});
