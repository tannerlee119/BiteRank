
#!/usr/bin/env node

/**
 * Quick City Changer for n8n OpenTable Workflow
 * Usage: node city-changer.js "los angeles"
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'workflow-config.json');

function changeCity(newCity) {
  try {
    // Read current config
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Validate city
    const availableCities = config.opentable_config.available_cities;
    const cityLower = newCity.toLowerCase();
    
    if (!availableCities.includes(cityLower)) {
      console.log(`❌ City "${newCity}" not in available cities list.`);
      console.log(`📋 Available cities: ${availableCities.join(', ')}`);
      return false;
    }
    
    // Update city
    config.opentable_config.current_city = cityLower;
    
    // Write back to file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    console.log(`✅ Successfully changed target city to: ${cityLower}`);
    console.log(`🔄 Next n8n workflow run will scrape restaurants in ${cityLower}`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error changing city: ${error.message}`);
    return false;
  }
}

function showCurrentCity() {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const currentCity = config.opentable_config.current_city;
    const availableCities = config.opentable_config.available_cities;
    
    console.log(`🌆 Current target city: ${currentCity}`);
    console.log(`📋 Available cities: ${availableCities.join(', ')}`);
    
  } catch (error) {
    console.error(`❌ Error reading config: ${error.message}`);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('🌆 City Changer for n8n OpenTable Workflow\n');
  showCurrentCity();
  console.log('\n📖 Usage:');
  console.log('  node city-changer.js "los angeles"  # Change city');
  console.log('  node city-changer.js                # Show current city');
} else {
  const newCity = args[0];
  changeCity(newCity);
}
