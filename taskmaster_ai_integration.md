# Taskmaster AI Integration Guide

## Overview
Taskmaster AI can enhance your restaurant scraping project by providing intelligent task automation, data processing, and workflow orchestration. Here are several integration approaches:

## 1. Webhook Integration

### Setup Taskmaster AI Webhook
```javascript
// In your n8n workflow, add a webhook node
{
  "parameters": {
    "httpMethod": "POST",
    "path": "taskmaster-webhook",
    "responseMode": "responseNode",
    "options": {
      "responseHeaders": {
        "entries": [
          {
            "name": "Content-Type",
            "value": "application/json"
          }
        ]
      }
    }
  }
}
```

### Taskmaster AI Webhook Handler
```python
# taskmaster_webhook_handler.py
import requests
import json
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/taskmaster-webhook', methods=['POST'])
def handle_restaurant_data():
    data = request.json
    
    # Process restaurant data with Taskmaster AI
    taskmaster_response = process_with_taskmaster(data)
    
    return jsonify({
        "status": "success",
        "processed_data": taskmaster_response
    })

def process_with_taskmaster(restaurant_data):
    # Send data to Taskmaster AI API
    taskmaster_url = "https://api.taskmaster.ai/process"
    headers = {
        "Authorization": "Bearer YOUR_TASKMASTER_API_KEY",
        "Content-Type": "application/json"
    }
    
    payload = {
        "data": restaurant_data,
        "task_type": "restaurant_analysis",
        "parameters": {
            "extract_sentiment": True,
            "categorize_cuisine": True,
            "validate_data": True
        }
    }
    
    response = requests.post(taskmaster_url, headers=headers, json=payload)
    return response.json()
```

## 2. Direct API Integration

### Taskmaster AI API Client
```python
# taskmaster_client.py
import requests
import json
from typing import Dict, List, Any

class TaskmasterAIClient:
    def __init__(self, api_key: str, base_url: str = "https://api.taskmaster.ai"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def analyze_restaurant_data(self, restaurant_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze restaurant data using Taskmaster AI"""
        endpoint = f"{self.base_url}/v1/analyze"
        
        payload = {
            "input": restaurant_data,
            "analysis_type": "restaurant_insights",
            "options": {
                "extract_sentiment": True,
                "categorize_cuisine": True,
                "validate_contact_info": True,
                "extract_keywords": True
            }
        }
        
        response = requests.post(endpoint, headers=self.headers, json=payload)
        return response.json()
    
    def process_batch_restaurants(self, restaurants: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process multiple restaurants in batch"""
        endpoint = f"{self.base_url}/v1/batch-process"
        
        payload = {
            "items": restaurants,
            "task_type": "restaurant_analysis",
            "batch_size": 10
        }
        
        response = requests.post(endpoint, headers=self.headers, json=payload)
        return response.json()
    
    def create_automated_workflow(self, workflow_config: Dict[str, Any]) -> str:
        """Create an automated workflow in Taskmaster AI"""
        endpoint = f"{self.base_url}/v1/workflows"
        
        payload = {
            "name": "Restaurant Data Processing",
            "description": "Automated restaurant data analysis and validation",
            "triggers": ["new_restaurant_data"],
            "actions": workflow_config["actions"],
            "conditions": workflow_config["conditions"]
        }
        
        response = requests.post(endpoint, headers=self.headers, json=payload)
        return response.json()["workflow_id"]
```

## 3. Enhanced n8n Workflow Integration

### Updated n8n Workflow with Taskmaster AI
```json
{
  "name": "Restaurant Scraper with Taskmaster AI",
  "nodes": [
    // ... existing scraping nodes ...
    {
      "parameters": {
        "jsCode": "// Send data to Taskmaster AI for analysis\nconst taskmasterClient = new TaskmasterAIClient('YOUR_API_KEY');\n\nconst analysisResult = await taskmasterClient.analyzeRestaurantData($json);\n\nreturn [{\n  json: {\n    ...$json,\n    ai_analysis: analysisResult,\n    sentiment_score: analysisResult.sentiment,\n    cuisine_category: analysisResult.cuisine_category,\n    data_quality_score: analysisResult.quality_score\n  }\n}];"
      },
      "id": "taskmaster-analysis",
      "name": "Taskmaster AI Analysis",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1200, 300]
    }
  ]
}
```

## 4. Database Integration with AI Processing

### Enhanced Database Schema
```sql
-- Add AI analysis columns to restaurants table
ALTER TABLE restaurants ADD COLUMN ai_sentiment_score DECIMAL(3,2);
ALTER TABLE restaurants ADD COLUMN ai_cuisine_category VARCHAR(100);
ALTER TABLE restaurants ADD COLUMN ai_data_quality_score DECIMAL(3,2);
ALTER TABLE restaurants ADD COLUMN ai_keywords JSONB;
ALTER TABLE restaurants ADD COLUMN ai_processed_at TIMESTAMP;

-- Create index for AI-processed data
CREATE INDEX idx_restaurants_ai_sentiment ON restaurants(ai_sentiment_score);
CREATE INDEX idx_restaurants_ai_cuisine ON restaurants(ai_cuisine_category);
```

### AI Processing Service
```python
# ai_processing_service.py
import asyncio
from taskmaster_client import TaskmasterAIClient
import psycopg2
from psycopg2.extras import RealDictCursor

class RestaurantAIProcessor:
    def __init__(self, db_config: Dict[str, str], taskmaster_api_key: str):
        self.db_config = db_config
        self.taskmaster_client = TaskmasterAIClient(taskmaster_api_key)
    
    async def process_unprocessed_restaurants(self):
        """Process restaurants that haven't been analyzed by AI yet"""
        with psycopg2.connect(**self.db_config) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get unprocessed restaurants
                cur.execute("""
                    SELECT id, name, description, reviews_count, rating
                    FROM restaurants 
                    WHERE ai_processed_at IS NULL
                    LIMIT 50
                """)
                
                restaurants = cur.fetchall()
                
                for restaurant in restaurants:
                    # Analyze with Taskmaster AI
                    analysis = self.taskmaster_client.analyze_restaurant_data({
                        "name": restaurant["name"],
                        "description": restaurant["description"],
                        "rating": restaurant["rating"],
                        "reviews_count": restaurant["reviews_count"]
                    })
                    
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
                        analysis.get("sentiment_score"),
                        analysis.get("cuisine_category"),
                        analysis.get("quality_score"),
                        json.dumps(analysis.get("keywords", [])),
                        restaurant["id"]
                    ))
                
                conn.commit()
```

## 5. Real-time AI Processing Pipeline

### Streaming Integration
```python
# real_time_ai_pipeline.py
import asyncio
import aiohttp
from taskmaster_client import TaskmasterAIClient

class RealTimeAIPipeline:
    def __init__(self, taskmaster_api_key: str):
        self.taskmaster_client = TaskmasterAIClient(taskmaster_api_key)
        self.websocket_url = "wss://api.taskmaster.ai/stream"
    
    async def start_streaming_analysis(self):
        """Start real-time AI analysis of restaurant data"""
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(self.websocket_url) as ws:
                async for msg in ws:
                    if msg.type == aiohttp.WSMsgType.TEXT:
                        data = json.loads(msg.data)
                        
                        if data["type"] == "new_restaurant":
                            # Process new restaurant data in real-time
                            analysis = await self.process_restaurant_realtime(data["restaurant"])
                            
                            # Send analysis results back
                            await ws.send_json({
                                "type": "analysis_complete",
                                "restaurant_id": data["restaurant"]["id"],
                                "analysis": analysis
                            })
    
    async def process_restaurant_realtime(self, restaurant_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process restaurant data in real-time"""
        return self.taskmaster_client.analyze_restaurant_data(restaurant_data)
```

## 6. Configuration Management

### Environment Configuration
```python
# config.py
import os
from dataclasses import dataclass

@dataclass
class TaskmasterConfig:
    api_key: str
    base_url: str
    batch_size: int
    timeout: int
    retry_attempts: int

def load_taskmaster_config() -> TaskmasterConfig:
    return TaskmasterConfig(
        api_key=os.getenv("TASKMASTER_API_KEY"),
        base_url=os.getenv("TASKMASTER_BASE_URL", "https://api.taskmaster.ai"),
        batch_size=int(os.getenv("TASKMASTER_BATCH_SIZE", "10")),
        timeout=int(os.getenv("TASKMASTER_TIMEOUT", "30")),
        retry_attempts=int(os.getenv("TASKMASTER_RETRY_ATTEMPTS", "3"))
    )
```

## 7. Use Cases and Benefits

### Data Quality Enhancement
- **Sentiment Analysis**: Analyze restaurant descriptions and reviews
- **Cuisine Categorization**: Automatically categorize restaurants by cuisine type
- **Data Validation**: Validate contact information and addresses
- **Keyword Extraction**: Extract relevant keywords from descriptions

### Business Intelligence
- **Trend Analysis**: Identify trending cuisines and restaurants
- **Competitive Analysis**: Compare restaurants in the same area
- **Recommendation Engine**: Build AI-powered restaurant recommendations
- **Market Insights**: Analyze pricing trends and market dynamics

### Automation Benefits
- **Reduced Manual Work**: Automate data cleaning and categorization
- **Improved Accuracy**: AI-powered validation and analysis
- **Scalability**: Handle large volumes of restaurant data
- **Real-time Processing**: Process data as it's scraped

## 8. Implementation Steps

1. **Get Taskmaster AI API Key**
   - Sign up for Taskmaster AI
   - Generate API key from dashboard
   - Set up webhook endpoints

2. **Install Dependencies**
   ```bash
   pip install requests aiohttp psycopg2-binary asyncio
   ```

3. **Configure Environment**
   ```bash
   export TASKMASTER_API_KEY="your_api_key"
   export TASKMASTER_BASE_URL="https://api.taskmaster.ai"
   ```

4. **Update Database Schema**
   - Run the ALTER TABLE statements
   - Create new indexes

5. **Integrate with n8n**
   - Add Taskmaster AI nodes to workflow
   - Configure webhook endpoints
   - Test the integration

6. **Monitor and Optimize**
   - Monitor API usage and costs
   - Optimize batch processing
   - Implement error handling and retries

This integration will significantly enhance your restaurant scraping project with AI-powered analysis, validation, and insights! 