
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatMessagesTable, chatSessionsTable } from '../db/schema';
import { type CreateChatMessageInput } from '../schema';
import { createChatMessage } from '../handlers/create_chat_message';
import { eq } from 'drizzle-orm';

// Test chat session to use as prerequisite
const testSession = {
  id: 'session_123',
  user_id: 'user_456',
  title: 'Test Chat Session'
};

// Test input for user message
const userMessageInput: CreateChatMessageInput = {
  session_id: 'session_123',
  role: 'user',
  content: 'What are the symptoms of pneumonia in children?'
};

// Test input for assistant message with citations
const assistantMessageInput: CreateChatMessageInput = {
  session_id: 'session_123',
  role: 'assistant',
  content: 'Common symptoms include fever, cough, and difficulty breathing.',
  citations: [
    {
      source: 'Nelson Textbook of Pediatrics',
      page_number: 245,
      chunk_id: 'chunk_abc123'
    },
    {
      source: 'Pediatric Protocol',
      chunk_id: 'chunk_def456'
    }
  ]
};

describe('createChatMessage', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create prerequisite chat session
    await db.insert(chatSessionsTable)
      .values(testSession)
      .execute();
  });
  
  afterEach(resetDB);

  it('should create a user message', async () => {
    const result = await createChatMessage(userMessageInput);

    // Basic field validation
    expect(result.session_id).toEqual('session_123');
    expect(result.role).toEqual('user');
    expect(result.content).toEqual('What are the symptoms of pneumonia in children?');
    expect(result.citations).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an assistant message with citations', async () => {
    const result = await createChatMessage(assistantMessageInput);

    // Basic field validation
    expect(result.session_id).toEqual('session_123');
    expect(result.role).toEqual('assistant');
    expect(result.content).toEqual('Common symptoms include fever, cough, and difficulty breathing.');
    expect(result.citations).toHaveLength(2);
    expect(result.citations![0].source).toEqual('Nelson Textbook of Pediatrics');
    expect(result.citations![0].page_number).toEqual(245);
    expect(result.citations![0].chunk_id).toEqual('chunk_abc123');
    expect(result.citations![1].source).toEqual('Pediatric Protocol');
    expect(result.citations![1].page_number).toBeUndefined();
    expect(result.citations![1].chunk_id).toEqual('chunk_def456');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save message to database', async () => {
    const result = await createChatMessage(userMessageInput);

    // Query using proper drizzle syntax
    const messages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].session_id).toEqual('session_123');
    expect(messages[0].role).toEqual('user');
    expect(messages[0].content).toEqual('What are the symptoms of pneumonia in children?');
    expect(messages[0].citations).toBeNull();
    expect(messages[0].created_at).toBeInstanceOf(Date);
  });

  it('should save citations correctly', async () => {
    const result = await createChatMessage(assistantMessageInput);

    // Query the saved message
    const messages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    const savedMessage = messages[0];
    expect(savedMessage.citations).toHaveLength(2);
    expect(savedMessage.citations![0].source).toEqual('Nelson Textbook of Pediatrics');
    expect(savedMessage.citations![0].page_number).toEqual(245);
    expect(savedMessage.citations![0].chunk_id).toEqual('chunk_abc123');
    expect(savedMessage.citations![1].source).toEqual('Pediatric Protocol');
    expect(savedMessage.citations![1].page_number).toBeUndefined();
    expect(savedMessage.citations![1].chunk_id).toEqual('chunk_def456');
  });

  it('should handle message without citations', async () => {
    const messageWithoutCitations: CreateChatMessageInput = {
      session_id: 'session_123',
      role: 'assistant',
      content: 'I need more information to provide an accurate response.'
    };

    const result = await createChatMessage(messageWithoutCitations);

    expect(result.citations).toBeNull();
    expect(result.content).toEqual('I need more information to provide an accurate response.');
    expect(result.role).toEqual('assistant');
  });
});
