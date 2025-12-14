// --- GEMINI --- //
import { postProcessImage, thresholdToBW } from "../utils/imageProcessing";
import { downloadImageAsBase64 } from "../utils/storage";
import { formatBookName } from "../utils/urlHelpers";

// --- TYPES ---
export interface ArchitectBrief {
  positive_prompt: string;
  negative_prompt: string;
  validation_criteria: string[];
  reasoning: string;
}

interface PipelineResult {
  imageUrl: string;
  passed: boolean;
  logs: string[];
}

interface ValidationResult {
  passed: boolean;
  failure_reason?: string;
}

// --- PROXY CALLER ---
const callGeminiProxy = async (params: { model: string, contents: any, config?: any }): Promise<GenerateContentResponse> => {
  // Set client-side timeout to 540s (9 mins) to prevent "deadline-exceeded" on long generations
  const generateContent = httpsCallable(functions, 'generateContent', { timeout: 540000 });
  const result = await generateContent(params);
  return result.data as GenerateContentResponse;
};

// --- UTILS ---
const callWithRetry = async <T>(
  fn: () => Promise<T>,
  retries = 5, // Keep high retry count
  initialDelay = 3000 // INCREASE: Start with 3s wait (was 2000)
): Promise<T> => {
  let delay = initialDelay;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      // Check for 429 (Quota) or 503 (Service Unavailable)
      // Also check for 500 which sometimes masks a 503
      const errorCode = error.status || error.code;
      const errorMessage = error.message || "";
      const isRetryable =
        errorCode === 429 ||
        errorCode === 503 ||
        errorCode === 500 || // ADDED: Sometimes overload manifests as 500
        errorMessage.includes("Resource has been exhausted") ||
        errorMessage.includes("overloaded") || // ADDED: Explicit check
        errorMessage.includes("quota");

      if (isRetryable && i < retries - 1) {
        console.warn(`Gemini API hit limit/error (${errorCode}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
};

// ========================================================
// STAGE 1: THE ARCHITECT (Prompt Engineering)
// ========================================================
const generateCreativeBrief = async (
  reference: BibleReference,
  ageGroup: AgeGroup,
  artStyle: ArtStyle
): Promise<ArchitectBrief> => {
  const refString = `${reference.book} ${reference.chapter}:${reference.startVerse}${
    reference.endVerse && reference.endVerse > reference.startVerse
      ? '-' + reference.endVerse
      : ''
  }`;

  const ageRules = AGE_LOGIC[ageGroup];
  const styleRules = STYLE_LOGIC[artStyle];

  const systemPrompt = `
    ROLE: Biblical Art Director.
    TASK: Create a JSON brief for an Image Generator.
    INPUT: Passage "${refString}".
    
    TARGET AUDIENCE SPECS (${ageGroup}):
    - Line Style: ${ageRules.keywords}
    - Composition Focus: ${ageRules.subjectFocus}

    ART STYLE SPECS (${artStyle}):
    - Visual Rules: ${styleRules}
    
    CRITICAL RULES:
    1. ${CHRISTIAN_GUIDELINES}
    2. IF the scene is Genesis pre-fall, you MUST add "thorns, dead plants" to negative_prompt.
    3. CHECK SCRIPTURE: If the INPUT passage does not exist in the standard protestant bible, return JSON with a single field: {"error": "INVALID_REFERENCE"}.

    OUTPUT JSON:
    {
      "positive_prompt": "Detailed visual description incorporating the line style and composition focus...",
      "negative_prompt": "Specific exclusion list...",
      "validation_criteria": ["List 3 specific checks for the Critic"],
      "reasoning": "Brief explanation"
    }
  `;

  try {
    // Fix: Explicitly type the retry call to GenerateContentResponse
    const response = await callWithRetry<GenerateContentResponse>(() => callGeminiProxy({
      model: MODELS.ARCHITECT,
      contents: { parts: [{ text: systemPrompt }] },
      config: { responseMimeType: 'application/json' }
    }));

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Architect returned empty response");
    
    const parsed = JSON.parse(text);
    if (parsed.error === "INVALID_REFERENCE") {
      throw new Error("INVALID_REFERENCE");
    }
    
    return parsed as ArchitectBrief;
  } catch (e: any) {
    if (e.message === "INVALID_REFERENCE") throw e;
    throw new Error(`Architect Failed: ${e.message}`);
  }
};

// ========================================================
// STAGE 2: THE ARTIST (Nano Banana Pro / Multimodal)
// ========================================================
const renderImage = async (
  brief: ArchitectBrief,
  ageGroup: AgeGroup,
  artStyle: ArtStyle
): Promise<string> => {
  const refKey = `${ageGroup}_${artStyle}`;
  const refUriRaw = REFERENCE_MAP[refKey];

  // Use all available references
  const refUris = Array.isArray(refUriRaw) ? refUriRaw : (refUriRaw ? [refUriRaw] : []);

  const ageKeywords = AGE_LOGIC[ageGroup].keywords;
  const styleKeywords = STYLE_LOGIC[artStyle];

  const refImageParts: any[] = [];

  // Download reference images on CLIENT-SIDE (not in Cloud Function)
  if (refUris.length > 0) {
    try {
      console.log(`[Artist] Fetching Style References: ${refUris.join(', ')}`);

      // Fetch all references in parallel
      const fetchPromises = refUris.map(async (uri) => {
        const response = await fetch(uri);
        if (!response.ok) {
          console.warn(`Failed to fetch reference image ${uri}: ${response.status}`);
          return null;
        }
        
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
          console.warn(`Invalid content type for ${uri}: ${blob.type}`);
          return null;
        }

        // Convert to base64 (no resizing needed - images are pre-sized to 512px)
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            let base64 = result.split(',')[1];

            // Clean up base64 (BOM/Garbage removal)
            if (base64.startsWith("77+9")) {
              base64 = base64.substring(4);
            }
            while (base64.startsWith("77+9")) {
              base64 = base64.substring(4);
            }
            if (blob.type === 'image/jpeg' && !base64.startsWith('/9j/') && base64.length > 100) {
              const jpegStart = base64.indexOf('/9j/');
              if (jpegStart > 0 && jpegStart < 100) {
                base64 = base64.substring(jpegStart);
              }
            }
            resolve(base64);
          };
          reader.onerror = () => reject(new Error("FileReader error"));
          reader.readAsDataURL(blob);
        });

        return {
          inlineData: {
            mimeType: blob.type || "image/jpeg",
            data: base64Data
          }
        };
      });

      const results = await Promise.all(fetchPromises);
      results.forEach(res => {
        if (res) refImageParts.push(res);
      });

      console.log(`[Artist] ${refImageParts.length} reference images loaded successfully.`);
    } catch (err) {
      console.warn(`[Artist] Failed to load references. Proceeding with text-only style emulation.`, err);
    }
  }

  // Fallback instruction if images fail to load
  let styleInstruction = `
    --- VISUAL REFERENCE INSTRUCTION ---
    Use the attached images as STRICT STYLE SOURCES. 
    Adopt the line weight, stroke confidence, and level of detail from the references.
    Do NOT copy the subject matter of the references; only copy the artistic style.
  `;

  if (refImageParts.length === 0) {
    styleInstruction = `
        --- STYLE EMULATION MODE (IMPORTANT) ---
        You must strictly adhere to the LINE STYLE and ART TECHNIQUE described below.
        Simulate the visual characteristics of this style perfectly based on the text description alone.
        Generate a HIGH CONTRAST BLACK AND WHITE coloring page.
     `;
  }

  const promptText = `
    ${brief.positive_prompt}
    
    --- LAYOUT REQUIREMENTS ---
    ${LAYOUT_RULES}
    
    --- TECHNICAL SPECIFICATIONS (STRICT) ---
    1. LINE STYLE: ${ageKeywords} 
    2. ART TECHNIQUE: ${styleKeywords}
    
    ${styleInstruction}
    NEGATIVE PROMPT: ${brief.negative_prompt}, ${CRITICAL_NEGATIVES}
  `;

  try {
    // Fix: Explicitly type the retry call to GenerateContentResponse
    const response = await callWithRetry<GenerateContentResponse>(() => callGeminiProxy({
      model: MODELS.ARTIST, // gemini-3-pro-image-preview
      contents: { 
        role: 'user', 
        parts: [
          // Ensure images come before text for optimal understanding
          ...refImageParts,
          { text: promptText }
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE],
        imageConfig: {
          imageSize: "2K",
          aspectRatio: "3:4"
        },
        safetySettings: [{ category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }]
      }
    }));

    // Handle cases where the image is in a different part index
    for (const p of response.candidates?.[0]?.content?.parts || []) {
      if (p.inlineData) {
        return `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`;
      }
    }
    throw new Error("Artist returned no image data.");

  } catch (e: any) {
    throw new Error(`Artist Failed (Gemini 3): ${e.message}`);
  }
};


// ========================================================
// STAGE 3: THE CRITIC (Vision Validation)
// ========================================================
const validateImage = async (
  imageBase64: string,
  criteria: string[]
): Promise<ValidationResult> => {
  const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|webp);base64,/, "");

  const prompt = `
    ROLE: Quality Assurance Bot for Coloring Book App.
    TASK: STRICTLY validate this image against the following criteria.
    
    CRITERIA LIST:
    ${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}
    
    UNIVERSAL FAILURES (Reject if found):
    - Color detected (Must be B&W).
    - Text or letters detected.
    - Grayscale shading (Must be pure Line Art).
    
    OUTPUT JSON:
    {
      "passed": boolean,
      "failure_reason": "string or null"
    }
  `;

  try {
    // Fix: Explicitly type the retry call to GenerateContentResponse
    const response = await callWithRetry<GenerateContentResponse>(() => callGeminiProxy({
      model: MODELS.CRITIC,
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/png", data: cleanBase64 } }
        ]
      },
      config: { responseMimeType: 'application/json' }
    }));

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    return JSON.parse(text);
  } catch (e) {
    console.warn("[Critic] Validation error, assuming Pass:", e);
    return { passed: true };
  }
};

// ========================================================
// MAIN PIPELINE ORCHESTRATOR
// ========================================================
export const generateWithGoldenPipeline = async (
  reference: BibleReference,
  ageGroup: AgeGroup,
  artStyle: ArtStyle
): Promise<PipelineResult> => {
  const logs: string[] = [];

  try {
    // 1. THE ARCHITECT
    logs.push("Step 1: Architect drafting brief...");
    const brief = await generateCreativeBrief(reference, ageGroup, artStyle);
    logs.push(`Brief Logic: ${brief.reasoning}`);

    // Retry Loop
    let attempts = 0;
    const MAX_ATTEMPTS = 2;

    while (attempts < MAX_ATTEMPTS) {
      attempts++;
      logs.push(`Step 2: Artist generating (Attempt ${attempts})...`);

      // 2. THE ARTIST
      let rawImageUrl = await renderImage(brief, ageGroup, artStyle);

      // 3. THE EDITOR
      logs.push("Step 3: Editor processing (Desaturation/Thresholding)...");
      const processedImageUrl = await postProcessImage(rawImageUrl);

      // 4. THE CRITIC
      logs.push("Step 4: Critic validating...");
      const validation = await validateImage(processedImageUrl, brief.validation_criteria);

      if (validation.passed) {
        logs.push("Validation PASSED.");
        return { imageUrl: processedImageUrl, passed: true, logs };
      } else {
        logs.push(`Validation FAILED: ${validation.failure_reason}`);

        if (attempts < MAX_ATTEMPTS) {
          logs.push("Retrying with refined prompt...");
          brief.positive_prompt += ` (IMPORTANT: Fix previous error: ${validation.failure_reason})`;
        }
      }
    }

    throw new Error("Maximum retries exceeded. The Critic rejected all drafts.");

  } catch (error: any) {
    return { imageUrl: "", passed: false, logs: [...logs, `ERROR: ${error.message}`] };
  }
};

// ========================================================
// EXPORTS FOR INDIVIDUAL STEPS
// ========================================================

// 1. Get Description (Architect)
export const getVerseVisualDescription = generateCreativeBrief;

// 2. Generate Image (Artist + Editor)
export const generateColoringPage = async (
  brief: ArchitectBrief,
  ageGroup: AgeGroup,
  artStyle: ArtStyle
): Promise<{ imageUrl: string }> => {
  const rawUrl = await renderImage(brief, ageGroup, artStyle);
  const processedUrl = await postProcessImage(rawUrl);
  return { imageUrl: processedUrl };
};

// 3. Edit Image
export const editColoringPage = async (
  base64Image: string,
  editPrompt: string
): Promise<string> => {
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
  const mimeType = base64Image.match(/data:([^;]+);base64/)?.[1] || "image/png";

  const prompt = `
    TASK: Modify this existing coloring page image according to the user's instruction.
    
    User Instruction: "${editPrompt}"
    
    --- CRITICAL CANVAS RULES (MANDATORY) ---
    1. PRESERVE EXACT CANVAS SIZE: The output must have the SAME dimensions as the input.
    2. FULL BLEED: Content must extend to ALL 4 EDGES. NO white margins. NO padding. NO borders.
    3. DO NOT zoom out, shrink, scale down, or add any empty space around the artwork.
    4. The artwork must FILL THE ENTIRE CANVAS edge-to-edge, exactly like the input.
    
    --- STYLE CONSTRAINTS ---
    - Maintain black and white line art style.
    - Output ONLY the modified image.
    
    NEGATIVE PROMPT: ${CRITICAL_NEGATIVES}, white margin, white border, padding, zoomed out, scaled down, empty space around image, frame
  `;

  try {
    // Fix: Explicitly type the retry call to GenerateContentResponse
    const response = await callWithRetry<GenerateContentResponse>(() => callGeminiProxy({
      model: MODELS.ARTIST, // Updated to use 3-pro-image-preview for better quality/editing
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: cleanBase64 } }
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE],
        imageConfig: {
          imageSize: "2K",
          aspectRatio: "3:4"
        },
        safetySettings: [{ category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }]
      }
    }));

    // Extract Image
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      // Check parts for image
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          const resultBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          // Threshold to B&W without adding margins (avoids progressive shrinking)
          return await thresholdToBW(resultBase64);
        }
      }
    }
    throw new Error("No image generated.");
  } catch (e: any) {
    throw new Error(`Edit Failed: ${e.message}`);
  }
};

// ========================================================
// BIBLE VERSE ART GENERATION PIPELINE
// ========================================================

// --- VERSE TYPES ---
interface VerseArtBrief {
  verse_text: string;
  reference_string: string;
  layout_type: 'EMBLEM' | 'STACK' | 'SCROLL';
  verse_themes?: string[];
  decorative_motifs?: string[];
  positive_prompt: string;
  negative_prompt: string;
  validation_criteria: string[];
}

interface VersePipelineResult {
  imageUrl: string;
  passed: boolean;
  logs: string[];
  verseText: string;
}

// --- FETCH VERSE TEXT FROM BIBLE API ---
export const fetchVerseText = async (reference: BibleReference): Promise<string> => {
  const refString = `${reference.book}+${reference.chapter}:${reference.startVerse}`;
  const response = await fetch(`https://bible-api.com/${encodeURIComponent(refString)}?translation=web`);
  
  if (!response.ok) {
    throw new Error("INVALID_REFERENCE");
  }
  
  const data = await response.json();
  const text = data.text?.trim() || "";
  
  if (!text) {
    throw new Error("INVALID_REFERENCE");
  }
  
  return text;
};

// --- DETERMINE LAYOUT TYPE BASED ON WORD COUNT ---
const getVerseLayoutType = (wordCount: number): 'EMBLEM' | 'STACK' | 'SCROLL' => {
  if (wordCount <= VERSE_LAYOUT_RULES.EMBLEM.maxWords) return 'EMBLEM';
  if (wordCount <= VERSE_LAYOUT_RULES.STACK.maxWords) return 'STACK';
  return 'SCROLL';
};

// --- VERSE ARCHITECT: Create Typography Brief ---
const generateVerseArtBrief = async (
  reference: BibleReference,
  verseText: string,
  fontStyle: FontStyle
): Promise<VerseArtBrief> => {
  const refString = `${formatBookName(reference.book)} ${reference.chapter}:${reference.startVerse}`;
  const wordCount = verseText.split(/\s+/).filter(w => w.length > 0).length;
  const layoutType = getVerseLayoutType(wordCount);
  const layoutRules = VERSE_LAYOUT_RULES[layoutType];
  const fontRules = FONT_STYLE_LOGIC[fontStyle];

  const systemPrompt = `
    ROLE: Creative Art Director for Bible Verse Typography Coloring Pages.
    TASK: Create a visually stunning, thematically cohesive typography coloring page.
    
    THE VERSE (render this text EXACTLY):
    "${verseText}"
    - ${refString}
    
    ═══════════════════════════════════════════════════════════
    STEP 1: ANALYZE THE VERSE THEMES
    ═══════════════════════════════════════════════════════════
    Read the verse carefully and identify:
    - What is the CORE MESSAGE? (faith, love, strength, peace, guidance, protection, praise, trust, hope, etc.)
    - What NATURAL IMAGERY appears or is implied? (water, mountains, light, animals, plants, sky, earth)
    - What SYMBOLIC ELEMENTS fit this verse? (cross, crown, shield, dove, lamb, flame, heart, anchor, etc.)
    
    ═══════════════════════════════════════════════════════════
    STEP 2: DESIGN THEMATIC DECORATIONS
    ═══════════════════════════════════════════════════════════
    Based on your theme analysis, choose decorative elements that REINFORCE the verse meaning.
    
    EXAMPLES OF THEMATIC MATCHING:
    - Psalm 23 "The Lord is my shepherd" → sheep, shepherd's crook, green rolling hills, still waters, peaceful meadow
    - John 3:16 "God so loved the world" → cross with radiant light beams, heart, dove descending, globe
    - Proverbs 3:5 "Trust in the Lord" → open book, oil lamp, crown of wisdom, winding path, steady rock
    - Isaiah 40:31 "Wings like eagles" → soaring eagle, dramatic clouds, sunrise over mountain peaks
    - Philippians 4:13 "I can do all things" → strong arms, mountain summit, rising sun, victory wreath
    - Psalm 46:10 "Be still and know" → calm lake, peaceful sunrise, quiet forest, resting dove
    
    CRITICAL: Do NOT use generic florals/vines unless the verse specifically mentions gardens, flowers, or growth.
    Every decorative element should have a DIRECT CONNECTION to the verse's meaning.
    
    ═══════════════════════════════════════════════════════════
    TECHNICAL SPECIFICATIONS
    ═══════════════════════════════════════════════════════════
    WORD COUNT: ${wordCount} words
    LAYOUT TYPE: ${layoutType}
    LAYOUT RULES: ${layoutRules.description}
    
    FONT STYLE: ${fontStyle}
    FONT RULES: ${fontRules}
    
    ${VERSE_TYPOGRAPHY_RULES}
    
    ═══════════════════════════════════════════════════════════
    OUTPUT JSON
    ═══════════════════════════════════════════════════════════
    {
      "verse_themes": ["List 2-3 core themes identified in this verse"],
      "decorative_motifs": ["List 3-5 specific decorative elements chosen for THIS verse based on its themes"],
      "positive_prompt": "Detailed visual description incorporating the thematic decorations. Be specific and vivid.",
      "negative_prompt": "Specific exclusions including generic unrelated decorations...",
      "validation_criteria": ["List 3 specific checks for quality"]
    }
  `;

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => callGeminiProxy({
      model: MODELS.ARCHITECT,
      contents: { parts: [{ text: systemPrompt }] },
      config: { responseMimeType: 'application/json' }
    }));

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Verse Architect returned empty response");
    
    const parsed = JSON.parse(text);
    
    return {
      verse_text: verseText,
      reference_string: refString,
      layout_type: layoutType,
      verse_themes: parsed.verse_themes || [],
      decorative_motifs: parsed.decorative_motifs || [],
      positive_prompt: parsed.positive_prompt,
      negative_prompt: parsed.negative_prompt,
      validation_criteria: parsed.validation_criteria || []
    };
  } catch (e: any) {
    throw new Error(`Verse Architect Failed: ${e.message}`);
  }
};

// --- VERSE ARTIST: Render Typography Image ---
const renderVerseImage = async (
  brief: VerseArtBrief,
  fontStyle: FontStyle
): Promise<string> => {
  const refUri = VERSE_REFERENCE_MAP[fontStyle];
  const refUris = Array.isArray(refUri) ? refUri : (refUri ? [refUri] : []);
  
  const refImageParts: any[] = [];

  // Load reference images
  if (refUris.length > 0) {
    try {
      console.log(`[Verse Artist] Fetching Style References: ${refUris.join(', ')}`);

      const fetchPromises = refUris.map(async (uri) => {
        const response = await fetch(uri);
        if (!response.ok) {
          console.warn(`Failed to fetch reference image ${uri}: ${response.status}`);
          return null;
        }
        
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
          console.warn(`Invalid content type for ${uri}: ${blob.type}`);
          return null;
        }

        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            let base64 = result.split(',')[1];
            if (base64.startsWith("77+9")) base64 = base64.substring(4);
            resolve(base64);
          };
          reader.onerror = () => reject(new Error("FileReader error"));
          reader.readAsDataURL(blob);
        });

        return {
          inlineData: {
            mimeType: blob.type || "image/jpeg",
            data: base64Data
          }
        };
      });

      const results = await Promise.all(fetchPromises);
      results.forEach(res => {
        if (res) refImageParts.push(res);
      });

      console.log(`[Verse Artist] ${refImageParts.length} reference images loaded.`);
    } catch (err) {
      console.warn(`[Verse Artist] Failed to load references.`, err);
    }
  }

  const layoutPrompt = VERSE_LAYOUT_RULES[brief.layout_type].prompt;

  const promptText = `
    Create a BIBLE VERSE COLORING PAGE with decorative typography.
    
    THE VERSE TEXT TO RENDER (EXACT spelling required):
    "${brief.verse_text}"
    - ${brief.reference_string}
    
    ${brief.positive_prompt}
    
    --- LAYOUT ---
    ${layoutPrompt}
    
    --- CRITICAL TYPOGRAPHY RULES ---
    1. ALL LETTERS MUST BE HOLLOW/OUTLINE STYLE with white interior space for coloring
    2. Use DOUBLE OUTLINE technique - every letter has a visible white interior
    3. NO solid black filled letters - this is a COLORING PAGE
    4. Text must have MARGINS - do not run off canvas edges
    5. Decorative elements go AROUND text, never overlapping
    6. Pure BLACK and WHITE only - no gray, no shading
    7. All shapes must be CLOSED PATHS for bucket-fill coloring
    
    NEGATIVE PROMPT: ${brief.negative_prompt}, ${VERSE_NEGATIVES}
  `;

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => callGeminiProxy({
      model: MODELS.ARTIST,
      contents: { 
        role: 'user', 
        parts: [
          ...refImageParts,
          { text: promptText }
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE],
        imageConfig: {
          imageSize: "2K",
          aspectRatio: "3:4"
        },
        safetySettings: [{ category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }]
      }
    }));

    for (const p of response.candidates?.[0]?.content?.parts || []) {
      if (p.inlineData) {
        return `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`;
      }
    }
    throw new Error("Verse Artist returned no image data.");

  } catch (e: any) {
    throw new Error(`Verse Artist Failed: ${e.message}`);
  }
};

// --- VERSE CRITIC: Validate Typography (Different from Scene Critic) ---
const validateVerseImage = async (
  imageBase64: string,
  criteria: string[]
): Promise<ValidationResult> => {
  const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|webp);base64,/, "");

  const prompt = `
    ROLE: Quality Assurance Bot for Bible Verse Coloring Pages.
    TASK: Validate this TYPOGRAPHY-BASED coloring page.
    
    CRITERIA LIST:
    ${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}
    
    VERSE-SPECIFIC VALIDATION (Critical):
    - Text IS present (this is a typography design - text is REQUIRED)
    - Letters are HOLLOW/OUTLINE style (white interior visible for coloring)
    - NO solid black filled letters (they cannot be colored)
    - Background is pure white
    - Text has margins (not running off edges)
    - Decorative elements don't overlap/obscure text
    
    FAILURES:
    - Color detected (Must be B&W).
    - Solid black filled letters (Must be hollow/outline).
    - Text missing or illegible.
    - Grayscale shading.
    
    OUTPUT JSON:
    {
      "passed": boolean,
      "failure_reason": "string or null"
    }
  `;

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => callGeminiProxy({
      model: MODELS.CRITIC,
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/png", data: cleanBase64 } }
        ]
      },
      config: { responseMimeType: 'application/json' }
    }));

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    return JSON.parse(text);
  } catch (e) {
    console.warn("[Verse Critic] Validation error, assuming Pass:", e);
    return { passed: true };
  }
};

// --- MAIN VERSE ART PIPELINE ---
export const generateVerseArt = async (
  reference: BibleReference,
  fontStyle: FontStyle
): Promise<VersePipelineResult> => {
  const logs: string[] = [];

  try {
    // 1. FETCH VERSE TEXT
    logs.push("Step 1: Fetching verse text...");
    const verseText = await fetchVerseText(reference);
    logs.push(`Verse: "${verseText.substring(0, 50)}..."`);

    // 2. CHECK WORD COUNT
    const wordCount = verseText.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount >= VERSE_LAYOUT_RULES.MAX_WORDS) {
      throw new Error(`VERSE_TOO_LONG: ${wordCount} words exceeds maximum of ${VERSE_LAYOUT_RULES.MAX_WORDS - 1}`);
    }
    logs.push(`Word count: ${wordCount} (Layout: ${getVerseLayoutType(wordCount)})`);

    // 3. THE VERSE ARCHITECT
    logs.push("Step 2: Architect drafting typography brief...");
    const brief = await generateVerseArtBrief(reference, verseText, fontStyle);
    logs.push(`Layout: ${brief.layout_type}`);

    // Retry Loop
    let attempts = 0;
    const MAX_ATTEMPTS = 2;

    while (attempts < MAX_ATTEMPTS) {
      attempts++;
      logs.push(`Step 3: Verse Artist generating (Attempt ${attempts})...`);

      // 4. THE VERSE ARTIST
      let rawImageUrl = await renderVerseImage(brief, fontStyle);

      // 5. THE EDITOR (B&W Processing)
      logs.push("Step 4: Editor processing...");
      const processedImageUrl = await postProcessImage(rawImageUrl);

      // 6. THE VERSE CRITIC
      logs.push("Step 5: Verse Critic validating...");
      const validation = await validateVerseImage(processedImageUrl, brief.validation_criteria);

      if (validation.passed) {
        logs.push("Validation PASSED.");
        return { imageUrl: processedImageUrl, passed: true, logs, verseText };
      } else {
        logs.push(`Validation FAILED: ${validation.failure_reason}`);

        if (attempts < MAX_ATTEMPTS) {
          logs.push("Retrying with refined prompt...");
          brief.positive_prompt += ` (CRITICAL FIX: ${validation.failure_reason}. Ensure all letters are HOLLOW/OUTLINE with white interior.)`;
        }
      }
    }

    throw new Error("Maximum retries exceeded. The Verse Critic rejected all drafts.");

  } catch (error: any) {
    if (error.message === "INVALID_REFERENCE") throw error;
    if (error.message.startsWith("VERSE_TOO_LONG")) throw error;
    return { imageUrl: "", passed: false, logs: [...logs, `ERROR: ${error.message}`], verseText: "" };
  }
};


// --- END GEMINI --- //

// --- Image Processing Utlity --- // 

/**
 * Process image for download/print (Handles CORS and PNG conversion).
 */
export const embedLogoOnImage = (imageSource: string): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "anonymous"; // Attempt to load with CORS to avoid tainted canvas
    
    // Cache Busting for CORS safety when dealing with Storage URLs
    const src = imageSource.startsWith('http') && !imageSource.includes('base64') 
       ? `${imageSource}${imageSource.includes('?') ? '&' : '?'}t=${Date.now()}`
       : imageSource;

    img.onload = () => {
      try {
          canvas.width = img.width;
          canvas.height = img.height;
          if (!ctx) { 
              resolve(imageSource); 
              return; 
          }

          // Draw Base Image
          ctx.drawImage(img, 0, 0);

          try {
              // Return PNG for lossless quality
              resolve(canvas.toDataURL('image/png'));
          } catch (e) {
              // Tainted canvas (CORS failure), return original
              console.warn("Canvas tainted, returning original source", e);
              resolve(imageSource);
          }

      } catch (e) {
          console.error("Error during image processing", e);
          resolve(imageSource);
      }
    };
    
    img.onerror = (e) => {
        console.warn("Failed to load base image for processing", e);
        resolve(imageSource);
    };

    img.src = src;
  });
};

/**
 * Post-processes the raw AI output to meet coloring book standards.
 * 1. Adds padding (Zoom out to leave margins).
 * 2. Converts to Grayscale.
 * 3. Thresholds (Eliminates light grays -> White, Snaps darks -> Black).
 */
/**
 * Threshold image to pure B&W without adding margins.
 * Used for editing operations to avoid progressive shrinking.
 */
export const thresholdToBW = (base64Image: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(base64Image);
        return;
      }

      const width = img.width;
      const height = img.height;
      canvas.width = width;
      canvas.height = height;

      // Draw image at full size (no zoom-out)
      ctx.drawImage(img, 0, 0, width, height);

      // PIXEL MANIPULATION (Grayscale & Threshold)
      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Calculate Luminance
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

          // Threshold: light grays (>160) become white, darks become black
          let finalVal = luminance < 160 ? 0 : 255;

          data[i] = finalVal;
          data[i + 1] = finalVal;
          data[i + 2] = finalVal;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error("Error processing pixel data", err);
        resolve(base64Image);
      }
    };

    img.onerror = (err) => {
      console.error("Failed to load image for thresholding", err);
      resolve(base64Image);
    };

    img.src = base64Image;
  });
};

/**
 * Post-processes the raw AI output to meet coloring book standards.
 * 1. Adds padding (Zoom out to leave margins).
 * 2. Converts to Grayscale.
 * 3. Thresholds (Eliminates light grays -> White, Snaps darks -> Black).
 */
export const postProcessImage = (base64Image: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; 

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(base64Image);
        return;
      }

      // 1. SETUP CANVAS
      const width = img.width;
      const height = img.height;
      canvas.width = width;
      canvas.height = height;

      // Fill Background with Pure White
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // 2. ZOOM OUT / MARGINS
      // Scale down to 85% to create nice margins
      const scale = 0.85; 
      const scaledW = width * scale;
      const scaledH = height * scale;
      const offsetX = (width - scaledW) / 2;
      const offsetY = (height - scaledH) / 2;

      ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);

      // 3. PIXEL MANIPULATION (Grayscale & Threshold)
      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Calculate Luminance
          // Formula: 0.299*R + 0.587*G + 0.114*B
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

          // THRESHOLD LOGIC:
          // "Eliminate the gray... so that the gray becomes white."
          // "Keeping the black as black."
          
          let finalVal = 255; // Default to white

          // If it's dark enough, make it black.
          // This removes light shading (grays) effectively.
          // Threshold of 160 means light grays (>160) become 255 (white).
          // Dark grays/Blacks (<160) become 0 (black).
          if (luminance < 160) {
             finalVal = 0;
          }

          data[i] = finalVal;     // Red
          data[i + 1] = finalVal; // Green
          data[i + 2] = finalVal; // Blue
          // Alpha (data[i+3]) remains unchanged (255)
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));

      } catch (err) {
        console.error("Error processing pixel data (likely tainted canvas)", err);
        // Fallback to the padded image without pixel manip if CORS fails
        resolve(canvas.toDataURL('image/png'));
      }
    };

    img.onerror = (err) => {
      console.error("Failed to load image for post-processing", err);
      resolve(base64Image);
    };

    img.src = base64Image;
  });
};

// --- END IMAGE PROCESSING UTILITIES --- //

// --- START OF CONTANTS --- //

import { AgeGroup, ArtStyle, FontStyle } from './types';

// ==========================================
// 0. APP CONFIGURATION
// ==========================================
export const APP_DOMAIN = 'https://biblesketch.app';

// ==========================================
// 1. MODEL CONFIGURATION
// ==========================================
// "Nano Banana Pro" (gemini-3-pro-image-preview) is used for the Artist
// because it supports multimodal input (Reference Images).
export const MODELS = {
  ARCHITECT: "gemini-2.5-flash",
  ARTIST: "gemini-3-pro-image-preview",
  CRITIC: "gemini-2.5-flash"
};

export const THEME_COLORS = {
  background: "#FFF7ED",
  primary: "#7C3AED",
  secondary: "#FCD34D",
  text: "#1F2937",
  accent: "#A78BFA"
};

// ==========================================
// 2. REFERENCE ASSETS (The "ControlNets")
// ==========================================
// Pointing to local files in the public/references folder to bypass CORS/Network issues
// Ensure you have downloaded the images and placed them in 'public/references/' folder
const BASE_PATH = "/references/";

export const REFERENCE_MAP: Record<string, string | string[]> = {
  // TODDLER
  [`${AgeGroup.TODDLER}_${ArtStyle.SUNDAY_SCHOOL}`]: [`${BASE_PATH}toddler-sundayschool.jpg`, `${BASE_PATH}toddler-sundayschool-2.jpg`],

  // YOUNG CHILD
  [`${AgeGroup.YOUNG_CHILD}_${ArtStyle.SUNDAY_SCHOOL}`]: `${BASE_PATH}child-sundayschool.jpg`,
  [`${AgeGroup.YOUNG_CHILD}_${ArtStyle.STAINED_GLASS}`]: [`${BASE_PATH}child-stainglass.jpg`, `${BASE_PATH}child-stainglass-2.jpg`],
  [`${AgeGroup.YOUNG_CHILD}_${ArtStyle.ICONOGRAPHY}`]:   `${BASE_PATH}child-iconography.jpg`,
  [`${AgeGroup.YOUNG_CHILD}_${ArtStyle.COMIC}`]:         [`${BASE_PATH}child-comicbook.jpg`, `${BASE_PATH}child-comicbook-2.jpg`],

  // TEEN
  [`${AgeGroup.TEEN}_${ArtStyle.CLASSIC}`]:          [`${BASE_PATH}teen-classic.jpg`, `${BASE_PATH}teen-classic-2.jpg`],
  [`${AgeGroup.TEEN}_${ArtStyle.STAINED_GLASS}`]:    [`${BASE_PATH}teen-stainglass.jpg`, `${BASE_PATH}teen-stainglass-2.jpg`],
  [`${AgeGroup.TEEN}_${ArtStyle.ICONOGRAPHY}`]:      `${BASE_PATH}teen-iconography.jpg`,
  [`${AgeGroup.TEEN}_${ArtStyle.COMIC}`]:            [`${BASE_PATH}teen-comicbook.jpg`, `${BASE_PATH}teen-comicbook-2.jpg`],

  // ADULT
  [`${AgeGroup.ADULT}_${ArtStyle.CLASSIC}`]:             `${BASE_PATH}adult-classic.jpg`,
  [`${AgeGroup.ADULT}_${ArtStyle.STAINED_GLASS}`]:       [`${BASE_PATH}adult-stainglass.jpg`, `${BASE_PATH}adult-stainglass-2.jpg`],
  [`${AgeGroup.ADULT}_${ArtStyle.ICONOGRAPHY}`]:         `${BASE_PATH}adult-iconography.jpg`,
  [`${AgeGroup.ADULT}_${ArtStyle.DOODLE}`]:              [`${BASE_PATH}adult-doodle.jpg`, `${BASE_PATH}adult-doodle-2.jpg`]
};

// ==========================================
// 3. LOGIC RULES (The "Double-Lock" Text)
// ==========================================
export const AGE_LOGIC = {
  [AgeGroup.TODDLER]: {
    keywords: "BOLD, SIMPLE LINE ART. FULL SCENE COVERAGE. Background elements (simple waves, hills, clouds) must fill the page edge-to-edge. OUTLINE ONLY. NO SOLID FILLS. Ultra-thick uniform black outlines (approx 4-5mm). NO shading. Proportions: Natural/Realistic (Simplified). NO cartoon/chibi/bobblehead style.",
    subjectFocus: "Focus on a single central subject or a simple pair interacting with the environment. Do NOT float subjects in empty space. Visuals must be iconic, cheerful, and easy to color. Simplify complex crowds to 1-2 representative figures. Do NOT use black ink to represent darkness or night; use symbols (stars, moon) on white space."
  },
  [AgeGroup.YOUNG_CHILD]: {
    keywords: "STORYBOOK LINE ART. PURE WHITE BACKGROUND. OUTLINE ONLY. NO SOLID FILLS. Consistent, medium-thick outlines (approx 2mm). Focus on clear object separation. Detailed environments are acceptable (water, sky) but must maintain large, colorable segments.",
    subjectFocus: "Interaction between maximum two characters. Clear action. Visual storytelling that reflects specific narrative emotion."
  },
  [AgeGroup.TEEN]: {
    keywords: "ENGAGING COLORING BOOK STYLE. PURE WHITE BACKGROUND. OUTLINE ONLY. NO SOLID FILLS. NO hatching, NO cross-hatching, NO shading. Variable line weight (thick outer contours, fine inner lines). Complex composition with plenty of white space for coloring. Avoid large, solid black areas.", 
    subjectFocus: "Cinematic composition. Clean outlines only. **Ensure natural human height and scale. No giant figures unless giants are explicitly mentioned.**"
  },
  [AgeGroup.ADULT]: {
    keywords: "STRESS-RELIEF COLORING BOOK STYLE. PURE WHITE BACKGROUND. OUTLINE ONLY. NO SOLID FILLS. NO hatching, NO cross-hatching, NO texture shading. Use clean contour lines and decorative ornamental borders. Generous white space within each shape for pleasant coloring.",
    subjectFocus: "Symbolic, elegant composition. Detail through ornamental flourishes and borders, NOT through texture fills or dense linework."
  }
};

export const STYLE_LOGIC = {
  [ArtStyle.SUNDAY_SCHOOL]: "Gentle aesthetic, soft rounded edges, safe for children. Expressions must reflect the narrative's emotional tone.",
  [ArtStyle.STAINED_GLASS]: "Authentic medieval leaded glass. MOSAIC SEGMENTATION. Every shape must be fully enclosed by thick black lead-lines. No free-floating lines. Geometric subdivision. Stiff, architectural style.",
  [ArtStyle.ICONOGRAPHY]: "Byzantine orthodox style, formal stiff pose, halos with geometric patterns, flat perspective, spiritual and solemn.",
  [ArtStyle.COMIC]: "Dynamic comic book style, bold clean outlines, simple action lines, expressive poses, NO shading, NO hatching, NO cross-hatching.",
  [ArtStyle.CLASSIC]: "Traditional fine art illustration. Realistic proportions, clean detailed outlines, NO hatching, NO cross-hatching, NO shading. Intricate line work for detail without fill techniques.",
  [ArtStyle.DOODLE]: "Modern liturgical vector art. Bernardo Ramonfaur style illustration. Minimalist Catholic iconography. Faceted character design using straight lines and sharp corners. Clean vector lines with decorative hatching. Solemn and dignified atmosphere. Black and white ink sketch."
};

export const BIBLE_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther",
  "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon",
  "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel",
  "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah",
  "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians",
  "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon",
  "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude",
  "Revelation"
];

// ==========================================
// 4. CONSTRAINTS & SAFETY
// ==========================================

export const CHRISTIAN_GUIDELINES = `
1. **TRINITY VISUAL RULES (STRICT):** - **God the Father:** NEVER depict as a human/man. Focus on the *effect* of His presence (light rays, wind, reaction of nature/people). Do NOT use a physical representation (like a hand) unless specifically appropriate for Genesis Creation scenes.
   - **Jesus:** Depict as a historical human male (Middle Eastern descent).
   - **Holy Spirit:** Depict as a Dove or Tongues of Fire.
2. **Subject Count:** Draw EXACTLY the number of characters described.
3. **Biblical Accuracy:** - **Exodus:** Water walls must be liquid waves, not rock.
   - **Eden:** Serpents on ground/trees only (no wings/legs).
4. **Chronological Consistency:** - **Pre-Fall (Gen 1-2):** NO SNAKES, NO APPLES, NO THORNS. NO CLOTHING. Use strategic visual modesty: foreground plants/flowers covering lower body, long hair, waist-deep water, or waist-up framing.
   - **Post-Fall (Gen 3+):** Clothing is animal skins (rough).
5. **Modesty:** Private areas must ALWAYS be concealed. Pre-Fall: use environmental/natural elements (NOT clothing). Post-Fall+: use period-appropriate attire.
6. **Scale:** Humans should always be depicted in natural, realistic scale. NO GIANT FIGURES.
7. **Digital Safety:** ALL SHAPES MUST BE CLOSED PATHS (for bucket fill).
`;

// ==========================================
// 5. LITURGICAL TAGS
// ==========================================
export const LITURGICAL_TAGS = [
  // Liturgical Seasons
  { id: 'advent', label: 'Advent', category: 'season' },
  { id: 'christmas', label: 'Christmas', category: 'season' },
  { id: 'epiphany', label: 'Epiphany', category: 'season' },
  { id: 'lent', label: 'Lent', category: 'season' },
  { id: 'holy-week', label: 'Holy Week', category: 'season' },
  { id: 'easter', label: 'Easter', category: 'season' },
  { id: 'pentecost', label: 'Pentecost', category: 'season' },
  { id: 'ordinary-time', label: 'Ordinary Time', category: 'season' },

  // Themes
  { id: 'creation', label: 'Creation', category: 'theme' },
  { id: 'the-fall', label: 'The Fall', category: 'theme' },
  { id: 'exile', label: 'Exile', category: 'theme' },
  { id: 'prophets', label: 'Prophets', category: 'theme' },
  { id: 'miracles', label: 'Miracles', category: 'theme' },
  { id: 'parables', label: 'Parables', category: 'theme' },
  { id: 'resurrection', label: 'Resurrection', category: 'theme' },
] as const;

export type LiturgicalTagId = typeof LITURGICAL_TAGS[number]['id'];

export const GOLDEN_NEGATIVES = [
  // THEOLOGY NEGATIVES
  "face of god, old man in sky, bearded god, zeus, human god figure, anthropomorphic father",

  // STYLE NEGATIVES
  "color, colored, colorful, polychrome, chromatic, red, blue, green, yellow, pink, purple, orange, brown, gold, silver, rainbow",
  "shading, grayscale, gradient, 3d render, photo, realistic texture, filled colors, grey, shadows, sketchiness, charcoal, smudge, blurry, dithering, noise, hatching, cross-hatching, wood grain texture, stippling",
  "duplicate characters, twins, clones, multiple versions of same character, crowd, extra people, collage, split screen, comic panels",
  "extra fingers, extra limbs, fused fingers, malformed hands, floating hands, anatomy disconnected, bad anatomy, mutation, missing limbs",
  "text, watermark, signature, writing, letters, numbers, bible verse numbers, chapter numbers, bottom text, footer, date, copyright",
  "modern clothing, suits, zippers, cars, buildings, glasses, wristwatches, tattoos",
  "smiling angels (in judgment scenes), happy expressions on sad characters, laughing, celebrating, party, wedding",
  "wings on serpents, dragons, surrealism, people merging with objects",

  // Ratio & Scale
  "hierarchical scaling, symbolic perspective, giant leader, giant moses, giant jesus, figure larger than mountains, scale mismatch, tiny crowd, forced perspective",

  // Coloring Book Physics
  "solid black areas, filled black shapes, heavy black background, dense cross-hatching, ink wash, filled hair, silhouette, inverted colors, night mode",
  "broken lines, gaps in lines, open shapes, sketching artifacts, unfinished lines"
].join(", ");

// ==========================================
// 6. LAYOUT RULES (V2)
// ==========================================
export const LAYOUT_RULES = `
CANVAS: FULL BLEED. Extend content to all 4 edges. NO margins. NO padding.
ORIENTATION: Camera must be level. Keep vertical lines vertical. NO Dutch angles. NO camera tilt.
NO decorative frames, borders, or margins.
`;

// ==========================================
// 7. CRITICAL NEGATIVES (V2 - Optimized)
// ==========================================
// Reduced from ~800 to ~150 chars for faster generation
export const CRITICAL_NEGATIVES = [
  "color", "shading", "hatching", "3d", "solid black", "sketch", "noise",
  "text", "watermark", "border", "rotated image", "tilted frame", "diagonal border",
  "white border", "margin", "padding", "inset image",
  "cartoon proportions", "chibi", "big head",
  "face of god", "modern", "anachronism",
  "bad anatomy", "extra limbs", "giant figure"
].join(", ");

// ==========================================
// 8. BIBLE VERSE COLORING - FONT STYLES
// ==========================================
export const FONT_STYLE_LOGIC: Record<FontStyle, string> = {
  [FontStyle.ELEGANT_SCRIPT]: "Elegant calligraphy script with flowing letters and decorative flourishes. Sophisticated swashes and ornamental curves. DOUBLE OUTLINE letters with white interior. Surrounded by delicate floral elements, graceful vines, and botanical decorations.",
  [FontStyle.MODERN_BRUSH]: "Contemporary brush lettering with varied stroke weights. Trendy hand-lettered style mixing cursive and print. DOUBLE OUTLINE hollow letters. Botanical illustrations, geometric patterns, and modern florals as decoration.",
  [FontStyle.PLAYFUL]: "Whimsical hand-drawn BUBBLE LETTERS with playful, chunky shapes. Fun, bouncy character with white interior space. Decorated with stars, hearts, simple flowers, clouds, and cheerful doodle elements.",
  [FontStyle.CLASSIC_SERIF]: "Traditional serif typography with elegant proportions. Timeless book-style HOLLOW lettering with decorative serifs. Framed with ornate borders, classical scrollwork, and decorative corner flourishes."
};

// ==========================================
// 9. BIBLE VERSE COLORING - LAYOUT RULES
// ==========================================
// Layout selection based on verse word count
export const VERSE_LAYOUT_RULES = {
  // 1-5 words: THE EMBLEM
  EMBLEM: {
    maxWords: 5,
    description: "Text contained inside a central decorative shape (circle, heart, shield, banner). The shape is the hero element. Background outside the shape is empty or simple pattern. Text is large and bold.",
    prompt: "Place the verse text inside a central decorative shape like a circle, heart, shield, or banner. The shape should be ornate with detailed borders. Keep background simple outside the main shape."
  },
  // 6-15 words: THE STACK
  STACK: {
    maxWords: 15,
    description: "Vertical hierarchy layout. KEYWORDS (nouns, verbs) are rendered 2x larger. Connector words (and, the, of, in, to) are 0.5x size in scripted style. Fills the page top-to-bottom.",
    prompt: "Arrange text in vertical stacked layout. Make important words (nouns, verbs) TWICE as large. Make connector words (the, and, of, in, to, for) half-size in a different script style. Fill the page from top to bottom with decorative elements between lines."
  },
  // 15-29 words: THE SCROLL
  SCROLL: {
    maxWords: 29,
    description: "Text block placed inside a parchment scroll graphic OR illuminated manuscript border. Center area remains white for text legibility. Ornate border frames the entire page.",
    prompt: "Place the verse text inside an ornate parchment scroll or illuminated manuscript border. The text area should be white/empty for legibility. Add detailed decorative borders with floral motifs, vines, or geometric patterns around the edges."
  },
  // 30+ words: BLOCKED
  MAX_WORDS: 30
};

// ==========================================
// 10. BIBLE VERSE COLORING - NEGATIVES
// ==========================================
// Different from GOLDEN_NEGATIVES - ALLOWS text but blocks solid fills
export const VERSE_NEGATIVES = [
  // Color negatives (same as scene)
  "color", "colored", "colorful", "red", "blue", "green", "yellow", "pink", "purple", "orange", "brown", "gold", "silver", "rainbow",
  
  // Shading negatives (same as scene)
  "shading", "grayscale", "gradient", "grey", "shadows", "3d render", "photo", "realistic texture",
  
  // CRITICAL: Anti-solid-text (text must be HOLLOW/OUTLINE)
  "solid filled letters", "filled text", "solid black text", "silhouette text", "black filled typography",
  "solid black letters", "filled in letters", "opaque text", "dark text fill",
  
  // Layout problems
  "text off canvas", "text cut off", "text running off edge", "no margins",
  "decorations behind text", "overlapping decorations on text", "text obscured",
  "tiny text", "small font", "illegible text", "blurry text",
  
  // General quality
  "watermark", "signature", "copyright", "misspelled", "typo",
  "broken lines", "gaps in outlines", "incomplete shapes"
].join(", ");

// ==========================================
// 11. BIBLE VERSE COLORING - REFERENCE IMAGES
// ==========================================
export const VERSE_REFERENCE_MAP: Record<FontStyle, string | string[]> = {
  [FontStyle.ELEGANT_SCRIPT]: `${BASE_PATH}verse-elegant.jpg`,
  [FontStyle.MODERN_BRUSH]: `${BASE_PATH}verse-modern.jpg`,
  [FontStyle.PLAYFUL]: `${BASE_PATH}verse-playful.jpg`,
  [FontStyle.CLASSIC_SERIF]: `${BASE_PATH}verse-classic.jpg`
};

// ==========================================
// 12. BIBLE VERSE COLORING - TYPOGRAPHY RULES
// ==========================================
export const VERSE_TYPOGRAPHY_RULES = `
CRITICAL TYPOGRAPHY RULES FOR BIBLE VERSE COLORING:

1. **HOLLOW TEXT ONLY (MANDATORY)**
   - ALL letters must be OUTLINE/HOLLOW style with WHITE INTERIOR
   - Use "Double Outline" or "Bubble Letter" technique
   - NEVER use solid black filled letters - they cannot be colored and waste ink
   - The white space inside each letter is where users will color

2. **TEXT HIERARCHY**
   - KEYWORDS (nouns, verbs, names) = LARGE, prominent
   - Connector words (the, and, of, in, to, for, a) = smaller, scripted
   - Bible reference = small, positioned at bottom or corner

3. **LAYOUT REQUIREMENTS**
   - Text must have MARGINS - never run off canvas edges
   - Decorative elements go AROUND text, never BEHIND or OVERLAPPING
   - Minimum "24pt equivalent" sizing - text must be large enough to color
   - All shapes must be CLOSED PATHS for bucket-fill coloring

4. **BACKGROUND**
   - PURE WHITE background only
   - NO grey washes, NO gradients, NO textures behind text

5. **DECORATIVE ELEMENTS**
   - Florals, vines, geometric patterns SURROUNDING the text
   - All decorations must also be OUTLINE only (hollow, colorable)
   - Decorations should complement, not compete with, the text
`;