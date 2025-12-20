{{- $md := .OutputFormats.Get "MARKDOWN" -}}

# {{ .Site.Title }}

{{ .Site.Params.description }}

## Collections

{{- range .Site.Sections.ByTitle }}
  {{- $smd := .OutputFormats.Get "MARKDOWN" -}}
- [{{ .Title }}]({{ with $smd }}{{ .RelPermalink }}{{ end }}) — {{ len .RegularPagesRecursive }} pages
{{- end }}

## Sitemaps

- {{ "sitemap.xml" | absURL }}
- {{ "pages-sitemap.xml" | absURL }}

