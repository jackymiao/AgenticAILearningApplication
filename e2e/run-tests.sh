#!/bin/bash

# E2E Test Runner Script for Agentic AI Learning Platform
# This script starts backend, frontend, and runs E2E tests

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   Agentic AI Learning - E2E Test Runner              ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if backend is running
echo -e "${YELLOW}Checking if backend is running...${NC}"
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running${NC}"
    BACKEND_RUNNING=true
else
    echo -e "${RED}✗ Backend is not running${NC}"
    BACKEND_RUNNING=false
fi

# Check if frontend is running
echo -e "${YELLOW}Checking if frontend is running...${NC}"
if curl -s http://localhost:5174 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
    FRONTEND_RUNNING=true
else
    echo -e "${RED}✗ Frontend is not running${NC}"
    FRONTEND_RUNNING=false
fi

# If either is not running, provide instructions
if [ "$BACKEND_RUNNING" = false ] || [ "$FRONTEND_RUNNING" = false ]; then
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}  Please start the servers before running E2E tests   ${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo ""
    
    if [ "$BACKEND_RUNNING" = false ]; then
        echo -e "${BLUE}Backend:${NC}"
        echo "  cd backend"
        echo "  E2E_TEST=1 REVIEW_COOLDOWN_MS=10000 npm run dev"
        echo ""
    fi
    
    if [ "$FRONTEND_RUNNING" = false ]; then
        echo -e "${BLUE}Frontend:${NC}"
        echo "  cd frontend"
        echo "  npm run dev"
        echo ""
    fi
    
    echo -e "${YELLOW}Or run them in background:${NC}"
    echo "  ./e2e/start-servers.sh"
    echo ""
    exit 1
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Both servers are running - Starting E2E tests!       ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""

# Check if seed should be run
if [ "$1" = "--skip-seed" ]; then
    echo -e "${YELLOW}Skipping seed (--skip-seed flag provided)${NC}"
else
    echo -e "${BLUE}Step 1/2: Seeding database...${NC}"
    npm run e2e:seed
    echo -e "${GREEN}✓ Database seeded${NC}"
    echo ""
fi

# Run tests
echo -e "${BLUE}Step 2/2: Running E2E tests...${NC}"
echo ""

# Check if headless mode is requested
if [ "$1" = "--headless" ] || [ "$2" = "--headless" ]; then
    echo -e "${YELLOW}Running in headless mode${NC}"
    npm run e2e:test
else
    echo -e "${YELLOW}Running in debug mode (visible browser)${NC}"
    npm run e2e:debug
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✨ E2E Tests Complete! ✨                            ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""

# Check if report was generated
if [ -f "e2e/screenshots/report.html" ]; then
    echo -e "${BLUE}📊 Test Report: ${NC}file://$(pwd)/e2e/screenshots/report.html"
    echo ""
    
    # Ask if user wants to open report
    if [ -t 0 ]; then  # Check if running in interactive terminal
        read -p "Open HTML report in browser? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if command -v open > /dev/null 2>&1; then
                open e2e/screenshots/report.html
            elif command -v xdg-open > /dev/null 2>&1; then
                xdg-open e2e/screenshots/report.html
            else
                echo -e "${YELLOW}Could not detect browser opener. Please open manually.${NC}"
            fi
        fi
    fi
else
    echo -e "${RED}⚠️  Report not found. Tests may have failed.${NC}"
    echo -e "${YELLOW}Check e2e/screenshots/ for FAIL-*.png files${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Done!${NC}"
