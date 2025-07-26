
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get("OPENROUTER_API_KEY", "")
print(f"API Key present: {bool(api_key)}")
print(f"API Key length: {len(api_key) if api_key else 0}")
print(f"API Key starts with: {api_key[:10]}..." if api_key else "No API key")

# Test basic import
try:
    from utils.openrouter_api import OPENROUTER_API_KEY
    print(f"Import successful, key length in module: {len(OPENROUTER_API_KEY)}")
except Exception as e:
    print(f"Import error: {e}")
