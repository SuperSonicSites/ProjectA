# **Visual Sanctuary: Taxonomy & Keyword Strategy**

Version: 1.1
Status: Cleaned & Merged

## **1. Information Architecture (The Sitemap)**

We use a **Strict Silo** structure. This is non-negotiable for SEO.

### **1.1 The Hierarchy**

*   **Homepage** (/)
    *   **Level 1: The Silos (Categories)**
        *   /animals/
        *   /mandalas/
        *   /holidays/
        *   /fantasy/
        *   /educational/
    *   **Level 2: The Collections (Series)**
        *   /animals/cats/
        *   /animals/forest/
        *   /mandalas/geometric/
    *   **Level 3: The Asset (Leaf)**
        *   /animals/cats/sleeping-persian-cat-01/

### **1.2 Hugo Taxonomy Configuration (hugo.toml)**

Copy this into your config to force this structure. We disable default "Tags" in URLs to prevent duplicate content, using them only for filtering *within* pages.

```toml
[taxonomies]
  category = "categories"  # The Silo (Animals, Holidays)
  series = "collections"   # The Sub-Silo (Cats, Christmas)

[permalinks]
  posts = "/:category/:series/:slug/" # Critical for SEO Siloing
```

## **2. The Pilot Silo: Animals (Level 1)**

Root URL: yourdomain.com/animals/
Target Head Keyword: "Animal Coloring Pages" (28,265 Vol)
SEO Intent: The "Hub" page linking to all specific collections below.

### **2.1 Sub-Silo: Cats**

*   **URL:** /animals/cats/
*   **Primary Keyword:** "Cat coloring pages" (36,528 Vol)
*   **Target Persona:** Cottagecore / Comfort
*   **Automation Prompts (Examples):**
    *   *Sleeping Cat* (Cozy)
    *   *Chubby Cat* (Bold/Simple)
    *   *Kitten in Box* (Cute)
*   **Secondary Keywords (For H2s & Descriptions):**
    *   "Cute kitten coloring pages"
    *   "Easy cat drawings"
    *   "Simple cat coloring sheets"

### **2.2 Sub-Silo: Dinosaurs**

*   **URL:** /animals/dinosaurs/
*   **Primary Keyword:** "Dinosaur coloring pages" (28,890 Vol)
*   **Target Persona:** Boys / Education / Seniors (Grandkids)
*   **Automation Prompts (Examples):**
    *   *T-Rex Standing* (Classic)
    *   *Baby Dino hatching* (Cute)
    *   *Brontosaurus eating leaves* (Peaceful)
*   **Secondary Keywords:**
    *   "T-Rex coloring pages"
    *   "Easy dinosaur pictures"
    *   "Dino coloring for kids"

### **2.3 Sub-Silo: Butterflies**

*   **URL:** /animals/butterflies/
*   **Primary Keyword:** "Butterfly coloring pages" (24,406 Vol)
*   **Target Persona:** Relaxation / Nature
*   **Automation Prompts (Examples):**
    *   *Symmetrical Butterfly* (Pattern-lite)
    *   *Butterfly on Flower* (Nature)
    *   *Monarch Butterfly* (Specific)
*   **Secondary Keywords:**
    *   "Monarch butterfly coloring page"
    *   *Simple butterfly outline*
    *   *Spring coloring pages*

### **2.4 Sub-Silo: Horses**

*   **URL:** /animals/horses/
*   **Primary Keyword:** "Horse coloring pages" (17,902 Vol)
*   **Target Persona:** Girls / Nature Lovers
*   **Automation Prompts (Examples):**
    *   *Galloping Horse* (Action)
    *   *Mare and Foal* (Cute)
    *   *Pony Portrait* (Simple)
*   **Secondary Keywords:**
    *   "Cute pony coloring pages"
    *   *Mustang coloring sheet*
    *   *Farm animal coloring pages*

### **2.5 Sub-Silo: Bears**

*   **URL:** /animals/bears/
*   **Primary Keyword:** "Bear coloring pages" (16,253 Vol)
*   **Target Persona:** Cozy / Woodland / Kids
*   **Automation Prompts (Examples):**
    *   *Teddy Bear* (Toy/Cute)
    *   *Grizzly Bear* (Nature)
    *   *Mama Bear* (Family)
*   **Secondary Keywords:**
    *   "Teddy bear coloring pages"
    *   *Woodland animal coloring pages*
    *   *Cute bear cartoon*

## **3. Metadata & Content Rules**

This defines how our content engine generates headers and metadata.

### **3.1 Global Keyword Layer (The "Style" Attributes)**

These keywords must be injected into the **Title (H1)**, **Subtitle (H2)**, and **Alt Text** of *every* page.

| Attribute | Keyword Targets | Where to use |
| :--- | :--- | :--- |
| **Difficulty** | Easy, Simple, Beginner, For Kids, For Seniors, Large Print | H1, Meta Title |
| **Style** | Bold, Thick Lines, Sticker Style, Cute, Cartoon, Outline | H2, Alt Text |
| **Format** | Printable, PDF, A4, High Resolution, Free Download | H2, Button Text |
| **Medium** | Marker Friendly, Crayon Friendly | Body Copy |

### **3.2 Automation Rules (Template Logic)**

**H1 (Title) Rules:**
*   Must contain the Subject + Style.
*   *Bad:* "Cat 04"
*   *Good:* "Realistic Sleeping Persian Cat Coloring Page"
*   *Formula:* `[Difficulty] [Style] [Subject] Coloring Page [Format]`

**H2 (Subtitle) Rules:**
*   Must target "Intent" keywords.
*   *Template:* "Free printable coloring page for [Audience]. High-resolution PDF with lines."

**Alt Text Rules:**
*   Describe the image for blind users *and* SEO.
*   *Template:* "Black and white line art of a doing [Action] in style."

## **4. Future Expansion (Phase 3)**

These silos are reserved for after the Animals pilot is stable.

### **Silo B: Fantasy (Identity/Goth)**
*   **Root:** /fantasy/
*   **Collections:** /fairies/, /mermaids/, /goth/, /dragons/

### **Silo C: Cozy Lifestyle (Objects)**
*   **Root:** /cozy/
*   **Collections:** /food/, /fruit/, /home/