#!/bin/bash

# Build the application
echo "Building the application..."
npm run build

# Create a deployment package
echo "Creating deployment package..."
rm -f deployment.zip
zip -r deployment.zip .next package.json next.config.js public server.js node_modules

# Deploy to Azure Web App
echo "Deploying to Azure..."
az webapp deployment source config-zip \
  --resource-group GifStudios \
  --name gif-studios \
  --src deployment.zip \
  --timeout 180

# Configure app settings
echo "Configuring app settings..."
az webapp config appsettings set \
  --resource-group GifStudios \
  --name gif-studios \
  --settings \
  WEBSITE_NODE_DEFAULT_VERSION=~18 \
  WEBSITE_RUN_FROM_PACKAGE=1 \
  NODE_ENV=production \
  SCM_DO_BUILD_DURING_DEPLOYMENT=true

echo "Deployment complete!"

# Clean up
echo "Cleaning up..."
rm deployment.zip 