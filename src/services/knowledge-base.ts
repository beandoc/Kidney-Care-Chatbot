import * as fs from 'fs/promises';
import * as path from 'path';
import { Document } from 'langchain/document';
import { CharacterTextSplitter } from 'langchain/text_splitter';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

const KNOWLEDGE_BASE_DIR = path.resolve(process.cwd(), 'src', 'data', 'knowledge-base');

let vectorStore: MemoryVectorStore | null = null;

async function getVectorStore() {
  if (vectorStore) {
    return vectorStore;
  }

  try {
    await fs.mkdir(KNOWLEDGE_BASE_DIR, { recursive: true });
    const files = await fs.readdir(KNOWLEDGE_BASE_DIR);
    const supportedFiles = files.filter(file => file.endsWith('.txt') || file.endsWith('.md'));

    if (supportedFiles.length === 0) {
      console.log("No .txt or .md files found in the knowledge base directory. The chatbot will only use its general knowledge.");
      const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY,
        model: "text-embedding-004",
      });
      vectorStore = new MemoryVectorStore(embeddings);
      // Add a dummy document to prevent errors with an empty vector store
      await vectorStore.addDocuments([new Document({ pageContent: "This is a placeholder document." })]);
      return vectorStore;
    }

    const docs: Document[] = [];
    for (const file of supportedFiles) {
      const filePath = path.join(KNOWLEDGE_BASE_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      docs.push(new Document({ pageContent: content, metadata: { source: file } }));
    }

    const splitter = new CharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocs = await splitter.splitDocuments(docs);

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_KEY,
      model: "text-embedding-004",
    });

    vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
    console.log("Knowledge base loaded successfully from .txt and .md files.");
    return vectorStore;
  } catch (error) {
    console.error("Error initializing knowledge base:", error);
    // Create an empty vector store on error to prevent crashes
    const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY,
        model: "text-embedding-004",
    });
    vectorStore = new MemoryVectorStore(embeddings);
    await vectorStore.addDocuments([new Document({ pageContent: "Error loading knowledge base." })]);
    return vectorStore;
  }
}

export async function getRelevantDocuments(query: string) {
  const store = await getVectorStore();
  if (store.memoryVectors.length === 1 && store.memoryVectors[0].content.includes('placeholder')) {
      return [];
  }
  const results = await store.similaritySearch(query, 4);
  return results;
}
