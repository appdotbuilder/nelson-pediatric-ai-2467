
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { nelsonBookChunksTable, pediatricMedicalResourcesTable } from '../db/schema';
import { type SemanticSearchInput } from '../schema';
import { semanticSearch } from '../handlers/semantic_search';

// Test data
const testNelsonChunk = {
  id: 'nelson-1',
  chapter_title: 'Pediatric Cardiology',
  section_title: 'Heart Defects',
  content: 'Congenital heart disease affects many children and requires careful diagnosis',
  page_number: 245,
  chunk_index: 0,
  embedding: [0.1, 0.2, 0.3]
};

const testMedicalResource = {
  id: 'resource-1',
  title: 'Cardiac Assessment Protocol',
  content: 'Protocol for assessing heart conditions in pediatric patients',
  resource_type: 'protocol' as const,
  category: 'cardiology',
  tags: ['heart', 'pediatric', 'assessment'],
  embedding: [0.4, 0.5, 0.6]
};

describe('semanticSearch', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should search Nelson book chunks by content', async () => {
    // Create test data
    await db.insert(nelsonBookChunksTable).values(testNelsonChunk).execute();

    const input: SemanticSearchInput = {
      query: 'heart',
      limit: 10,
      similarity_threshold: 0.5
    };

    const results = await semanticSearch(input);

    expect(results.length).toBeGreaterThan(0);
    const result = results[0];
    expect(result.chunk.id).toEqual('nelson-1');
    expect(result.similarity_score).toBeGreaterThanOrEqual(0.5);
    expect(result.similarity_score).toBeLessThanOrEqual(1);
    
    // Verify Nelson chunk structure
    if ('chapter_title' in result.chunk) {
      expect(result.chunk.chapter_title).toEqual('Pediatric Cardiology');
      expect(result.chunk.content).toEqual('Congenital heart disease affects many children and requires careful diagnosis');
    }
  });

  it('should search medical resources by title and content', async () => {
    // Create test data
    await db.insert(pediatricMedicalResourcesTable).values(testMedicalResource).execute();

    const input: SemanticSearchInput = {
      query: 'cardiac',
      limit: 10,
      similarity_threshold: 0.5
    };

    const results = await semanticSearch(input);

    expect(results.length).toBeGreaterThan(0);
    const result = results[0];
    expect(result.chunk.id).toEqual('resource-1');
    expect(result.similarity_score).toBeGreaterThanOrEqual(0.5);
    
    // Verify medical resource structure
    if ('resource_type' in result.chunk) {
      expect(result.chunk.title).toEqual('Cardiac Assessment Protocol');
      expect(result.chunk.resource_type).toEqual('protocol');
      expect(result.chunk.category).toEqual('cardiology');
    }
  });

  it('should combine results from both sources', async () => {
    // Create test data in both tables
    await db.insert(nelsonBookChunksTable).values(testNelsonChunk).execute();
    await db.insert(pediatricMedicalResourcesTable).values(testMedicalResource).execute();

    const input: SemanticSearchInput = {
      query: 'heart',
      limit: 10,
      similarity_threshold: 0.5
    };

    const results = await semanticSearch(input);

    expect(results.length).toEqual(2);
    
    // Should have one of each type
    const chunkIds = results.map(r => r.chunk.id);
    expect(chunkIds).toContain('nelson-1');
    expect(chunkIds).toContain('resource-1');
  });

  it('should respect similarity threshold', async () => {
    // Create test data
    await db.insert(nelsonBookChunksTable).values(testNelsonChunk).execute();

    const input: SemanticSearchInput = {
      query: 'heart',
      limit: 10,
      similarity_threshold: 0.99 // Very high threshold
    };

    const results = await semanticSearch(input);

    // All results should meet the threshold
    results.forEach(result => {
      expect(result.similarity_score).toBeGreaterThanOrEqual(0.99);
    });
  });

  it('should respect limit parameter', async () => {
    // Create multiple test records
    const chunks = Array.from({ length: 5 }, (_, i) => ({
      ...testNelsonChunk,
      id: `nelson-${i}`,
      content: `Heart disease content ${i}`
    }));

    await db.insert(nelsonBookChunksTable).values(chunks).execute();

    const input: SemanticSearchInput = {
      query: 'heart',
      limit: 3,
      similarity_threshold: 0.5
    };

    const results = await semanticSearch(input);

    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('should return empty array when no matches found', async () => {
    // Create test data
    await db.insert(nelsonBookChunksTable).values(testNelsonChunk).execute();

    const input: SemanticSearchInput = {
      query: 'completely unrelated query about astronomy',
      limit: 10,
      similarity_threshold: 0.5
    };

    const results = await semanticSearch(input);

    expect(results).toEqual([]);
  });

  it('should handle case insensitive searches', async () => {
    // Create test data
    await db.insert(nelsonBookChunksTable).values(testNelsonChunk).execute();

    const input: SemanticSearchInput = {
      query: 'HEART',
      limit: 10,
      similarity_threshold: 0.5
    };

    const results = await semanticSearch(input);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].chunk.id).toEqual('nelson-1');
  });

  it('should handle multi-word queries', async () => {
    // Create test data
    await db.insert(nelsonBookChunksTable).values(testNelsonChunk).execute();

    const input: SemanticSearchInput = {
      query: 'heart disease',
      limit: 10,
      similarity_threshold: 0.5
    };

    const results = await semanticSearch(input);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].chunk.id).toEqual('nelson-1');
  });
});
