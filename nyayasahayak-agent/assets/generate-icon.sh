#!/bin/bash
# Generates icon.png at 1024x1024 from SVG using sips/qlmanage (macOS built-in)
# Then creates icon.icns and icon.ico from it

set -e
cd "$(dirname "$0")"

echo "🎨 Generating NyayaSahayak icon..."

# Create SVG icon
cat > /tmp/nyaya-icon.svg << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <!-- Deep navy to gold gradient for background -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f2240;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a3a6b;stop-opacity:1" />
    </linearGradient>
    <!-- Gold shimmer gradient -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f5c842;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#e8a800;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f5c842;stop-opacity:1" />
    </linearGradient>
    <!-- White shimmer for scales -->
    <linearGradient id="whiteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#d0dff0;stop-opacity:1" />
    </linearGradient>
    <!-- Drop shadow filter -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="rgba(0,0,0,0.4)"/>
    </filter>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <!-- Rounded rect clip -->
    <clipPath id="roundedClip">
      <rect width="1024" height="1024" rx="220" ry="220"/>
    </clipPath>
  </defs>

  <!-- Background with rounded corners (macOS style) -->
  <rect width="1024" height="1024" rx="220" ry="220" fill="url(#bgGrad)"/>

  <!-- Subtle inner border glow -->
  <rect width="1024" height="1024" rx="220" ry="220" fill="none"
        stroke="rgba(245,200,66,0.12)" stroke-width="4"/>

  <!-- ── Scales of Justice ── -->
  <!-- Central pivot post -->
  <rect x="498" y="240" width="28" height="480" rx="14" fill="url(#goldGrad)" filter="url(#shadow)"/>

  <!-- Top ornamental knob -->
  <circle cx="512" cy="230" r="36" fill="url(#goldGrad)" filter="url(#shadow)"/>
  <circle cx="512" cy="230" r="20" fill="#fff8e1"/>
  <circle cx="512" cy="230" r="10" fill="url(#goldGrad)"/>

  <!-- Horizontal balance beam -->
  <rect x="210" y="290" width="604" height="26" rx="13" fill="url(#goldGrad)" filter="url(#shadow)"/>

  <!-- Left chain -->
  <line x1="290" y1="316" x2="270" y2="400" stroke="url(#goldGrad)" stroke-width="12" stroke-linecap="round"/>
  <line x1="270" y1="400" x2="280" y2="460" stroke="url(#goldGrad)" stroke-width="12" stroke-linecap="round"/>
  <!-- Right chain -->
  <line x1="734" y1="316" x2="754" y2="400" stroke="url(#goldGrad)" stroke-width="12" stroke-linecap="round"/>
  <line x1="754" y1="400" x2="744" y2="460" stroke="url(#goldGrad)" stroke-width="12" stroke-linecap="round"/>

  <!-- Left pan (slightly lower = balanced/justice served) -->
  <ellipse cx="280" cy="490" rx="120" ry="28" fill="url(#whiteGrad)" filter="url(#shadow)"/>
  <path d="M160 470 Q280 510 400 470" fill="none" stroke="url(#whiteGrad)" stroke-width="14" stroke-linecap="round"/>
  <!-- Left pan reflection -->
  <ellipse cx="280" cy="476" rx="80" ry="10" fill="rgba(255,255,255,0.3)"/>

  <!-- Right pan (balanced) -->
  <ellipse cx="744" cy="490" rx="120" ry="28" fill="url(#whiteGrad)" filter="url(#shadow)"/>
  <path d="M624 470 Q744 510 864 470" fill="none" stroke="url(#whiteGrad)" stroke-width="14" stroke-linecap="round"/>
  <!-- Right pan reflection -->
  <ellipse cx="744" cy="476" rx="80" ry="10" fill="rgba(255,255,255,0.3)"/>

  <!-- Base / plinth -->
  <rect x="390" y="716" width="244" height="22" rx="11" fill="url(#goldGrad)"/>
  <rect x="350" y="730" width="324" height="28" rx="14" fill="url(#goldGrad)" filter="url(#shadow)"/>
  <rect x="300" y="750" width="424" height="32" rx="16" fill="url(#goldGrad)" filter="url(#shadow)"/>

  <!-- ── Book (law books bottom) ── -->
  <!-- Book 1 -->
  <rect x="290" y="794" width="64" height="90" rx="6" fill="#c0392b"/>
  <rect x="290" y="794" width="14" height="90" rx="4" fill="#922b21"/>
  <rect x="296" y="810" width="36" height="3" rx="1" fill="rgba(255,255,255,0.4)"/>
  <rect x="296" y="820" width="28" height="3" rx="1" fill="rgba(255,255,255,0.3)"/>
  <!-- Book 2 -->
  <rect x="362" y="784" width="64" height="100" rx="6" fill="#1a5276"/>
  <rect x="362" y="784" width="14" height="100" rx="4" fill="#154360"/>
  <rect x="368" y="800" width="36" height="3" rx="1" fill="rgba(255,255,255,0.4)"/>
  <rect x="368" y="810" width="28" height="3" rx="1" fill="rgba(255,255,255,0.3)"/>
  <!-- Book 3 -->
  <rect x="598" y="788" width="64" height="96" rx="6" fill="#1e8449"/>
  <rect x="598" y="788" width="14" height="96" rx="4" fill="#196f3d"/>
  <rect x="604" y="804" width="36" height="3" rx="1" fill="rgba(255,255,255,0.4)"/>
  <rect x="604" y="814" width="28" height="3" rx="1" fill="rgba(255,255,255,0.3)"/>
  <!-- Book 4 -->
  <rect x="670" y="796" width="64" height="88" rx="6" fill="#7d3c98"/>
  <rect x="670" y="796" width="14" height="88" rx="4" fill="#6c3483"/>
  <rect x="676" y="812" width="36" height="3" rx="1" fill="rgba(255,255,255,0.4)"/>
  <rect x="676" y="822" width="28" height="3" rx="1" fill="rgba(255,255,255,0.3)"/>

  <!-- ── Sync arrows (the "agent" part) ── -->
  <!-- Left arrow (upload ↑) -->
  <g transform="translate(440, 560)" filter="url(#shadow)">
    <path d="M0 60 L0 20 L-16 36 M0 20 L16 36" stroke="url(#goldGrad)"
          stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
  <!-- Right arrow (download ↓) -->
  <g transform="translate(584, 560)" filter="url(#shadow)">
    <path d="M0 0 L0 40 L-16 24 M0 40 L16 24" stroke="url(#goldGrad)"
          stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>

  <!-- Small stars / sparkles for premium feel -->
  <g fill="rgba(245,200,66,0.5)">
    <polygon points="150,160 157,178 176,178 162,189 167,208 150,197 133,208 138,189 124,178 143,178" transform="scale(0.6) translate(90,90)"/>
    <polygon points="870,140 875,154 890,154 879,162 883,176 870,168 857,176 861,162 850,154 865,154" transform="scale(0.5) translate(1520,100)"/>
  </g>
</svg>
SVGEOF

echo "✅ SVG created at /tmp/nyaya-icon.svg"

# Convert SVG → PNG using qlmanage or rsvg-convert or inkscape
if command -v rsvg-convert &>/dev/null; then
  rsvg-convert -w 1024 -h 1024 /tmp/nyaya-icon.svg -o icon.png
  echo "✅ PNG generated via rsvg-convert"
elif command -v inkscape &>/dev/null; then
  inkscape --export-type=png --export-filename=icon.png -w 1024 -h 1024 /tmp/nyaya-icon.svg
  echo "✅ PNG generated via inkscape"
else
  # Use Python with cairosvg if available
  python3 -c "
import subprocess, sys
try:
    import cairosvg
    cairosvg.svg2png(url='/tmp/nyaya-icon.svg', write_to='icon.png', output_width=1024, output_height=1024)
    print('✅ PNG generated via cairosvg')
except ImportError:
    print('⚠️  No SVG converter found, skipping PNG generation')
    sys.exit(0)
" 2>/dev/null || echo "⚠️  No SVG converter available, using existing PNG"
fi

echo "Done! Now creating .icns and .ico..."
