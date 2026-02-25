# Created: 2026-02-25 00:00
"""
DigitCNN model + preprocessing logic.
Ported from ../digit_recognizer.py — identical architecture and preprocessing.
"""

import os
import numpy as np
from PIL import Image
from scipy.ndimage import center_of_mass, shift as nd_shift

import torch
import torch.nn as nn

MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'digit_cnn.pth')


class DigitCNN(nn.Module):
    """
    LeNet-style CNN.
    Input : (B, 1, 28, 28) float32 in [0, 1]
    Output: (B, 10) log-probabilities
    """
    def __init__(self):
        super().__init__()
        self.features = nn.Sequential(
            # Block 1
            nn.Conv2d(1, 32, 3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.Conv2d(32, 32, 3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Dropout2d(0.25),
            # Block 2
            nn.Conv2d(32, 64, 3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.Conv2d(64, 64, 3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Dropout2d(0.25),
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64 * 7 * 7, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.5),
            nn.Linear(256, 10),
        )

    def forward(self, x):
        return self.classifier(self.features(x))

    def predict_proba(self, x: np.ndarray) -> np.ndarray:
        self.eval()
        with torch.no_grad():
            t   = torch.from_numpy(x).float()
            out = torch.softmax(self(t), dim=1)
        return out.numpy()


def load_model() -> DigitCNN:
    model = DigitCNN()
    model.load_state_dict(torch.load(MODEL_PATH, map_location='cpu', weights_only=True))
    model.eval()
    return model


def preprocess(img_array: np.ndarray) -> np.ndarray | None:
    """
    Convert grayscale 2-D array (H×W) → (1, 1, 28, 28) float32.

    Steps (identical to desktop version):
    1. Crop to bounding box
    2. Scale longer side to 20 px (MNIST convention)
    3. Embed in 28×28 frame
    4. Center-of-mass shift
    5. Normalise to [0, 1]
    """
    rows = np.any(img_array > 0, axis=1)
    cols = np.any(img_array > 0, axis=0)
    if not rows.any():
        return None

    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    cropped = img_array[rmin:rmax + 1, cmin:cmax + 1].astype(np.float32)

    h, w   = cropped.shape
    scale  = 20.0 / max(h, w)
    nh, nw = max(1, int(h * scale)), max(1, int(w * scale))
    resized = np.array(
        Image.fromarray(cropped).resize((nw, nh), Image.LANCZOS),
        dtype=np.float32,
    )

    frame = np.zeros((28, 28), dtype=np.float32)
    y0    = (28 - nh) // 2
    x0    = (28 - nw) // 2
    frame[y0:y0 + nh, x0:x0 + nw] = resized

    cy, cx  = center_of_mass(frame)
    shift_y = 14.0 - cy
    shift_x = 14.0 - cx
    frame   = nd_shift(frame, [shift_y, shift_x], cval=0.0)

    arr = (frame / 255.0).astype(np.float32)
    return arr.reshape(1, 1, 28, 28)
