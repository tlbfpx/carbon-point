-- V32: Initialize product rule chain configurations
-- Update existing products with rule_chain_config

-- First, rename the products to match our product codes
UPDATE platform_products SET code = 'stair_climbing', name = '爬楼梯' WHERE code = 'stairs_basic';
UPDATE platform_products SET code = 'walking', name = '步行' WHERE code = 'walking_basic';

-- Delete the other products we don't need for now
DELETE FROM platform_products WHERE code IN ('stairs_pro', 'walking_pro');

-- Set rule chain config for stair climbing
UPDATE platform_products
SET trigger_type = 'check_in',
    rule_chain_config = '["time_slot_match","random_base","special_date_multiplier","level_coefficient","round","daily_cap"]'
WHERE code = 'stair_climbing';

-- Set rule chain config for walking (we'll add walking later)
UPDATE platform_products
SET trigger_type = 'sensor_data',
    rule_chain_config = '[]'
WHERE code = 'walking';
