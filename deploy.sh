#!/bin/bash

# BakuCT - AWS S3 Deployment Script
# This script deploys the static website to AWS S3

# Configuration - Update these values
S3_BUCKET="your-bucket-name"
AWS_REGION="ap-south-1"  # Change to your preferred region
CLOUDFRONT_DISTRIBUTION_ID=""  # Optional: Add if using CloudFront

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}   BakuCT - AWS Deployment Script${NC}"
echo -e "${YELLOW}========================================${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed.${NC}"
    echo "Please install AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if AWS is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not configured.${NC}"
    echo "Please run 'aws configure' to set up your credentials."
    exit 1
fi

# Check if bucket name is set
if [ "$S3_BUCKET" == "your-bucket-name" ]; then
    echo -e "${RED}Error: Please update the S3_BUCKET variable in this script.${NC}"
    exit 1
fi

echo -e "\n${GREEN}Step 1: Checking S3 bucket...${NC}"

# Check if bucket exists, create if not
if aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
    echo "Bucket '$S3_BUCKET' exists."
else
    echo "Creating bucket '$S3_BUCKET'..."
    aws s3api create-bucket \
        --bucket "$S3_BUCKET" \
        --region "$AWS_REGION" \
        --create-bucket-configuration LocationConstraint="$AWS_REGION"
    
    # Enable static website hosting
    aws s3 website "s3://$S3_BUCKET/" --index-document index.html --error-document index.html
fi

echo -e "\n${GREEN}Step 2: Configuring bucket for static website hosting...${NC}"

# Set bucket policy for public access
BUCKET_POLICY=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$S3_BUCKET/*"
        }
    ]
}
EOF
)

# Disable block public access
aws s3api put-public-access-block \
    --bucket "$S3_BUCKET" \
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Apply bucket policy
echo "$BUCKET_POLICY" | aws s3api put-bucket-policy --bucket "$S3_BUCKET" --policy file:///dev/stdin

# Enable static website hosting
aws s3 website "s3://$S3_BUCKET/" --index-document index.html --error-document index.html

echo -e "\n${GREEN}Step 3: Uploading files to S3...${NC}"

# Upload files with appropriate content types
aws s3 sync . "s3://$S3_BUCKET/" \
    --exclude ".git/*" \
    --exclude "deploy.sh" \
    --exclude "*.md" \
    --exclude ".gitignore" \
    --delete

# Set correct content types
aws s3 cp "s3://$S3_BUCKET/index.html" "s3://$S3_BUCKET/index.html" \
    --content-type "text/html" \
    --metadata-directive REPLACE

aws s3 cp "s3://$S3_BUCKET/css/styles.css" "s3://$S3_BUCKET/css/styles.css" \
    --content-type "text/css" \
    --metadata-directive REPLACE

aws s3 cp "s3://$S3_BUCKET/js/app.js" "s3://$S3_BUCKET/js/app.js" \
    --content-type "application/javascript" \
    --metadata-directive REPLACE

echo -e "\n${GREEN}Step 4: Setting cache headers...${NC}"

# Set cache control for static assets
aws s3 cp "s3://$S3_BUCKET/css/styles.css" "s3://$S3_BUCKET/css/styles.css" \
    --content-type "text/css" \
    --cache-control "max-age=31536000" \
    --metadata-directive REPLACE

aws s3 cp "s3://$S3_BUCKET/js/app.js" "s3://$S3_BUCKET/js/app.js" \
    --content-type "application/javascript" \
    --cache-control "max-age=31536000" \
    --metadata-directive REPLACE

# Invalidate CloudFront cache if distribution ID is set
if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo -e "\n${GREEN}Step 5: Invalidating CloudFront cache...${NC}"
    aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
        --paths "/*"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}   Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nYour website is available at:"
echo -e "${YELLOW}http://$S3_BUCKET.s3-website.$AWS_REGION.amazonaws.com${NC}"
echo ""
