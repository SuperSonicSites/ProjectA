export const PROMPT_CONFIG = {
    base: `
    TYPE: Vector Line Art Coloring Page.
    OUTPUT FORMAT: PNG with black outlines on pure white background.
    SUBJECT: A cute, cozy cat.
    
    TECHNICAL REQUIREMENTS:
    - Background: Pure white (#FFFFFF) - NOT transparent, NOT transparent background
    - Lines: Pure black (#000000) outlines only
    - Line weight: Thick, consistent, 4-6px width
    - Style: Clean vector-style line art suitable for coloring
    
    COMPOSITION:
    - Centered subject within 2:3 frame
    - Leave adequate margins (10-15% on all sides)
    - Vertical (portrait) orientation
    - Subject should fit comfortably within the frame
    
    WHAT TO AVOID:
    - Transparent backgrounds
    - Gray tones or shading
    - Thin or broken lines
    - Horizontal compositions
    
    ATMOSPHERE: Whimsical, cozy, detailed but colorable.
  `,

    negative_prompt: "transparent background, transparency, color, shading, gray, gradient, photo, realistic, 3d, rendering, text, signature, watermark, blurry, broken lines, thin lines, sketch, messy, horizontal orientation, landscape, filled areas, solid colors",

    attributes: {
        tones: [
            "Cozy", "Playful", "Sleepy", "Adventurous", "Elegant",
            "Curious", "Grumpy", "Zen", "Mischievous", "Cheerful",
            "Dreamy", "Focused", "Happy", "Lazy"
        ],
        types: [
            "Persian Cat", "Tabby Cat", "Siamese Cat", "Bengal Cat",
            "Maine Coon", "Scottish Fold", "Calico Cat", "Tuxedo Cat",
            "Sphynx Cat", "Ragdoll Cat", "British Shorthair", "Chubby Ginger Cat",
            "Fluffy Kitten"
        ],
        actions: [
            "baking cookies", "chasing butterflies", "napping", "reading a vintage book",
            "painting on a canvas", "knitting a scarf", "sipping herbal tea",
            "potting plants", "playing chess", "watching the rain",
            "juggling apples", "playing the violin", "rolling out dough",
            "peering into a fishbowl", "unraveling a ball of yarn"
        ],
        settings: [
            "rustic kitchen", "sunlit garden", "dusty library", "treehouse",
            "Parisian apartment balcony", "flower shop window", "cozy fireplace rug",
            "Japanese zen garden", "messy art studio", "vintage bakery",
            "magical forest clearing", "cluttered attic", "window sill",
            "vegetable garden", "sewing room"
        ],
        details: [
            "surrounded by flour and utensils", "among oversized sunflowers",
            "stacked on piles of books", "with hanging paper lanterns",
            "with a view of the Eiffel Tower", "surrounded by blooming daisies",
            "with a plate of cookies nearby", "under softly falling cherry blossoms",
            "with paint tubes scattered around", "smelling fresh bread",
            "surrounded by fireflies", "with balls of yarn everywhere",
            "with raindrops on the glass", "surrounded by pumpkins"
        ]
    }
};

/**
 * Randomly selects one value from each attribute array and constructs a unique prompt
 * Template: "{tone} {type} in a {setting} {action}"
 */
export const getRandomVariant = () => {
    const { tones, types, actions, settings } = PROMPT_CONFIG.attributes;

    const randomTone = tones[Math.floor(Math.random() * tones.length)];
    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    const randomSetting = settings[Math.floor(Math.random() * settings.length)];

    return `${randomTone} ${randomType} in a ${randomSetting} ${randomAction}`;
};
