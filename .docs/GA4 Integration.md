# **Measurement Plan: Maximizing Site Insights**

Context: Visual Sanctuary (Hugo Static Site)  
Objective: Engineer a tracking system that identifies the "Most Downloaded" assets with precision and gathers deep behavioral insights to optimize future content generation.

## **1\. The Strategy: "Granular Event Tracking"**

To get maximum insights, we cannot rely on default Google Analytics (which only tracks "Page Views"). We must inject a custom **Data Collector** that listens for specific user interactions.

### **The Insights We Will Capture:**

1. **The Holy Grail:** Exact download counts per specific file (e.g., simple-cat-01.pdf).  
2. **Category Affinity:** Which *Silos* are performing best (e.g., "Do users download more from /animals/ or /fantasy/?").  
3. **Acquisition Context:** Did the user land directly on the asset (SEO/Pinterest) or navigate there from the home page?

## **2\. Implementation: The "Master Collector" Script**

Since you are automating site creation with Hugo, we will implement a single, robust JavaScript listener in your global footer. This script will automatically "tag" every download button across 10,000+ pages without manual work.

**Action:** Place this code in layouts/partials/footer.html immediately before the \</body\> tag.

\<script\>  
/\*\*  
 \* Visual Sanctuary \- Master Analytics Collector  
 \* Tracks: Downloads, External Clicks, and Category Context  
 \*/  
document.addEventListener('click', function(e) {  
    // 1\. Identify the Click Target  
    const link \= e.target.closest('a');  
    if (\!link) return;

    // 2\. DATA EXTRACTION LOGIC  
      
    // A. Track PDF Downloads (The Core Metric)  
    if (link.href.endsWith('.pdf')) {  
        const filename \= link.href.split('/').pop();  
          
        // Extract "Silo" from URL (e.g., \[domain.com/animals/cats/\](https://domain.com/animals/cats/)...)  
        // Assumes structure: \[domain.com/\](https://domain.com/)\[silo\]/\[collection\]/...  
        const pathSegments \= window.location.pathname.split('/').filter(Boolean);  
        const silo \= pathSegments\[0\] || 'uncategorized';   
        const collection \= pathSegments\[1\] || 'general';

        if (typeof gtag \=== 'function') {  
            gtag('event', 'asset\_download', {  
                'file\_name': filename,          // "simple-cat-01.pdf"  
                'file\_category': silo,          // "animals"  
                'file\_subcategory': collection, // "cats"  
                'link\_location': 'sticky\_bar'   // Helps optimize UI placement  
            });  
        }  
    }

    // B. Track Affiliate/Outbound Clicks (Monetization Insight)  
    // Checks if link is external and NOT our domain  
    if (link.hostname \!== window.location.hostname && \!link.href.endsWith('.pdf')) {  
        if (typeof gtag \=== 'function') {  
            gtag('event', 'outbound\_click', {  
                'destination\_domain': link.hostname,  
                'link\_url': link.href  
            });  
        }  
    }  
});  
\</script\>

## **3\. How to View the "Most Downloaded" Report**

Default GA4 reports are messy. You must build a **Custom Exploration** to see the clean list of top downloads.

### **Configuration Steps (Do this once in GA4):**

1. **Navigate:** Go to **Explore** (left sidebar) \-\> **Blank Report**.  
2. **Variables (Left Column):**  
   * **Dimensions:** Add File Name and File Category (You must register these as *Custom Dimensions* in Admin settings first, or use the default Link URL if you want a quick start).  
   * **Metrics:** Add Event Count.  
3. **Tab Settings (Right Column):**  
   * **Rows:** Drag File Name here.  
   * **Values:** Drag Event Count here.  
   * **Filters:** Drag Event Name and set it to match specifically asset\_download.  
4. **Result:** You will see a spreadsheet-like table sorted by popularity:  
   * simple-cat-01.pdf | 1,204  
   * dino-rex-03.pdf | 892  
   * fantasy-fairy-01.pdf | 400

## **4\. Advanced Insights: The "Missed Opportunity" Tracker**

Beyond downloads, you need to know what users *wanted* but didn't find.

### **Internal Search Tracking**

GA4 tracks Site Search by default, but you should review it weekly.

* **Report:** Reports \> Engagement \> Events \> view\_search\_results  
* **Insight:** Look for terms with **High Search Volume** but **Low Engagement**.  
  * *Example:* 500 searches for "Axolotl" but you have 0 Axolotl pages.  
  * **Action:** Add "Axolotl" to your next automation batch immediately.

## **5\. The Feedback Loop (Data \-\> Automation)**

This implementation plan is designed to feed your automation engine.

| Insight | Automation Trigger |
| :---- | :---- |
| **High Volume Download** | If cats \> 50% of total downloads \-\> **Increase Cat Batch Size** by 2x. |
| **Zero Downloads** | If bears \< 5% of downloads after month 1 \-\> **Stop Generating Bears**. |
| **High Search / No Result** | If search term unicorn \> 100 queries \-\> **Create New Silo: Unicorns**. |

## **6\. Summary Checklist**

1. **Install GA4 Base Code:** Standard setup in \<head\>.  
2. **Inject Master Collector:** Place the script above in footer.html.  
3. **Register Custom Dimensions:** In GA4 Admin \> Custom Definitions, create dimensions for file\_name and file\_category so they show up in reports.  
4. **Weekly Review:** Check the "Exploration" report to identify your winners.