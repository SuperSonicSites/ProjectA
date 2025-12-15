import { ENV } from '../config/env';
import { logger } from './logger';
import { withRetry } from './retry';

interface RecraftResponse {
    data: {
        url: string;
        b64_json?: string;
    }[];
}

export const generateImage = async (prompt: string, negativePrompt?: string): Promise<Buffer> => {
    return withRetry(
        async () => {
            logger.info(`Generating image with Recraft V3...`);

            const requestBody: any = {
                prompt: prompt,
                model: 'recraftv3',
                response_format: 'b64_json',
                size: '1024x1536' // 2:3 ratio portrait (officially supported)
            };

            // Add negative prompt if provided
            if (negativePrompt) {
                requestBody.negative_prompt = negativePrompt;
            }

            const response = await fetch('https://external.api.recraft.ai/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ENV.RECRAFT_API_KEY}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Recraft API error (${response.status}): ${errorText}`);
            }

            const data = (await response.json()) as RecraftResponse;

            if (!data.data || data.data.length === 0 || !data.data[0].b64_json) {
                throw new Error('No image data returned from Recraft');
            }

            const base64Data = data.data[0].b64_json;
            const buffer = Buffer.from(base64Data, 'base64');

            logger.success('Image generated successfully via Recraft V3', { size: buffer.length });
            return buffer;
        },
        {
            retries: 3,
            delay: 2000,
            backoff: 2,
            onRetry: (attempt, error) => {
                logger.warn(`Recraft generation attempt ${attempt} failed, retrying...`, {
                    error: error.message
                });
            }
        }
    );
};
