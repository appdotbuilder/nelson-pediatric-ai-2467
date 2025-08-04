
import { db } from '../db';
import { chatMessagesTable, nelsonBookChunksTable, pediatricMedicalResourcesTable } from '../db/schema';
import { type ChatQueryInput, type ChatResponse } from '../schema';
import { sql, desc, or } from 'drizzle-orm';

export async function processChatQuery(input: ChatQueryInput): Promise<ChatResponse> {
  try {
    // Generate unique IDs for the messages
    const userMessageId = `msg_${Date.now()}_user_${Math.random().toString(36).substring(2, 9)}`;
    const assistantMessageId = `msg_${Date.now()}_assistant_${Math.random().toString(36).substring(2, 9)}`;
    const currentTime = new Date();

    // Step 1: Save user message to database
    await db.insert(chatMessagesTable).values({
      id: userMessageId,
      session_id: input.session_id,
      role: 'user',
      content: input.message,
      citations: null,
      created_at: currentTime
    }).execute();

    // Step 2: Perform semantic search (simplified - would use vector similarity in real implementation)
    // Extract meaningful search terms and create more flexible search patterns
    const searchTerms = input.message.toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2 && !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(term));
    
    let relevantChunks: any[] = [];
    let relevantResources: any[] = [];

    if (searchTerms.length > 0) {
      // Create multiple search patterns for better matching
      const exactSearchPattern = searchTerms.join('|');
      const partialSearchPattern = searchTerms.map(term => `${term}`).join('|');

      // Search Nelson book chunks with broader matching
      const nelsonResults = await db.select()
        .from(nelsonBookChunksTable)
        .where(or(
          sql`LOWER(${nelsonBookChunksTable.content}) ~ ${exactSearchPattern}`,
          sql`LOWER(${nelsonBookChunksTable.chapter_title}) ~ ${partialSearchPattern}`,
          sql`LOWER(${nelsonBookChunksTable.section_title}) ~ ${partialSearchPattern}`
        ))
        .orderBy(desc(nelsonBookChunksTable.created_at))
        .limit(3)
        .execute();

      relevantChunks = nelsonResults;

      // Search medical resources with broader matching
      const resourceResults = await db.select()
        .from(pediatricMedicalResourcesTable)
        .where(or(
          sql`LOWER(${pediatricMedicalResourcesTable.content}) ~ ${exactSearchPattern}`,
          sql`LOWER(${pediatricMedicalResourcesTable.title}) ~ ${partialSearchPattern}`,
          sql`LOWER(${pediatricMedicalResourcesTable.category}) ~ ${partialSearchPattern}`
        ))
        .orderBy(desc(pediatricMedicalResourcesTable.created_at))
        .limit(2)
        .execute();

      relevantResources = resourceResults;
    }

    // Step 3: Generate response with context (simplified AI response generation)
    let responseContent = "Based on the available pediatric literature, ";
    let citations: Array<{source: string; page_number?: number; chunk_id: string}> = [];

    if (relevantChunks.length > 0 || relevantResources.length > 0) {
      responseContent += "I found relevant information from the following sources:\n\n";
      
      // Add Nelson book citations
      relevantChunks.forEach((chunk, index) => {
        responseContent += `${index + 1}. From "${chunk.chapter_title}"${chunk.section_title ? ` - ${chunk.section_title}` : ''} (Page ${chunk.page_number}): This section discusses relevant pediatric concepts.\n`;
        citations.push({
          source: chunk.chapter_title,
          page_number: chunk.page_number,
          chunk_id: chunk.id
        });
      });

      // Add medical resource citations
      relevantResources.forEach((resource, index) => {
        const citationNumber = relevantChunks.length + index + 1;
        responseContent += `${citationNumber}. ${resource.resource_type.toUpperCase()}: "${resource.title}" - ${resource.category}\n`;
        citations.push({
          source: resource.title,
          chunk_id: resource.id
        });
      });

      responseContent += "\nPlease consult with healthcare professionals for specific medical advice.";
    } else {
      responseContent += "I couldn't find specific information related to your query in the current knowledge base. Please consult with healthcare professionals for medical advice.";
    }

    // Step 4: Save assistant message with citations
    await db.insert(chatMessagesTable).values({
      id: assistantMessageId,
      session_id: input.session_id,
      role: 'assistant',
      content: responseContent,
      citations: citations.length > 0 ? citations : null,
      created_at: currentTime
    }).execute();

    // Step 5: Prepare search results with similarity scores (placeholder scores)
    const sources = [
      ...relevantChunks.map(chunk => ({
        chunk,
        similarity_score: 0.85 // Placeholder similarity score
      })),
      ...relevantResources.map(resource => ({
        chunk: resource,
        similarity_score: 0.80 // Placeholder similarity score
      }))
    ];

    // Step 6: Return complete chat response
    return {
      message: {
        id: assistantMessageId,
        session_id: input.session_id,
        role: 'assistant',
        content: responseContent,
        citations: citations.length > 0 ? citations : null,
        created_at: currentTime
      },
      sources
    };

  } catch (error) {
    console.error('Chat query processing failed:', error);
    throw error;
  }
}
