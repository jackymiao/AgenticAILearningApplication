-- Migration script to update category constraints from 4 to 3 categories
-- Run this on existing databases to update the schema

-- Step 1: Drop the old constraint
ALTER TABLE review_attempts DROP CONSTRAINT IF EXISTS review_attempts_category_check;

-- Step 2: Add new constraint with 3 categories
ALTER TABLE review_attempts ADD CONSTRAINT review_attempts_category_check 
  CHECK (category IN ('content', 'structure', 'mechanics'));

-- Note: This migration assumes no existing data uses the old categories (grammar, style)
-- If you have existing data, you'll need to migrate or delete old review_attempts records first
