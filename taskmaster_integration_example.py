#!/usr/bin/env python3
"""
Taskmaster AI Integration Example for Restaurant Scraping Project
This example shows how to integrate Taskmaster AI with your n8n restaurant scraping workflow.
"""

import os
import json
import asyncio
import requests
import psycopg2
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class TaskmasterConfig:
    """Configuration for Taskmaster AI integration"""
    api_key: str
    base_url: str = "https://api.taskmaster.ai"
    batch_size: int = 10
    timeout: int = 30
    retry_attempts: int = 3

class TaskmasterAIClient:
    """Client for interacting with Taskmaster AI API"""
    
    def __init__(self, config: TaskmasterConfig):
        self.config = config
        self.headers = {
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json"
        }
    
    def analyze_restaurant_data(self, restaurant_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze restaurant data using Taskmaster AI"""
        try:
            endpoint = f"{self.config.base_url}/v1/analyze"
            
            payload = {
                "input": restaurant_data,
                "analysis_type": "restaurant_insights",
                "options": {
                    "extract_sentiment": True,
                    "categorize_cuisine": True,
                    "validate_contact_info": True,
                    "extract_keywords": True,
                    "detect_language": True
                }
            }
            
            response = requests.post(
                endpoint, 
                headers=self.headers, 
                json=payload,
                timeout=self.config.timeout
            )
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error calling Taskmaster AI API: {e}")
            return {
                "error": str(e),
                "sentiment_score": None,
                "cuisine_category": None,
                "quality_score": None,
                "keywords": []
            }
    
    def process_batch_restaurants(self, restaurants: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process multiple restaurants in batch"""
        try:
            endpoint = f"{self.config.base_url}/v1/batch-process"
            
            payload = {
                "items": restaurants,
                "task_type": "restaurant_analysis",
                "batch_size": self.config.batch_size
            }
            
            response = requests.post(
                endpoint, 
                headers=self.headers, 
                json=payload,
                timeout=self.config.timeout
            )
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error in batch processing: {e}")
            return [{"error": str(e)} for _ in restaurants]

class RestaurantAIProcessor:
    """Main processor for integrating Taskmaster AI with restaurant data"""
    
    def __init__(self, db_config: Dict[str, Any], taskmaster_config: TaskmasterConfig):
        self.db_config = db_config
        self.taskmaster_client = TaskmasterAIClient(taskmaster_config)
    
    def process_single_restaurant(self, restaurant_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single restaurant with AI analysis"""
        logger.info(f"Processing restaurant: {restaurant_data.get('name', 'Unknown')}")
        
        # Analyze with Taskmaster AI
        analysis = self.taskmaster_client.analyze_restaurant_data(restaurant_data)
        
        # Combine original data with AI analysis
        enhanced_data = {
            **restaurant_data,
            "ai_analysis": analysis,
            "ai_sentiment_score": analysis.get("sentiment_score"),
            "ai_cuisine_category": analysis.get("cuisine_category"),
            "ai_data_quality_score": analysis.get("quality_score"),
            "ai_keywords": analysis.get("keywords", []),
            "ai_processed_at": datetime.now().isoformat()
        }
        
        return enhanced_data
    
    def save_to_database(self, enhanced_data: Dict[str, Any]) -> bool:
        """Save enhanced restaurant data to database"""
        try:
            with psycopg2.connect(**self.db_config) as conn:  # type: ignore
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO restaurants (
                            name, rating, cuisine_type, description, address, 
                            phone, hours, price_range, image_urls, reviews_count,
                            ai_sentiment_score, ai_cuisine_category, ai_data_quality_score,
                            ai_keywords, ai_processed_at, scraped_at
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        ) ON CONFLICT (name, address) DO UPDATE SET
                            rating = EXCLUDED.rating,
                            ai_sentiment_score = EXCLUDED.ai_sentiment_score,
                            ai_cuisine_category = EXCLUDED.ai_cuisine_category,
                            ai_data_quality_score = EXCLUDED.ai_data_quality_score,
                            ai_keywords = EXCLUDED.ai_keywords,
                            ai_processed_at = EXCLUDED.ai_processed_at
                    """, (
                        enhanced_data.get("name"),
                        enhanced_data.get("rating"),
                        enhanced_data.get("cuisine_type"),
                        enhanced_data.get("description"),
                        enhanced_data.get("address"),
                        enhanced_data.get("phone"),
                        enhanced_data.get("hours"),
                        enhanced_data.get("price_range"),
                        json.dumps(enhanced_data.get("image_urls", [])),
                        enhanced_data.get("reviews_count"),
                        enhanced_data.get("ai_sentiment_score"),
                        enhanced_data.get("ai_cuisine_category"),
                        enhanced_data.get("ai_data_quality_score"),
                        json.dumps(enhanced_data.get("ai_keywords", [])),
                        enhanced_data.get("ai_processed_at"),
                        enhanced_data.get("scraped_at", datetime.now().isoformat())
                    ))
                    
                    conn.commit()
                    logger.info(f"Saved restaurant: {enhanced_data.get('name')}")
                    return True
                    
        except Exception as e:
            logger.error(f"Error saving to database: {e}")
            return False
    
    async def process_unprocessed_restaurants(self, limit: int = 50):
        """Process restaurants that haven't been analyzed by AI yet"""
        try:
            with psycopg2.connect(**self.db_config) as conn:  # type: ignore
                with conn.cursor() as cur:
                    # Get unprocessed restaurants
                    cur.execute("""
                        SELECT id, name, description, reviews_count, rating,
                               cuisine_type, address, phone, hours, price_range,
                               image_urls, scraped_at
                        FROM restaurants 
                        WHERE ai_processed_at IS NULL
                        LIMIT %s
                    """, (limit,))
                    
                    restaurants = cur.fetchall()
                    
                    if not restaurants:
                        logger.info("No unprocessed restaurants found")
                        return
                    
                    logger.info(f"Processing {len(restaurants)} restaurants")
                    
                    for restaurant in restaurants:
                        # Convert to dictionary
                        restaurant_data = {
                            "id": restaurant[0],
                            "name": restaurant[1],
                            "description": restaurant[2],
                            "reviews_count": restaurant[3],
                            "rating": restaurant[4],
                            "cuisine_type": restaurant[5],
                            "address": restaurant[6],
                            "phone": restaurant[7],
                            "hours": restaurant[8],
                            "price_range": restaurant[9],
                            "image_urls": restaurant[10] if restaurant[10] else [],
                            "scraped_at": restaurant[11].isoformat() if restaurant[11] else None
                        }
                        
                        # Process with AI
                        enhanced_data = self.process_single_restaurant(restaurant_data)
                        
                        # Update database with AI results
                        cur.execute("""
                            UPDATE restaurants 
                            SET ai_sentiment_score = %s,
                                ai_cuisine_category = %s,
                                ai_data_quality_score = %s,
                                ai_keywords = %s,
                                ai_processed_at = NOW()
                            WHERE id = %s
                        """, (
                            enhanced_data.get("ai_sentiment_score"),
                            enhanced_data.get("ai_cuisine_category"),
                            enhanced_data.get("ai_data_quality_score"),
                            json.dumps(enhanced_data.get("ai_keywords", [])),
                            restaurant[0]
                        ))
                        
                        # Add delay to be respectful to API
                        await asyncio.sleep(1)
                    
                    conn.commit()
                    logger.info("Completed processing unprocessed restaurants")
                    
        except Exception as e:
            logger.error(f"Error processing unprocessed restaurants: {e}")

class WebhookHandler:
    """Handle webhooks from n8n workflow"""
    
    def __init__(self, taskmaster_config: TaskmasterConfig, db_config: Dict[str, Any]):
        self.taskmaster_config = taskmaster_config
        self.db_config = db_config
        self.processor = RestaurantAIProcessor(db_config, taskmaster_config)
    
    def handle_restaurant_webhook(self, restaurant_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming restaurant data from n8n webhook"""
        try:
            logger.info(f"Received webhook for restaurant: {restaurant_data.get('name')}")
            
            # Process with AI
            enhanced_data = self.processor.process_single_restaurant(restaurant_data)
            
            # Save to database
            success = self.processor.save_to_database(enhanced_data)
            
            return {
                "status": "success" if success else "error",
                "restaurant_name": restaurant_data.get("name"),
                "ai_analysis": enhanced_data.get("ai_analysis"),
                "database_saved": success
            }
            
        except Exception as e:
            logger.error(f"Error handling webhook: {e}")
            return {
                "status": "error",
                "error": str(e)
            }

def load_config() -> tuple[TaskmasterConfig, Dict[str, Any]]:
    """Load configuration from environment variables"""
    
    # Taskmaster AI configuration
    taskmaster_config = TaskmasterConfig(
        api_key=os.getenv("TASKMASTER_API_KEY", ""),
        base_url=os.getenv("TASKMASTER_BASE_URL", "https://api.taskmaster.ai"),
        batch_size=int(os.getenv("TASKMASTER_BATCH_SIZE", "10")),
        timeout=int(os.getenv("TASKMASTER_TIMEOUT", "30")),
        retry_attempts=int(os.getenv("TASKMASTER_RETRY_ATTEMPTS", "3"))
    )
    
    # Database configuration
    db_config: Dict[str, Any] = {
        "host": os.getenv("DB_HOST", "localhost"),
        "database": os.getenv("DB_NAME", "restaurants"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", ""),
        "port": int(os.getenv("DB_PORT", "5432"))
    }
    
    return taskmaster_config, db_config

def create_database_schema(db_config: Dict[str, Any]):
    """Create the enhanced database schema with AI columns"""
    try:
        with psycopg2.connect(**db_config) as conn:  # type: ignore
            with conn.cursor() as cur:
                # Add AI analysis columns if they don't exist
                cur.execute("""
                    DO $$ 
                    BEGIN 
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                      WHERE table_name='restaurants' AND column_name='ai_sentiment_score') THEN
                            ALTER TABLE restaurants ADD COLUMN ai_sentiment_score DECIMAL(3,2);
                        END IF;
                    END $$;
                """)
                
                cur.execute("""
                    DO $$ 
                    BEGIN 
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                      WHERE table_name='restaurants' AND column_name='ai_cuisine_category') THEN
                            ALTER TABLE restaurants ADD COLUMN ai_cuisine_category VARCHAR(100);
                        END IF;
                    END $$;
                """)
                
                cur.execute("""
                    DO $$ 
                    BEGIN 
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                      WHERE table_name='restaurants' AND column_name='ai_data_quality_score') THEN
                            ALTER TABLE restaurants ADD COLUMN ai_data_quality_score DECIMAL(3,2);
                        END IF;
                    END $$;
                """)
                
                cur.execute("""
                    DO $$ 
                    BEGIN 
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                      WHERE table_name='restaurants' AND column_name='ai_keywords') THEN
                            ALTER TABLE restaurants ADD COLUMN ai_keywords JSONB;
                        END IF;
                    END $$;
                """)
                
                cur.execute("""
                    DO $$ 
                    BEGIN 
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                      WHERE table_name='restaurants' AND column_name='ai_processed_at') THEN
                            ALTER TABLE restaurants ADD COLUMN ai_processed_at TIMESTAMP;
                        END IF;
                    END $$;
                """)
                
                # Create indexes
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_restaurants_ai_sentiment 
                    ON restaurants(ai_sentiment_score);
                """)
                
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_restaurants_ai_cuisine 
                    ON restaurants(ai_cuisine_category);
                """)
                
                conn.commit()
                logger.info("Database schema updated successfully")
                
    except Exception as e:
        logger.error(f"Error creating database schema: {e}")

async def main():
    """Main function to demonstrate the integration"""
    
    # Load configuration
    taskmaster_config, db_config = load_config()
    
    if not taskmaster_config.api_key:
        logger.error("TASKMASTER_API_KEY not set. Please set your API key.")
        return
    
    # Create database schema
    create_database_schema(db_config)
    
    # Initialize processor
    processor = RestaurantAIProcessor(db_config, taskmaster_config)
    
    # Example restaurant data (simulating data from n8n)
    example_restaurant = {
        "name": "Example Restaurant",
        "rating": 4.5,
        "cuisine_type": "Italian",
        "description": "Authentic Italian cuisine with fresh ingredients and warm atmosphere",
        "address": "123 Main St, City, State",
        "phone": "(555) 123-4567",
        "hours": "Mon-Fri: 11AM-10PM, Sat-Sun: 12PM-11PM",
        "price_range": "$$",
        "image_urls": ["https://example.com/image1.jpg"],
        "reviews_count": 150,
        "scraped_at": datetime.now().isoformat()
    }
    
    # Process example restaurant
    logger.info("Processing example restaurant...")
    enhanced_data = processor.process_single_restaurant(example_restaurant)
    
    # Save to database
    success = processor.save_to_database(enhanced_data)
    
    if success:
        logger.info("Example restaurant processed and saved successfully")
        logger.info(f"AI Analysis Results:")
        logger.info(f"  Sentiment Score: {enhanced_data.get('ai_sentiment_score')}")
        logger.info(f"  Cuisine Category: {enhanced_data.get('ai_cuisine_category')}")
        logger.info(f"  Quality Score: {enhanced_data.get('ai_data_quality_score')}")
        logger.info(f"  Keywords: {enhanced_data.get('ai_keywords')}")
    else:
        logger.error("Failed to save example restaurant")
    
    # Process any unprocessed restaurants in database
    logger.info("Processing unprocessed restaurants...")
    await processor.process_unprocessed_restaurants(limit=5)

if __name__ == "__main__":
    # Run the main function
    asyncio.run(main()) 