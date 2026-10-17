"""
Dataset Augmentation Studio - FastAPI Backend
Handles dataset scanning, validation, preview, and augmentation generation.
"""

import os
import re
import math
import base64
import asyncio
import traceback
from pathlib import Path
from typing import List, Optional, Dict, Any
from concurrent.futures import ThreadPoolExecutor

import cv2
import numpy as np
from PIL import Image
import aiofiles
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from augmentation import apply_augmentation, YoloBox

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="Dataset Augmentation Studio", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173",
                   "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

executor = ThreadPoolExecutor(max_workers=4)

# ---------------------------------------------------------------------------
# In-memory job state
# ---------------------------------------------------------------------------

generation_jobs: Dict[str, Dict[str, Any]] = {}

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SUPPORTED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".webp"}

BOX_COLORS = [
    (59, 130, 246),   # blue
    (34, 197, 94),    # green
    (239, 68, 68),    # red
    (234, 179, 8),    # yellow
    (168, 85, 247),   # purple
    (249, 115, 22),   # orange
    (20, 184, 166),   # teal
    (236, 72, 153),   # pink
]

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ScanRequest(BaseModel):
    dataset_path: str

class ValidationDetail(BaseModel):
    image_name: str
    errors: List[str]

class ScanResponse(BaseModel):
    image_count: int
    label_count: int
    missing_labels: int
    invalid_annotations: int
    class_distribution: Dict[str, int]
    image_files: List[str]
    validation_errors: List[ValidationDetail]
    classes_file: Optional[List[str]] = None

class PreviewRequest(BaseModel):
    dataset_path: str
    image_name: str

class ImagePreviewResponse(BaseModel):
    image_b64: str
    annotation_text: str
    width: int
    height: int
    boxes: List[List[float]]
    validation_errors: List[str]

class AugPreviewRequest(BaseModel):
    dataset_path: str
    image_name: str
    aug_type: str
    params: Dict[str, Any] = {}

class AugPreviewResponse(BaseModel):
    original_b64: str
    augmented_b64: str
    original_width: int
    original_height: int
    augmented_width: int
    augmented_height: int
    original_annotation: str
    augmented_annotation: str
    original_boxes: List[List[float]]
    augmented_boxes: List[List[float]]

class AugmentationConfig(BaseModel):
    type: str
    params: Dict[str, Any] = {}

class GenerateRequest(BaseModel):
    dataset_path: str
    output_path: str
    augmentations: List[AugmentationConfig]
    preserve_originals: bool = True
    create_classes_file: bool = True
    validate_output: bool = True

class GenerateResponse(BaseModel):
    job_id: str

class JobStatusResponse(BaseModel):
    status: str  # running | done | error
    progress: float  # 0-100
    processed: int
    total: int
    errors: List[str]
    output_count: int
    message: str

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def parse_yolo_line(line: str) -> Optional[List[float]]:
    """Parse a single YOLO annotation line. Returns None on failure."""
    parts = line.strip().split()
    if len(parts) != 5:
        return None
    try:
        vals = [float(p) for p in parts]
    except ValueError:
        return None
    return vals


def validate_box(vals: List[float], class_names: Optional[List[str]] = None) -> List[str]:
    """Return list of validation error strings for a YOLO box."""
    errors = []
    cls_id, cx, cy, w, h = vals
    if cls_id != int(cls_id) or cls_id < 0:
        errors.append(f"Invalid class_id={cls_id}")
    if class_names and int(cls_id) >= len(class_names):
        errors.append(f"class_id={int(cls_id)} out of range (have {len(class_names)} classes)")
    for name, val in [("cx", cx), ("cy", cy), ("w", w), ("h", h)]:
        if not (0.0 <= val <= 1.0):
            errors.append(f"{name}={val:.4f} out of [0,1]")
    if w <= 0:
        errors.append(f"w={w:.4f} must be > 0")
    if h <= 0:
        errors.append(f"h={h:.4f} must be > 0")
    return errors


def read_label_file(label_path: Path, class_names: Optional[List[str]]) -> tuple:
    """Return (boxes, raw_text, errors) from a label file."""
    boxes = []
    errors = []
    lines = []
    try:
        with open(label_path, "r") as f:
            lines = f.readlines()
    except Exception as e:
        return [], "", [f"Cannot read label file: {e}"]

    raw_text = "".join(lines)
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        vals = parse_yolo_line(line)
        if vals is None:
            errors.append(f"Line {i+1}: malformed annotation '{line}'")
            continue
        box_errors = validate_box(vals, class_names)
        if box_errors:
            errors.extend([f"Line {i+1}: {e}" for e in box_errors])
        boxes.append(vals)

    return boxes, raw_text, errors


def load_classes(dataset_path: str) -> Optional[List[str]]:
    for name in ["classes.txt", "obj.names", "data.yaml", "data.yml"]:
        p = Path(dataset_path) / name
        if p.exists():
            if name.endswith((".yaml", ".yml")):
                try:
                    import yaml
                    with open(p) as f:
                        data = yaml.safe_load(f)
                    if isinstance(data, dict) and "names" in data:
                        return list(data["names"])
                except Exception:
                    pass
            else:
                with open(p) as f:
                    return [l.strip() for l in f if l.strip()]
    return None


def draw_boxes_on_image(image: np.ndarray, boxes: List[List[float]],
                        class_names: Optional[List[str]] = None,
                        thickness: int = 2) -> np.ndarray:
    H, W = image.shape[:2]
    img = image.copy()
    for box in boxes:
        if len(box) < 5:
            continue
        cls_id = int(box[0])
        cx, cy, bw, bh = box[1], box[2], box[3], box[4]
        x1 = int((cx - bw / 2) * W)
        y1 = int((cy - bh / 2) * H)
        x2 = int((cx + bw / 2) * W)
        y2 = int((cy + bh / 2) * H)
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(W - 1, x2), min(H - 1, y2)

        color = BOX_COLORS[cls_id % len(BOX_COLORS)]
        cv2.rectangle(img, (x1, y1), (x2, y2), color, thickness)

        label = class_names[cls_id] if class_names and cls_id < len(class_names) else str(cls_id)
        label_text = f"{label}"
        (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.rectangle(img, (x1, y1 - th - 4), (x1 + tw + 4, y1), color, -1)
        cv2.putText(img, label_text, (x1 + 2, y1 - 2),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
    return img


def image_to_b64(image: np.ndarray, quality: int = 85) -> str:
    """Convert BGR numpy array to base64 JPEG string."""
    encode_params = [cv2.IMWRITE_JPEG_QUALITY, quality]
    _, buf = cv2.imencode(".jpg", image, encode_params)
    return base64.b64encode(buf.tobytes()).decode("utf-8")


def boxes_to_yolo_text(boxes: List[List[float]]) -> str:
    lines = []
    for box in boxes:
        cls_id = int(box[0])
        lines.append(f"{cls_id} {box[1]:.4f} {box[2]:.4f} {box[3]:.4f} {box[4]:.4f}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/api/scan", response_model=ScanResponse)
async def scan_dataset(req: ScanRequest):
    dataset_path = Path(req.dataset_path)
    if not dataset_path.exists():
        raise HTTPException(status_code=400, detail=f"Path does not exist: {req.dataset_path}")

    images_dir = dataset_path / "images"
    labels_dir = dataset_path / "labels"

    if not images_dir.exists():
        raise HTTPException(status_code=400, detail="No 'images' subdirectory found in dataset root.")

    class_names = load_classes(req.dataset_path)

    image_files = sorted([
        f.name for f in images_dir.iterdir()
        if f.is_file() and f.suffix.lower() in SUPPORTED_IMAGE_EXTS
    ])

    label_count = 0
    missing_labels = 0
    invalid_annotations = 0
    class_distribution: Dict[str, int] = {}
    validation_errors: List[ValidationDetail] = []

    for img_name in image_files:
        stem = Path(img_name).stem
        label_path = labels_dir / f"{stem}.txt" if labels_dir.exists() else None

        if label_path is None or not label_path.exists():
            missing_labels += 1
            continue

        label_count += 1
        boxes, _, errors = read_label_file(label_path, class_names)

        if errors:
            invalid_annotations += len(errors)
            validation_errors.append(ValidationDetail(image_name=img_name, errors=errors))

        for box in boxes:
            cls_id = int(box[0])
            key = class_names[cls_id] if class_names and cls_id < len(class_names) else str(cls_id)
            class_distribution[key] = class_distribution.get(key, 0) + 1

    return ScanResponse(
        image_count=len(image_files),
        label_count=label_count,
        missing_labels=missing_labels,
        invalid_annotations=invalid_annotations,
        class_distribution=class_distribution,
        image_files=image_files,
        validation_errors=validation_errors,
        classes_file=class_names,
    )


@app.post("/api/preview-image", response_model=ImagePreviewResponse)
async def preview_image(req: PreviewRequest):
    dataset_path = Path(req.dataset_path)
    images_dir = dataset_path / "images"
    labels_dir = dataset_path / "labels"

    img_path = images_dir / req.image_name
    if not img_path.exists():
        raise HTTPException(status_code=404, detail=f"Image not found: {req.image_name}")

    image = cv2.imread(str(img_path))
    if image is None:
        raise HTTPException(status_code=400, detail=f"Cannot read image: {req.image_name}")

    H, W = image.shape[:2]
    class_names = load_classes(str(dataset_path))

    stem = Path(req.image_name).stem
    label_path = labels_dir / f"{stem}.txt"

    boxes, raw_text, errors = [], "", []
    if label_path.exists():
        boxes, raw_text, errors = read_label_file(label_path, class_names)

    annotated = draw_boxes_on_image(image, boxes, class_names)

    return ImagePreviewResponse(
        image_b64=image_to_b64(annotated),
        annotation_text=raw_text,
        width=W,
        height=H,
        boxes=boxes,
        validation_errors=errors,
    )


@app.post("/api/preview-augmentation", response_model=AugPreviewResponse)
async def preview_augmentation(req: AugPreviewRequest):
    dataset_path = Path(req.dataset_path)
    images_dir = dataset_path / "images"
    labels_dir = dataset_path / "labels"

    img_path = images_dir / req.image_name
    if not img_path.exists():
        raise HTTPException(status_code=404, detail=f"Image not found: {req.image_name}")

    image = cv2.imread(str(img_path))
    if image is None:
        raise HTTPException(status_code=400, detail=f"Cannot read image: {req.image_name}")

    orig_H, orig_W = image.shape[:2]
    class_names = load_classes(str(dataset_path))

    stem = Path(req.image_name).stem
    label_path = labels_dir / f"{stem}.txt"
    boxes, raw_text, _ = [], "", []
    if label_path.exists():
        boxes, raw_text, _ = read_label_file(label_path, class_names)

    try:
        aug_image, aug_boxes = apply_augmentation(req.aug_type, image, boxes, req.params)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Augmentation error: {e}")

    aug_H, aug_W = aug_image.shape[:2]

    orig_annotated = draw_boxes_on_image(image, boxes, class_names)
    aug_annotated = draw_boxes_on_image(aug_image, aug_boxes, class_names)

    return AugPreviewResponse(
        original_b64=image_to_b64(orig_annotated),
        augmented_b64=image_to_b64(aug_annotated),
        original_width=orig_W,
        original_height=orig_H,
        augmented_width=aug_W,
        augmented_height=aug_H,
        original_annotation=raw_text,
        augmented_annotation=boxes_to_yolo_text(aug_boxes),
        original_boxes=boxes,
        augmented_boxes=aug_boxes,
    )


@app.post("/api/generate", response_model=GenerateResponse)
async def generate_dataset(req: GenerateRequest, background_tasks: BackgroundTasks):
    dataset_path = Path(req.dataset_path)
    output_path = Path(req.output_path)

    if not dataset_path.exists():
        raise HTTPException(status_code=400, detail="Dataset path does not exist.")

    if output_path.resolve() == dataset_path.resolve():
        raise HTTPException(status_code=400, detail="Output path must differ from dataset path.")

    # Check output is not inside source
    try:
        output_path.resolve().relative_to(dataset_path.resolve() / "images")
        raise HTTPException(status_code=400, detail="Output path must not be inside dataset images.")
    except ValueError:
        pass

    import uuid
    job_id = str(uuid.uuid4())
    generation_jobs[job_id] = {
        "status": "running",
        "progress": 0.0,
        "processed": 0,
        "total": 0,
        "errors": [],
        "output_count": 0,
        "message": "Starting...",
    }

    background_tasks.add_task(run_generation, job_id, req)
    return GenerateResponse(job_id=job_id)


@app.get("/api/job/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    job = generation_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return JobStatusResponse(**job)


# ---------------------------------------------------------------------------
# Background generation task
# ---------------------------------------------------------------------------

def expand_augmentations(augmentations: List[AugmentationConfig]) -> List[tuple]:
    """Expand rotate360 into individual angle configs."""
    expanded = []
    for aug in augmentations:
        if aug.type == "rotate360":
            count = int(aug.params.get("count", 4))
            count = max(1, count)
            for i in range(1, count + 1):
                angle = (360.0 / count) * i
                if abs(angle - 360.0) < 1e-6:
                    continue  # skip 360 == 0
                expanded.append(("rotate360", {"angle": angle}))
        else:
            expanded.append((aug.type, aug.params))
    return expanded


async def run_generation(job_id: str, req: GenerateRequest):
    job = generation_jobs[job_id]
    try:
        dataset_path = Path(req.dataset_path)
        output_path = Path(req.output_path)
        images_dir = dataset_path / "images"
        labels_dir = dataset_path / "labels"

        out_images_dir = output_path / "images"
        out_labels_dir = output_path / "labels"
        out_images_dir.mkdir(parents=True, exist_ok=True)
        out_labels_dir.mkdir(parents=True, exist_ok=True)

        class_names = load_classes(str(dataset_path))

        image_files = sorted([
            f for f in images_dir.iterdir()
            if f.is_file() and f.suffix.lower() in SUPPORTED_IMAGE_EXTS
        ])

        expanded_augs = expand_augmentations(req.augmentations)
        total_ops = len(image_files) * len(expanded_augs)
        if req.preserve_originals:
            total_ops += len(image_files)

        job["total"] = total_ops
        job["message"] = f"Processing {len(image_files)} images × {len(expanded_augs)} augmentations..."

        processed = 0
        output_count = 0
        errors = []

        # Copy originals
        if req.preserve_originals:
            for img_path in image_files:
                try:
                    dest_img = out_images_dir / img_path.name
                    import shutil
                    shutil.copy2(img_path, dest_img)
                    output_count += 1

                    stem = img_path.stem
                    label_path = labels_dir / f"{stem}.txt"
                    if label_path.exists():
                        shutil.copy2(label_path, out_labels_dir / label_path.name)
                except Exception as e:
                    errors.append(f"Copy {img_path.name}: {e}")

                processed += 1
                job["processed"] = processed
                job["progress"] = (processed / total_ops) * 100
                job["output_count"] = output_count
                await asyncio.sleep(0)  # yield

        # Apply augmentations
        for img_path in image_files:
            image = cv2.imread(str(img_path))
            if image is None:
                errors.append(f"Cannot read: {img_path.name}")
                processed += len(expanded_augs)
                job["processed"] = processed
                continue

            stem = img_path.stem
            label_path = labels_dir / f"{stem}.txt"
            boxes, _, label_errors = [], "", []
            if label_path.exists():
                boxes, _, label_errors = read_label_file(label_path, class_names)
                if label_errors:
                    errors.extend([f"{img_path.name}: {e}" for e in label_errors])

            for aug_type, params in expanded_augs:
                try:
                    aug_image, aug_boxes = apply_augmentation(aug_type, image, boxes, params)

                    suffix = aug_type
                    if aug_type in ("rotate", "rotate360"):
                        angle = params.get("angle", 0)
                        suffix = f"rot{int(angle)}"
                    elif aug_type == "flip_h":
                        suffix = "fliph"
                    elif aug_type == "flip_v":
                        suffix = "flipv"
                    elif aug_type == "shear":
                        suffix = "shear"
                    elif aug_type == "crop":
                        suffix = "crop"
                    elif aug_type == "zoom":
                        suffix = "zoom"
                    elif aug_type == "cutout":
                        suffix = "cutout"
                    elif aug_type == "mosaic":
                        suffix = "mosaic"

                    out_name = f"{stem}_{suffix}{img_path.suffix}"
                    out_img_path = out_images_dir / out_name
                    out_lbl_path = out_labels_dir / f"{stem}_{suffix}.txt"

                    cv2.imwrite(str(out_img_path), aug_image)
                    with open(out_lbl_path, "w") as f:
                        f.write(boxes_to_yolo_text(aug_boxes))

                    output_count += 1
                except Exception as e:
                    errors.append(f"{img_path.name} [{aug_type}]: {e}")

                processed += 1
                job["processed"] = processed
                job["progress"] = (processed / total_ops) * 100
                job["output_count"] = output_count
                job["errors"] = errors[-50:]  # keep last 50
                await asyncio.sleep(0)

        # Write classes file
        if req.create_classes_file and class_names:
            with open(output_path / "classes.txt", "w") as f:
                f.write("\n".join(class_names))

        job["status"] = "done"
        job["progress"] = 100.0
        job["message"] = f"Complete! Generated {output_count} files."
        job["errors"] = errors

    except Exception as e:
        job["status"] = "error"
        job["message"] = str(e)
        job["errors"] = [traceback.format_exc()]


# ---------------------------------------------------------------------------
# Estimate output count
# ---------------------------------------------------------------------------

class EstimateRequest(BaseModel):
    dataset_path: str
    augmentations: List[AugmentationConfig]
    preserve_originals: bool = True

class EstimateResponse(BaseModel):
    original_count: int
    augmented_count: int
    total_count: int

@app.post("/api/estimate", response_model=EstimateResponse)
async def estimate_output(req: EstimateRequest):
    dataset_path = Path(req.dataset_path)
    images_dir = dataset_path / "images"
    if not images_dir.exists():
        return EstimateResponse(original_count=0, augmented_count=0, total_count=0)

    image_count = sum(
        1 for f in images_dir.iterdir()
        if f.is_file() and f.suffix.lower() in SUPPORTED_IMAGE_EXTS
    )

    expanded = expand_augmentations(req.augmentations)
    aug_count = image_count * len(expanded)
    orig_count = image_count if req.preserve_originals else 0

    return EstimateResponse(
        original_count=image_count,
        augmented_count=aug_count,
        total_count=orig_count + aug_count,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)
