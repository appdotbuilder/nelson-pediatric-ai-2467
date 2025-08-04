
import { db } from '../db';
import { pediatricMedicalResourcesTable } from '../db/schema';
import { type CreatePediatricMedicalResourceInput, type PediatricMedicalResource } from '../schema';

export const createMedicalResource = async (input: CreatePediatricMedicalResourceInput): Promise<PediatricMedicalResource> => {
  try {
    // Insert medical resource record
    const result = await db.insert(pediatricMedicalResourcesTable)
      .values({
        id: input.id,
        title: input.title,
        content: input.content,
        resource_type: input.resource_type,
        category: input.category,
        tags: input.tags,
        embedding: input.embedding || null
      })
      .returning()
      .execute();

    const resource = result[0];
    return resource;
  } catch (error) {
    console.error('Medical resource creation failed:', error);
    throw error;
  }
};
