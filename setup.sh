#!/bin/bash

# Notification Service Demo Setup Script
echo "🚀 Setting up Notification Migration Demo..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data logs

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before running the service"
else
    echo "✅ .env file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create initial database structure (SQLite will be created when first accessed)
echo "🗄️  Database will be created automatically on first run"

# Make scripts executable
chmod +x test-client.js

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit the .env file with your configuration"
echo "2. Start the service: npm start"
echo "3. Run the demo client: node test-client.js"
echo "4. Or use Docker: docker-compose up"
echo ""
echo "API will be available at: http://localhost:3000"
echo "Health check: http://localhost:3000/health"
echo ""

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo "🐳 Docker detected - you can also run: docker-compose up"
else
    echo "ℹ️  Install Docker to use containerized deployment"
fi

echo ""
echo "📖 Check README.md for detailed instructions"
echo "🔄 See MIGRATION.md for AWS Lambda migration guide"
