# smartsdlc
Smart SDLC

@echo off
echo Installing dependencies...
npm install
echo Starting application...
set NODE_ENV=development
set SESSION_SECRET=secret
set AWS_REGION=us-east-1
set AWS_ACCESS_KEY_ID=your_aws_access_key_id
set AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
npx tsx server/index.ts
