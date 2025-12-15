---
title: "{{ replace .Name "-" " " | title }}"
description: "A beautiful coloring page for you to enjoy."
date: {{ .Date }}
type: "coloring-pages"
draft: false

# SEO & Content Classification
categories: ["animals"]  # Choose: animals, mandalas, holidays, fantasy, educational
collections: ["cats"]    # Choose based on category
difficulty: "Easy"       # Easy, Medium, Hard
style: "Bold"            # Bold, Realistic, Cute, Cartoon, Outline, etc.
medium: "Markers"        # Markers, Crayons, Colored Pencils, etc.

# Asset URLs
cf_image_id: ""          # Cloudflare Images ID
image_url: ""            # Full resolution web preview
download_url: ""         # R2 PDF download link
r2_original: ""          # Backup original PNG in R2
---

Add your description here. This will appear below the image on the detail page.

