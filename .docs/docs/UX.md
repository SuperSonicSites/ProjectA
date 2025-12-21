# **🏛️ PaperPause: UX Specifications**

## **1. The Core User Journey**

We optimize for **two** distinct user flows. Your team must build the UI to support these specifically.

### **Flow A: The "Hunter" (SEO/Pinterest Traffic - 80% of users)**
*   **Entry:** Landing directly on a Single Asset Page (e.g., "Steampunk Cat") from Google Images or Pinterest.
*   **Intent:** "I want this specific image *now*."
*   **UX Goal:** Frictionless download + "Sticky" retention (show them 5 more similar images before they leave).

### **Flow B: The "Browser" (Homepage Traffic - 20% of users)**
*   **Entry:** Typing paperpause.app or clicking "Home" after downloading.
*   **Intent:** "I need something to color, but I don't know what."
*   **UX Goal:** Visual clarity. High-level categorization to narrow down their vague intent quickly.

---

## **2. Page Layouts & Wireframes**

### **2.1 The Homepage: "The Grand Hall"**
*Concept:* A visual directory. No "Latest Posts."

*   **Hero Section:** A search bar centered on a clean background. Text: *"Find your calm. Search 5,000+ free coloring pages."*
*   **The Grid:** Large, clickable cards representing the **Level 1 Categories**.
    *   *Visual:* A collage of 4 best images from that category.
    *   *Label:* "Animals (1,240 pages)"
*   **Seasonal Rail:** A horizontal scroll section for upcoming holidays (e.g., "Trending for Easter").

### **2.2 The Collection Page (L2): "The Masonry"**
*Concept:* Infinite visual browsing.

*   **Header:**
    *   H1: "Cat Coloring Pages"
    *   H2: "Browse 50+ free printable cat coloring sheets..."
*   **Sidebar (Desktop) / Drawer (Mobile):** **Faceted Filters.**
    *   [ ] Easy / Simple
    *   [ ] Hard / Intricate
    *   [ ] Realistic
    *   [ ] Cartoon
*   **The Grid:** 4-column masonry layout (images interlock like Tetris).

### **2.3 The Single Page (L3): "The Studio"**
*Concept:* Distraction-free utility.

**Mobile View (Vertical Stack):**
1.  **Sticky Header:** Logo + Search Icon.
2.  **Preview Image:** Full width.
3.  **Title Block:** H1 "Sleeping Persian Cat" + "Hard" Badge.
4.  **The "Action Deck" (Sticky Bottom Bar):**
    *   A floating bar fixed to the bottom of the screen.
    *   Contains one massive button: **DOWNLOAD PDF**.
    *   *Why?* Mobile users hate scrolling back up to find the button.
5.  **Metadata:** "Format: A4 PDF | Artist: AI Agent".
6.  **Related Grid:** "More Cats" (6 thumbnails).

**Desktop View (Split Screen):**
*   **Left (65%):** The Image on a grey "tabletop" background.
*   **Right (35%):** Title, Ad Unit, Download Button, "Print Now" Button, and Affiliate Links ("Best Pencils for this page").

---

## **3. Design Specs (Tailwind CSS)**

### **3.1 Typography**
*   **Headings (Outfit):**
    *   **H1 (Single Page):** `text-4xl font-bold text-slate-800 tracking-tight`
    *   **H2 (Collection Title):** `text-3xl font-semibold text-slate-700`
    *   **H3 (Section Headers):** `text-xl font-medium text-slate-500 uppercase tracking-widest`
*   **Body (Inter):**
    *   `text-lg text-slate-600 leading-relaxed` (Optimized for readability).

### **3.2 The "PaperPause" Color Palette**
We use a **Warm Grayscale** base with **Teal** accents to create a calming, premium feel.

| Usage | Tailwind Class | Hex Code | Purpose |
| :--- | :--- | :--- | :--- |
| **Page BG** | `bg-stone-50` | #FAFAF9 | Warmer than pure white; easier on eyes. |
| **Card BG** | `bg-white` | #FFFFFF | Maximum contrast for images. |
| **Primary** | `bg-teal-600` | #0d9488 | Download buttons (Trust/Calm). |
| **Accent** | `text-rose-500` | #F43F5E | "New" badges, Sales. |
| **Text Main** | `text-slate-800` | #1E293B | Soft black. |

### **3.3 UI Component: The "Download" Button**
This is your most important element. It needs to look tactile and trustworthy.

```html
<button class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform transition hover:-translate-y-1 flex items-center justify-center gap-3">
  <svg>...</svg> <span>DOWNLOAD PDF (Printable)</span>
</button>
```

---

## **4. Frontend Implementation Notes**
1.  **Masonry Layout:** Use a grid system (Tailwind columns or lightweight JS) for the Collection Page.
2.  **Print Styles (`print.css`):** ensure navbar and ads are hidden when printing.
3.  **Analytics:** Tag the "Download" button with the `asset_download` GA4 event.