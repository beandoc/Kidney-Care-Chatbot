import * as fs from 'fs/promises';
import * as path from 'path';

// Define the path to the knowledge base directory
const KNOWLEDGE_BASE_DIR = path.resolve(process.cwd(), 'src', 'data', 'knowledge-base');

// In-memory cache for the knowledge base content
let knowledgeBaseContent: string | null = null;
let lastModifiedTime: number = 0;

/**
 * Reads all .txt and .md files from the knowledge base directory,
 * concatenates their content, and caches it.
 * The cache is invalidated if the directory's modification time changes.
 * @returns A single string containing all the knowledge base content.
 */
export async function getKnowledgeBaseContent(): Promise<string> {
  try {
    const stats = await fs.stat(KNOWLEDGE_BASE_DIR);
    const mtimeMs = stats.mtimeMs;

    // If directory hasn't changed and content is cached, return cached content
    if (mtimeMs === lastModifiedTime && knowledgeBaseContent) {
      console.log("Returning cached knowledge base content.");
      return knowledgeBaseContent;
    }

    console.log("Knowledge base changed or not cached. Reading files...");
    // Ensure the directory exists
    await fs.mkdir(KNOWLEDGE_BASE_DIR, { recursive: true });

    const files = await fs.readdir(KNOWLEDGE_BASE_DIR);
    const supportedFiles = files.filter(
      (file) => file.endsWith('.txt') || file.endsWith('.md')
    );

    if (supportedFiles.length === 0) {
      console.warn("No .txt or .md files found in the knowledge base directory.");
      return ""; // Return empty string if no files are found
    }

    let allContent = '';
    for (const file of supportedFiles) {
      const filePath = path.join(KNOWLEDGE_BASE_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      allContent += content + '\n\n'; // Add separator between files
    }

    // Update cache and last modified time
    knowledgeBaseContent = allContent.trim();
    lastModifiedTime = mtimeMs;
    
    console.log("Knowledge base loaded successfully.");
    return knowledgeBaseContent;
  } catch (error) {
    // Check if the error is because the directory doesn't exist
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        console.warn(`Knowledge base directory not found at: ${KNOWLEDGE_BASE_DIR}. Returning empty content.`);
        return "";
    }
    console.error("Error reading knowledge base directory:", error);
    // In case of other errors, return empty string to prevent crashing
    return "";
  }
}
