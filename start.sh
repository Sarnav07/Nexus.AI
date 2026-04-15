#!/bin/bash

# Nexus.AI Multi-Agent Startup Script

echo "🚀 Starting Nexus.AI Multi-Agent System..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."
if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

if ! command_exists npx; then
    echo "❌ npx is not installed. Please install npx first."
    exit 1
fi

# Install OnchainOS skills if not present
if [ ! -d "skills" ]; then
    echo "📦 Installing OnchainOS skills..."
    npx skills add okx/onchainos-skills --all -y
fi

# Install dependencies for all agents
echo "📦 Installing agent dependencies..."
echo "Installing orchestrator dependencies..."
cd agents/orchestrator && npm install && cd ../..

echo "Installing specialist dependencies..."
cd agents/specialist && npm install && cd ../..

echo "Installing risk-guardian dependencies..."
cd agents/risk-guardian && npm install && cd ../..

echo "Installing pay-relay dependencies..."
cd agents/pay-relay && npm install && cd ../..

# Check if .env files exist
if [ ! -f "agents/orchestrator/.env" ]; then
    echo "⚠️  Orchestrator .env file not found. Creating from template..."
    cp agents/orchestrator/.env.example agents/orchestrator/.env 2>/dev/null || echo "# Add your API keys here" > agents/orchestrator/.env
    echo "📝 Please edit agents/orchestrator/.env with your actual API keys before running."
fi

# Start agents in background
echo "📡 Starting Orchestrator Agent (Autonomous Trading)..."
cd agents/orchestrator && npm run dev &
ORCHESTRATOR_PID=$!

echo "🌾 Starting Specialist Agent (Yield Farming)..."
cd agents/specialist && npm run dev &
SPECIALIST_PID=$!

echo "🛡️  Starting Risk Guardian Agent..."
cd agents/risk-guardian && npm run dev &
RISK_PID=$!

echo "💰 Starting Pay Relay Agent..."
cd agents/pay-relay && npm run dev &
PAY_PID=$!

echo "🎯 Starting Frontend Dashboard..."
echo "📡 Starting Orchestrator Agent (Autonomous Trading)..."
cd agents/orchestrator && npm run dev &
ORCHESTRATOR_PID=$!

echo "🌾 Starting Specialist Agent (Yield Farming)..."
cd ../specialist && npm run dev &
SPECIALIST_PID=$!

echo "🛡️  Starting Risk Guardian Agent..."
cd ../risk-guardian && npm run dev &
RISK_PID=$!

echo "💰 Starting Pay Relay Agent..."
cd ../pay-relay && npm run dev &
PAY_PID=$!

echo "🎯 Starting Frontend Dashboard..."
cd ../../frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ All services started!"
echo "📊 Frontend: http://localhost:5173"
echo "🤖 Orchestrator API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "echo '🛑 Stopping all services...'; kill $ORCHESTRATOR_PID $SPECIALIST_PID $RISK_PID $PAY_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait