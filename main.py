from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mistralai import Mistral
from pydantic import BaseModel
from mistralai import ImageURLChunk, TextChunk
import base64
import os

from dotenv import load_dotenv
load_dotenv()

class StructuredOCR(BaseModel):
    #file_name: str
    topics: list[str]
    languages: str
    ocr_contents: dict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", 
                   "https://fonts.googleapis.com", 
                   "https://fonts.gstatic.com",
                   "https://webcam-ai-scan.vercel.app",
                   "https://webcam-ai-scan-r2c8zfw71-dassoos-projects.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = os.getenv("MISTRAL_API_KEY")
if not api_key:
    raise ValueError("Mistral API key not found!")
client = Mistral(api_key=api_key)

async def process_image(image_bytes: bytes) -> StructuredOCR:
    """Process image through Mistral OCR pipeline"""
    try:
        encoded_image = base64.b64encode(image_bytes).decode()
        base64_data_url = f"data:image/jpeg;base64,{encoded_image}"

        image_response = client.ocr.process(
            document=ImageURLChunk(image_url=base64_data_url),
            model="mistral-ocr-latest"
        )
        image_ocr_markdown = image_response.pages[0].markdown

        chat_response = client.chat.parse(
            model="pixtral-12b-latest",
            messages=[{
                "role": "user",
                "content": [
                    ImageURLChunk(image_url=base64_data_url),
                    TextChunk(text=(
                        f"OCR result in markdown:\n{image_ocr_markdown}\n\n"
                        "Convert to structured JSON with categorized OCR contents."
                    ))
                ]
            }],
            response_format=StructuredOCR,
            temperature=0
        )

        return chat_response.choices[0].message.parsed
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scan", response_model=StructuredOCR)
async def process_ocr(image: UploadFile = File(...)):
    """Main scanning endpoint for image processing"""
    try:
        if not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Invalid file type")

        image_bytes = await image.read()
        result = await process_image(image_bytes)
        
        return result
        
    except Exception as e:
        #raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Frame processing failed, try again")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
