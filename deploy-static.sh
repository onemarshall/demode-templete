#!/bin/bash

# Static deployment script for Cloudflare Workers
echo "🚀 Building static version for Cloudflare Workers deployment..."

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
    echo "🌐 To deploy to Cloudflare Workers:"
    echo "   Run: bunx wrangler deploy"
    echo ""
    echo "🔧 To test locally:"
    echo "   Run: bun run preview"
else
    echo "❌ Build failed!"
    exit 1
fi
