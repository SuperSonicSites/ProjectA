# **PaperPause: Taxonomy & Keyword Strategy**

Version: 1.2
Status: Updated for PaperPause

## **1. Information Architecture (The Sitemap)**

We use a **Strict Silo** structure to maximize topical authority and SEO performance.

### **1.1 The Hierarchy**

*   **Homepage** (/)
*   **Level 1: The Silos (Categories)**
    *   /animals/
    *   /mandalas/
    *   /holidays/
*   **Level 2: The Collections (Sections)**
    *   /animals/cats/
    *   /animals/dogs/
    *   /animals/butterflies/
*   **Level 3: The Asset (Leaf)**
    *   /animals/cats/sleeping-persian-cat-01/

### **1.2 Hugo Taxonomy Configuration (hugo.toml)**

The project is configured to use categories for silos and directory structures for collections.

```toml
[taxonomies]
  category = "categories"  # The Silo (e.g., Animals)

[permalinks]
  coloring-pages = "/:sections/:slug/" # Ensures siloed URL structure
```

## **2. The Primary Silo: Animals**

Root URL: `paperpause.app/animals/`
Target Head Keyword: "Animal Coloring Pages"
SEO Intent: The "Hub" page linking to all specific collections.

### **2.1 Sub-Silo: Cats**
*   **URL:** `/animals/cats/`
*   **Primary Keyword:** "Cat coloring pages"

### **2.2 Sub-Silo: Dogs**
*   **URL:** `/animals/dogs/`
*   **Primary Keyword:** "Dog coloring pages"

### **2.3 Sub-Silo: Butterflies**
*   **URL:** `/animals/butterflies/`
*   **Primary Keyword:** "Butterfly coloring pages"

### **2.4 Sub-Silo: Horses**
*   **URL:** `/animals/horses/`
*   **Primary Keyword:** "Horse coloring pages"

### **2.5 Sub-Silo: Sharks**
*   **URL:** `/animals/sharks/`
*   **Primary Keyword:** "Shark coloring pages"

## **3. Metadata & Content Rules**

### **3.1 Global Keyword Layer**

| Attribute | Keyword Targets |
| :--- | :--- |
| **Difficulty** | Easy, Simple, Beginner, For Kids, For Seniors, Large Print |
| **Style** | Bold, Thick Lines, Sticker Style, Cute, Cartoon, Outline |
| **Format** | Printable, PDF, A4, High Resolution, Free Download |

### **3.2 Automation Rules (Template Logic)**

**H1 (Title) Rules:**
- Must contain the Subject + Style.
- *Formula:* `[Difficulty] [Style] [Subject] Coloring Page [Format]`

**Alt Text Rules:**
- Describe the image for accessibility and SEO.
- *Template:* "Black and white line art coloring page of a [Subject] in [Style] style."

---

## **4. Future Expansion**

### **Silo: Mandalas**
*   **Root:** `/mandalas/`
*   **Potential Collections:** `/geometric/`, `/floral/`, `/animal-mandalas/`

### **Silo: Holidays**
*   **Root:** `/holidays/`
*   **Potential Collections:** `/christmas/`, `/halloween/`, `/easter/`