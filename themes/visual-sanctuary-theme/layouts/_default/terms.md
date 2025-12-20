{{- $html := .OutputFormats.Get "HTML" -}}
{{- $md := .OutputFormats.Get "MARKDOWN" -}}

# {{ .Title }}

{{- with .Params.description }}
{{ . }}
{{- end }}

## Metadata

- **Canonical (HTML):** {{ with $html }}{{ .Permalink }}{{ end }}
- **Markdown:** {{ with $md }}{{ .Permalink }}{{ end }}
- **Terms:** {{ len .Data.Terms.ByCount }}

## Terms

{{- range .Data.Terms.ByCount }}
- [{{ .Name }}]({{ .Page.RelPermalink }}) — {{ .Count }} pages
{{- end }}

