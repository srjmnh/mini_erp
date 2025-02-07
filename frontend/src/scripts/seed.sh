#!/bin/bash

# Load environment variables
export $(cat .env | xargs)

# Run the seeding script
node src/scripts/seedRoles.js
