#!/bin/bash

# Wind Chaser Development Helper Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌊 Wind Chaser Development Script${NC}"
echo ""

# Function to start services
start_services() {
    echo -e "${YELLOW}Starting Wind Chaser services...${NC}"
    
    # Start MongoDB first
    echo -e "${BLUE}Starting MongoDB...${NC}"
    if ! pgrep mongod > /dev/null; then
        if command -v mongod &> /dev/null; then
            mongod --dbpath ./data/db --fork --logpath ./data/mongodb.log
            echo -e "${GREEN}✓ MongoDB started${NC}"
        else
            echo -e "${RED}❌ MongoDB not found. Please install MongoDB or use Docker.${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✓ MongoDB already running${NC}"
    fi
    
    # Start backend
    echo -e "${BLUE}Starting backend server...${NC}"
    cd backend
    npm run dev &
    BACKEND_PID=$!
    echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
    cd ..
    
    # Start frontend
    echo -e "${BLUE}Starting frontend server...${NC}"
    cd frontend
    npm start &
    FRONTEND_PID=$!
    echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
    cd ..
    
    echo ""
    echo -e "${GREEN}🚀 All services started!${NC}"
    echo -e "${BLUE}📊 Backend API: http://localhost:5000${NC}"
    echo -e "${BLUE}🌐 Frontend: http://localhost:3000${NC}"
    echo -e "${BLUE}🗃️  MongoDB: mongodb://localhost:27017/wind-chaser${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
    
    # Wait for user interrupt
    trap 'kill $BACKEND_PID $FRONTEND_PID; exit' INT
    wait
}

# Function to install dependencies
install_deps() {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    
    echo -e "${BLUE}Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
    
    echo -e "${BLUE}Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
    
    echo -e "${GREEN}✓ All dependencies installed${NC}"
}

# Function to start with Docker
start_docker() {
    echo -e "${YELLOW}Starting with Docker Compose...${NC}"
    docker-compose up --build
}

# Function to stop Docker
stop_docker() {
    echo -e "${YELLOW}Stopping Docker services...${NC}"
    docker-compose down
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  start       Start all services locally"
    echo "  install     Install all dependencies"
    echo "  docker      Start services with Docker Compose"
    echo "  stop        Stop Docker services"
    echo "  help        Show this help message"
    echo ""
}

# Main script logic
case ${1:-start} in
    start)
        start_services
        ;;
    install)
        install_deps
        ;;
    docker)
        start_docker
        ;;
    stop)
        stop_docker
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        show_help
        exit 1
        ;;
esac
