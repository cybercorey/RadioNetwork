#!/bin/bash

# Setup git hooks for the RadioNetwork project
# Run this script after cloning the repo: ./scripts/setup-hooks.sh

echo "🔧 Setting up git hooks..."

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
HOOKS_DIR="$ROOT_DIR/.git/hooks"

# Create pre-push hook
cat > "$HOOKS_DIR/pre-push" << 'EOF'
#!/bin/bash

# Git pre-push hook to ensure build succeeds before pushing
# This prevents pushing broken code to Vercel

echo "🔍 Running pre-push checks..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the root directory
ROOT_DIR=$(git rev-parse --show-toplevel)

# Check if we're pushing to main/master or v2 branches
PUSHING_TO_PRODUCTION=0
while read local_ref local_sha remote_ref remote_sha
do
    if [[ $remote_ref =~ refs/heads/(main|master|v2) ]]; then
        PUSHING_TO_PRODUCTION=1
    fi
done

# Only run build checks when pushing to production branches
if [ $PUSHING_TO_PRODUCTION -eq 0 ]; then
    echo "✅ Skipping build check (not pushing to production branch)"
    exit 0
fi

echo ""
echo "📦 Building frontend..."
cd "$ROOT_DIR/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ npm install failed${NC}"
        exit 1
    fi
fi

# Run the build
npm run build > /tmp/frontend-build.log 2>&1
BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed!${NC}"
    echo ""
    echo "Build errors:"
    cat /tmp/frontend-build.log
    echo ""
    echo -e "${RED}Push rejected. Fix the build errors and try again.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Frontend build succeeded${NC}"
fi

echo ""
echo "🔧 Checking backend TypeScript..."
cd "$ROOT_DIR/backend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ npm install failed${NC}"
        exit 1
    fi
fi

# Run TypeScript compiler in check mode (no emit)
npx tsc --noEmit > /tmp/backend-tsc.log 2>&1
TSC_EXIT_CODE=$?

if [ $TSC_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Backend TypeScript check failed!${NC}"
    echo ""
    echo "TypeScript errors:"
    cat /tmp/backend-tsc.log
    echo ""
    echo -e "${RED}Push rejected. Fix the TypeScript errors and try again.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Backend TypeScript check passed${NC}"
fi

echo ""
echo -e "${GREEN}✅ All pre-push checks passed!${NC}"
echo "🚀 Pushing to remote..."
echo ""

exit 0
EOF

# Make the hook executable
chmod +x "$HOOKS_DIR/pre-push"

echo "✅ Git hooks installed successfully!"
echo ""
echo "The pre-push hook will now:"
echo "  - Build the frontend before pushing to main/master/v2"
echo "  - Check backend TypeScript for errors"
echo "  - Prevent push if build fails"
echo ""
echo "To bypass the hook in an emergency: git push --no-verify"
