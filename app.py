import sys
import json
import os
from PIL import Image
import google.generativeai as genai
import traceback
import dotenv
import io
import base64

# Load environment variables from .env file
dotenv.load_dotenv()

def analyze_image(image_path):
    try:
        # Open and validate the image
        image = Image.open(image_path)
        
        # Convert image to bytes for API processing
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format=image.format or 'JPEG')
        img_bytes = img_byte_arr.getvalue()
        
        # Initialize Gemini API with key from environment variable
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return {"error": "GEMINI_API_KEY not found in environment variables"}
        
        genai.configure(api_key=api_key)
        
        # Select the correct model name - gemini-pro-vision instead of gemini-flash-2.0
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Create a prompt for image analysis
        prompt = """
        Analyze this image and provide:
        1. A detailed description of what you see
        2. The main category of content (Product, Nature, People, Technology, etc.)
        3. Any patterns visible
        4. The overall sentiment or mood
        5. Dominant colors
        
        Format your response as JSON with the following structure:
        {
            "original_caption": "brief factual description",
            "detailed_description": "longer analysis",
            "category": "primary category",
            "colors": ["color1", "color2"],
            "patterns": ["pattern1", "pattern2"] or [],
            "sentiment": "Positive/Neutral/Negative"
        }
        """
        
        # Process image with Gemini
        response = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": img_bytes}])
        
        # Try to parse the response as JSON
        try:
            # Extract just the JSON part from the response
            response_text = response.text
            
            # Find JSON object in the response (if wrapped in code blocks or other text)
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                analysis_result = json.loads(json_str)
                
                # Ensure all required fields are present
                required_fields = ["original_caption", "detailed_description", "category", "colors", "patterns", "sentiment"]
                for field in required_fields:
                    if field not in analysis_result:
                        analysis_result[field] = "" if field != "colors" and field != "patterns" else []
                
                # Format the output as requested - a formal description without stars
                formal_caption = analysis_result.get("detailed_description", "")
                analysis_result["description"] = formal_caption
                
                return analysis_result
            else:
                # If JSON parsing fails, create a structured response from the text
                return {
                    "description": response.text,
                    "original_caption": response.text[:100] + "...",
                    "category": "Other",
                    "colors": [],
                    "sentiment": "Neutral",
                    "patterns": []
                }
                
        except json.JSONDecodeError:
            # If JSON parsing fails, create a structured response from the text
            return {
                "description": response.text,
                "original_caption": response.text[:100] + "...",
                "category": "Other",
                "colors": [],
                "sentiment": "Neutral",
                "patterns": []
            }
            
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}

if __name__ == "__main__":
    try:
        # Check if an image path was provided as a command-line argument
        if len(sys.argv) > 1:
            image_path = sys.argv[1]
        else:
            # For server integration, exit with an error if no argument is provided
            result = {"error": "No image path provided"}
            print(json.dumps(result))
            sys.exit(1)
        
        # Check if the file exists
        if not os.path.exists(image_path):
            result = {"error": f"The file '{image_path}' does not exist"}
            print(json.dumps(result))
            sys.exit(1)
        
        # Process the image and return the result
        result = analyze_image(image_path)
        print(json.dumps(result))
        
    except Exception as e:
        # Always return a valid JSON object even when an error occurs
        error_result = {"error": str(e), "traceback": traceback.format_exc()}
        print(json.dumps(error_result))
        sys.exit(1)