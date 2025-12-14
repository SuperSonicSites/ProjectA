# **The "1-Hour Workweek" Automation Architecture**

# **Platform: n8n (Self-hosted or Cloud)**

REQUIRED ACCOUNTS:

1. OpenAI API (The Brain \- Text)  
2. Recraft.ai API (The Artist \- Images)  
3. Cloudflare R2 (The Storage \- Buckets)  
4. Telegram Bot (The Manager \- Interface)  
5. GitHub (The CMS \- Code)

### **WORKFLOW 1: "THE CREATOR" (Runs Daily)**

Trigger: Schedule (Every day at 4:00 AM)

NODE 1: OpenAI (Chat Model)

* Role: The "Creative Director"  
* System Prompt: "You are an expert coloring book editor. Generate 5 unique, detailed prompts for adult coloring pages based on the theme: \[Select Random Theme from List\]. Output strictly JSON array."  
* Input List: \[Steampunk, Mandala, Floral, Cyberpunk, Cute Animals, Architecture\]

NODE 2: Split In Batches

* Role: Process the 5 prompts one by one.

NODE 3: HTTP Request (Recraft.ai)

* Role: The "Illustrator"  
* Method: POST https://www.google.com/search?q=https://api.recraft.ai/v1/images/generations  
* Payload:  
  * prompt: {{ $json.prompt }}  
  * style: "vector\_art"  
  * sub\_style: "line\_art" or "coloring\_book"  
  * color: "black\_and\_white"  
  * size: "1024x1536" (Portrait)

NODE 4: HTTP Request (Cloudflare R2 \- Upload)

* Role: The "Staging Server"  
* Action: Upload the generated image file.  
* Bucket: "my-coloring-site"  
* Key: "staging/{{ $now.format('yyyy-MM-dd') }}-{{ $json.id }}.png"

NODE 5: Telegram (Send Photo)

* Role: The "Notifier"  
* Chat ID: Your Personal ID  
* Photo: URL from Recraft  
* Caption: "New Design: {{ $json.prompt }}"  
* Inline Keyboard (Buttons):  
  * \[✅ Approve\] (callback\_data: approve\_{{file\_name}})  
  * \[❌ Trash\] (callback\_data: trash\_{{file\_name}})

### **WORKFLOW 2: "THE PUBLISHER" (Runs on Click)**

Trigger: Telegram Trigger (On Callback Query)

NODE 1: Switch (Condition)

* Logic: If callback\_data starts with "approve\_" \-\> Path A. Else \-\> Path B.

\--- PATH A (APPROVED) \---

NODE 2: OpenAI (Metadata Gen)

* Role: The "SEO Writer"  
* Prompt: "Write a catchy H1 title, a 50-word SEO description, and 5 tags for a coloring page described as: {{prompt}}. Format as JSON."

NODE 3: Cloudflare R2 (Move File)

* Action: Copy file  
* Source: "staging/{{file\_name}}"  
* Destination: "public/{{file\_name}}"

NODE 4: GitHub (Create File)

* Role: The "CMS Manager"  
* Repository: "username/repo"  
* File Path: "content/coloring-pages/{{slug}}.md"

* ## **Content (Template):**   **title: "{{ $json.title }}" date: {{ $now }} image\_url: "https://www.google.com/search?q=https://r2.mydomain.com/public/{{file\_name}}" description: "{{ $json.description }}" tags: \[{{ $json.tags }}\]**   **{{ $json.description }}**

\--- PATH B (TRASHED) \---

NODE 1: Cloudflare R2 (Delete)

* Action: Delete object  
* Key: "staging/{{file\_name}}"  
* Message: Reply to Telegram "Deleted."