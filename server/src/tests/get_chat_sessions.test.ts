
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatSessionsTable } from '../db/schema';
import { getChatSessions } from '../handlers/get_chat_sessions';

describe('getChatSessions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no chat sessions', async () => {
    const result = await getChatSessions('user-123');
    expect(result).toEqual([]);
  });

  it('should return chat sessions for specific user', async () => {
    // Create test sessions for two different users
    await db.insert(chatSessionsTable).values([
      {
        id: 'session-1',
        user_id: 'user-123',
        title: 'First Chat'
      },
      {
        id: 'session-2',
        user_id: 'user-456',
        title: 'Other User Chat'
      },
      {
        id: 'session-3',
        user_id: 'user-123',
        title: 'Second Chat'
      }
    ]).execute();

    const result = await getChatSessions('user-123');

    expect(result).toHaveLength(2);
    expect(result.every(session => session.user_id === 'user-123')).toBe(true);
    
    const titles = result.map(session => session.title);
    expect(titles).toContain('First Chat');
    expect(titles).toContain('Second Chat');
    expect(titles).not.toContain('Other User Chat');
  });

  it('should return sessions ordered by most recent activity', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Create sessions with specific timestamps
    await db.insert(chatSessionsTable).values([
      {
        id: 'session-old',
        user_id: 'user-123',
        title: 'Oldest Chat',
        created_at: twoHoursAgo,
        updated_at: twoHoursAgo
      },
      {
        id: 'session-recent',
        user_id: 'user-123',
        title: 'Most Recent Chat',
        created_at: now,
        updated_at: now
      },
      {
        id: 'session-middle',
        user_id: 'user-123',
        title: 'Middle Chat',
        created_at: oneHourAgo,
        updated_at: oneHourAgo
      }
    ]).execute();

    const result = await getChatSessions('user-123');

    expect(result).toHaveLength(3);
    expect(result[0].title).toEqual('Most Recent Chat');
    expect(result[1].title).toEqual('Middle Chat');
    expect(result[2].title).toEqual('Oldest Chat');
  });

  it('should include all required fields in response', async () => {
    await db.insert(chatSessionsTable).values({
      id: 'session-1',
      user_id: 'user-123',
      title: 'Test Chat'
    }).execute();

    const result = await getChatSessions('user-123');

    expect(result).toHaveLength(1);
    const session = result[0];
    
    expect(session.id).toEqual('session-1');
    expect(session.user_id).toEqual('user-123');
    expect(session.title).toEqual('Test Chat');
    expect(session.created_at).toBeInstanceOf(Date);
    expect(session.updated_at).toBeInstanceOf(Date);
  });
});
