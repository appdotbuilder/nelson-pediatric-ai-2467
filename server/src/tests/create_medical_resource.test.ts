
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { pediatricMedicalResourcesTable } from '../db/schema';
import { type CreatePediatricMedicalResourceInput } from '../schema';
import { createMedicalResource } from '../handlers/create_medical_resource';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreatePediatricMedicalResourceInput = {
  id: 'test-resource-1',
  title: 'Pediatric Fever Management Protocol',
  content: 'Complete protocol for managing fever in pediatric patients including assessment criteria, medication dosing, and monitoring guidelines.',
  resource_type: 'protocol',
  category: 'emergency_medicine',
  tags: ['fever', 'pediatric', 'emergency', 'protocol']
};

// Test input with embedding
const testInputWithEmbedding: CreatePediatricMedicalResourceInput = {
  id: 'test-resource-2',
  title: 'Asthma Management Guidelines',
  content: 'Comprehensive guidelines for pediatric asthma management including diagnosis, treatment, and follow-up care.',
  resource_type: 'guideline',
  category: 'respiratory',
  tags: ['asthma', 'respiratory', 'chronic_care'],
  embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
};

describe('createMedicalResource', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a medical resource without embedding', async () => {
    const result = await createMedicalResource(testInput);

    // Basic field validation
    expect(result.id).toEqual('test-resource-1');
    expect(result.title).toEqual('Pediatric Fever Management Protocol');
    expect(result.content).toEqual(testInput.content);
    expect(result.resource_type).toEqual('protocol');
    expect(result.category).toEqual('emergency_medicine');
    expect(result.tags).toEqual(['fever', 'pediatric', 'emergency', 'protocol']);
    expect(result.embedding).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a medical resource with embedding', async () => {
    const result = await createMedicalResource(testInputWithEmbedding);

    // Basic field validation including embedding
    expect(result.id).toEqual('test-resource-2');
    expect(result.title).toEqual('Asthma Management Guidelines');
    expect(result.content).toEqual(testInputWithEmbedding.content);
    expect(result.resource_type).toEqual('guideline');
    expect(result.category).toEqual('respiratory');
    expect(result.tags).toEqual(['asthma', 'respiratory', 'chronic_care']);
    expect(result.embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save medical resource to database', async () => {
    const result = await createMedicalResource(testInput);

    // Query database to verify record was saved
    const resources = await db.select()
      .from(pediatricMedicalResourcesTable)
      .where(eq(pediatricMedicalResourcesTable.id, result.id))
      .execute();

    expect(resources).toHaveLength(1);
    expect(resources[0].id).toEqual('test-resource-1');
    expect(resources[0].title).toEqual('Pediatric Fever Management Protocol');
    expect(resources[0].content).toEqual(testInput.content);
    expect(resources[0].resource_type).toEqual('protocol');
    expect(resources[0].category).toEqual('emergency_medicine');
    expect(resources[0].tags).toEqual(['fever', 'pediatric', 'emergency', 'protocol']);
    expect(resources[0].embedding).toBeNull();
    expect(resources[0].created_at).toBeInstanceOf(Date);
    expect(resources[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle all resource types correctly', async () => {
    const resourceTypes = ['protocol', 'guideline', 'reference', 'calculation'] as const;

    for (const resourceType of resourceTypes) {
      const input: CreatePediatricMedicalResourceInput = {
        id: `test-${resourceType}`,
        title: `Test ${resourceType}`,
        content: `Content for ${resourceType}`,
        resource_type: resourceType,
        category: 'test_category',
        tags: [resourceType, 'test']
      };

      const result = await createMedicalResource(input);
      expect(result.resource_type).toEqual(resourceType);
      expect(result.id).toEqual(`test-${resourceType}`);
    }
  });

  it('should handle empty tags array', async () => {
    const inputWithEmptyTags: CreatePediatricMedicalResourceInput = {
      id: 'test-empty-tags',
      title: 'Resource with no tags',
      content: 'Content without any tags',
      resource_type: 'reference',
      category: 'general',
      tags: []
    };

    const result = await createMedicalResource(inputWithEmptyTags);

    expect(result.tags).toEqual([]);
    expect(result.id).toEqual('test-empty-tags');
    expect(result.resource_type).toEqual('reference');
  });
});
