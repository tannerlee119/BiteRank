# Restaurant Web Scraping Workflow with n8n

## Overview
This workflow scrapes restaurant data from websites that allow web scraping, extracting names, ratings, cuisine types, images, and other details.

## Database Schema

### PostgreSQL Table Structure
```sql
CREATE TABLE restaurants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rating DECIMAL(3,2),
    cuisine_type VARCHAR(100),
    description TEXT,
    address TEXT,
    phone VARCHAR(20),
    hours TEXT,
    price_range VARCHAR(10),
    image_urls JSONB,
    reviews_count INTEGER,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for better query performance
CREATE INDEX idx_restaurants_name ON restaurants(name);
CREATE INDEX idx_restaurants_cuisine ON restaurants(cuisine_type);
CREATE INDEX idx_restaurants_rating ON restaurants(rating);
```

## Workflow Components

### 1. Fetch Restaurant List
- **Node Type**: HTTP Request
- **Purpose**: Fetches the main restaurant listing page
- **Configuration**: 
  - URL: Your target website's restaurant list page
  - Timeout: 10 seconds
  - Headers: Add User-Agent if needed

### 2. Extract List Data
- **Node Type**: HTML Extract
- **Purpose**: Extracts basic restaurant information from the listing page
- **Data Extracted**:
  - Restaurant names
  - Links to detail pages
  - Ratings
  - Cuisine types

### 3. Process List Data
- **Node Type**: Code
- **Purpose**: Combines extracted data into structured objects
- **Output**: Array of restaurant objects with basic info

### 4. Fetch Detail Page
- **Node Type**: HTTP Request
- **Purpose**: Fetches individual restaurant detail pages
- **Configuration**: Uses URLs from the list data

### 5. Extract Detail Data
- **Node Type**: HTML Extract
- **Purpose**: Extracts detailed restaurant information
- **Data Extracted**:
  - Description
  - Address
  - Phone number
  - Operating hours
  - Price range
  - Image URLs
  - Review count

### 6. Merge Data
- **Node Type**: Code
- **Purpose**: Combines list and detail data into complete restaurant records

### 7. Save to Database
- **Node Type**: PostgreSQL
- **Purpose**: Stores data in PostgreSQL database
- **Configuration**: Requires database connection credentials

### 8. Save to File
- **Node Type**: Write Binary File
- **Purpose**: Creates backup JSON files with scraped data

### 9. Error Handler
- **Node Type**: IF
- **Purpose**: Routes errors to logging and continues processing

### 10. Add Delay
- **Node Type**: Code
- **Purpose**: Adds 2-second delay between requests to be respectful

## Setup Instructions

### 1. Install n8n
```bash
# Using npm
npm install n8n -g

# Using Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### 2. Configure Database Connection
1. Open n8n interface (http://localhost:5678)
2. Go to Settings → Credentials
3. Add PostgreSQL credentials:
   - Host: localhost
   - Database: your_database_name
   - User: your_username
   - Password: your_password
   - Port: 5432

### 3. Import Workflow
1. In n8n, go to Workflows
2. Click "Import from File"
3. Select the `n8n_restaurant_scraping_workflow.json` file

### 4. Configure Target Website
Update the CSS selectors in the HTML Extract nodes to match your target website's structure:

#### Example CSS Selectors for Common Sites:
```javascript
// Yelp-style selectors
{
  "restaurant_names": "h3 a",
  "ratings": ".rating-large",
  "cuisine_types": ".category-str-list a",
  "image_urls": ".photo-box img"
}

// Google Maps-style selectors
{
  "restaurant_names": "h1",
  "ratings": ".rating",
  "cuisine_types": ".cuisine",
  "image_urls": ".gallery img"
}
```

### 5. Test the Workflow
1. Run the workflow manually first
2. Check the data extraction in each node
3. Verify database insertion
4. Monitor for any errors

## Customization Options

### Adding More Data Fields
To extract additional data, add new extraction values to the HTML Extract nodes:

```javascript
{
  "key": "website",
  "cssSelector": "a.website",
  "attribute": "href"
},
{
  "key": "delivery_available",
  "cssSelector": ".delivery-badge"
}
```

### Handling Pagination
For sites with multiple pages, add a Loop node:

```javascript
// In a Code node before the main workflow
const totalPages = 10; // Adjust based on your target site
const pages = [];
for (let i = 1; i <= totalPages; i++) {
  pages.push(`https://example.com/restaurants?page=${i}`);
}
return pages.map(url => ({ json: { url } }));
```

### Rate Limiting
Adjust the delay in the "Add Delay" node based on the website's requirements:
- Conservative: 3-5 seconds
- Moderate: 1-2 seconds
- Aggressive: 0.5-1 second (use with caution)

## Best Practices

### 1. Respectful Scraping
- Always check robots.txt
- Add reasonable delays between requests
- Use proper User-Agent headers
- Don't overwhelm the server

### 2. Error Handling
- Implement retry logic for failed requests
- Log errors for debugging
- Handle missing data gracefully
- Validate extracted data

### 3. Data Quality
- Clean and normalize text data
- Handle different date/time formats
- Remove HTML tags from text
- Validate URLs and phone numbers

### 4. Performance
- Use appropriate timeouts
- Implement connection pooling
- Monitor memory usage
- Consider using proxies for large-scale scraping

## Troubleshooting

### Common Issues

1. **CSS Selectors Not Working**
   - Inspect the target website's HTML structure
   - Update selectors to match the actual elements
   - Test selectors in browser developer tools

2. **Rate Limiting**
   - Increase delays between requests
   - Add random delays
   - Use proxy rotation if needed

3. **Database Connection Issues**
   - Verify PostgreSQL credentials
   - Check database permissions
   - Ensure table exists with correct schema

4. **Memory Issues**
   - Process data in smaller batches
   - Clear node data between runs
   - Monitor n8n resource usage

## Legal Considerations

- Always check the website's Terms of Service
- Respect robots.txt files
- Don't scrape copyrighted content
- Consider using official APIs when available
- Be transparent about your scraping activities

## Monitoring and Maintenance

### Regular Tasks
- Monitor workflow execution logs
- Check database storage usage
- Update CSS selectors if website changes
- Review and clean old data
- Backup scraped data regularly

### Performance Optimization
- Index frequently queried database columns
- Archive old data to separate tables
- Implement data deduplication
- Monitor and optimize slow queries 