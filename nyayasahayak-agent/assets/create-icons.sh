#!/bin/bash
# Script to generate icons for NyayaSahayak Sync agent
# Requires ImageMagick: brew install imagemagick (Mac) or apt install imagemagick (Linux)
# On Windows, use GIMP or Inkscape to create the .ico files manually

# Create a simple scale icon for the app
# In production, replace icon.png with a proper 1024x1024 PNG

SOURCE_PNG="icon-source.png"

if [ ! -f "$SOURCE_PNG" ]; then
  echo "Creating placeholder icon using ImageMagick..."
  # Create a navy blue square with ⚖ scale symbol
  convert -size 1024x1024 xc:"#1e3a5f" \
    -font "Helvetica" -pointsize 512 -fill white \
    -gravity center -annotate 0 "⚖" \
    icon-source.png 2>/dev/null || {
    echo "ImageMagick not found or failed. Using ffmpeg fallback..."
    # Fallback: create solid colored PNG
    python3 -c "
import struct, zlib

def create_png(width, height, color):
    def write_chunk(name, data):
        c = zlib.crc32(name + data) & 0xffffffff
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', c)

    signature = b'\x89PNG\r\n\x1a\n'
    ihdr = write_chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))

    raw = b''
    for y in range(height):
        raw += b'\x00'
        for x in range(width):
            raw += bytes(color)

    compressed = zlib.compress(raw)
    idat = write_chunk(b'IDAT', compressed)
    iend = write_chunk(b'IEND', b'')

    return signature + ihdr + idat + iend

# Navy blue: #1e3a5f = rgb(30, 58, 95)
with open('icon.png', 'wb') as f:
    f.write(create_png(512, 512, [30, 58, 95]))
print('Created icon.png (512x512 navy blue placeholder)')
"
  }
fi

echo ""
echo "=== Generating icons for all platforms ==="
echo ""

# Mac: generate .icns
if command -v sips &> /dev/null && command -v iconutil &> /dev/null; then
  echo "Generating Mac .icns..."
  mkdir -p AppIcon.iconset
  SIZES="16 32 64 128 256 512 1024"
  for size in $SIZES; do
    sips -z $size $size icon-source.png --out AppIcon.iconset/icon_${size}x${size}.png 2>/dev/null
    if [ "$size" -le 512 ]; then
      double=$((size * 2))
      sips -z $double $double icon-source.png --out AppIcon.iconset/icon_${size}x${size}@2x.png 2>/dev/null
    fi
  done
  iconutil -c icns AppIcon.iconset -o icon.icns
  rm -rf AppIcon.iconset
  echo "✅ Created icon.icns"
else
  echo "⚠ sips/iconutil not available (Mac only). Skipping .icns generation."
fi

# Generate PNG sizes for Linux/electron
if command -v convert &> /dev/null; then
  for size in 16 32 48 64 128 256 512; do
    convert icon-source.png -resize ${size}x${size} icon_${size}.png 2>/dev/null
  done
  cp icon_512.png icon.png

  # Windows ICO
  convert icon_16.png icon_32.png icon_48.png icon_64.png icon_128.png icon_256.png icon.ico 2>/dev/null
  echo "✅ Created icon.ico (Windows)"

  # Tray icons (22x22 PNG for Mac menu bar, 16x16 for Windows)
  convert icon-source.png -resize 22x22 tray-idle.png 2>/dev/null
  cp tray-idle.png tray-active.png
  echo "✅ Created tray icons"
else
  echo "⚠ ImageMagick not available. Using PNG as-is."
  cp icon.png icon_512.png 2>/dev/null || true
fi

echo ""
echo "Done! Required icon files:"
echo "  assets/icon.icns   — Mac app icon"
echo "  assets/icon.ico    — Windows app icon"
echo "  assets/icon.png    — Linux app icon"
echo "  assets/tray-idle.png   — Tray icon (inactive)"
echo "  assets/tray-active.png — Tray icon (active/syncing)"
echo ""
echo "Replace icon-source.png with your final branded icon before building."
