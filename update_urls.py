#!/usr/bin/env python3
"""
Script to update all internal links from .html to clean URLs
"""
import os
import re

WORKSPACE = '/workspace'

# List of all page names (without .html) for clean URLs
PAGES = [
    'search', 'messages', 'my-listings', 'social', 'listanitem', 'listing',
    'profile', 'login', 'activity', 'chat', 'user', 'tag', 'topic',
    'createtopic', 'edittopic', 'edit-listing', 'terms', 'privacy', 'safety',
    'contact', 'finish-signup', 'searchsocial', 'admincenter', 'verify',
    '404'
]

def replace_html_links(content):
    """Replace internal .html links with clean URLs in HTML content."""
    for page in PAGES:
        if page == '404':
            continue
        # Pattern for href="/page.html" -> href="/page"
        pattern = r'href="/' + re.escape(page) + r'\.html"'
        replacement = f'href="/{page}"'
        content = re.sub(pattern, replacement, content)
        # Pattern for href='/page.html' -> href='/page'
        pattern = r"href='/" + re.escape(page) + r"\.html'"
        replacement = f"href='/{page}'"
        content = re.sub(pattern, replacement, content)
    
    # Special case: /index.html -> /
    content = re.sub(r'href="/index\.html"', 'href="/"', content)
    content = re.sub(r"href='/index\.html'", "href='/'", content)
    
    return content

def replace_js_nav(content):
    """Replace window.location.href and similar JS navigation patterns."""
    
    for page in PAGES:
        if page == '404':
            continue
        
        # Pattern for window.location.href = '/page.html' -> '/page'
        pattern = r"window\.location\.href\s*=\s*'/" + re.escape(page) + r"\.html'"
        replacement = f"window.location.href = '/{page}'"
        content = re.sub(pattern, replacement, content)
        
        # Pattern for window.location.href = "/page.html" -> "/page"
        pattern = r'window\.location\.href\s*=\s*"/' + re.escape(page) + r'\.html"'
        replacement = f'window.location.href = "/{page}"'
        content = re.sub(pattern, replacement, content)
        
        # Pattern for template literals: `/page.html?...` -> `/${page}?...`
        pattern = r"`/" + re.escape(page) + r"\.html(\?[^`]*?)`"
        replacement = f"`/{page}\\1`"
        content = re.sub(pattern, replacement, content)
        
        # Pattern for simple template literal: `/page.html`
        pattern = r"`/" + re.escape(page) + r"\.html`"
        replacement = f"`/{page}`"
        content = re.sub(pattern, replacement, content)
        
        # Pattern for .href = '/page.html' (without window.location)
        pattern = r"\.href\s*=\s*'/" + re.escape(page) + r"\.html'"
        replacement = f".href = '/{page}'"
        content = re.sub(pattern, replacement, content)
        
        # Pattern for .href = "/page.html"
        pattern = r'\.href\s*=\s*"/' + re.escape(page) + r'\.html"'
        replacement = f'.href = "/{page}"'
        content = re.sub(pattern, replacement, content)
        
        # Pattern for redirect=/page.html in URL query strings (inside encodeURIComponent or not)
        pattern = r"encodeURIComponent\('/?" + re.escape(page) + r"\.html'\)"
        replacement = f"encodeURIComponent('/{page}')"
        content = re.sub(pattern, replacement, content)
        
        # Pattern for ?redirect=/page.html or &redirect=/page.html
        pattern = r"(\?|&)redirect=/??" + re.escape(page) + r"\.html"
        replacement = f"\\1redirect=/{page}"
        content = re.sub(pattern, replacement, content)
    
    # Special case: /index.html -> /
    content = re.sub(r"window\.location\.href\s*=\s*'/index\.html'", "window.location.href = '/'", content)
    content = re.sub(r'window\.location\.href\s*=\s*"/index\.html"', 'window.location.href = "/"', content)
    content = re.sub(r"`/index\.html`", "'/'", content)
    content = re.sub(r"\.href\s*=\s*'/index\.html'", ".href = '/'", content)
    content = re.sub(r'\.href\s*=\s*"/index\.html"', '.href = "/"', content)
    content = re.sub(r"redirect=/index\.html", "redirect=/", content)
    
    # Pattern for includes('/page.html') -> includes('/page')
    for page in PAGES:
        if page == '404':
            continue
        pattern = r"\.includes\('/" + re.escape(page) + r"\.html'\)"
        replacement = f".includes('/{page}')"
        content = re.sub(pattern, replacement, content)
        
        pattern = r'\.includes\("/' + re.escape(page) + r'\.html"\)'
        replacement = f'.includes("/{page}")'
        content = re.sub(pattern, replacement, content)
    
    # Special case for index.html includes
    content = re.sub(r"\.includes\('index\.html'\)", ".includes('/')", content)
    content = re.sub(r'\.includes\("index\.html"\)', '.includes("/")', content)
    
    # Pattern for endsWith('/index.html') -> endsWith('/')
    content = re.sub(r"\.endsWith\('/index\.html'\)", ".endsWith('/')", content)
    content = re.sub(r'\.endsWith\("/index\.html"\)', '.endsWith("/")', content)
    
    return content

def process_html_file(filepath):
    """Process an HTML file to update links."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    content = replace_html_links(content)
    content = replace_js_nav(content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")
        return True
    return False

def process_js_file(filepath):
    """Process a JS file to update navigation."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    content = replace_js_nav(content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")
        return True
    return False

def process_sitemap(filepath):
    """Update sitemap.xml to use clean URLs."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Remove the duplicate index.html entry
    content = re.sub(
        r'\s*<url>\s*<loc>https://scoralia\.netlify\.app/index\.html</loc>\s*<lastmod>.*?</lastmod>\s*<changefreq>.*?</changefreq>\s*<priority>.*?</priority>\s*</url>',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Replace .html URLs with clean URLs
    for page in PAGES:
        if page == '404':
            continue
        pattern = r'https://scoralia\.netlify\.app/' + re.escape(page) + r'\.html'
        replacement = f'https://scoralia.netlify.app/{page}'
        content = re.sub(pattern, replacement, content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")
        return True
    return False

def process_sw(filepath):
    """Update sw.js to use clean URLs in cache list."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Replace /index.html with /
    content = content.replace("'/index.html',", "'/',")
    
    # Replace other .html entries
    for page in PAGES:
        if page == '404':
            continue
        content = content.replace(f"'/{page}.html',", f"'/{page}',")
        content = content.replace(f"'/{page}.html'", f"'/{page}'")
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")
        return True
    return False

def main():
    print("Starting URL cleanup...")
    
    # Process all HTML files
    html_files = [f for f in os.listdir(WORKSPACE) if f.endswith('.html')]
    for html_file in html_files:
        filepath = os.path.join(WORKSPACE, html_file)
        process_html_file(filepath)
    
    # Process global.js
    js_path = os.path.join(WORKSPACE, 'global.js')
    if os.path.exists(js_path):
        process_js_file(js_path)
    
    # Process sitemap.xml
    sitemap_path = os.path.join(WORKSPACE, 'sitemap.xml')
    if os.path.exists(sitemap_path):
        process_sitemap(sitemap_path)
    
    # Process sw.js
    sw_path = os.path.join(WORKSPACE, 'sw.js')
    if os.path.exists(sw_path):
        process_sw(sw_path)
    
    print("Done!")

if __name__ == '__main__':
    main()
