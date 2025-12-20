# Role
You are a Senior Hugo Developer and Technical SEO Specialist.

# Context
PaperPause is optimizing its structured data to maximize "Entity Authority" and semantic precision. We are strictly avoiding "boilerplate" schema (like repetitive FAQs) to prevent spam penalties.

# Objectives
1.  **Establish Global Authority:** Link the website entity to the official Pinterest profile using `sameAs`. We will use the canonical global URL (`pinterest.com`) rather than the regional (`ca.pinterest.com`) to consolidate authority.
2.  **Semantic Precision:** Add the `creator` property to `VisualArtwork` schema. Schema.org defines `creator` as the primary property for visual works, while `author` is secondary. We will use both to satisfy all parsers.

# Target File
`themes/visual-sanctuary-theme/layouts/partials/seo/schema.html`

# Implementation Plan

## Task 1: Add Social Authority (`sameAs`)
**Location:** Section 4 ("Organization Schema") - This is the schema block that runs on single pages and sections.
**Action:** Add the `sameAs` array to the Organization object.

*Current State:*

```json
"description": "{{ .Site.Params.description | default "Free printable coloring pages for adults and kids." }}"

## New State (Ensure comma is added to previous line):
"description": "{{ .Site.Params.description | default "Free printable coloring pages for adults and kids." }}",
"logo": "{{ .Site.Params.logo }}",
"sameAs": [
  "[https://www.pinterest.com/paperpause/](https://www.pinterest.com/paperpause/)",
  "[https://www.facebook.com/paperpause/](https://www.facebook.com/paperpause/)"
]

(Note: We use the clean, global Pinterest URL without tracking codes or regional subdomains.)

## Task 2: Add creator Property to Artwork
Location: Section 5 ("Single Asset Schema"), inside the VisualArtwork block. Action: Duplicate the existing author block key and rename it creator.

Current State:

"author": {
        "@type": "Organization",
        "@id": "{{ .Site.BaseURL }}#organization",
        "name": "{{ .Site.Title }}",
        "url": "{{ .Site.BaseURL }}"
      }

New State (Add creator immediately after author):

"author": {
        "@type": "Organization",
        "@id": "{{ .Site.BaseURL }}#organization",
        "name": "{{ .Site.Title }}",
        "url": "{{ .Site.BaseURL }}"
      },
      "creator": {
        "@type": "Organization",
        "@id": "{{ .Site.BaseURL }}#organization",
        "name": "{{ .Site.Title }}",
        "url": "{{ .Site.BaseURL }}"
      }
