
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  chatSessionsTable, 
  chatMessagesTable, 
  nelsonBookChunksTable, 
  pediatricMedicalResourcesTable 
} from '../db/schema';
import { type ChatQueryInput } from '../schema';
import { processChatQuery } from '../handlers/process_chat_query';
import { eq } from 'drizzle-orm';

// Test data
const testSessionId = 'session_test_123';
const testUserId = 'user_test_456';

const createTestSession = async () => {
  await db.insert(chatSessionsTable).values({
    id: testSessionId,
    user_id: testUserId,
    title: 'Test Chat Session',
    created_at: new Date(),
    updated_at: new Date()
  }).execute();
};

const createTestNelsonChunk = async () => {
  await db.insert(nelsonBookChunksTable).values({
    id: 'chunk_asthma_001',
    chapter_title: 'Respiratory Disorders',
    section_title: 'Pediatric Asthma',
    content: 'Asthma is a chronic respiratory condition affecting many children. Management includes bronchodilators and anti-inflammatory medications.',
    page_number: 245,
    chunk_index: 1,
    embedding: null,
    created_at: new Date(),
    updated_at: new Date()
  }).execute();
};

const createTestMedicalResource = async () => {
  await db.insert(pediatricMedicalResourcesTable).values({
    id: 'resource_fever_protocol',
    title: 'Pediatric Fever Management Protocol',
    content: 'Guidelines for managing fever in pediatric patients including temperature thresholds and medication dosing.',
    resource_type: 'protocol',
    category: 'Emergency Medicine',
    tags: ['fever', 'emergency', 'pediatric'],
    embedding: null,
    created_at: new Date(),
    updated_at: new Date()
  }).execute();
};

describe('processChatQuery', () => {
  beforeEach(async () => {
    await createDB();
    await createTestSession();
  });
  
  afterEach(resetDB);

  it('should process a basic chat query and save messages', async () => {
    const input: ChatQueryInput = {
      session_id: testSessionId,
      message: 'What are the symptoms of asthma in children?'
    };

    const result = await processChatQuery(input);

    // Verify response structure
    expect(result.message).toBeDefined();
    expect(result.message.session_id).toEqual(testSessionId);
    expect(result.message.role).toEqual('assistant');
    expect(result.message.content).toContain('pediatric');
    expect(result.message.id).toBeDefined();
    expect(result.message.created_at).toBeInstanceOf(Date);
    expect(result.sources).toBeDefined();
    expect(Array.isArray(result.sources)).toBe(true);

    // Verify messages were saved to database
    const messages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.session_id, testSessionId))
      .execute();

    expect(messages).toHaveLength(2); // User message + assistant message
    
    const userMessage = messages.find(m => m.role === 'user');
    const assistantMessage = messages.find(m => m.role === 'assistant');

    expect(userMessage).toBeDefined();
    expect(userMessage!.content).toEqual(input.message);
    expect(userMessage!.citations).toBeNull();

    expect(assistantMessage).toBeDefined();
    expect(assistantMessage!.content).toEqual(result.message.content);
    expect(assistantMessage!.id).toEqual(result.message.id);
  });

  it('should include relevant sources when knowledge base has matching content', async () => {
    // Create test data with matching content
    await createTestNelsonChunk();
    await createTestMedicalResource();

    const input: ChatQueryInput = {
      session_id: testSessionId,
      message: 'Tell me about asthma management in children'
    };

    const result = await processChatQuery(input);

    // Should find relevant sources
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.message.citations).not.toBeNull();
    expect(result.message.citations!.length).toBeGreaterThan(0);

    // Verify citation structure
    const citation = result.message.citations![0];
    expect(citation.source).toBeDefined();
    expect(citation.chunk_id).toBeDefined();
    
    // Should include page number for Nelson book chunks
    if (citation.page_number) {
      expect(typeof citation.page_number).toBe('number');
    }

    // Verify source structure
    const source = result.sources[0];
    expect(source.chunk).toBeDefined();
    expect(typeof source.similarity_score).toBe('number');
    expect(source.similarity_score).toBeGreaterThan(0);
    expect(source.similarity_score).toBeLessThanOrEqual(1);
  });

  it('should handle queries with no matching content gracefully', async () => {
    const input: ChatQueryInput = {
      session_id: testSessionId,
      message: 'What is quantum mechanics in pediatrics?'
    };

    const result = await processChatQuery(input);

    // Should still generate a response
    expect(result.message.content).toContain("couldn't find specific information");
    expect(result.message.citations).toBeNull();
    expect(result.sources).toHaveLength(0);

    // Messages should still be saved
    const messages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.session_id, testSessionId))
      .execute();

    expect(messages).toHaveLength(2);
  });

  it('should handle multiple relevant sources correctly', async () => {
    // Create multiple test chunks and resources with overlapping content
    await createTestNelsonChunk();
    await createTestMedicalResource();
    
    // Create additional Nelson chunk with respiratory content
    await db.insert(nelsonBookChunksTable).values({
      id: 'chunk_respiratory_002',
      chapter_title: 'Pulmonary Function',
      section_title: 'Breathing Assessment',
      content: 'Assessment of respiratory function in pediatric patients includes monitoring breathing patterns and oxygen saturation.',
      page_number: 158,
      chunk_index: 2,
      embedding: null,
      created_at: new Date(),
      updated_at: new Date()
    }).execute();

    // Create additional medical resource with respiratory content
    await db.insert(pediatricMedicalResourcesTable).values({
      id: 'resource_respiratory_protocol',
      title: 'Respiratory Assessment Guidelines',
      content: 'Comprehensive guidelines for respiratory assessment in pediatric emergency settings.',
      resource_type: 'guideline',
      category: 'Respiratory Medicine',
      tags: ['respiratory', 'assessment', 'pediatric'],
      embedding: null,
      created_at: new Date(),
      updated_at: new Date()
    }).execute();

    const input: ChatQueryInput = {
      session_id: testSessionId,
      message: 'respiratory assessment protocols pediatric'
    };

    const result = await processChatQuery(input);

    // Should find multiple sources
    expect(result.sources.length).toBeGreaterThan(1);
    expect(result.message.citations).not.toBeNull();
    expect(result.message.citations!.length).toBeGreaterThan(1);

    // Should include both Nelson chunks and medical resources
    const nelsonSources = result.sources.filter(s => 'chapter_title' in s.chunk);
    const resourceSources = result.sources.filter(s => 'resource_type' in s.chunk);
    
    expect(nelsonSources.length).toBeGreaterThan(0);
    expect(resourceSources.length).toBeGreaterThan(0);
  });

  it('should preserve message order and timestamps', async () => {
    const input: ChatQueryInput = {
      session_id: testSessionId,
      message: 'Test message for timing'
    };

    const startTime = new Date();
    const result = await processChatQuery(input);
    const endTime = new Date();

    // Verify timestamps are reasonable
    expect(result.message.created_at.getTime()).toBeGreaterThanOrEqual(startTime.getTime());
    expect(result.message.created_at.getTime()).toBeLessThanOrEqual(endTime.getTime());

    // Verify messages in database have correct order
    const messages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.session_id, testSessionId))
      .execute();

    expect(messages).toHaveLength(2);
    
    // User message should come first (or at least have same timestamp)
    const userMessage = messages.find(m => m.role === 'user')!;
    const assistantMessage = messages.find(m => m.role === 'assistant')!;
    
    expect(userMessage.created_at.getTime()).toBeLessThanOrEqual(assistantMessage.created_at.getTime());
  });
});
