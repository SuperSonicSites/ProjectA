{{- $html := .OutputFormats.Get "HTML" -}}
{{- $md := .OutputFormats.Get "MARKDOWN" -}}

# {{ .Title }}

{{- with .Params.description }}
{{ . }}
{{- end }}

## Metadata

- **Canonical (HTML):** {{ with $html }}{{ .Permalink }}{{ end }}
- **Markdown:** {{ with $md }}{{ .Permalink }}{{ end }}
- **Pages (recursive):** {{ len .RegularPagesRecursive }}

{{- if gt (len .Sections) 0 }}

## Subcollections

{{- range .Sections.ByTitle }}
  {{- $childMd := .OutputFormats.Get "MARKDOWN" -}}
- [{{ .Title }}]({{ with $childMd }}{{ .RelPermalink }}{{ end }}) — {{ len .RegularPagesRecursive }} pages
{{- end }}

{{- end }}

{{- if gt (len .RegularPages) 0 }}

## Pages

{{- range .RegularPages.ByDate.Reverse | first 200 }}
  {{- $pmd := .OutputFormats.Get "MARKDOWN" -}}
- [{{ .Title }}]({{ with $pmd }}{{ .RelPermalink }}{{ end }}) — {{ .Description | default "No description." }} ({{ .Params.style | default "Style N/A" }}, {{ .Params.audience | default "Audience N/A" }})
{{- end }}

{{- if gt (len .RegularPages) 200 }}

_Listing truncated at 200 pages. See the HTML page for full browsing._

{{- end }}

{{- end }}

