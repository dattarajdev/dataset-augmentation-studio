"""
Image augmentation algorithms - kept separate from API/UI code.
All functions accept and return numpy arrays + YOLO annotation lists.
YOLO format: [class_id, cx, cy, w, h] (all normalized 0-1)
"""

import cv2
import numpy as np
from typing import List, Tuple, Optional
import math


YoloBox = List[float]  # [class_id, cx, cy, w, h]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def clip_box(box: YoloBox, min_area_ratio: float = 0.05) -> Optional[YoloBox]:
    """Clip a YOLO box to [0,1] range and discard if too small."""
    cls = box[0]
    cx, cy, w, h = box[1], box[2], box[3], box[4]

    x1 = cx - w / 2
    y1 = cy - h / 2
    x2 = cx + w / 2
    y2 = cy + h / 2

    x1 = max(0.0, min(1.0, x1))
    y1 = max(0.0, min(1.0, y1))
    x2 = max(0.0, min(1.0, x2))
    y2 = max(0.0, min(1.0, y2))

    nw = x2 - x1
    nh = y2 - y1

    if nw * nh < min_area_ratio * box[3] * box[4]:
        return None  # box became too small after clipping

    return [cls, (x1 + x2) / 2, (y1 + y2) / 2, nw, nh]


def yolo_to_abs(box: YoloBox, W: int, H: int) -> Tuple[int, int, int, int]:
    """Convert YOLO box to absolute pixel (x1,y1,x2,y2)."""
    cls, cx, cy, bw, bh = box
    x1 = int((cx - bw / 2) * W)
    y1 = int((cy - bh / 2) * H)
    x2 = int((cx + bw / 2) * W)
    y2 = int((cy + bh / 2) * H)
    return x1, y1, x2, y2


def abs_to_yolo(cls: int, x1: int, y1: int, x2: int, y2: int, W: int, H: int) -> YoloBox:
    cx = ((x1 + x2) / 2) / W
    cy = ((y1 + y2) / 2) / H
    bw = (x2 - x1) / W
    bh = (y2 - y1) / H
    return [float(cls), cx, cy, bw, bh]


# ---------------------------------------------------------------------------
# Flip
# ---------------------------------------------------------------------------

def flip_horizontal(image: np.ndarray, boxes: List[YoloBox]) -> Tuple[np.ndarray, List[YoloBox]]:
    img = cv2.flip(image, 1)
    new_boxes = []
    for box in boxes:
        cls, cx, cy, w, h = box
        new_boxes.append([cls, 1.0 - cx, cy, w, h])
    return img, new_boxes


def flip_vertical(image: np.ndarray, boxes: List[YoloBox]) -> Tuple[np.ndarray, List[YoloBox]]:
    img = cv2.flip(image, 0)
    new_boxes = []
    for box in boxes:
        cls, cx, cy, w, h = box
        new_boxes.append([cls, cx, 1.0 - cy, w, h])
    return img, new_boxes


# ---------------------------------------------------------------------------
# Rotation
# ---------------------------------------------------------------------------

def rotate(image: np.ndarray, boxes: List[YoloBox], angle: float,
           expand_canvas: bool = True) -> Tuple[np.ndarray, List[YoloBox]]:
    """Rotate image and update bounding boxes.
    If expand_canvas is True the output canvas grows to fit the rotated image.
    """
    H, W = image.shape[:2]
    cx_px, cy_px = W / 2, H / 2
    rad = math.radians(-angle)

    M = cv2.getRotationMatrix2D((cx_px, cy_px), angle, 1.0)

    if expand_canvas:
        cos = abs(math.cos(rad))
        sin = abs(math.sin(rad))
        new_W = int(H * sin + W * cos)
        new_H = int(H * cos + W * sin)
        M[0, 2] += (new_W / 2) - cx_px
        M[1, 2] += (new_H / 2) - cy_px
    else:
        new_W, new_H = W, H

    img = cv2.warpAffine(image, M, (new_W, new_H),
                         flags=cv2.INTER_LINEAR,
                         borderMode=cv2.BORDER_CONSTANT,
                         borderValue=(114, 114, 114))

    new_boxes = []
    for box in boxes:
        cls, bcx, bcy, bw, bh = box
        # Convert four corners to absolute
        x1 = (bcx - bw / 2) * W
        y1 = (bcy - bh / 2) * H
        x2 = (bcx + bw / 2) * W
        y2 = (bcy + bh / 2) * H

        corners = np.array([
            [x1, y1, 1], [x2, y1, 1],
            [x1, y2, 1], [x2, y2, 1]
        ], dtype=np.float32)

        rotated = (M @ corners.T).T  # (4,2)
        rx1, ry1 = rotated[:, 0].min(), rotated[:, 1].min()
        rx2, ry2 = rotated[:, 0].max(), rotated[:, 1].max()

        nb = abs_to_yolo(int(cls), int(rx1), int(ry1), int(rx2), int(ry2), new_W, new_H)
        clipped = clip_box(nb)
        if clipped:
            new_boxes.append(clipped)

    return img, new_boxes


# ---------------------------------------------------------------------------
# Shear
# ---------------------------------------------------------------------------

def shear(image: np.ndarray, boxes: List[YoloBox],
          shear_x: float = 0.2, shear_y: float = 0.0) -> Tuple[np.ndarray, List[YoloBox]]:
    H, W = image.shape[:2]
    M = np.float32([[1, shear_x, 0],
                    [shear_y, 1, 0]])
    new_W = int(W + abs(shear_x) * H)
    new_H = int(H + abs(shear_y) * W)
    if shear_x < 0:
        M[0, 2] = abs(shear_x) * H
    if shear_y < 0:
        M[1, 2] = abs(shear_y) * W

    img = cv2.warpAffine(image, M, (new_W, new_H),
                         flags=cv2.INTER_LINEAR,
                         borderMode=cv2.BORDER_CONSTANT,
                         borderValue=(114, 114, 114))

    new_boxes = []
    for box in boxes:
        cls, bcx, bcy, bw, bh = box
        x1 = (bcx - bw / 2) * W
        y1 = (bcy - bh / 2) * H
        x2 = (bcx + bw / 2) * W
        y2 = (bcy + bh / 2) * H

        corners = np.array([[x1, y1, 1], [x2, y1, 1],
                             [x1, y2, 1], [x2, y2, 1]], dtype=np.float32)
        transformed = (M @ corners.T).T
        rx1 = transformed[:, 0].min()
        ry1 = transformed[:, 1].min()
        rx2 = transformed[:, 0].max()
        ry2 = transformed[:, 1].max()

        nb = abs_to_yolo(int(cls), int(rx1), int(ry1), int(rx2), int(ry2), new_W, new_H)
        clipped = clip_box(nb)
        if clipped:
            new_boxes.append(clipped)

    return img, new_boxes


# ---------------------------------------------------------------------------
# Crop
# ---------------------------------------------------------------------------

def crop(image: np.ndarray, boxes: List[YoloBox],
         crop_x: float = 0.1, crop_y: float = 0.1) -> Tuple[np.ndarray, List[YoloBox]]:
    """Crop margins by crop_x (fraction of width) and crop_y (fraction of height)."""
    H, W = image.shape[:2]
    x1 = int(crop_x * W)
    y1 = int(crop_y * H)
    x2 = W - x1
    y2 = H - y1
    img = image[y1:y2, x1:x2]

    new_W = x2 - x1
    new_H = y2 - y1
    new_boxes = []
    for box in boxes:
        cls, bcx, bcy, bw, bh = box
        ax1 = (bcx - bw / 2) * W - x1
        ay1 = (bcy - bh / 2) * H - y1
        ax2 = (bcx + bw / 2) * W - x1
        ay2 = (bcy + bh / 2) * H - y1

        ax1 = max(0, ax1)
        ay1 = max(0, ay1)
        ax2 = min(new_W, ax2)
        ay2 = min(new_H, ay2)

        if ax2 <= ax1 or ay2 <= ay1:
            continue
        nb = abs_to_yolo(int(cls), int(ax1), int(ay1), int(ax2), int(ay2), new_W, new_H)
        clipped = clip_box(nb)
        if clipped:
            new_boxes.append(clipped)

    return img, new_boxes


# ---------------------------------------------------------------------------
# Zoom
# ---------------------------------------------------------------------------

def zoom(image: np.ndarray, boxes: List[YoloBox],
         scale: float = 1.2) -> Tuple[np.ndarray, List[YoloBox]]:
    """Zoom in (scale>1) or out (scale<1). Output size equals input size."""
    H, W = image.shape[:2]
    if scale >= 1.0:
        # Zoom in: crop center then resize back
        new_W = int(W / scale)
        new_H = int(H / scale)
        x1 = (W - new_W) // 2
        y1 = (H - new_H) // 2
        cropped = image[y1:y1 + new_H, x1:x1 + new_W]
        img = cv2.resize(cropped, (W, H))

        new_boxes = []
        for box in boxes:
            cls, bcx, bcy, bw, bh = box
            # Recompute in cropped coords, then normalize
            ax1 = (bcx - bw / 2) * W - x1
            ay1 = (bcy - bh / 2) * H - y1
            ax2 = (bcx + bw / 2) * W - x1
            ay2 = (bcy + bh / 2) * H - y1

            ax1 = max(0, ax1)
            ay1 = max(0, ay1)
            ax2 = min(new_W, ax2)
            ay2 = min(new_H, ay2)

            if ax2 <= ax1 or ay2 <= ay1:
                continue
            nb = abs_to_yolo(int(cls), int(ax1), int(ay1), int(ax2), int(ay2), new_W, new_H)
            clipped = clip_box(nb)
            if clipped:
                new_boxes.append(clipped)
    else:
        # Zoom out: resize to smaller, paste on gray canvas
        new_W = int(W * scale)
        new_H = int(H * scale)
        resized = cv2.resize(image, (new_W, new_H))
        img = np.full((H, W, 3), 114, dtype=np.uint8)
        ox = (W - new_W) // 2
        oy = (H - new_H) // 2
        img[oy:oy + new_H, ox:ox + new_W] = resized

        new_boxes = []
        for box in boxes:
            cls, bcx, bcy, bw, bh = box
            ax1 = int((bcx - bw / 2) * new_W + ox)
            ay1 = int((bcy - bh / 2) * new_H + oy)
            ax2 = int((bcx + bw / 2) * new_W + ox)
            ay2 = int((bcy + bh / 2) * new_H + oy)
            nb = abs_to_yolo(int(cls), ax1, ay1, ax2, ay2, W, H)
            clipped = clip_box(nb)
            if clipped:
                new_boxes.append(clipped)

    return img, new_boxes


# ---------------------------------------------------------------------------
# Cutout
# ---------------------------------------------------------------------------

def cutout(image: np.ndarray, boxes: List[YoloBox],
           num_holes: int = 3, hole_size: float = 0.1) -> Tuple[np.ndarray, List[YoloBox]]:
    """Randomly mask rectangular regions with gray."""
    img = image.copy()
    H, W = img.shape[:2]
    rng = np.random.default_rng(seed=42)

    hw = int(hole_size * W)
    hh = int(hole_size * H)

    for _ in range(num_holes):
        cx = rng.integers(0, W)
        cy = rng.integers(0, H)
        x1 = max(0, cx - hw // 2)
        y1 = max(0, cy - hh // 2)
        x2 = min(W, cx + hw // 2)
        y2 = min(H, cy + hh // 2)
        img[y1:y2, x1:x2] = 114

    return img, boxes  # boxes unchanged; cutout doesn't move objects


# ---------------------------------------------------------------------------
# Mosaic  (4-image mosaic of the same image with slight random crops)
# ---------------------------------------------------------------------------

def mosaic(image: np.ndarray, boxes: List[YoloBox]) -> Tuple[np.ndarray, List[YoloBox]]:
    """Create a 2×2 mosaic from one image (self-mosaic)."""
    H, W = image.shape[:2]
    out_H, out_W = H, W
    rng = np.random.default_rng(seed=42)

    # Cut point (slightly off-center)
    cy = int(out_H * rng.uniform(0.35, 0.65))
    cx = int(out_W * rng.uniform(0.35, 0.65))

    canvas = np.full((out_H, out_W, 3), 114, dtype=np.uint8)
    new_boxes: List[YoloBox] = []

    # Each quadrant: (row, col, dest slice, scale into sub-tile)
    quadrants = [
        (0, 0, (0, cy, 0, cx)),        # top-left
        (0, 1, (0, cy, cx, out_W)),     # top-right
        (1, 0, (cy, out_H, 0, cx)),     # bottom-left
        (1, 1, (cy, out_H, cx, out_W)), # bottom-right
    ]

    for row, col, (dy1, dy2, dx1, dx2) in quadrants:
        tile_H = dy2 - dy1
        tile_W = dx2 - dx1
        tile = cv2.resize(image, (tile_W, tile_H))
        canvas[dy1:dy2, dx1:dx2] = tile

        sx = tile_W / W
        sy = tile_H / H

        for box in boxes:
            cls, bcx, bcy, bw, bh = box
            ax1 = int((bcx - bw / 2) * tile_W + dx1)
            ay1 = int((bcy - bh / 2) * tile_H + dy1)
            ax2 = int((bcx + bw / 2) * tile_W + dx1)
            ay2 = int((bcy + bh / 2) * tile_H + dy1)
            nb = abs_to_yolo(int(cls), ax1, ay1, ax2, ay2, out_W, out_H)
            clipped = clip_box(nb)
            if clipped:
                new_boxes.append(clipped)

    return canvas, new_boxes


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

AUGMENTATION_MAP = {
    "flip_h": flip_horizontal,
    "flip_v": flip_vertical,
    "rotate": rotate,
    "shear": shear,
    "crop": crop,
    "zoom": zoom,
    "cutout": cutout,
    "mosaic": mosaic,
}


def apply_augmentation(aug_type: str, image: np.ndarray,
                       boxes: List[YoloBox], params: dict) -> Tuple[np.ndarray, List[YoloBox]]:
    """Apply a single augmentation by name with given params."""
    if aug_type == "flip_h":
        return flip_horizontal(image, boxes)
    elif aug_type == "flip_v":
        return flip_vertical(image, boxes)
    elif aug_type == "rotate":
        angle = float(params.get("angle", 45))
        return rotate(image, boxes, angle)
    elif aug_type == "rotate360":
        angle = float(params.get("angle", 90))
        return rotate(image, boxes, angle)
    elif aug_type == "shear":
        sx = float(params.get("shear_x", 0.2))
        sy = float(params.get("shear_y", 0.0))
        return shear(image, boxes, sx, sy)
    elif aug_type == "crop":
        cx_ = float(params.get("crop_x", 0.1))
        cy_ = float(params.get("crop_y", 0.1))
        return crop(image, boxes, cx_, cy_)
    elif aug_type == "zoom":
        scale = float(params.get("scale", 1.2))
        return zoom(image, boxes, scale)
    elif aug_type == "cutout":
        holes = int(params.get("num_holes", 3))
        size = float(params.get("hole_size", 0.1))
        return cutout(image, boxes, holes, size)
    elif aug_type == "mosaic":
        return mosaic(image, boxes)
    else:
        raise ValueError(f"Unknown augmentation type: {aug_type}")
