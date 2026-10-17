# Dataset Augmentation Studio

A polished, local web application for augmenting computer-vision datasets with YOLO bounding-box annotations.

![AugmentStudio Screenshot](./docs/screenshot.png)

---

## Features

| Section | What it does |
|---------|-------------|
| **Dataset Selection** | Browse to your dataset root, validate structure, scan statistics |
| **Dataset Inspector** | Navigate images, preview bounding boxes, inspect raw YOLO annotations, see class distribution |
| **Augmentation Panel** | Toggle-able panel with 9 transformations (H-flip, V-flip, Rotation, 360° Rotation, Shear, Crop, Zoom, Cutout, Mosaic) |
| **Preview** | Side-by-side original vs augmented with overlaid boxes and updated YOLO text |
| **Output & Generation** | Estimated output count, real-time progress, error log |

---

## Requirements

| Tool | Minimum version |
|------|----------------|
| Python | 3.9+ |
| Node.js | 18+ |
| npm | 9+ |

---

## Windows Setup & Launch

### 1. Clone / download the project

```
git clone <repo-url>
cd Augmentation
```

### 2. Set up the Python backend

```powershell
cd backend
pip install fastapi uvicorn python-multipart opencv-python numpy pillow aiofiles
```

> **Tip:** Use a virtual environment to avoid dependency conflicts:
> ```powershell
> python -m venv .venv
> .venv\Scripts\activate
> pip install fastapi uvicorn python-multipart opencv-python numpy pillow aiofiles
> ```

### 3. Set up the React frontend

```powershell
cd ..\frontend
npm install
```

---

## Running the Application

You need **two terminal windows** (or use the helper script below).

### Terminal 1 — Backend

```powershell
cd backend
python main.py
```

The API starts at `http://127.0.0.1:8000`.  
Docs available at `http://127.0.0.1:8000/docs`.

### Terminal 2 — Frontend

```powershell
cd frontend
npm run dev
```

Open your browser at **http://localhost:5173**.

### Quick-launch script (Windows)

Double-click `start.bat` in the project root to launch both servers at once:

```bat
start.bat
```

---

## Dataset Structure

The tool expects:

```
my_dataset/
├── images/
│   ├── img_001.jpg
│   ├── img_002.png
│   └── ...
├── labels/
│   ├── img_001.txt
│   ├── img_002.txt
│   └── ...
└── classes.txt   (optional — one class name per line)
```

**YOLO annotation format** (one object per line):
```
<class_id> <cx> <cy> <width> <height>
```
All values normalized to `[0, 1]`.

---

## Augmentations

| Transform | Parameters |
|-----------|-----------|
| Horizontal Flip | — |
| Vertical Flip | — |
| Rotation | Angle (−180° … 180°) |
| 360° Rotation | Interval count X → generates X−1 images at angles 360/X, 2·360/X, … |
| Shear | Shear X, Shear Y |
| Crop | Crop X margin, Crop Y margin |
| Zoom | Scale factor (0.5 … 2.5) |
| Cutout | Number of holes, hole size |
| Mosaic | — (self 2×2 mosaic) |

---

## Output

Augmented images and labels are written to the output folder in the **same structure** as the input:

```
augmented_dataset/
├── images/
│   ├── img_001.jpg          ← original (if "Preserve originals" is checked)
│   ├── img_001_fliph.jpg
│   ├── img_001_rot30.jpg
│   └── ...
├── labels/
│   ├── img_001.txt
│   ├── img_001_fliph.txt
│   └── ...
└── classes.txt
```

**Original files are never overwritten.**

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| "Backend offline" banner | Start `python main.py` in the `backend/` directory |
| `ModuleNotFoundError: cv2` | Run `pip install opencv-python` |
| Port 8000 already in use | Change port in `backend/main.py` → `uvicorn.run(app, port=XXXX)` |
| Port 5173 already in use | Run `npm run dev -- --port 5174` |
| Empty image list after scan | Check that your dataset has an `images/` subdirectory |

---

## Architecture

```
Augmentation/
├── backend/
│   ├── main.py          ← FastAPI server, API endpoints
│   └── augmentation.py  ← Pure image processing algorithms (no UI/API coupling)
├── frontend/
│   ├── src/
│   │   ├── api.ts                    ← Typed API client
│   │   ├── App.tsx                   ← Root component, shared state
│   │   └── components/
│   │       ├── ui.tsx                ← Reusable UI primitives
│   │       ├── DatasetSelection.tsx
│   │       ├── DatasetInspector.tsx
│   │       ├── AugmentationPanel.tsx
│   │       ├── PreviewPanel.tsx
│   │       └── OutputPanel.tsx
│   └── vite.config.ts
├── start.bat            ← Windows quick-launch
└── README.md
```
