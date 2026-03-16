   
**INSTAGRAM COMMENT**  
**INTELLIGENCE SYSTEM**  
Comprehensive Technical Architecture Plan  
   
Firebase Firestore + Apify + Python + Streamlit  
Version 1.0  |  March 2026  
Production-Ready Architecture with Code Examples  
  
   
**Table of Contents**  
++Table of Contents............................................................................................................................ 2++  
++Table of Contents............................................................................................................................ 2++  
++System Overview and Architecture................................................................................................ 4++  
++System Overview and Architecture................................................................................................ 4++  
++High-Level Architecture............................................................................................................... 4++  
++Technology Stack........................................................................................................................ 4++  
++Technology Stack........................................................................................................................ 4++  
++Complete Folder and File Structure............................................................................................ 5++  
++Complete Folder and File Structure............................................................................................ 5++  
++Data Flow Summary.................................................................................................................... 5++  
++Firebase Setup and Firestore Configuration.................................................................................. 7++  
++Firebase Project Setup................................................................................................................ 7++  
++Python Firebase Connection....................................................................................................... 7++  
++Python Firebase Connection....................................................................................................... 7++  
++Complete Firestore Data Structure............................................................................................. 7++  
++Collection: accounts................................................................................................................. 7++  
++Collection: accounts................................................................................................................. 7++  
++Collection: accounts/{id}/posts................................................................................................ 8++  
++Collection: accounts/{id}/posts................................................................................................ 8++  
++Collection: comments (top-level, flat)...................................................................................... 8++  
++Collection: topic_clusters......................................................................................................... 9++  
++Collection: topic_clusters......................................................................................................... 9++  
++Collection: alerts.................................................................................................................... 10++  
++Collection: daily_analytics..................................................................................................... 10++  
++Collection: daily_analytics..................................................................................................... 10++  
++Firestore Security Rules............................................................................................................ 11++  
++Firestore Security Rules............................................................................................................ 11++  
++Free Tier Optimization Strategy................................................................................................ 11++  
++Required Composite Indexes.................................................................................................... 11++  
++Required Composite Indexes.................................................................................................... 11++  
++Apify Integration............................................................................................................................ 13++  
++Recommended Apify Actor....................................................................................................... 13++  
++Apify API Client in Python......................................................................................................... 13++  
++Parsing and Flattening Nested Replies..................................................................................... 13++  
++Parsing and Flattening Nested Replies..................................................................................... 13++  
++Configuration for Maximum Comment Depth........................................................................... 14++  
++Python Scheduler.......................................................................................................................... 16++  
++APScheduler Configuration....................................................................................................... 16++  
++Main Pipeline Runner with Retry Logic..................................................................................... 16++  
++Duplicate Comment Prevention................................................................................................ 18++  
++Comment Data Pipeline................................................................................................................ 19++  
++Text Cleaning and Normalization.............................................................................................. 19++  
++Batch Writing to Firestore.......................................................................................................... 19++  
++Comment Analysis Engine............................................................................................................ 20++  
++VADER Sentiment Scoring....................................................................................................... 20++  
++NRCLex Emotion Detection...................................................................................................... 20++  
++NRCLex Emotion Detection...................................................................................................... 20++  
++KeyBERT Topic Extraction........................................................................................................ 21++  
++KeyBERT Topic Extraction........................................................................................................ 21++  
++Comment Category Classifier................................................................................................... 21++  
++Most Liked Comments Query.................................................................................................... 22++  
++Most Liked Comments Query.................................................................................................... 22++  
++Recurring Theme Aggregation.................................................................................................. 22++  
++Recurring Theme Aggregation.................................................................................................. 22++  
++Streamlit Dashboard with Realtime Firestore............................................................................... 24++  
++Connecting Streamlit to Firestore............................................................................................. 24++  
++Dashboard Layout..................................................................................................................... 24++  
++Dashboard Layout..................................................................................................................... 24++  
++Realtime Listener Alternative.................................................................................................... 26++  
++Realtime Listener Alternative.................................................................................................... 26++  
++Alerting System............................................................................................................................. 27++  
++Spike and Viral Comment Detection......................................................................................... 27++  
++Telegram Notification................................................................................................................ 28++  
++Deployment................................................................................................................................... 29++  
++Deployment Options.................................................................................................................. 29++  
++VPS Deployment with systemd................................................................................................. 29++  
++VPS Deployment with systemd................................................................................................. 29++  
++Streamlit Deployment................................................................................................................ 29++  
++Streamlit Deployment................................................................................................................ 29++  
++Firebase Connection Best Practices......................................................................................... 30++  
++Firebase Connection Best Practices......................................................................................... 30++  
++Cost Estimate................................................................................................................................ 31++  
++Apify Costs................................................................................................................................ 31++  
++Firebase Costs.......................................................................................................................... 31++  
++Firebase Costs.......................................................................................................................... 31++  
++VPS Costs................................................................................................................................. 31++  
++Total Monthly Cost Estimate..................................................................................................... 31++  
++Total Monthly Cost Estimate..................................................................................................... 31++  
++Build Timeline................................................................................................................................ 33++  
++Risks and Limitations.................................................................................................................... 34++  
++Technical Risks......................................................................................................................... 34++  
++Architectural Limitations............................................................................................................ 34++  
++Architectural Limitations............................................................................................................ 34++  
++Recommended Mitigations Summary....................................................................................... 34++  
   
  
   
**System Overview and Architecture**  
   
This document describes a fully custom automated pipeline built entirely in Python that collects Instagram comment data via Apify, processes it through a Python comment analysis engine, stores everything in Firebase Firestore, and delivers live marketing insights through a Streamlit dashboard. No third-party orchestration tools are used.  
   
**High-Level Architecture**  
The system follows a five-stage data flow pattern:  
1.     Data Collection: Apify Instagram Scraper fetches full comment threads via the Apify API on an automated schedule.  
2.     Scheduling and Orchestration: APScheduler runs hourly collection jobs, handles retries, and prevents duplicate processing.  
3.     Data Processing: Python + Pandas cleans and normalizes comments. VADER, NRCLex, and KeyBERT perform sentiment, emotion, and topic analysis.  
3.     Data Processing: Python + Pandas cleans and normalizes comments. VADER, NRCLex, and KeyBERT perform sentiment, emotion, and topic analysis.  
4.     Cloud Storage: Firebase Firestore stores all raw and processed data in a structured, query-optimized collection hierarchy.  
4.     Cloud Storage: Firebase Firestore stores all raw and processed data in a structured, query-optimized collection hierarchy.  
5.     Visualization and Alerting: Streamlit reads from Firestore with realtime listeners. Alert engine sends Telegram/email notifications on spikes.  
5.     Visualization and Alerting: Streamlit reads from Firestore with realtime listeners. Alert engine sends Telegram/email notifications on spikes.  
   
**Technology Stack**  

| Component | Technology | Purpose |
| ------------------ | ------------------------- | ----------------------------------------------- |
| Data Collection | Apify Instagram Scraper | Fetch posts and full comment threads via API |
| Scheduling | APScheduler (Python) | Hourly job scheduling, retries, dedup |
| Data Processing | Python + Pandas | Clean, normalize, transform comment data |
| Sentiment Analysis | VADER (vaderSentiment) | Per-comment sentiment scoring |
| Emotion Detection | NRCLex | Eight-dimension emotion breakdown per comment |
| Topic Extraction | KeyBERT / spaCy | Keyword and topic clustering from comment text |
| Database | Firebase Firestore | Cloud realtime NoSQL document database |
| Python SDK | firebase-admin | Server-side Firestore read/write |
| Dashboard | Streamlit | Interactive web dashboard with realtime updates |
| Alerting | Python (Telegram / Email) | Spike and viral comment notifications |
  
   
**Complete Folder and File Structure**  
The project is organized into clear modules:  
instagram-comment-intel/  
├── config/  
├── config/  
│   ├── settings.py              # All configuration constants  
│   ├── firebase_config.py       # Firebase init and credentials  
│   ├── firebase_config.py       # Firebase init and credentials  
│   └── serviceAccountKey.json   # Firebase service account (gitignored)  
├── collectors/  
│   ├── apify_client.py          # Apify API wrapper  
│   └── comment_fetcher.py       # Post + comment collection logic  
├── processing/  
│   ├── cleaner.py               # Text cleaning and normalization  
│   ├── cleaner.py               # Text cleaning and normalization  
│   ├── sentiment.py             # VADER sentiment scoring  
│   ├── emotion.py               # NRCLex emotion detection  
│   ├── topics.py                # KeyBERT topic extraction  
│   └── classifier.py            # Pain point/praise/question/complaint tagging  
│   └── classifier.py            # Pain point/praise/question/complaint tagging  
├── storage/  
│   ├── firestore_client.py      # Firestore read/write helpers  
│   └── dedup.py                 # Duplicate comment detection  
│   └── dedup.py                 # Duplicate comment detection  
├── alerts/  
├── alerts/  
│   ├── detector.py              # Spike and viral comment detection  
│   └── notifier.py              # Telegram / email sender  
├── dashboard/  
├── dashboard/  
│   └── app.py                   # Streamlit dashboard with Firestore listener  
│   └── app.py                   # Streamlit dashboard with Firestore listener  
├── pipeline/  
│   ├── runner.py                # Main pipeline orchestrator  
│   ├── runner.py                # Main pipeline orchestrator  
│   └── scheduler.py             # APScheduler job definitions  
│   └── scheduler.py             # APScheduler job definitions  
├── tests/  
├── tests/  
│   ├── test_sentiment.py  
│   ├── test_sentiment.py  
│   ├── test_emotion.py  
│   └── test_pipeline.py  
│   └── test_pipeline.py  
├── requirements.txt  
├── requirements.txt  
├── .env                             # API keys (gitignored)  
├── .env                             # API keys (gitignored)  
└── main.py                          # Entry point  
└── main.py                          # Entry point  
   
**Data Flow Summary**  
**Step 1 — Trigger: **APScheduler fires hourly job.  
**Step 1 — Trigger: **APScheduler fires hourly job.  
**Step 2 — Collect: **Apify scrapes target accounts, returns posts and full comment threads as JSON.  
**Step 2 — Collect: **Apify scrapes target accounts, returns posts and full comment threads as JSON.  
**Step 3 — Dedup: **Comment IDs checked against Firestore to skip already-processed comments.  
**Step 3 — Dedup: **Comment IDs checked against Firestore to skip already-processed comments.  
**Step 4 — Clean: **Raw text normalized (lowercase, emoji preserved, URLs stripped, unicode fixed).  
**Step 5 — Analyze: **VADER sentiment, NRCLex emotion, KeyBERT topics, and category classification run on each comment.  
**Step 5 — Analyze: **VADER sentiment, NRCLex emotion, KeyBERT topics, and category classification run on each comment.  
**Step 6 — Store: **Enriched comment documents written to Firestore in batched writes (max 500 per batch).  
**Step 6 — Store: **Enriched comment documents written to Firestore in batched writes (max 500 per batch).  
**Step 7 — Aggregate: **Daily rollup documents computed and stored for fast dashboard queries.  
**Step 8 — Alert: **Alert engine checks for negative spikes and viral negative comments. Sends Telegram/email if thresholds crossed.  
**Step 8 — Alert: **Alert engine checks for negative spikes and viral negative comments. Sends Telegram/email if thresholds crossed.  
**Step 9 — Display: **Streamlit dashboard reads from Firestore with snapshot listeners for live updates.  
  
   
**Firebase Setup and Firestore Configuration**  
   
**Firebase Project Setup**  
Follow these steps to create and configure the Firebase project:  
1.     Go to console.firebase.google.com and create a new project named instagram-comment-intel.  
2.     Disable Google Analytics (not needed for this backend system).  
2.     Disable Google Analytics (not needed for this backend system).  
3.     Navigate to Firestore Database in the left sidebar and click Create Database.  
4.     Select production mode with your nearest region (e.g., us-central1 for North America, europe-west1 for EU).  
4.     Select production mode with your nearest region (e.g., us-central1 for North America, europe-west1 for EU).  
5.     Go to Project Settings > Service Accounts > Generate New Private Key. Save the JSON file as serviceAccountKey.json in your config/ folder.  
5.     Go to Project Settings > Service Accounts > Generate New Private Key. Save the JSON file as serviceAccountKey.json in your config/ folder.  
6.     Add serviceAccountKey.json to .gitignore immediately.  
6.     Add serviceAccountKey.json to .gitignore immediately.  
   
**Python Firebase Connection**  
Install the SDK and initialize the connection:  
# config/firebase_config.py  
import firebase_admin  
import firebase_admin  
from firebase_admin import credentials, firestore  
from firebase_admin import credentials, firestore  
   
def init_firestore():  
def init_firestore():  
    if not firebase_admin._apps:  
    if not firebase_admin._apps:  
        cred = credentials.Certificate(  
        cred = credentials.Certificate(  
            "config/serviceAccountKey.json"  
            "config/serviceAccountKey.json"  
        )  
        )  
        firebase_admin.initialize_app(cred)  
        firebase_admin.initialize_app(cred)  
    return firestore.client()  
    return firestore.client()  
   
# Usage anywhere in the project:  
# Usage anywhere in the project:  
db = init_firestore()  
db = init_firestore()  
   
**Complete Firestore Data Structure**  
The database is organized into six top-level collections optimized for the query patterns this system requires. Below is the full schema.  
   
**Collection: accounts**  
Each document represents a tracked Instagram account.  

| Field                  | Type      | Description                         |
| ---------------------- | --------- | ----------------------------------- |
| account_id             | string    | Document ID (Instagram username)    |
| display_name           | string    | Account display name                |
| profile_url            | string    | Full Instagram profile URL          |
| tracking_since         | timestamp | When tracking started               |
| is_active              | boolean   | Whether currently being tracked     |
| total_posts_tracked    | number    | Count of posts collected            |
| total_comments_tracked | number    | Count of comments collected         |
| last_scraped_at        | timestamp | Timestamp of last successful scrape |
| avg_sentiment          | number    | Running average sentiment score     |
  
   
**Collection: accounts/{id}/posts**  
Subcollection storing each post under its parent account.  

| Field          | Type      | Description                                    |
| -------------- | --------- | ---------------------------------------------- |
| post_id        | string    | Instagram post shortcode (document ID)         |
| post_url       | string    | Full Instagram post URL                        |
| caption        | string    | Post caption text (truncated to 500 chars)     |
| post_type      | string    | image / video / carousel / reel                |
| posted_at      | timestamp | When the post was published                    |
| likes_count    | number    | Post like count at time of scrape              |
| comments_count | number    | Post comment count at time of scrape           |
| scraped_at     | timestamp | When this post was last scraped                |
| avg_sentiment  | number    | Average sentiment of all comments on this post |
  
   
**Collection: comments (top-level, flat)**  
All comments stored flat in a single top-level collection for efficient cross-account querying. This is the core collection of the entire system.  

| Field | Type | Description |
| ----------------- | -------------- | ---------------------------------------------------- |
| comment_id | string | Unique Instagram comment ID (document ID) |
| account_id | string | Parent Instagram account username |
| post_id | string | Parent post shortcode |
| author_username | string | Comment author username |
| text | string | Full comment text |
| text_clean | string | Cleaned/normalized text for analysis |
| likes_count | number | Likes on this comment |
| is_reply | boolean | Whether this is a reply to another comment |
| parent_comment_id | string \| null | ID of parent comment if reply |
| reply_depth | number | Nesting depth (0 = top-level) |
| posted_at | timestamp | When comment was posted |
| scraped_at | timestamp | When comment was collected |
| sentiment_score | number | VADER compound score (-1 to +1) |
| sentiment_label | string | positive / negative / neutral |
| emotions | map | NRCLex scores: {anger, joy, fear, sadness, ...} |
| topics | array<string> | KeyBERT extracted topics |
| category | string | pain_point / praise / question / complaint / neutral |
  
   
**Collection: topic_clusters**  
Aggregated topic data for trend analysis.  

| Field            | Type          | Description                      |
| ---------------- | ------------- | -------------------------------- |
| topic            | string        | Topic keyword (document ID)      |
| account_id       | string        | Account this cluster belongs to  |
| count            | number        | Total occurrences                |
| avg_sentiment    | number        | Average sentiment for this topic |
| dominant_emotion | string        | Most frequent emotion            |
| sample_comments  | array<string> | Up to 5 example comment IDs      |
| first_seen       | timestamp     | Earliest occurrence              |
| last_seen        | timestamp     | Most recent occurrence           |
  
   
**Collection: alerts**  
Alert history for audit trail and dashboard display.  

| Field | Type | Description |
| ------------------ | ------------- | ------------------------------------------------- |
| alert_id | string | Auto-generated document ID |
| alert_type | string | negative_spike / viral_negative / complaint_surge |
| account_id | string | Affected account |
| triggered_at | timestamp | When alert fired |
| severity | string | low / medium / high / critical |
| message | string | Human-readable alert description |
| trigger_value | number | The metric value that triggered the alert |
| threshold | number | The threshold that was crossed |
| sample_comment_ids | array<string> | Comment IDs that triggered this |
| notified_via | string | telegram / email / both |
| acknowledged | boolean | Whether alert has been reviewed |
  
   
**Collection: daily_analytics**  
Pre-aggregated daily rollups for fast dashboard rendering. Document ID format: {account_id}_{YYYY-MM-DD}.  

| Field | Type | Description |
| --------------------- | ---------- | -------------------------------------------- |
| account_id | string | Account username |
| date | string | YYYY-MM-DD |
| total_comments | number | Comments collected that day |
| avg_sentiment | number | Mean sentiment score |
| sentiment_dist | map | {positive: n, negative: n, neutral: n} |
| emotion_dist | map | {anger: n, joy: n, fear: n, sadness: n, ...} |
| top_topics | array<map> | [{topic: str, count: n}, ...] |
| category_dist | map | {pain_point: n, praise: n, question: n, ...} |
| most_liked_comment_id | string | Comment with highest likes that day |
| alert_count | number | Alerts triggered that day |
  
   
**Firestore Security Rules**  
Since this system uses a service account (server-side only), lock down client access completely:  
rules_version = '2';  
service cloud.firestore {  
  match /databases/{database}/documents {  
    // Deny all client-side access  
    // Deny all client-side access  
    // All reads/writes happen via firebase-admin SDK  
    // which bypasses security rules entirely  
    // which bypasses security rules entirely  
    match /{document=**} {  
      allow read, write: if false;  
      allow read, write: if false;  
    }  
  }  
}  
}  
The firebase-admin SDK uses a service account and bypasses these rules entirely. This configuration ensures no unauthenticated client can access your data.  
   
**Free Tier Optimization Strategy**  
Firebase Spark (free) plan limits: 50K reads/day, 20K writes/day, 20K deletes/day, 1 GiB storage.  
•       Batch writes: Use Firestore batch operations (max 500 per batch) to reduce write overhead.  
•       Pre-aggregate: Store daily_analytics rollups so the dashboard reads one document instead of querying thousands of comments.  
•       Pre-aggregate: Store daily_analytics rollups so the dashboard reads one document instead of querying thousands of comments.  
•       Flat comment collection: Avoid deeply nested subcollections. The flat comments collection enables compound queries without multiple reads.  
•       Flat comment collection: Avoid deeply nested subcollections. The flat comments collection enables compound queries without multiple reads.  
•       Snapshot listeners: Streamlit listener on daily_analytics reads only changed documents, not full collection rescans.  
•       Snapshot listeners: Streamlit listener on daily_analytics reads only changed documents, not full collection rescans.  
•       Comment dedup: Check existence before writing to avoid wasted writes on already-stored comments.  
•       Paginate queries: Always use .limit() and cursor-based pagination. Never fetch entire collections.  
•       Paginate queries: Always use .limit() and cursor-based pagination. Never fetch entire collections.  
•       Index strategically: Create composite indexes only for queries you actually run (account_id + sentiment_label + posted_at is the most critical one).  
•       Index strategically: Create composite indexes only for queries you actually run (account_id + sentiment_label + posted_at is the most critical one).  
   
**Required Composite Indexes**  
Create these in Firebase Console under Firestore > Indexes:  

| Collection | Fields | Purpose |
| --------------- | --------------------------------------------------- | ------------------------------- |
| comments | account_id ASC, posted_at DESC | Recent comments per account |
| comments | account_id ASC, sentiment_label ASC, posted_at DESC | Filter by sentiment per account |
| comments | account_id ASC, category ASC, posted_at DESC | Filter by category per account |
| comments | account_id ASC, likes_count DESC | Most liked comments per account |
| daily_analytics | account_id ASC, date DESC | Recent analytics per account |
| alerts | account_id ASC, triggered_at DESC | Recent alerts per account |
  
   
**Apify Integration**  
   
**Recommended Apify Actor**  
**Actor: apify/instagram-comment-scraper** — This is the dedicated comment scraper that extracts full comment threads including nested replies. For post discovery, use **apify/instagram-post-scraper** to first get post URLs, then pipe them into the comment scraper.  
**Actor: apify/instagram-comment-scraper** — This is the dedicated comment scraper that extracts full comment threads including nested replies. For post discovery, use **apify/instagram-post-scraper** to first get post URLs, then pipe them into the comment scraper.  
   
**Apify API Client in Python**  
# collectors/apify_client.py  
import os, time  
from apify_client import ApifyClient  
from apify_client import ApifyClient  
   
class InstagramApifyClient:  
class InstagramApifyClient:  
    def __init__(self):  
        self.client = ApifyClient(os.getenv("APIFY_TOKEN"))  
   
    def fetch_comments(self, post_urls, max_comments=500):  
    def fetch_comments(self, post_urls, max_comments=500):  
        """Fetch comments for a list of post URLs."""  
        run_input = {  
            "directUrls": post_urls,  
            "resultsLimit": max_comments,  
            "includeNestedComments": True,  
            "maxReplies": 50,  
            "maxReplies": 50,  
        }  
        }  
        run = self.client.actor(  
            "apify/instagram-comment-scraper"  
            "apify/instagram-comment-scraper"  
        ).call(run_input=run_input)  
        ).call(run_input=run_input)  
        items = list(self.client.dataset(run["defaultDatasetId"]).iterate_items())  
        return items  
        return items  
   
    def fetch_recent_posts(self, username, max_posts=20):  
    def fetch_recent_posts(self, username, max_posts=20):  
        """Fetch recent post URLs for an account."""  
        run_input = {  
            "directUrls": [f"https://www.instagram.com/{username}/"],  
            "resultsLimit": max_posts,  
            "resultsLimit": max_posts,  
            "resultsType": "posts",  
            "resultsType": "posts",  
        }  
        }  
        run = self.client.actor(  
        run = self.client.actor(  
            "apify/instagram-post-scraper"  
            "apify/instagram-post-scraper"  
        ).call(run_input=run_input)  
        ).call(run_input=run_input)  
        items = list(self.client.dataset(run["defaultDatasetId"]).iterate_items())  
        return items  
   
**Parsing and Flattening Nested Replies**  
Apify returns comments with a replies array. The following function flattens them into a single list with parent references:  
# collectors/comment_fetcher.py  
from datetime import datetime  
from datetime import datetime  
   
def flatten_comments(raw_comments, account_id, post_id):  
    """Flatten nested comment threads into flat list."""  
    """Flatten nested comment threads into flat list."""  
    flat = []  
    flat = []  
    for c in raw_comments:  
        comment = {  
        comment = {  
            "comment_id": c["id"],  
            "comment_id": c["id"],  
            "account_id": account_id,  
            "account_id": account_id,  
            "post_id": post_id,  
            "post_id": post_id,  
            "author_username": c.get("ownerUsername", "unknown"),  
            "author_username": c.get("ownerUsername", "unknown"),  
            "text": c.get("text", ""),  
            "text": c.get("text", ""),  
            "likes_count": c.get("likesCount", 0),  
            "likes_count": c.get("likesCount", 0),  
            "is_reply": False,  
            "parent_comment_id": None,  
            "reply_depth": 0,  
            "posted_at": c.get("timestamp"),  
            "scraped_at": datetime.utcnow().isoformat(),  
            "scraped_at": datetime.utcnow().isoformat(),  
        }  
        }  
        flat.append(comment)  
   
        # Process nested replies  
        # Process nested replies  
        for reply in c.get("replies", []):  
            reply_doc = {  
            reply_doc = {  
                "comment_id": reply["id"],  
                "comment_id": reply["id"],  
                "account_id": account_id,  
                "post_id": post_id,  
                "author_username": reply.get("ownerUsername", "unknown"),  
                "author_username": reply.get("ownerUsername", "unknown"),  
                "text": reply.get("text", ""),  
                "text": reply.get("text", ""),  
                "likes_count": reply.get("likesCount", 0),  
                "likes_count": reply.get("likesCount", 0),  
                "is_reply": True,  
                "is_reply": True,  
                "parent_comment_id": c["id"],  
                "reply_depth": 1,  
                "reply_depth": 1,  
                "posted_at": reply.get("timestamp"),  
                "scraped_at": datetime.utcnow().isoformat(),  
            }  
            }  
            flat.append(reply_doc)  
            flat.append(reply_doc)  
    return flat  
    return flat  
   
**Configuration for Maximum Comment Depth**  
Key Apify input parameters to maximize comment collection:  

| Parameter | Recommended Value | Purpose |
| --------------------- | ----------------- | --------------------------------------------------------- |
| resultsLimit | 500-1000 | Max comments per post (higher = more Apify compute units) |
| includeNestedComments | True | Fetch reply threads, not just top-level |
| maxReplies | 50 | Max replies per top-level comment |
| maxRequestRetries | 3 | Auto-retry on transient failures |
  
   
**Python Scheduler**  
   
**APScheduler Configuration**  
The scheduler runs as a long-lived Python process, executing the collection pipeline on a fixed interval:  
# pipeline/scheduler.py  
import logging  
from apscheduler.schedulers.blocking import BlockingScheduler  
from apscheduler.triggers.interval import IntervalTrigger  
from apscheduler.triggers.interval import IntervalTrigger  
from pipeline.runner import run_pipeline  
   
logging.basicConfig(level=logging.INFO)  
logger = logging.getLogger(__name__)  
logger = logging.getLogger(__name__)  
   
def start_scheduler():  
    scheduler = BlockingScheduler()  
    scheduler = BlockingScheduler()  
   
    # Main collection job - runs every hour  
    scheduler.add_job(  
    scheduler.add_job(  
        run_pipeline,  
        trigger=IntervalTrigger(hours=1),  
        trigger=IntervalTrigger(hours=1),  
        id="comment_collection",  
        id="comment_collection",  
        name="Hourly Comment Collection",  
        max_instances=1,          # Prevent overlap  
        misfire_grace_time=300,   # 5 min grace period  
        replace_existing=True,  
    )  
   
    # Daily aggregation - runs at midnight UTC  
    # Daily aggregation - runs at midnight UTC  
    scheduler.add_job(  
        run_daily_aggregation,  
        run_daily_aggregation,  
        trigger="cron", hour=0, minute=5,  
        id="daily_aggregation",  
        name="Daily Analytics Rollup",  
        name="Daily Analytics Rollup",  
    )  
   
    logger.info("Scheduler started")  
    try:  
    try:  
        scheduler.start()  
        scheduler.start()  
    except (KeyboardInterrupt, SystemExit):  
    except (KeyboardInterrupt, SystemExit):  
        logger.info("Scheduler stopped")  
        logger.info("Scheduler stopped")  
   
**Main Pipeline Runner with Retry Logic**  
# pipeline/runner.py  
import logging, time  
from config.firebase_config import init_firestore  
from config.firebase_config import init_firestore  
from collectors.apify_client import InstagramApifyClient  
from collectors.comment_fetcher import flatten_comments  
from processing.cleaner import clean_text  
from processing.sentiment import analyze_sentiment  
from processing.sentiment import analyze_sentiment  
from processing.emotion import analyze_emotions  
from processing.emotion import analyze_emotions  
from processing.topics import extract_topics  
from processing.topics import extract_topics  
from processing.classifier import classify_comment  
from processing.classifier import classify_comment  
from storage.firestore_client import batch_write_comments  
from storage.dedup import get_existing_comment_ids  
from alerts.detector import check_alerts  
from alerts.detector import check_alerts  
   
logger = logging.getLogger(__name__)  
MAX_RETRIES = 3  
   
def run_pipeline():  
def run_pipeline():  
    db = init_firestore()  
    db = init_firestore()  
    apify = InstagramApifyClient()  
   
    # Get all active tracked accounts  
    # Get all active tracked accounts  
    accounts = db.collection("accounts")  
    accounts = db.collection("accounts")  
        .where("is_active", "==", True).stream()  
        .where("is_active", "==", True).stream()  
   
    for account in accounts:  
        acct = account.to_dict()  
        username = account.id  
   
        for attempt in range(MAX_RETRIES):  
            try:  
            try:  
                # Step 1: Fetch recent posts  
                # Step 1: Fetch recent posts  
                posts = apify.fetch_recent_posts(username)  
                posts = apify.fetch_recent_posts(username)  
                post_urls = [p["url"] for p in posts]  
                post_urls = [p["url"] for p in posts]  
   
                # Step 2: Fetch comments for all posts  
                # Step 2: Fetch comments for all posts  
                raw_comments = apify.fetch_comments(post_urls)  
   
                # Step 3: Flatten and dedup  
                # Step 3: Flatten and dedup  
                all_comments = []  
                for post in posts:  
                for post in posts:  
                    post_comments = [c for c in raw_comments  
                    post_comments = [c for c in raw_comments  
                        if c.get("postId") == post["id"]]  
                        if c.get("postId") == post["id"]]  
                    flat = flatten_comments(  
                        post_comments, username, post["shortCode"]  
                        post_comments, username, post["shortCode"]  
                    )  
                    )  
                    all_comments.extend(flat)  
   
                existing_ids = get_existing_comment_ids(  
                    db, username  
                    db, username  
                )  
                new_comments = [  
                new_comments = [  
                    c for c in all_comments  
                    c for c in all_comments  
                    if c["comment_id"] not in existing_ids  
                ]  
                ]  
   
                # Step 4: Analyze each comment  
                # Step 4: Analyze each comment  
                for comment in new_comments:  
                for comment in new_comments:  
                    comment["text_clean"] = clean_text(comment["text"])  
                    comment["text_clean"] = clean_text(comment["text"])  
                    sent = analyze_sentiment(comment["text_clean"])  
                    sent = analyze_sentiment(comment["text_clean"])  
                    comment["sentiment_score"] = sent["score"]  
                    comment["sentiment_score"] = sent["score"]  
                    comment["sentiment_label"] = sent["label"]  
                    comment["emotions"] = analyze_emotions(  
                    comment["emotions"] = analyze_emotions(  
                        comment["text_clean"]  
                        comment["text_clean"]  
                    )  
                    comment["topics"] = extract_topics(  
                    comment["topics"] = extract_topics(  
                        comment["text_clean"]  
                        comment["text_clean"]  
                    )  
                    )  
                    comment["category"] = classify_comment(comment)  
   
                # Step 5: Batch write to Firestore  
                # Step 5: Batch write to Firestore  
                batch_write_comments(db, new_comments)  
                batch_write_comments(db, new_comments)  
   
                # Step 6: Check for alerts  
                check_alerts(db, username, new_comments)  
   
                logger.info(  
                    f"{username}: {len(new_comments)} new comments"  
                )  
                break  # Success, exit retry loop  
                break  # Success, exit retry loop  
   
            except Exception as e:  
            except Exception as e:  
                logger.error(  
                logger.error(  
                    f"Attempt {attempt+1} failed for {username}: {e}"  
                    f"Attempt {attempt+1} failed for {username}: {e}"  
                )  
                if attempt < MAX_RETRIES - 1:  
                    time.sleep(30 * (attempt + 1))  
                    time.sleep(30 * (attempt + 1))  
                else:  
                else:  
                    logger.critical(f"All retries failed: {username}")  
   
**Duplicate Comment Prevention**  
# storage/dedup.py  
   
def get_existing_comment_ids(db, account_id):  
def get_existing_comment_ids(db, account_id):  
    """Fetch set of comment IDs already in Firestore."""  
    """Fetch set of comment IDs already in Firestore."""  
    docs = db.collection("comments")  
    docs = db.collection("comments")  
        .where("account_id", "==", account_id)  
        .where("account_id", "==", account_id)  
        .select([])  
        .stream()  
        .stream()  
    return {doc.id for doc in docs}  
    return {doc.id for doc in docs}  
This uses a metadata-only query (select with empty fields) to minimize read costs. Each document ID check counts as one read, but no field data is transferred.  
  
   
**Comment Data Pipeline**  
   
**Text Cleaning and Normalization**  
# processing/cleaner.py  
import re, unicodedata  
   
def clean_text(text):  
    """Clean and normalize comment text for NLP analysis."""  
    """Clean and normalize comment text for NLP analysis."""  
    if not text:  
        return ""  
    # Normalize unicode  
    text = unicodedata.normalize("NFKD", text)  
    text = unicodedata.normalize("NFKD", text)  
    # Remove URLs  
    # Remove URLs  
    text = re.sub(r"http\S+|www\S+", "", text)  
    text = re.sub(r"http\S+|www\S+", "", text)  
    # Remove @mentions (keep for context but strip @)  
    # Remove @mentions (keep for context but strip @)  
    text = re.sub(r"@(\w+)", r"\1", text)  
    # Remove hashtag symbol but keep word  
    text = re.sub(r"#(\w+)", r"\1", text)  
    text = re.sub(r"#(\w+)", r"\1", text)  
    # Collapse whitespace  
    # Collapse whitespace  
    text = re.sub(r"\s+", " ", text).strip()  
    return text  
    return text  
Important: Emojis are intentionally preserved because both VADER and NRCLex can interpret emoji sentiment.  
   
**Batch Writing to Firestore**  
# storage/firestore_client.py  
from google.cloud.firestore_v1 import WriteBatch  
   
def batch_write_comments(db, comments, batch_size=450):  
    """Write comments in batches of 450 (under 500 limit)."""  
    """Write comments in batches of 450 (under 500 limit)."""  
    for i in range(0, len(comments), batch_size):  
    for i in range(0, len(comments), batch_size):  
        batch = db.batch()  
        chunk = comments[i:i + batch_size]  
        chunk = comments[i:i + batch_size]  
        for comment in chunk:  
        for comment in chunk:  
            ref = db.collection("comments").document(  
                comment["comment_id"]  
            )  
            )  
            batch.set(ref, comment, merge=True)  
            batch.set(ref, comment, merge=True)  
        batch.commit()  
        batch.commit()  
Using merge=True ensures that re-processing a comment updates it rather than overwriting. The batch size of 450 stays safely under Firestore’s 500-operation batch limit.  
  
   
**Comment Analysis Engine**  
   
**VADER Sentiment Scoring**  
# processing/sentiment.py  
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer  
   
analyzer = SentimentIntensityAnalyzer()  
   
def analyze_sentiment(text):  
    """Return compound score and label."""  
    """Return compound score and label."""  
    scores = analyzer.polarity_scores(text)  
    scores = analyzer.polarity_scores(text)  
    compound = scores["compound"]  
   
    if compound >= 0.05:  
    if compound >= 0.05:  
        label = "positive"  
        label = "positive"  
    elif compound <= -0.05:  
        label = "negative"  
        label = "negative"  
    else:  
    else:  
        label = "neutral"  
   
    return {"score": compound, "label": label}  
    return {"score": compound, "label": label}  
VADER is well-suited for social media text because it handles slang, emoticons, capitalization emphasis, and exclamation marks natively.  
   
**NRCLex Emotion Detection**  
# processing/emotion.py  
from nrclex import NRCLex  
   
EMOTION_KEYS = [  
EMOTION_KEYS = [  
    "anger", "anticipation", "disgust", "fear",  
    "anger", "anticipation", "disgust", "fear",  
    "joy", "sadness", "surprise", "trust",  
    "positive", "negative"  
]  
]  
   
def analyze_emotions(text):  
def analyze_emotions(text):  
    """Return normalized emotion scores."""  
    if not text.strip():  
    if not text.strip():  
        return {e: 0.0 for e in EMOTION_KEYS}  
   
    emotion = NRCLex(text)  
    raw = emotion.raw_emotion_scores  
    raw = emotion.raw_emotion_scores  
    total = sum(raw.values()) or 1  
   
    return {  
    return {  
        e: round(raw.get(e, 0) / total, 3)  
        for e in EMOTION_KEYS  
    }  
Scores are normalized to sum to 1.0 so they are comparable across comments of different lengths.  
   
**KeyBERT Topic Extraction**  
# processing/topics.py  
from keybert import KeyBERT  
   
# Initialize once (loads transformer model ~250MB)  
kw_model = KeyBERT()  
kw_model = KeyBERT()  
   
def extract_topics(text, top_n=5):  
    """Extract top N topic keywords from comment text."""  
    if not text or len(text.split()) < 3:  
        return []  
   
    keywords = kw_model.extract_keywords(  
    keywords = kw_model.extract_keywords(  
        text,  
        keyphrase_ngram_range=(1, 2),  
        stop_words="english",  
        stop_words="english",  
        top_n=top_n,  
        top_n=top_n,  
        use_mmr=True,       # Maximal Marginal Relevance  
        use_mmr=True,       # Maximal Marginal Relevance  
        diversity=0.5,      # Balance relevance and diversity  
    )  
    )  
    return [kw[0] for kw in keywords]  
    return [kw[0] for kw in keywords]  
KeyBERT uses BERT embeddings to find keywords most semantically relevant to the document. use_mmr=True ensures extracted topics are diverse rather than redundant. For very short comments (fewer than 3 words), topic extraction is skipped.  
   
**Comment Category Classifier**  
# processing/classifier.py  
import re  
import re  
   
PAIN_KEYWORDS = [  
    "broken", "bug", "crash", "slow", "terrible",  
    "broken", "bug", "crash", "slow", "terrible",  
    "awful", "worst", "disappointed", "frustrating",  
    "awful", "worst", "disappointed", "frustrating",  
    "waste", "scam", "rip off", "never again",  
    "waste", "scam", "rip off", "never again",  
    "doesn't work", "not working", "poor quality"  
    "doesn't work", "not working", "poor quality"  
]  
]  
PRAISE_KEYWORDS = [  
PRAISE_KEYWORDS = [  
    "love", "amazing", "best", "awesome", "perfect",  
    "love", "amazing", "best", "awesome", "perfect",  
    "excellent", "fantastic", "great", "wonderful",  
    "excellent", "fantastic", "great", "wonderful",  
    "recommend", "life changing", "game changer"  
    "recommend", "life changing", "game changer"  
]  
QUESTION_PATTERNS = [  
QUESTION_PATTERNS = [  
    r"\?$", r"^(how|what|when|where|why|which|can|does|is|do|will)",  
    r"\?$", r"^(how|what|when|where|why|which|can|does|is|do|will)",  
    r"anyone know", r"help me", r"looking for"  
    r"anyone know", r"help me", r"looking for"  
]  
   
def classify_comment(comment):  
def classify_comment(comment):  
    """Classify comment into category."""  
    text = comment["text_clean"].lower()  
    text = comment["text_clean"].lower()  
    sentiment = comment["sentiment_score"]  
    sentiment = comment["sentiment_score"]  
   
    # Check for questions first  
    # Check for questions first  
    for pattern in QUESTION_PATTERNS:  
        if re.search(pattern, text):  
        if re.search(pattern, text):  
            return "question"  
            return "question"  
   
    # Pain points: negative sentiment + pain keywords  
    if sentiment < -0.3:  
    if sentiment < -0.3:  
        if any(kw in text for kw in PAIN_KEYWORDS):  
            return "pain_point"  
        return "complaint"  
        return "complaint"  
   
    # Praise: positive sentiment + praise keywords  
    # Praise: positive sentiment + praise keywords  
    if sentiment > 0.3:  
        if any(kw in text for kw in PRAISE_KEYWORDS):  
        if any(kw in text for kw in PRAISE_KEYWORDS):  
            return "praise"  
            return "praise"  
   
    return "neutral"  
   
**Most Liked Comments Query**  
# Query: Top 20 most liked comments for an account  
def get_most_liked(db, account_id, limit=20):  
    docs = db.collection("comments") \  
    docs = db.collection("comments") \  
        .where("account_id", "==", account_id) \  
        .order_by("likes_count", direction="DESCENDING") \  
        .order_by("likes_count", direction="DESCENDING") \  
        .limit(limit) \  
        .limit(limit) \  
        .stream()  
    return [doc.to_dict() for doc in docs]  
   
**Recurring Theme Aggregation**  
The daily aggregation job computes topic frequency and sentiment trends across a rolling window:  
def aggregate_topics(db, account_id, days=7):  
    from datetime import datetime, timedelta  
    from collections import Counter  
    from collections import Counter  
   
    cutoff = datetime.utcnow() - timedelta(days=days)  
    docs = db.collection("comments") \  
    docs = db.collection("comments") \  
        .where("account_id", "==", account_id) \  
        .where("posted_at", ">=", cutoff.isoformat()) \  
        .where("posted_at", ">=", cutoff.isoformat()) \  
        .stream()  
   
    topic_counter = Counter()  
    topic_sentiments = {}  
   
    for doc in docs:  
    for doc in docs:  
        d = doc.to_dict()  
        for topic in d.get("topics", []):  
        for topic in d.get("topics", []):  
            topic_counter[topic] += 1  
            topic_counter[topic] += 1  
            if topic not in topic_sentiments:  
            if topic not in topic_sentiments:  
                topic_sentiments[topic] = []  
                topic_sentiments[topic] = []  
            topic_sentiments[topic].append(d["sentiment_score"])  
            topic_sentiments[topic].append(d["sentiment_score"])  
   
    results = []  
    results = []  
    for topic, count in topic_counter.most_common(20):  
        sents = topic_sentiments[topic]  
        sents = topic_sentiments[topic]  
        results.append({  
            "topic": topic,  
            "topic": topic,  
            "count": count,  
            "avg_sentiment": sum(sents) / len(sents),  
            "avg_sentiment": sum(sents) / len(sents),  
        })  
    return results  
    return results  
  
   
**Streamlit Dashboard with Realtime Firestore**  
   
**Connecting Streamlit to Firestore**  
Streamlit does not natively support Firestore snapshot listeners because it re-runs the script on each interaction. The recommended approach uses cached Firestore queries with a manual refresh button and short TTL cache:  
# dashboard/app.py  
import streamlit as st  
import streamlit as st  
from config.firebase_config import init_firestore  
from datetime import datetime, timedelta  
from datetime import datetime, timedelta  
import pandas as pd  
import pandas as pd  
import plotly.express as px  
   
st.set_page_config(  
st.set_page_config(  
    page_title="Instagram Comment Intelligence",  
    page_title="Instagram Comment Intelligence",  
    page_icon="\U0001F4CA",  
    layout="wide"  
    layout="wide"  
)  
   
db = init_firestore()  
   
# Cache Firestore reads for 60 seconds  
# Cache Firestore reads for 60 seconds  
@st.cache_data(ttl=60)  
def load_comments(account_id, days=7):  
    cutoff = datetime.utcnow() - timedelta(days=days)  
    docs = db.collection("comments") \  
        .where("account_id", "==", account_id) \  
        .where("posted_at", ">=", cutoff.isoformat()) \  
        .where("posted_at", ">=", cutoff.isoformat()) \  
        .order_by("posted_at", direction="DESCENDING") \  
        .order_by("posted_at", direction="DESCENDING") \  
        .limit(1000) \  
        .limit(1000) \  
        .stream()  
    return pd.DataFrame([doc.to_dict() for doc in docs])  
   
@st.cache_data(ttl=60)  
def load_daily_analytics(account_id, days=30):  
def load_daily_analytics(account_id, days=30):  
    docs = db.collection("daily_analytics") \  
    docs = db.collection("daily_analytics") \  
        .where("account_id", "==", account_id) \  
        .where("account_id", "==", account_id) \  
        .order_by("date", direction="DESCENDING") \  
        .order_by("date", direction="DESCENDING") \  
        .limit(days) \  
        .stream()  
        .stream()  
    return pd.DataFrame([doc.to_dict() for doc in docs])  
   
**Dashboard Layout**  
The dashboard is organized into seven panels:  
# ── Sidebar: Account selector and date range ──  
st.sidebar.title("Comment Intelligence")  
accounts = [doc.id for doc in  
accounts = [doc.id for doc in  
    db.collection("accounts")  
    .where("is_active", "==", True).stream()]  
selected = st.sidebar.selectbox("Account", accounts)  
days = st.sidebar.slider("Days", 1, 90, 7)  
days = st.sidebar.slider("Days", 1, 90, 7)  
   
if st.sidebar.button("Refresh Data"):  
    st.cache_data.clear()  
   
df = load_comments(selected, days)  
df = load_comments(selected, days)  
analytics = load_daily_analytics(selected)  
analytics = load_daily_analytics(selected)  
   
# ── Panel 1: Sentiment Overview ──  
st.header("Sentiment Breakdown")  
col1, col2, col3 = st.columns(3)  
col1, col2, col3 = st.columns(3)  
pos = len(df[df["sentiment_label"] == "positive"])  
pos = len(df[df["sentiment_label"] == "positive"])  
neg = len(df[df["sentiment_label"] == "negative"])  
neu = len(df[df["sentiment_label"] == "neutral"])  
neu = len(df[df["sentiment_label"] == "neutral"])  
col1.metric("Positive", pos, f"{pos/len(df)*100:.0f}%")  
col1.metric("Positive", pos, f"{pos/len(df)*100:.0f}%")  
col2.metric("Negative", neg, f"{neg/len(df)*100:.0f}%")  
col2.metric("Negative", neg, f"{neg/len(df)*100:.0f}%")  
col3.metric("Neutral", neu, f"{neu/len(df)*100:.0f}%")  
col3.metric("Neutral", neu, f"{neu/len(df)*100:.0f}%")  
   
# ── Panel 2: Sentiment Timeline ──  
# ── Panel 2: Sentiment Timeline ──  
fig = px.line(analytics.sort_values('date'),  
fig = px.line(analytics.sort_values('date'),  
    x='date', y='avg_sentiment',  
    x='date', y='avg_sentiment',  
    title="Daily Average Sentiment")  
    title="Daily Average Sentiment")  
st.plotly_chart(fig, use_container_width=True)  
st.plotly_chart(fig, use_container_width=True)  
   
# ── Panel 3: Emotion Breakdown ──  
# ── Panel 3: Emotion Breakdown ──  
st.header("Emotion Analysis")  
st.header("Emotion Analysis")  
emotions_df = pd.json_normalize(  
emotions_df = pd.json_normalize(  
    df["emotions"].dropna())  
    df["emotions"].dropna())  
avg_emotions = emotions_df.mean()  
avg_emotions = emotions_df.mean()  
fig_emo = px.bar(x=avg_emotions.index,  
fig_emo = px.bar(x=avg_emotions.index,  
    y=avg_emotions.values,  
    title="Average Emotion Distribution")  
st.plotly_chart(fig_emo, use_container_width=True)  
   
# ── Panel 4: Topic Cloud ──  
st.header("Trending Topics")  
st.header("Trending Topics")  
topics_flat = [t for topics in df["topics"].dropna()  
topics_flat = [t for topics in df["topics"].dropna()  
    for t in topics]  
    for t in topics]  
from collections import Counter  
from collections import Counter  
tc = Counter(topics_flat).most_common(20)  
tc = Counter(topics_flat).most_common(20)  
st.bar_chart(dict(tc))  
st.bar_chart(dict(tc))  
   
# ── Panel 5: Pain Points ──  
st.header("Pain Points")  
st.header("Pain Points")  
pain = df[df["category"] == "pain_point"]  
pain = df[df["category"] == "pain_point"]  
    .sort_values('likes_count', ascending=False)  
    .sort_values('likes_count', ascending=False)  
st.dataframe(pain[['text', 'likes_count',  
    'sentiment_score']].head(20))  
    'sentiment_score']].head(20))  
   
# ── Panel 6: Praise ──  
# ── Panel 6: Praise ──  
st.header("Top Praise")  
st.header("Top Praise")  
praise = df[df["category"] == "praise"]  
    .sort_values('likes_count', ascending=False)  
    .sort_values('likes_count', ascending=False)  
st.dataframe(praise[['text', 'likes_count',  
    'sentiment_score']].head(20))  
   
# ── Panel 7: Alerts ──  
# ── Panel 7: Alerts ──  
st.header("Alert History")  
st.header("Alert History")  
alerts = db.collection("alerts") \  
alerts = db.collection("alerts") \  
    .where("account_id", "==", selected) \  
    .where("account_id", "==", selected) \  
    .order_by("triggered_at", direction="DESCENDING") \  
    .limit(20).stream()  
alert_df = pd.DataFrame([a.to_dict() for a in alerts])  
alert_df = pd.DataFrame([a.to_dict() for a in alerts])  
st.dataframe(alert_df)  
   
**Realtime Listener Alternative**  
For true realtime updates, you can run a background thread with a Firestore on_snapshot listener that pushes updates into Streamlit session state. This approach is more complex but eliminates the need for manual refresh:  
import threading  
   
def start_listener(account_id):  
    def on_snapshot(doc_snapshot, changes, read_time):  
    def on_snapshot(doc_snapshot, changes, read_time):  
        for change in changes:  
            if change.type.name == "ADDED":  
                st.session_state["new_comments"].append(  
                st.session_state["new_comments"].append(  
                    change.document.to_dict())  
                    change.document.to_dict())  
   
    if "listener_started" not in st.session_state:  
    if "listener_started" not in st.session_state:  
        st.session_state["new_comments"] = []  
        st.session_state["listener_started"] = True  
   
        db.collection("comments") \  
        db.collection("comments") \  
            .where("account_id", "==", account_id) \  
            .order_by("scraped_at", direction="DESCENDING") \  
            .order_by("scraped_at", direction="DESCENDING") \  
            .limit(1) \  
            .on_snapshot(on_snapshot)  
Caveat: Streamlit’s execution model reruns the full script on each widget interaction. The listener approach works but requires careful state management. For most use cases, the cached query approach with a 60-second TTL is simpler and sufficient.  
  
   
**Alerting System**  
   
**Spike and Viral Comment Detection**  
# alerts/detector.py  
from datetime import datetime  
from datetime import datetime  
   
# Thresholds  
# Thresholds  
NEGATIVE_SPIKE_THRESHOLD = 0.40  # 40% negative in batch  
VIRAL_NEGATIVE_LIKES = 50        # Likes on negative comment  
VIRAL_NEGATIVE_LIKES = 50        # Likes on negative comment  
   
def check_alerts(db, account_id, new_comments):  
    if not new_comments:  
    if not new_comments:  
        return  
   
    alerts = []  
    alerts = []  
   
    # Check 1: Negative comment spike  
    neg = [c for c in new_comments  
    neg = [c for c in new_comments  
        if c["sentiment_label"] == "negative"]  
    neg_ratio = len(neg) / len(new_comments)  
   
    if neg_ratio >= NEGATIVE_SPIKE_THRESHOLD:  
    if neg_ratio >= NEGATIVE_SPIKE_THRESHOLD:  
        alerts.append({  
            "alert_type": "negative_spike",  
            "account_id": account_id,  
            "account_id": account_id,  
            "triggered_at": datetime.utcnow().isoformat(),  
            "severity": "high" if neg_ratio > 0.6 else "medium",  
            "message": f"{neg_ratio*100:.0f}% negative comments",  
            "message": f"{neg_ratio*100:.0f}% negative comments",  
            "trigger_value": neg_ratio,  
            "threshold": NEGATIVE_SPIKE_THRESHOLD,  
            "sample_comment_ids": [c["comment_id"]  
                for c in neg[:5]],  
            "notified_via": "telegram",  
            "notified_via": "telegram",  
            "acknowledged": False,  
            "acknowledged": False,  
        })  
        })  
   
    # Check 2: Viral negative comments  
    # Check 2: Viral negative comments  
    for c in new_comments:  
        if (c["sentiment_label"] == "negative" and  
                c["likes_count"] >= VIRAL_NEGATIVE_LIKES):  
            alerts.append({  
            alerts.append({  
                "alert_type": "viral_negative",  
                "alert_type": "viral_negative",  
                "account_id": account_id,  
                "account_id": account_id,  
                "triggered_at": datetime.utcnow().isoformat(),  
                "severity": "critical",  
                "severity": "critical",  
                "message": f"Viral neg comment: {c['likes_count']} likes",  
                "trigger_value": c["likes_count"],  
                "trigger_value": c["likes_count"],  
                "threshold": VIRAL_NEGATIVE_LIKES,  
                "threshold": VIRAL_NEGATIVE_LIKES,  
                "sample_comment_ids": [c["comment_id"]],  
                "sample_comment_ids": [c["comment_id"]],  
                "notified_via": "telegram",  
                "acknowledged": False,  
            })  
            })  
   
    # Write alerts to Firestore and send notifications  
    # Write alerts to Firestore and send notifications  
    for alert in alerts:  
    for alert in alerts:  
        db.collection("alerts").add(alert)  
        send_notification(alert)  
        send_notification(alert)  
   
**Telegram Notification**  
# alerts/notifier.py  
import os, requests  
   
TELEGRAM_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')  
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')  
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')  
   
def send_notification(alert):  
    text = (  
    text = (  
        f"ALERT: {alert['alert_type'].upper()}\n"  
        f"Account: {alert['account_id']}\n"  
        f"Severity: {alert['severity']}\n"  
        f"Details: {alert['message']}"  
    )  
    )  
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"  
    requests.post(url, json={  
        "chat_id": TELEGRAM_CHAT_ID,  
        "text": text,  
        "parse_mode": "HTML"  
        "parse_mode": "HTML"  
    })  
    })  
  
   
**Deployment**  
   
**Deployment Options**  

| Option | Cost | Best For |
| ---------------------------- | ------------------ | ------------------------------------ |
| Local machine (always-on) | Free | Development and testing |
| VPS (DigitalOcean / Hetzner) | $4-12/month | Production single-user |
| Google Cloud Run | Pay per invocation | Serverless alternative to scheduler |
| Railway / Render | $5-7/month | Managed deployment with auto-restart |
  
   
**VPS Deployment with systemd**  
For a production deployment on a VPS, create a systemd service to keep the pipeline running:  
# /etc/systemd/system/ig-comment-intel.service  
[Unit]  
Description=Instagram Comment Intelligence Pipeline  
Description=Instagram Comment Intelligence Pipeline  
After=network.target  
After=network.target  
   
[Service]  
[Service]  
User=deploy  
User=deploy  
WorkingDirectory=/opt/instagram-comment-intel  
WorkingDirectory=/opt/instagram-comment-intel  
ExecStart=/opt/instagram-comment-intel/venv/bin/python main.py  
Restart=always  
Restart=always  
RestartSec=30  
EnvironmentFile=/opt/instagram-comment-intel/.env  
   
[Install]  
WantedBy=multi-user.target  
WantedBy=multi-user.target  
# Enable and start  
# Enable and start  
sudo systemctl enable ig-comment-intel  
sudo systemctl start ig-comment-intel  
sudo journalctl -u ig-comment-intel -f  # View logs  
   
**Streamlit Deployment**  
Run the dashboard as a separate service, also managed by systemd or via Streamlit Community Cloud:  
# Start Streamlit with production settings  
streamlit run dashboard/app.py \  
streamlit run dashboard/app.py \  
    --server.port 8501 \  
    --server.port 8501 \  
    --server.address 0.0.0.0 \  
    --server.headless true  
    --server.headless true  
   
**Firebase Connection Best Practices**  
•       Initialize the Firebase app once at module level, not per function call. The init_firestore() pattern with the _apps check handles this.  
•       Use connection pooling: firebase-admin maintains a persistent gRPC channel. Do not close and reopen it.  
•       Handle transient errors: Wrap Firestore calls in try/except with exponential backoff for DEADLINE_EXCEEDED and UNAVAILABLE errors.  
•       Set read timeouts: For dashboard queries, use a 10-second timeout to prevent hung requests.  
•       Monitor quotas: Log the number of reads and writes per pipeline run to track daily usage against free tier limits.  
•       Monitor quotas: Log the number of reads and writes per pipeline run to track daily usage against free tier limits.  
  
   
**Cost Estimate**  
   
**Apify Costs**  

| Scale  | Accounts | Posts/Day | Comments/Day | Apify Cost                  |
| ------ | -------- | --------- | ------------ | --------------------------- |
| Small  | 3-5      | ~50       | ~2,000       | $49/month (Personal plan)   |
| Medium | 10-20    | ~200      | ~10,000      | $99/month (Team plan)       |
| Large  | 50+      | ~1,000    | ~50,000      | $299+/month (Business plan) |
  
Apify charges based on compute units consumed. Instagram scraping is compute-intensive due to rate limiting and page rendering. Budget approximately $1.50 to $3.00 per 1,000 comments extracted.  
   
**Firebase Costs**  

| Tier                  | Reads/Day  | Writes/Day | Storage | Cost           |
| --------------------- | ---------- | ---------- | ------- | -------------- |
| Free (Spark)          | 50,000     | 20,000     | 1 GiB   | Free           |
| Pay-as-you-go (Blaze) | 200,000    | 100,000    | 5 GiB   | ~$5-15/month   |
| Heavy usage           | 1,000,000+ | 500,000+   | 20+ GiB | ~$50-100/month |
  
With the optimization strategies in this plan (pre-aggregation, dedup, batch writes, cached queries), a system tracking 5 to 10 accounts should comfortably stay within the free tier.  
   
**VPS Costs**  

| Provider | Specs | Cost |
| --------------------- | ----------------------------- | --------------------- |
| DigitalOcean Droplet | 1 vCPU, 2 GB RAM, 50 GB SSD | $12/month |
| Hetzner Cloud CX22 | 2 vCPU, 4 GB RAM, 40 GB SSD | €4.35/month |
| Railway | Managed container, auto-scale | $5/month base + usage |
| Google Cloud e2-micro | 0.25 vCPU, 1 GB RAM | Free tier eligible |
  
   
**Total Monthly Cost Estimate**  

| Scenario | Apify | Firebase | VPS | Total |
| ------------------------------- | ----- | -------- | ------ | -------------- |
| Minimal (3 accounts, free tier) | $49 | Free | $0-5 | $49-54/month |
| Standard (10 accounts) | $99 | $5-15 | $5-12 | $109-126/month |
| Scale (30+ accounts) | $299 | $50-100 | $12-24 | $361-423/month |
  
   
**Build Timeline**  
   
Estimated timeline for an intermediate Python developer working part-time (10 to 15 hours per week):  
   

| Phase | Duration | Deliverables |
| --------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Phase 1: Foundation | Week 1-2 | Firebase project setup, Firestore schema created, firebase-admin connection tested, folder structure established, .env configuration |
| Phase 2: Data Collection | Week 2-3 | Apify integration complete, comment fetching and flattening working, dedup logic implemented, manual pipeline test successful |
| Phase 3: Analysis Engine | Week 3-5 | VADER sentiment scoring, NRCLex emotion detection, KeyBERT topic extraction, comment classifier, all unit tests passing |
| Phase 4: Pipeline Automation | Week 5-6 | APScheduler running hourly jobs, retry logic, batch Firestore writes, daily aggregation job, end-to-end pipeline test |
| Phase 5: Dashboard | Week 6-8 | Streamlit app with all 7 panels, Firestore cached queries, account selector, date range filter, charts and tables working |
| Phase 6: Alerting | Week 8-9 | Spike detection, viral comment detection, Telegram notification, alert history in Firestore and dashboard |
| Phase 7: Deployment and Hardening | Week 9-10 | VPS deployment, systemd services, error monitoring, performance optimization, documentation |
  
   
**Total estimated timeline: 10 weeks** at 10 to 15 hours per week. A developer working full-time could compress this to 3 to 4 weeks.  
  
   
**Risks and Limitations**  
   
**Technical Risks**  
•       **Instagram rate limiting and blocking: **Apify handles this internally but aggressive scraping can lead to temporary blocks. Mitigation: Keep scrape frequency to hourly or lower, avoid scraping more than 20 posts per account per run.  
•       **VADER accuracy on short text: **VADER struggles with sarcasm, irony, and very short comments like single emojis. Mitigation: Combine VADER with NRCLex emotion scores for a more nuanced picture. Consider fine-tuned models later if accuracy is insufficient.  
•       **KeyBERT memory usage: **KeyBERT loads a transformer model (~250 MB RAM). On a low-memory VPS, this may cause issues. Mitigation: Use the lightweight all-MiniLM-L6-v2 model explicitly, or switch to spaCy for topic extraction on constrained hardware.  
•       **KeyBERT memory usage: **KeyBERT loads a transformer model (~250 MB RAM). On a low-memory VPS, this may cause issues. Mitigation: Use the lightweight all-MiniLM-L6-v2 model explicitly, or switch to spaCy for topic extraction on constrained hardware.  
•       **Firestore free tier exhaustion: **A dashboard with frequent page loads by multiple users can quickly exceed 50K reads per day. Mitigation: Use aggressive caching (60-second TTL), pre-aggregated analytics, and limit dashboard users during free tier operation.  
•       **Apify API changes: **Apify actors are community-maintained and may change their output schema. Mitigation: Add defensive parsing with .get() calls and validation on the raw response before processing.  
•       **Apify API changes: **Apify actors are community-maintained and may change their output schema. Mitigation: Add defensive parsing with .get() calls and validation on the raw response before processing.  
   
**Architectural Limitations**  
•       **No real-time streaming from Instagram: **This is a polling-based system. There is no webhook or streaming API for Instagram comments. The minimum practical polling interval is 15 to 30 minutes due to Apify compute costs.  
•       **Single-language analysis: **VADER and NRCLex are English-only. Comments in other languages will receive inaccurate scores. Mitigation: Add a language detection step (using langdetect) and skip or flag non-English comments.  
•       **Single-language analysis: **VADER and NRCLex are English-only. Comments in other languages will receive inaccurate scores. Mitigation: Add a language detection step (using langdetect) and skip or flag non-English comments.  
•       **No historical backfill guarantee: **Instagram and Apify may not return the full comment history for very old posts. Expect reliable data for posts within the last 30 to 90 days.  
•       **Firestore query limitations: **Firestore does not support full-text search, joins, or GROUP BY operations. Complex analytical queries must be pre-computed and stored as aggregation documents.  
   
**Recommended Mitigations Summary**  

| Risk | Probability | Impact | Mitigation |
| ------------------- | ----------- | ------ | ---------------------------------------------------------- |
| Instagram blocking | Medium | High | Throttle scraping, use Apify proxy rotation |
| Free tier exceeded | Medium | Medium | Pre-aggregate, cache aggressively, monitor quotas |
| Sentiment accuracy | High | Medium | Combine VADER + NRCLex, add human review for flagged items |
| Memory issues | Low | High | Use lightweight models, monitor RAM, scale VPS if needed |
| Apify schema change | Low | Medium | Defensive parsing, pin actor versions |
  
   
This architecture is designed to be modular. Each component (collection, analysis, storage, visualization, alerting) can be independently upgraded or replaced as the system scales. Start with the free tier, validate the analysis quality, and scale infrastructure only when the insights justify the cost.  
