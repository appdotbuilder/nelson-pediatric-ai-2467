
import { z } from 'zod';

// Nelson Book of Pediatrics schema
export const nelsonBookChunkSchema = z.object({
  id: z.string(),
  chapter_title: z.string(),
  section_title: z.string().nullable(),
  content: z.string(),
  page_number: z.number().int(),
  chunk_index: z.number().int(),
  embedding: z.array(z.number()).nullable(), // Vector embedding
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type NelsonBookChunk = z.infer<typeof nelsonBookChunkSchema>;

// Input schema for creating Nelson book chunks
export const createNelsonBookChunkInputSchema = z.object({
  id: z.string(),
  chapter_title: z.string(),
  section_title: z.string().nullable(),
  content: z.string(),
  page_number: z.number().int().positive(),
  chunk_index: z.number().int().nonnegative(),
  embedding: z.array(z.number()).optional()
});

export type CreateNelsonBookChunkInput = z.infer<typeof createNelsonBookChunkInputSchema>;

// Pediatric medical resource schema
export const pediatricMedicalResourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  resource_type: z.enum(['protocol', 'guideline', 'reference', 'calculation']),
  category: z.string(),
  tags: z.array(z.string()),
  embedding: z.array(z.number()).nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type PediatricMedicalResource = z.infer<typeof pediatricMedicalResourceSchema>;

// Input schema for creating medical resources
export const createPediatricMedicalResourceInputSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  resource_type: z.enum(['protocol', 'guideline', 'reference', 'calculation']),
  category: z.string(),
  tags: z.array(z.string()),
  embedding: z.array(z.number()).optional()
});

export type CreatePediatricMedicalResourceInput = z.infer<typeof createPediatricMedicalResourceInputSchema>;

// Chat session schema
export const chatSessionSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  title: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type ChatSession = z.infer<typeof chatSessionSchema>;

// Input schema for creating chat sessions
export const createChatSessionInputSchema = z.object({
  user_id: z.string(),
  title: z.string()
});

export type CreateChatSessionInput = z.infer<typeof createChatSessionInputSchema>;

// Chat message schema
export const chatMessageSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  citations: z.array(z.object({
    source: z.string(),
    page_number: z.number().int().optional(),
    chunk_id: z.string()
  })).nullable(),
  created_at: z.coerce.date()
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// Input schema for creating chat messages
export const createChatMessageInputSchema = z.object({
  session_id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  citations: z.array(z.object({
    source: z.string(),
    page_number: z.number().int().optional(),
    chunk_id: z.string()
  })).optional()
});

export type CreateChatMessageInput = z.infer<typeof createChatMessageInputSchema>;

// Query input schema for semantic search
export const semanticSearchInputSchema = z.object({
  query: z.string(),
  limit: z.number().int().positive().default(10),
  similarity_threshold: z.number().min(0).max(1).default(0.7)
});

export type SemanticSearchInput = z.infer<typeof semanticSearchInputSchema>;

// Search result schema
export const searchResultSchema = z.object({
  chunk: nelsonBookChunkSchema.or(pediatricMedicalResourceSchema),
  similarity_score: z.number()
});

export type SearchResult = z.infer<typeof searchResultSchema>;

// Chat query input schema
export const chatQueryInputSchema = z.object({
  session_id: z.string(),
  message: z.string()
});

export type ChatQueryInput = z.infer<typeof chatQueryInputSchema>;

// Chat response schema
export const chatResponseSchema = z.object({
  message: chatMessageSchema,
  sources: z.array(searchResultSchema)
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;

// Update chat session input schema
export const updateChatSessionInputSchema = z.object({
  id: z.string(),
  title: z.string().optional()
});

export type UpdateChatSessionInput = z.infer<typeof updateChatSessionInputSchema>;
