#!/bin/bash

# Kill any existing server processes
pkill -f "tsx server/index.ts"

# Start the servers
DATABASE_URL="postgresql://student-tracker_owner:npg_NTLklQzP4D7d@ep-royal-poetry-a8o7t01j-pooler.eastus2.azure.neon.tech/student-tracker?sslmode=require" npm run dev:all
