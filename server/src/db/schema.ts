
import { text, pgTable, timestamp, integer, json, real, pgEnum } from 'drizzle-orm/pg-core';

// Define enums
export const resourceTypeEnum = pgEnum('resource_type', ['protocol', 'guideline', 'reference', 'calculation']);
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant']);

// Nelson Book of Pediatrics table
export const nelsonBookChunksTable = pgTable('nelson_book_chunks', {
  id: text('id').primaryKey(),
  chapter_title: text('chapter_title').notNull(),
  section_title: text('section_title'), // Nullable
  content: text('content').notNull(),
  page_number: integer('page_number').notNull(),
  chunk_index: integer('chunk_index').notNull(),
  embedding: json('embedding').$type<number[]>(), // Store as JSON array, nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Pediatric medical resources table
export const pediatricMedicalResourcesTable = pgTable('pediatric_medical_resources', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  resource_type: resourceTypeEnum('resource_type').notNull(),
  category: text('category').notNull(),
  tags: json('tags').$type<string[]>().notNull(),
  embedding: json('embedding').$type<number[]>(), // Store as JSON array, nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Chat sessions table
export const chatSessionsTable = pgTable('chat_sessions', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  title: text('title').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Chat messages table
export const chatMessagesTable = pgTable('chat_messages', {
  id: text('id').primaryKey(),
  session_id: text('session_id').notNull(),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  citations: json('citations').$type<Array<{
    source: string;
    page_number?: number;
    chunk_id: string;
  }>>(), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull()
});

// TypeScript types for table schemas
export type NelsonBookChunk = typeof nelsonBookChunksTable.$inferSelect;
export type NewNelsonBookChunk = typeof nelsonBookChunksTable.$inferInsert;

export type PediatricMedicalResource = typeof pediatricMedicalResourcesTable.$inferSelect;
export type NewPediatricMedicalResource = typeof pediatricMedicalResourcesTable.$inferInsert;

export type ChatSession = typeof chatSessionsTable.$inferSelect;
export type NewChatSession = typeof chatSessionsTable.$inferInsert;

export type ChatMessage = typeof chatMessagesTable.$inferSelect;
export type NewChatMessage = typeof chatMessagesTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  nelsonBookChunks: nelsonBookChunksTable,
  pediatricMedicalResources: pediatricMedicalResourcesTable,
  chatSessions: chatSessionsTable,
  chatMessages: chatMessagesTable
};
