# **Measurement Plan: Maximizing Site Insights**

Context: PaperPause (Hugo Static Site)  
Objective: Engineer a tracking system that identifies the "Most Downloaded" assets with precision and gathers deep behavioral insights to optimize future content generation.

## **1\. The Strategy: "Granular Event Tracking"**

To get maximum insights, we cannot rely on default Google Analytics (which only tracks "Page Views"). We have implemented a custom **Analytics Collector** that listens for specific user interactions.

### **The Insights We Capture:**

1. **The Holy Grail:** Exact download counts per specific file.  
2. **Category Affinity:** Which *Silos* are performing best (e.g., "Do users download more from /animals/ or /mandalas/?").  
3. **Acquisition Context:** Did the user land directly on the asset (SEO/Pinterest) or navigate there from the home page?
4. **Social Engagement:** Tracking Pinterest "Save" interactions.
5. **Search Intent:** Capturing internal search queries via Pagefind.

## **2\. Implementation: The "Analytics Events" Partial**

The tracking logic is centralized in `layouts/partials/analytics-events.html`. This script is automatically included in the global footer and handles dual-tracking for Google Analytics 4 (GA4) and Pinterest Tag.

**Key Features:**
- **Consent Aware:** Only fires events if the user accepts the cookie consent banner.
- **Robust PDF Tracking:** Detects downloads via file extension and `download` attributes.
- **Context Rich:** Automatically extracts "Silo" and "Collection" metadata from the URL structure.
- **Search Integration:** Monitors search input with a debounce to capture user intent.

## **3\. How to View the "Most Downloaded" Report**

Default GA4 reports are messy. You should build a **Custom Exploration** in GA4 to see the clean list of top downloads.

### **Configuration Steps (Do this once in GA4):**

1. **Navigate:** Go to **Explore** (left sidebar) -> **Blank Report**.  
2. **Variables (Left Column):**  
   * **Dimensions:** Add `file_name`, `file_category`, and `file_subcategory`. (These should be registered as *Custom Dimensions* in GA4 Admin settings).  
   * **Metrics:** Add `Event Count`.  
3. **Tab Settings (Right Column):**  
   * **Rows:** Drag `file_name` here.  
   * **Values:** Drag `Event Count` here.  
   * **Filters:** Drag `Event Name` and set it to match specifically `asset_download`.  
4. **Result:** You will see a table sorted by popularity:  
   * simple-cat-01.pdf | 1,204  
   * dino-rex-03.pdf | 892  
   * fantasy-fairy-01.pdf | 400

## **4\. Advanced Insights: The "Missed Opportunity" Tracker**

Beyond downloads, you need to know what users *wanted* but didn't find.

### **Internal Search Tracking**

GA4 tracks `search` events from the collector script. Review this weekly to identify content gaps.

* **Report:** Reports > Engagement > Events > search  
* **Insight:** Look for terms with **High Search Volume** but **Low Engagement**.  
* **Action:** Generate content for popular search terms that aren't yet in your library.

## **5\. The Feedback Loop (Data -> Automation)**

| Insight | Automation Trigger |
| :---- | :---- |
| **High Volume Download** | If a category > 50% of total downloads -> **Increase Batch Size** for that category. |
| **Zero Downloads** | If a category < 5% of downloads after month 1 -> **Pause Generation** for that category. |
| **High Search / No Result** | If a search term > 100 queries -> **Create New Collection/Silo**. |

## **6\. Summary Checklist**

1. **GA4 Measurement ID:** Configured in `hugo.toml`.  
2. **Pinterest Tag ID:** Configured in `hugo.toml`.
3. **Collector Script:** Handled by `layouts/partials/analytics-events.html`.  
4. **Register Custom Dimensions:** In GA4 Admin > Custom Definitions, create dimensions for `file_name`, `file_category`, and `file_subcategory`.  
5. **Weekly Review:** Check the "Exploration" report to identify your winners.