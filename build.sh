#!/bin/bash
# =============================================================
# Luna Wallet v2 — Production Build Script
# =============================================================
set -e

echo "🏦 Luna Wallet v2.0.0 — Build Script"
echo "========================================"

# 1. Clean
echo "🧹 Cleaning dist..."
rm -rf dist

# 2. Install deps
echo "📦 Installing dependencies..."
npm install

# 3. TypeScript check
echo "🔍 Running TypeScript check..."
npx tsc --noEmit

# 4. Build
echo "🔨 Building for production..."
npm run build

# 5. Show results
echo ""
echo "✅ Build complete!"
echo "📁 Output: dist/"
echo "📊 Size: $(du -sh dist/ | cut -f1)"
echo ""
echo "📄 Files:"
ls -lh dist/ | grep -v node_modules | head -20

# 6. Generate Brotli sizes
echo ""
echo "📦 Gzipped sizes:"
for f in dist/assets/*.js dist/assets/*.css; do
  if [ -f "$f" ]; then
    size=$(gzip -c "$f" | wc -c | numfmt --to=iec)
    name=$(basename "$f")
    echo "   $name → $size"
  fi
done

echo ""
echo "🚀 Ready for deployment:"
echo "   Vercel:  https://luna-bank-app.vercel.app"
echo "   TWA:     t.me/LunaBankBot"
echo "   iOS:     capacitor open ios"
echo "   Android: capacitor open android"