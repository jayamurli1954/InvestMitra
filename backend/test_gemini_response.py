# Quick Test - Does Gemini Respond to Simple Prompts?
# Run this to verify Gemini works with basic requests

from dotenv import load_dotenv
import os
from google import genai

load_dotenv()

client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

print("\n" + "="*60)
print("TESTING GEMINI WITH SIMPLE PROMPT")
print("="*60)

# Test 1: Super simple prompt
print("\n🧪 Test 1: Simple text generation")
try:
    response = client.models.generate_content(
        model='models/gemini-2.5-flash',
        contents='Write a 2-sentence summary of portfolio diversification.'
    )
    
    print(f"✅ Response type: {type(response)}")
    print(f"✅ Has .text: {hasattr(response, 'text')}")
    
    if hasattr(response, 'text') and response.text:
        print(f"✅ Response via .text: {response.text}")
    elif hasattr(response, 'candidates'):
        print(f"✅ Candidates: {len(response.candidates)}")
        if response.candidates:
            candidate = response.candidates[0]
            print(f"   Finish reason: {candidate.finish_reason}")
            if hasattr(candidate, 'content'):
                if hasattr(candidate.content, 'parts'):
                    text = candidate.content.parts[0].text
                    print(f"✅ Response via candidates: {text}")
    else:
        print(f"❌ Could not extract text from response")
        print(f"   Response: {response}")
        
except Exception as e:
    print(f"❌ Error: {e}")

# Test 2: JSON response
print("\n🧪 Test 2: JSON generation")
try:
    response = client.models.generate_content(
        model='models/gemini-2.5-flash',
        contents='Return JSON: {"status": "working", "message": "Hello"}'
    )
    
    if hasattr(response, 'text') and response.text:
        print(f"✅ JSON Response: {response.text}")
    else:
        print(f"❌ No text in response")
        
except Exception as e:
    print(f"❌ Error: {e}")

# Test 3: With system instruction
print("\n🧪 Test 3: With config")
try:
    from google.genai import types
    
    response = client.models.generate_content(
        model='models/gemini-2.5-flash',
        contents='Say OK',
        config=types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=100
        )
    )
    
    if hasattr(response, 'text') and response.text:
        print(f"✅ Config test: {response.text}")
    else:
        print(f"❌ No response with config")
        
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "="*60)
print("TESTS COMPLETE")
print("="*60 + "\n")
