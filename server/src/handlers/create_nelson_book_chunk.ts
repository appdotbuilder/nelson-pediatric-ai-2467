
import { db } from '../db';
import { nelsonBookChunksTable } from '../db/schema';
import { type CreateNelsonBookChunkInput, type NelsonBookChunk } from '../schema';

export const createNelsonBookChunk = async (input: CreateNelsonBookChunkInput): Promise<NelsonBookChunk> => {
  try {
    // Insert nelson book chunk record
    const result = await db.insert(nelsonBookChunksTable)
      .values({
        id: input.id,
        chapter_title: input.chapter_title,
        section_title: input.section_title,
        content: input.content,
        page_number: input.page_number,
        chunk_index: input.chunk_index,
        embedding: input.embedding || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Nelson book chunk creation failed:', error);
    throw error;
  }
};
