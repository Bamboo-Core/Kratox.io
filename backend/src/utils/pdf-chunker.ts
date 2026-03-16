
import { PDFDocument } from 'pdf-lib';

const CHUNK_SIZE = 20; // páginas por chunk

/**
 * Splits a large PDF into smaller chunks for AI processing.
 * 
 * @param fileDataUri - The PDF file as a Base64 data URI (e.g., "data:application/pdf;base64,...")
 * @returns Array of data URIs, one for each chunk. If the PDF has <= CHUNK_SIZE pages, returns the original.
 */
export async function splitPdfIntoChunks(fileDataUri: string): Promise<string[]> {
    try {
        // Validate data URI format
        if (!fileDataUri.startsWith('data:')) {
            throw new Error('Invalid data URI: must start with "data:"');
        }

        // Extract Base64 data from data URI
        const base64Match = fileDataUri.match(/^data:([^;]+);base64,(.+)$/);
        if (!base64Match) {
            throw new Error('Invalid data URI format: expected "data:<mimetype>;base64,<data>"');
        }

        const mimeType = base64Match[1];
        const base64Data = base64Match[2];

        // Decode Base64 to bytes
        const pdfBytes = Buffer.from(base64Data, 'base64');

        // Load the PDF document
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const totalPages = pdfDoc.getPageCount();

        console.log(`[PDF Chunker] Total pages: ${totalPages}, Chunk size: ${CHUNK_SIZE}`);

        // If the PDF is small enough, return it as-is
        if (totalPages <= CHUNK_SIZE) {
            console.log(`[PDF Chunker] PDF is <= ${CHUNK_SIZE} pages, returning original document.`);
            return [fileDataUri];
        }

        // Calculate number of chunks
        const numChunks = Math.ceil(totalPages / CHUNK_SIZE);
        console.log(`[PDF Chunker] Splitting into ${numChunks} chunks...`);

        const chunks: string[] = [];

        // Create each chunk
        for (let i = 0; i < numChunks; i++) {
            const startPage = i * CHUNK_SIZE;
            const endPage = Math.min(startPage + CHUNK_SIZE, totalPages);

            console.log(`[PDF Chunker] Creating chunk ${i + 1}/${numChunks}: pages ${startPage + 1}-${endPage}`);

            // Create a new PDF document for this chunk
            const chunkDoc = await PDFDocument.create();

            // Copy pages to the chunk
            const pagesToCopy = await chunkDoc.copyPages(
                pdfDoc,
                Array.from({ length: endPage - startPage }, (_, idx) => startPage + idx)
            );

            // Add copied pages to the chunk document
            pagesToCopy.forEach((page) => {
                chunkDoc.addPage(page);
            });

            // Serialize the chunk to bytes
            const chunkBytes = await chunkDoc.save();

            // Convert back to Base64 data URI
            const chunkBase64 = Buffer.from(chunkBytes).toString('base64');
            const chunkDataUri = `data:${mimeType};base64,${chunkBase64}`;

            chunks.push(chunkDataUri);
        }

        console.log(`[PDF Chunker] Successfully created ${chunks.length} chunks.`);
        return chunks;

    } catch (error) {
        console.error('[PDF Chunker] Error splitting PDF:', error);
        throw new Error(`Failed to split PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
