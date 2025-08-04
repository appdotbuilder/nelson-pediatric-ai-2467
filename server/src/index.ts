
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createNelsonBookChunkInputSchema,
  createPediatricMedicalResourceInputSchema,
  createChatSessionInputSchema,
  createChatMessageInputSchema,
  semanticSearchInputSchema,
  chatQueryInputSchema,
  updateChatSessionInputSchema
} from './schema';

// Import handlers
import { createNelsonBookChunk } from './handlers/create_nelson_book_chunk';
import { createMedicalResource } from './handlers/create_medical_resource';
import { createChatSession } from './handlers/create_chat_session';
import { createChatMessage } from './handlers/create_chat_message';
import { getChatSessions } from './handlers/get_chat_sessions';
import { getChatMessages } from './handlers/get_chat_messages';
import { semanticSearch } from './handlers/semantic_search';
import { processChatQuery } from './handlers/process_chat_query';
import { updateChatSession } from './handlers/update_chat_session';
import { deleteChatSession } from './handlers/delete_chat_session';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Nelson textbook management
  createNelsonBookChunk: publicProcedure
    .input(createNelsonBookChunkInputSchema)
    .mutation(({ input }) => createNelsonBookChunk(input)),

  // Medical resources management
  createMedicalResource: publicProcedure
    .input(createPediatricMedicalResourceInputSchema)
    .mutation(({ input }) => createMedicalResource(input)),

  // Chat session management
  createChatSession: publicProcedure
    .input(createChatSessionInputSchema)
    .mutation(({ input }) => createChatSession(input)),

  getChatSessions: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => getChatSessions(input.userId)),

  updateChatSession: publicProcedure
    .input(updateChatSessionInputSchema)
    .mutation(({ input }) => updateChatSession(input)),

  deleteChatSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(({ input }) => deleteChatSession(input.sessionId)),

  // Chat message management
  createChatMessage: publicProcedure
    .input(createChatMessageInputSchema)
    .mutation(({ input }) => createChatMessage(input)),

  getChatMessages: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => getChatMessages(input.sessionId)),

  // Semantic search
  semanticSearch: publicProcedure
    .input(semanticSearchInputSchema)
    .query(({ input }) => semanticSearch(input)),

  // Main chat query processing
  processChatQuery: publicProcedure
    .input(chatQueryInputSchema)
    .mutation(({ input }) => processChatQuery(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`NelsonGPT TRPC server listening at port: ${port}`);
}

start();
