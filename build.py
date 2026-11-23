#!/usr/bin/env python3
"""Assemble src/ into a single self-contained index.html (plus PWA files already in dist/)."""
import pathlib

root = pathlib.Path(__file__).parent
src = root / 'src'
dist = root
dist.mkdir(exist_ok=True)

css = (src / 'style.css').read_text()
body = (src / 'body.html').read_text()
js = '\n'.join((src / f).read_text() for f in sorted(p.name for p in src.glob('*.js')))

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>IronLog</title>
<meta name="description" content="Gym tracker: weekly routines, sets, reps, weights, PRs and body weight.">
<meta name="theme-color" content="#F3F2EE" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0D0E10" media="(prefers-color-scheme: dark)">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="IronLog">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
{css}
</style>
</head>
<body>
{body}
<script>
{{
{js}
}}
</script>
</body>
</html>
"""
(dist / 'index.html').write_text(html)
print('index.html', len(html.splitlines()), 'lines,', len(html.encode()) // 1024, 'KB')
