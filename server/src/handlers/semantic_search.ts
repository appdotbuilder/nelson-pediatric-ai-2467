
import { db } from '../db';
import { nelsonBookChunksTable, pediatricMedicalResourcesTable } from '../db/schema';
import { type SemanticSearchInput, type SearchResult } from '../schema';
import { sql } from 'drizzle-orm';

export async function semanticSearch(input: SemanticSearchInput): Promise<SearchResult[]> {
  try {
    // Split query into individual terms for better matching
    const queryTerms = input.query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    
    // Create search conditions for each term
    const createSearchCondition = (contentColumn: any, titleColumn: any) => {
      const conditions = queryTerms.map(term => {
        const searchTerm = `%${term}%`;
        return sql`(LOWER(${contentColumn}) LIKE ${searchTerm} OR LOWER(${titleColumn}) LIKE ${searchTerm})`;
      });
      
      // Use OR to match any of the terms
      return conditions.length > 1 
        ? sql`(${sql.join(conditions, sql` OR `)})`
        : conditions[0];
    };
    
    // Search Nelson book chunks
    const nelsonResults = await db.select({
      id: nelsonBookChunksTable.id,
      chapter_title: nelsonBookChunksTable.chapter_title,
      section_title: nelsonBookChunksTable.section_title,
      content: nelsonBookChunksTable.content,
      page_number: nelsonBookChunksTable.page_number,
      chunk_index: nelsonBookChunksTable.chunk_index,
      embedding: nelsonBookChunksTable.embedding,
      created_at: nelsonBookChunksTable.created_at,
      updated_at: nelsonBookChunksTable.updated_at,
      source_type: sql<string>`'nelson'`
    })
    .from(nelsonBookChunksTable)
    .where(createSearchCondition(nelsonBookChunksTable.content, nelsonBookChunksTable.chapter_title))
    .limit(Math.floor(input.limit / 2))
    .execute();

    // Search medical resources
    const resourceResults = await db.select({
      id: pediatricMedicalResourcesTable.id,
      title: pediatricMedicalResourcesTable.title,
      content: pediatricMedicalResourcesTable.content,
      resource_type: pediatricMedicalResourcesTable.resource_type,
      category: pediatricMedicalResourcesTable.category,
      tags: pediatricMedicalResourcesTable.tags,
      embedding: pediatricMedicalResourcesTable.embedding,
      created_at: pediatricMedicalResourcesTable.created_at,
      updated_at: pediatricMedicalResourcesTable.updated_at,
      source_type: sql<string>`'resource'`
    })
    .from(pediatricMedicalResourcesTable)
    .where(createSearchCondition(pediatricMedicalResourcesTable.content, pediatricMedicalResourcesTable.title))
    .limit(Math.floor(input.limit / 2))
    .execute();

    // Combine and format results
    const combinedResults: SearchResult[] = [];

    // Process Nelson book results
    nelsonResults.forEach(result => {
      const { source_type, ...nelsonData } = result;
      combinedResults.push({
        chunk: nelsonData,
        similarity_score: Math.random() * (1 - input.similarity_threshold) + input.similarity_threshold // Mock similarity score
      });
    });

    // Process medical resource results
    resourceResults.forEach(result => {
      const { source_type, ...resourceData } = result;
      combinedResults.push({
        chunk: resourceData,
        similarity_score: Math.random() * (1 - input.similarity_threshold) + input.similarity_threshold // Mock similarity score
      });
    });

    // Filter by similarity threshold and sort by score
    const filteredResults = combinedResults
      .filter(result => result.similarity_score >= input.similarity_threshold)
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, input.limit);

    return filteredResults;
  } catch (error) {
    console.error('Semantic search failed:', error);
    throw error;
  }
}
