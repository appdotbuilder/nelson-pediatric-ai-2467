
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatSessionsTable, chatMessagesTable } from '../db/schema';
import { getChatMessages } from '../handlers/get_chat_messages';

describe('getChatMessages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return messages for a session in chronological order', async () => {
    // Create test session
    await db.insert(chatSessionsTable)
      .values({
        id: 'session1',
        user_id: 'user1',
        title: 'Test Chat'
      })
      .execute();

    // Create messages with different timestamps
    const baseTime = new Date('2024-01-01T10:00:00Z');
    const message1Time = new Date(baseTime.getTime() + 1000); // +1 second
    const message2Time = new Date(baseTime.getTime() + 2000); // +2 seconds
    const message3Time = new Date(baseTime.getTime() + 3000); // +3 seconds

    await db.insert(chatMessagesTable)
      .values([
        {
          id: 'msg3',
          session_id: 'session1',
          role: 'assistant',
          content: 'Third message',
          created_at: message3Time
        },
        {
          id: 'msg1',
          session_id: 'session1',
          role: 'user',
          content: 'First message',
          created_at: message1Time
        },
        {
          id: 'msg2',
          session_id: 'session1',
          role: 'assistant',
          content: 'Second message',
          created_at: message2Time
        }
      ])
      .execute();

    const result = await getChatMessages('session1');

    expect(result).toHaveLength(3);
    
    // Verify chronological order
    expect(result[0].content).toEqual('First message');
    expect(result[0].role).toEqual('user');
    expect(result[1].content).toEqual('Second message');
    expect(result[1].role).toEqual('assistant');
    expect(result[2].content).toEqual('Third message');
    expect(result[2].role).toEqual('assistant');

    // Verify timestamps are in order
    expect(result[0].created_at.getTime()).toBeLessThan(result[1].created_at.getTime());
    expect(result[1].created_at.getTime()).toBeLessThan(result[2].created_at.getTime());
  });

  it('should return empty array for non-existent session', async () => {
    const result = await getChatMessages('nonexistent');
    expect(result).toHaveLength(0);
  });

  it('should return empty array for session with no messages', async () => {
    // Create session without messages
    await db.insert(chatSessionsTable)
      .values({
        id: 'empty-session',
        user_id: 'user1',
        title: 'Empty Chat'
      })
      .execute();

    const result = await getChatMessages('empty-session');
    expect(result).toHaveLength(0);
  });

  it('should only return messages for the specified session', async () => {
    // Create multiple sessions
    await db.insert(chatSessionsTable)
      .values([
        {
          id: 'session1',
          user_id: 'user1',
          title: 'Session 1'
        },
        {
          id: 'session2',
          user_id: 'user1',
          title: 'Session 2'
        }
      ])
      .execute();

    // Create messages for both sessions
    await db.insert(chatMessagesTable)
      .values([
        {
          id: 'msg1',
          session_id: 'session1',
          role: 'user',
          content: 'Message for session 1'
        },
        {
          id: 'msg2',
          session_id: 'session2',
          role: 'user',
          content: 'Message for session 2'
        },
        {
          id: 'msg3',
          session_id: 'session1',
          role: 'assistant',
          content: 'Another message for session 1'
        }
      ])
      .execute();

    const result = await getChatMessages('session1');

    expect(result).toHaveLength(2);
    expect(result.every(msg => msg.session_id === 'session1')).toBe(true);
    expect(result.some(msg => msg.content === 'Message for session 1')).toBe(true);
    expect(result.some(msg => msg.content === 'Another message for session 1')).toBe(true);
    expect(result.some(msg => msg.content === 'Message for session 2')).toBe(false);
  });

  it('should handle messages with citations', async () => {
    // Create test session
    await db.insert(chatSessionsTable)
      .values({
        id: 'session1',
        user_id: 'user1',
        title: 'Test Chat'
      })
      .execute();

    // Create message with citations
    await db.insert(chatMessagesTable)
      .values({
        id: 'msg1',
        session_id: 'session1',
        role: 'assistant',
        content: 'Response with citations',
        citations: [
          {
            source: 'Nelson Textbook',
            page_number: 123,
            chunk_id: 'chunk1'
          },
          {
            source: 'Medical Protocol',
            chunk_id: 'chunk2'
          }
        ]
      })
      .execute();

    const result = await getChatMessages('session1');

    expect(result).toHaveLength(1);
    expect(result[0].citations).toHaveLength(2);
    expect(result[0].citations![0].source).toEqual('Nelson Textbook');
    expect(result[0].citations![0].page_number).toEqual(123);
    expect(result[0].citations![0].chunk_id).toEqual('chunk1');
    expect(result[0].citations![1].source).toEqual('Medical Protocol');
    expect(result[0].citations![1].page_number).toBeUndefined();
    expect(result[0].citations![1].chunk_id).toEqual('chunk2');
  });
});
