import { GoogleGenerativeAI } from '@google/generative-ai';
import { ENV } from '../config/env';
import { logger } from './logger';
import { withRetry } from './retry';

interface GeminiImageResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                inlineData?: {
                    mimeType: string;
                    data: string; // base64 encoded
                };
            }>;
        };
    }>;
}

export const generateImage = async (prompt: string, negativePrompt?: string): Promise<Buffer> => {
    return withRetry(
        async () => {
            logger.info(`Generating image with Gemini 3 Pro Image...`);

            const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
            
            // Use Gemini 3 Pro Image model with specialized image configuration
            const model = genAI.getGenerativeModel({ 
                model: 'gemini-3-pro-image-preview',
                generationConfig: {
                    // Explicitly request images and text in the output
                    response_modalities: ["IMAGE", "TEXT"],

                    // Group image-specific settings under image_config
                    image_config: {
                        aspect_ratio: "3:4",  // Standard supported ratio for coloring pages
                        image_size: "2K",
                                // Exact height for 3:4 at 4K
                    },

                    // Model behavior controls
                    temperature: 0.7          // Stricter adherence to instructions
                } as any
            });

            // Construct the full prompt with negative prompt if provided
            let fullPrompt = prompt;
            if (negativePrompt) {
                fullPrompt += `\n\nAVOID: ${negativePrompt}`;
            }

            // Generate image using Gemini with image generation capability
            // Strongly emphasize 3:4 aspect ratio at 3072×4096 pixels resolution in the prompt
            const aspectRatioPrompt = `${fullPrompt}\n\n[CRITICAL: ASPECT RATIO = "3:4". THIS IMAGE MUST BE TALL PORTRAIT. It MUST be TALLER than it is wide. Do NOT output a square image. Minimum resolutions: 2K.]`;
            
            const result = await model.generateContent(aspectRatioPrompt);

            // Log response structure for debugging
            logger.info('Gemini response structure:', { 
                hasResponse: !!result.response,
                hasCandidates: !!(result.response as any)?.candidates,
                candidatesLength: ((result.response as any)?.candidates || []).length
            });

            const response = result.response as any;
            
            // Try different response structures
            // Option 1: Check for inline data in parts
            if (response.candidates && response.candidates[0]) {
                const candidate = response.candidates[0];
                
                // Check if parts exist
                if (candidate.content?.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.inlineData?.data) {
                            const buffer = Buffer.from(part.inlineData.data, 'base64');
                            logger.success('Image generated successfully via Gemini 3 Pro Image', { size: buffer.length });
                            return buffer;
                        }
                    }
                }
            }
            
            // Option 2: Check for direct image data
            if ((response as any).image?.data) {
                const buffer = Buffer.from((response as any).image.data, 'base64');
                logger.success('Image generated successfully via Gemini 3 Pro Image', { size: buffer.length });
                return buffer;
            }

            // Log full response for debugging
            logger.error('Unexpected Gemini response structure:', JSON.stringify(response, null, 2));
            throw new Error('No inline image data in Gemini response');
        },
        {
            retries: 3,
            delay: 2000,
            backoff: 2,
            onRetry: (attempt, error) => {
                logger.warn(`Gemini generation attempt ${attempt} failed, retrying...`, {
                    error: error.message
                });
            }
        }
    );
};

