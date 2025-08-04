
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { nelsonBookChunksTable } from '../db/schema';
import { type CreateNelsonBookChunkInput } from '../schema';
import { createNelsonBookChunk } from '../handlers/create_nelson_book_chunk';
import { eq } from 'drizzle-orm';

// Test input with embedding
const testInputWithEmbedding: CreateNelsonBookChunkInput = {
  id: 'chunk-001',
  chapter_title: 'Growth and Development',
  section_title: 'Physical Growth',
  content: 'Normal growth patterns in pediatric patients involve consistent increases in height and weight.',
  page_number: 125,
  chunk_index: 0,
  embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
};

// Test input without embedding
const testInputWithoutEmbedding: CreateNelsonBookChunkInput = {
  id: 'chunk-002',
  chapter_title: 'Infectious Diseases',
  section_title: null,
  content: 'Common pediatric infections require prompt diagnosis and appropriate treatment.',
  page_number: 350,
  chunk_index: 1
};

describe('createNelsonBookChunk', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a nelson book chunk with embedding', async () => {
    const result = await createNelsonBookChunk(testInputWithEmbedding);

    // Basic field validation
    expect(result.id).toEqual('chunk-001');
    expect(result.chapter_title).toEqual('Growth and Development');
    expect(result.section_title).toEqual('Physical Growth');
    expect(result.content).toEqual(testInputWithEmbedding.content);
    expect(result.page_number).toEqual(125);
    expect(result.chunk_index).toEqual(0);
    expect(result.embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a nelson book chunk without embedding', async () => {
    const result = await createNelsonBookChunk(testInputWithoutEmbedding);

    // Basic field validation
    expect(result.id).toEqual('chunk-002');
    expect(result.chapter_title).toEqual('Infectious Diseases');
    expect(result.section_title).toBeNull();
    expect(result.content).toEqual(testInputWithoutEmbedding.content);
    expect(result.page_number).toEqual(350);
    expect(result.chunk_index).toEqual(1);
    expect(result.embedding).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save nelson book chunk to database', async () => {
    const result = await createNelsonBookChunk(testInputWithEmbedding);

    // Query using proper drizzle syntax
    const chunks = await db.select()
      .from(nelsonBookChunksTable)
      .where(eq(nelsonBookChunksTable.id, result.id))
      .execute();

    expect(chunks).toHaveLength(1);
    expect(chunks[0].id).toEqual('chunk-001');
    expect(chunks[0].chapter_title).toEqual('Growth and Development');
    expect(chunks[0].section_title).toEqual('Physical Growth');
    expect(chunks[0].content).toEqual(testInputWithEmbedding.content);
    expect(chunks[0].page_number).toEqual(125);
    expect(chunks[0].chunk_index).toEqual(0);
    expect(chunks[0].embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    expect(chunks[0].created_at).toBeInstanceOf(Date);
    expect(chunks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle duplicate id constraint', async () => {
    // Create first chunk
    await createNelsonBookChunk(testInputWithEmbedding);

    // Attempt to create chunk with same id
    await expect(createNelsonBookChunk(testInputWithEmbedding))
      .rejects
      .toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should handle null section_title correctly', async () => {
    const result = await createNelsonBookChunk(testInputWithoutEmbedding);

    const chunks = await db.select()
      .from(nelsonBookChunksTable)
      .where(eq(nelsonBookChunksTable.id, result.id))
      .execute();

    expect(chunks[0].section_title).toBeNull();
  });
});
