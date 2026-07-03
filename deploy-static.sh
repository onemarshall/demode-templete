#!/bin/bash

# Static deployment script for Cloudflare Pages
echo "🚀 Building static version for Cloudflare Pages deployment..."

# Set environment variables for static mode
export CMS_PROVIDER=static
export PUBLIC_CMS_PROVIDER=static

# Build the application
echo "📦 Building application..."
bun run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📁 Build output is ready in .svelte-kit/cloudflare"
    echo ""
    echo "🌐 To deploy to Cloudflare Pages:"
    echo "   1. Run: wrangler pages deploy .svelte-kit/cloudflare"
    echo "   2. Or use: bun run deploy:cloudflare"
    echo "   3. Or manually upload the .svelte-kit/cloudflare directory to Cloudflare Pages"
    echo ""
    echo "🔧 To test locally:"
    echo "   Run: bun run preview"
else
    echo "❌ Build failed!"
    exit 1
fi
