#!/bin/bash

# UI Testing Script for Tools & MCP Integration
# This script runs comprehensive tests for the UI components

echo "🧪 Starting Tools & MCP Integration UI Tests"
echo "============================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Check if database exists and is set up
if [ ! -f "fireplexity.db" ]; then
    print_status $YELLOW "⚠️  Database not found. Creating database..."
    sqlite3 fireplexity.db < scripts/create-tools-mcp-schema.sql
    if [ $? -eq 0 ]; then
        print_status $GREEN "✅ Database created successfully"
    else
        print_status $RED "❌ Failed to create database"
        exit 1
    fi
else
    print_status $GREEN "✅ Database found"
fi

# Check if Node modules are installed
if [ ! -d "node_modules" ]; then
    print_status $YELLOW "⚠️  Node modules not found. Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_status $GREEN "✅ Dependencies installed"
    else
        print_status $RED "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Install Playwright browsers if needed
print_status $YELLOW "🌐 Installing Playwright browsers..."
npx playwright install --with-deps chromium

# Function to run a test suite
run_test_suite() {
    local test_name=$1
    local test_file=$2
    
    print_status $YELLOW "\n🔍 Running $test_name tests..."
    echo "Test file: $test_file"
    
    npm run test:e2e -- "$test_file" --reporter=line
    
    if [ $? -eq 0 ]; then
        print_status $GREEN "✅ $test_name tests passed"
        return 0
    else
        print_status $RED "❌ $test_name tests failed"
        return 1
    fi
}

# Start the development server in background
print_status $YELLOW "🚀 Starting development server..."
npm run dev > dev-server.log 2>&1 &
DEV_SERVER_PID=$!

# Function to cleanup
cleanup() {
    print_status $YELLOW "🧹 Cleaning up..."
    if [ ! -z "$DEV_SERVER_PID" ]; then
        kill $DEV_SERVER_PID 2>/dev/null
        wait $DEV_SERVER_PID 2>/dev/null
    fi
    rm -f dev-server.log
}

# Set trap to cleanup on script exit
trap cleanup EXIT

# Wait for server to start
print_status $YELLOW "⏳ Waiting for development server to start..."
for i in {1..60}; do
    if curl -s http://localhost:18563 > /dev/null 2>&1; then
        print_status $GREEN "✅ Development server is running"
        break
    fi
    sleep 2
    if [ $i -eq 60 ]; then
        print_status $RED "❌ Development server failed to start within 2 minutes"
        cat dev-server.log
        exit 1
    fi
done

# Run test suites
TESTS_PASSED=0
TOTAL_TESTS=3

print_status $YELLOW "\n🎯 Running UI Test Suites"
print_status $YELLOW "========================="

# Test 1: Tools Integration
if run_test_suite "Tools Integration" "tests/e2e/tools-integration.spec.ts"; then
    ((TESTS_PASSED++))
fi

# Test 2: MCP Servers
if run_test_suite "MCP Servers" "tests/e2e/mcp-servers.spec.ts"; then
    ((TESTS_PASSED++))
fi

# Test 3: Integration Workflow
if run_test_suite "Integration Workflow" "tests/e2e/integration-workflow.spec.ts"; then
    ((TESTS_PASSED++))
fi

# Summary
print_status $YELLOW "\n📊 Test Summary"
print_status $YELLOW "==============="
print_status $GREEN "✅ Tests passed: $TESTS_PASSED/$TOTAL_TESTS"

if [ $TESTS_PASSED -eq $TOTAL_TESTS ]; then
    print_status $GREEN "\n🎉 All UI tests passed successfully!"
    print_status $GREEN "The Tools & MCP Integration UI is working correctly."
else
    FAILED_TESTS=$((TOTAL_TESTS - TESTS_PASSED))
    print_status $RED "\n💥 $FAILED_TESTS test suite(s) failed."
    print_status $YELLOW "Check the test output above for details."
    
    # Show recent server logs if tests failed
    if [ -f dev-server.log ]; then
        print_status $YELLOW "\n📋 Recent server logs:"
        tail -20 dev-server.log
    fi
fi

# Open test report if available
if [ -f playwright-report/index.html ]; then
    print_status $YELLOW "\n📄 Test report available at: playwright-report/index.html"
fi

exit $((TOTAL_TESTS - TESTS_PASSED))