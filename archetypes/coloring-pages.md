---
title: "{{ replace .Name "-" " " | title }}"
description: "A beautiful coloring page for you to enjoy."
pinterest_title: ""      # Pinterest/RSS-optimized title (keyword-forward)
pinterest_description: "" # Pinterest description (200-300 chars)
date: {{ .Date }}
type: "coloring-pages"
draft: false

# SEO & Content Classification
categories: ["animals"]  # Choose: animals, mandalas, holidays, fantasy, educational
collections: ["cats"]    # Choose based on category
style: "Kawaii"          # Kawaii, Cottagecore, Totem, Bold Line Pop Art, Magical Realism
medium: "Markers"        # Markers, Crayons, Colored Pencils, etc.

# Asset URLs
cf_image_id: ""          # Cloudflare Images ID
image_url: ""            # Full resolution web preview
download_url: ""         # R2 PDF download link
r2_original: ""          # Backup original PNG in R2
prompt: ""               # Alt text for accessibility (used in img alt attribute)
---

Add your description here. This will appear below the image on the detail page.

