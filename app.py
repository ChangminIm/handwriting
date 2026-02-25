# Created: 2026-02-25 00:00
"""
FastAPI server for the handwritten digit recognizer web version.
Serves the HTML/CSS/JS frontend and exposes POST /predict.
"""

import base64
import io
import os

import numpy as np
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydantic import BaseModel

from model import load_model, preprocess

app = FastAPI(title="Handwritten Digit Recognizer")

print("Loading model...")
_model = load_model()
print("Model ready - server starting.")


class PredictRequest(BaseModel):
    image: str  # data:image/png;base64,...


@app.post("/predict")
async def predict(req: PredictRequest):
    # Strip data-URL header if present
    encoded = req.image.split(',', 1)[1] if ',' in req.image else req.image
    img_bytes = base64.b64decode(encoded)

    img = Image.open(io.BytesIO(img_bytes)).convert('L')
    arr = np.array(img, dtype=np.float32)

    X = preprocess(arr)
    if X is None:
        return {"digit": -1, "confidence": 0.0, "probabilities": [0.0] * 10}

    probs      = _model.predict_proba(X)[0]
    digit      = int(probs.argmax())
    confidence = float(probs[digit])

    return {
        "digit":         digit,
        "confidence":    round(confidence * 100, 1),
        "probabilities": [round(float(p) * 100, 1) for p in probs],
    }


# Static files must be mounted AFTER API routes
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
