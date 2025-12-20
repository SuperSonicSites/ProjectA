{{- $html := .OutputFormats.Get "HTML" -}}
{{- $md := .OutputFormats.Get "MARKDOWN" -}}

{{- $img := "" -}}
{{- if .Params.image_url -}}
  {{- $img = .Params.image_url -}}
{{- else if .Params.cf_image_id -}}
  {{- $img = printf "https://imagedelivery.net/%s/%s/desktop" .Site.Params.cf_images_hash .Params.cf_image_id -}}
{{- else -}}
  {{- $img = ("/images/og-default.jpg" | absURL) -}}
{{- end -}}

# {{ .Title }}

## Metadata

- **Description:** {{ .Description | default .Site.Params.description }}
- **Canonical (HTML):** {{ with $html }}{{ .Permalink }}{{ end }}
- **Markdown:** {{ with $md }}{{ .Permalink }}{{ end }}
- **Type:** {{ .Type | default "unknown" }}
{{- with .CurrentSection }}
- **Section:** {{ .Title }}
{{- end }}
{{- with .Params.categories }}
- **Categories:** {{ delimit . ", " }}
{{- end }}
- **Style:** {{ .Params.style | default "Not specified" }}
- **Medium:** {{ .Params.medium | default "Not specified" }}
- **Audience:** {{ .Params.audience | default "Not specified" }}
- **Difficulty:** {{ .Params.difficulty | default "Not specified" }}
{{- if not .Date.IsZero }}
- **Published:** {{ .Date.Format "2006-01-02" }}
{{- end }}
- **Download (PDF):** {{ .Params.download_url | default .Params.r2_original | default "Not available" }}
- **Source image (PNG):** {{ .Params.r2_original | default "Not available" }}

## Image

![{{ .Params.prompt | default .Title }}]({{ $img }})

## Context

{{- with .Params.prompt }}
- **Alt/context prompt:** {{ . }}
{{- end }}
{{- with .Params.pinterest_description }}
- **Extended description:** {{ . }}
{{- end }}

