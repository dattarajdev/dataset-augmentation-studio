# Dataset Augmentation Studio

A local, full-stack desktop web application for inspecting and augmenting computer-vision datasets with YOLO bounding-box annotations.

Built with a **FastAPI** Python backend and a **React + TypeScript + Vite + Tailwind CSS** frontend, Dataset Augmentation Studio runs entirely offline on your local machine, preserving data privacy and allowing fast iterations on object detection datasets.

---

## Table of Contents
1. [Project Overview & Features](#project-overview--features)
2. [Prerequisites](#prerequisites)
3. [Clone the Repository](#clone-the-repository)
4. [Backend Setup (FastAPI)](#backend-setup-fastapi)
5. [Frontend Setup (React + Vite)](#frontend-setup-react--vite)
6. [Running the Full Application](#running-the-full-application)
   - [Option A: One-Click Quick Launch (`start.bat`)](#option-a-one-click-quick-launch-startbat)
   - [Option B: Manual Startup in Two Terminals](#option-b-manual-startup-in-two-terminals)
7. [Dataset Preparation & YOLO Format](#dataset-preparation--yolo-format)
8. [Available Augmentation Operations](#available-augmentation-operations)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Portability, Git Safety & Multi-Machine Workflows](#portability-git-safety--multi-machine-workflows)
11. [Project Structure](#project-structure)

---

## Project Overview & Features

Dataset Augmentation Studio enables computer vision engineers to easily balance, multiply, and stress-test YOLO-formatted datasets without uploading images to cloud services or writing custom OpenCV boilerplate scripts.

### Implemented Features
- **Local Dataset Selection & Path Configuration**: Specify local absolute directory paths for input dataset and target output folder.
- **Automated Structure & Annotation Validation**: Scans and verifies `images/` and `labels/` subdirectories, highlights missing label files, flags malformed YOLO lines, and verifies coordinate constraints ($0 \le cx, cy, w, h \le 1$).
- **Dataset Inspector**:
  - Image list with validation badges and search/filtering.
  - Interactive bounding-box overlay drawn with class-specific colors.
  - Raw YOLO text inspection alongside rendered image dimensions.
  - Class distribution histogram/counter based on detected class IDs or names from `classes.txt`.
- **9 Geometric & Occlusion Augmentations**:
  - Horizontal Flip (`flip_h`)
  - Vertical Flip (`flip_v`)
  - Continuous Rotation (`rotate`) with angle slider ($-180^\circ$ to $+180^\circ$)
  - 360° Multi-Angle Rotation (`rotate360`) dividing full circles into $N$ rotations
  - Affine Shear (`shear`) along X and Y axes
  - Bounding Margin Crop (`crop`)
  - Scale / Zoom (`zoom`)
  - Random Cutout Occlusion (`cutout`)
  - 2×2 Mosaic Synthesis (`mosaic`)
- **Interactive Side-by-Side Live Preview**: Compare original image and bounding boxes against augmented output in real time before running batch exports.
- **Batch Export & Background Job Runner**:
  - Asynchronous dataset generation with live progress bar and status polling.
  - Option to preserve original images in the output folder.
  - Automatic `classes.txt` replication.
  - Exported dataset is written with the identical YOLO structure (`images/` and `labels/`).
- **REST API & Swagger Documentation**: Auto-generated interactive API docs served by FastAPI.

### Current Limitations & Planned Features
- **Input Directory Layout**: The backend expects a direct `images/` and `labels/` folder layout under the dataset root. Nested split folders (`train/images`, `val/images`) require pointing to each split individually.
- **Native OS File Dialog**: Paths are currently entered as local system paths into the input fields (native OS file dialog picker integration is planned for future desktop packaging).

---

## Prerequisites

Ensure the following tools are installed on your Windows machine:

| Component | Required Version | Verification Command | Notes |
|-----------|------------------|----------------------|-------|
| **OS** | Windows 10 or 11 (64-bit) | `winver` | Tested on Windows PowerShell |
| **Python** | Python 3.9 – 3.12 (Recommended: 3.11) | `python --version` or `py --version` | Python 3.14+ may have binary wheel compatibility issues with certain pre-built OpenCV wheels. |
| **Node.js** | Node.js 18.x or 20.x+ | `node --version` | Required to build and serve the React application. |
| **npm** | npm 9.x or 10.x+ | `npm --version` | Bundled with Node.js. |
| **Git** | Git for Windows 2.x+ | `git --version` | Required to clone and track changes. |

---

## Clone the Repository

Open PowerShell or Windows Terminal and run:

```powershell
git clone https://github.com/dattarajdev/dataset-augmentation-studio.git
cd dataset-augmentation-studio
```

*(If you are working inside a directory named `Augmentation`, change into `cd Augmentation`).*

---

## Backend Setup (FastAPI)

The backend handles image transformations, OpenCV bounding-box calculations, and file I/O.

### 1. Enter the `backend/` directory
```powershell
cd backend
```

### 2. Create a Python Virtual Environment
Creating a virtual environment ensures dependencies do not conflict with other system packages:

```powershell
python -m venv .venv
```
*(If you have multiple Python versions installed via the Windows Python Launcher, you can explicitly specify Python 3.11: `py -3.11 -m venv .venv`)*

### 3. Activate the Virtual Environment
```powershell
.venv\Scripts\Activate.ps1
```
> **Note on PowerShell Script Execution Policy**: If you receive `PSSecurityException` or `Execution_Policies` errors when activating, run:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

### 4. Install Dependencies
Dependencies are listed in `backend/requirements.txt`:

```powershell
pip install -r requirements.txt
```

The core backend dependencies are:
- `fastapi` & `uvicorn` (ASGI web framework and HTTP server)
- `opencv-python` (Computer vision algorithms, bounding box rendering, affine matrices)
- `numpy` (Tensor and coordinate math)
- `pillow` (Image decoding and format conversion)
- `aiofiles` & `python-multipart` (Async file handling)

### 5. Start the Backend Server
```powershell
python main.py
```

The server initializes on `http://127.0.0.1:8000`.

- **Health Check Endpoint**: `http://127.0.0.1:8000/api/health`
- **Interactive Swagger Documentation**: `http://127.0.0.1:8000/docs`
- **OpenAPI JSON Spec**: `http://127.0.0.1:8000/openapi.json`

---

## Frontend Setup (React + Vite)

The frontend is a single-page React 19 application built with TypeScript, Vite 8, and Tailwind CSS.

### 1. Open a new PowerShell terminal and navigate to `frontend/`
```powershell
cd frontend
```

### 2. Install Dependencies with `npm ci`
Use `npm ci` to install the exact locked dependency tree:

```powershell
npm ci
```
*(Alternatively, use `npm install` if initializing for the first time).*

### 3. Start the Vite Development Server
```powershell
npm run dev
```

Vite will start the development server and print:
```text
  VITE v8.3.4  ready in 250 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

Vite includes a pre-configured reverse proxy in `vite.config.ts` forwarding `/api/*` requests to `http://127.0.0.1:8000`, eliminating CORS issues during development.

### 4. Building for Production (Optional)
To verify compilation or create a production distribution:
```powershell
npm run build
```
This runs TypeScript checking (`tsc -b`) and generates production bundles into `frontend/dist/`. You can preview the production bundle locally with:
```powershell
npm run preview
```

---

## Running the Full Application

### Option A: One-Click Quick Launch (`start.bat`)
For convenience on Windows, a `start.bat` launcher is provided in the project root:

1. Double-click `start.bat` in Windows File Explorer, or run in terminal:
   ```cmd
   .\start.bat
   ```
2. The launcher performs automated environment verification:
   - Verifies Python and Node/npm installations.
   - Detects and activates `backend\.venv` if present (or falls back cleanly to system Python).
   - Spawns two independent console windows:
     - **AugmentStudio - Backend** (`http://127.0.0.1:8000`)
     - **AugmentStudio - Frontend** (`http://localhost:5173`)
   - Automatically opens your default web browser at `http://localhost:5173`.

### Option B: Manual Startup in Two Terminals
If you prefer running services manually for debugging:

1. **Terminal 1 (Backend)**:
   ```powershell
   cd backend
   .venv\Scripts\Activate.ps1
   python main.py
   ```
2. **Terminal 2 (Frontend)**:
   ```powershell
   cd frontend
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser. The header indicator will turn green with **Backend online**.

---

## Dataset Preparation & YOLO Format

### Expected Directory Layout
The application expects datasets formatted according to the standard YOLO object detection convention:

```text
my_dataset/
├── images/
│   ├── image_001.jpg
│   ├── image_002.png
│   └── ...
├── labels/
│   ├── image_001.txt
│   ├── image_002.txt
│   └── ...
└── classes.txt          <-- (Optional but recommended)
```

### File Matching Rules
- Every image in `images/` must have a corresponding `.txt` file in `labels/` sharing the **exact same filename stem**.
  - Example: `images/frame_042.jpg` matches `labels/frame_042.txt`.
- Images without a matching label are highlighted as "Missing labels" in the validation overview.
- Images with zero annotations can have an empty `.txt` file.

### YOLO Annotation Line Format
Each line in a `.txt` label file represents one labeled bounding box:

```text
<class_id> <x_center> <y_center> <width> <height>
```

#### Example `labels/image_001.txt`:
```text
0 0.5234 0.6120 0.2450 0.3120
1 0.1200 0.3400 0.0850 0.1420
```

#### Coordinate Specifications:
- `class_id`: Zero-based integer index corresponding to the class name ($0, 1, 2, \dots$).
- `x_center`, `y_center`: The horizontal and vertical center of the bounding box, normalized by image width and height ($0.0 \le x, y \le 1.0$).
- `width`, `height`: The box width and height, normalized by image width and height ($0.0 < w, h \le 1.0$).

### Class Names File (`classes.txt`)
If `classes.txt` (or `obj.names`, `data.yaml`) is present in the dataset root directory, the class names are loaded line-by-line and mapped to integer IDs ($0 \rightarrow \text{line 1}, 1 \rightarrow \text{line 2}$). If omitted, raw numeric class indices are displayed.

---

## Available Augmentation Operations

All transformations recalculate the bounding box coordinates and clip or discard bounding boxes that fall outside the image canvas:

| Transformation | Type ID | Parameters | Description |
|----------------|---------|------------|-------------|
| **Horizontal Flip** | `flip_h` | None | Mirrors image across the vertical axis ($x' = 1 - x$). |
| **Vertical Flip** | `flip_v` | None | Inverts image across the horizontal axis ($y' = 1 - y$). |
| **Continuous Rotation** | `rotate` | `angle` ($-180^\circ$ to $+180^\circ$) | Rotates image around center; recalculates rotated bounding box hulls. |
| **360° Rotation** | `rotate360` | `count` ($N$ intervals) | Generates $N-1$ evenly spaced angular rotations ($360^\circ / N, 2 \times 360^\circ / N, \dots$). |
| **Affine Shear** | `shear` | `shear_x` ($-0.5$ to $0.5$), `shear_y` ($-0.5$ to $0.5$) | Applies directional skew matrix to image and vertices. |
| **Margin Crop** | `crop` | `crop_x` ($0$ to $0.4$), `crop_y` ($0$ to $0.4$) | Inward boundary cropping with canvas rescaling. |
| **Scale / Zoom** | `zoom` | `scale` ($0.5$ to $2.0$) | Digital zoom or shrink with boundary clamping. |
| **Cutout Occlusion** | `cutout` | `num_holes` ($1$ to $8$), `hole_size` ($0.05$ to $0.3$) | Inserts random zero-fill rectangular occlusions to improve robustness. |
| **2×2 Mosaic** | `mosaic` | None | Combines 4 synthesized quadrants into a multi-scale single image. |

### Generated Dataset Output
When generating the output, the target folder will contain:
```text
augmented_output/
├── images/
│   ├── image_001.jpg            <-- Original (if "Preserve Originals" enabled)
│   ├── image_001_fliph.jpg      <-- Augmented
│   ├── image_001_rot45.jpg      <-- Augmented
│   └── ...
├── labels/
│   ├── image_001.txt
│   ├── image_001_fliph.txt
│   ├── image_001_rot45.txt
│   └── ...
└── classes.txt                  <-- Copied or generated
```
*Original dataset files are strictly read-only and never modified or overwritten.*

---

## Troubleshooting Guide

### 1. "Python is not recognized as an internal or external command"
- **Cause**: Python was not added to your system `PATH` environment variable during installation.
- **Solution**:
  - Re-run the Python installer, check **"Add python.exe to PATH"**, and click **Modify**.
  - Alternatively, invoke the Windows Python Launcher directly: `py -m venv .venv`.

### 2. "npm is not recognized"
- **Cause**: Node.js is not installed or the command prompt has not refreshed its environment paths.
- **Solution**: Install Node.js from [nodejs.org](https://nodejs.org/). Restart your PowerShell terminal after installation.

### 3. Backend Dependency Errors (`ModuleNotFoundError: cv2` or `fastapi`)
- **Cause**: The terminal is using the global Python environment instead of the virtual environment where packages were installed.
- **Solution**:
  ```powershell
  cd backend
  .venv\Scripts\Activate.ps1
  pip install -r requirements.txt
  ```

### 4. PowerShell Execution Policy Restriction (`cannot be loaded because running scripts is disabled`)
- **Cause**: Windows PowerShell restricts running unsigned activation scripts by default.
- **Solution**: Run this command once in PowerShell:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

### 5. Port Conflicts
- **Port 8000 (Backend already in use)**:
  - Check for lingering processes: `Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process`
  - Or edit `backend/main.py` line 647: change `port=8000` to `port=8001`, and update the proxy in `frontend/vite.config.ts`.
- **Port 5173 (Frontend already in use)**:
  - Vite will automatically suggest port 5174, or specify: `npm run dev -- --port 5174`.

### 6. "Backend Offline" Banner in the Frontend
- Ensure the backend console is active and shows `Application startup complete.`
- Test the health endpoint directly in your browser: `http://127.0.0.1:8000/api/health`.
- If using an unconventional local proxy, verify `vite.config.ts` target matches the FastAPI server port (`http://127.0.0.1:8000`).

### 7. "No 'images' subdirectory found in dataset root"
- The scanner requires the dataset directory to explicitly contain an `images/` directory. Ensure your path points to the root enclosing `images/` and `labels/` (e.g. `C:\data\birds`, NOT `C:\data\birds\images`).

---

## Portability, Git Safety & Multi-Machine Workflows

When cloning this project onto an internship laptop, university computer, or cloud workstation:

### Why Datasets and Virtual Environments Are Not in Git
The repository's `.gitignore` explicitly excludes:
- `node_modules/` (Frontend dependencies; reinstalled with `npm ci`)
- `.venv/` and `__pycache__/` (Python environment; recreated per machine architecture)
- `datasets/`, `outputs/`, `test-dataset/`, `augmented-dataset/` (Local datasets can be gigabytes in size and contain proprietary data)

### Selecting a Dataset on Another Machine
1. When you clone the repository onto another computer, your local dataset files will not be present.
2. Copy your dataset folder anywhere onto the target laptop (e.g., `C:\Users\YourName\Datasets\my_project`).
3. In the AugmentStudio UI, enter the absolute path to that dataset in the **Input Dataset Folder** box.
4. Specify an empty output directory (e.g., `C:\Users\YourName\Datasets\my_project_augmented`).
5. Click **Scan Dataset**. The application works entirely with your local filesystem paths.

---

## Project Structure

```text
Augmentation/
├── backend/
│   ├── main.py              # FastAPI application, route handlers, background worker
│   ├── augmentation.py      # Core OpenCV transformation logic & YOLO bbox math
│   └── requirements.txt     # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # UI sections: DatasetSelection, Inspector, Augmentation, Preview, Output
│   │   ├── api.ts           # Axios client with TypeScript interfaces
│   │   ├── App.tsx          # Top navigation, status indicator, state coordination
│   │   ├── App.css          # App-specific animations & styles
│   │   ├── index.css        # Tailwind CSS imports & global design tokens
│   │   └── main.tsx         # React application entry point
│   ├── package.json         # Frontend dependencies and scripts
│   ├── package-lock.json    # Deterministic dependency lockfile
│   ├── vite.config.ts       # Vite configuration & backend /api reverse proxy
│   └── index.html           # HTML5 shell
├── .gitignore               # Ignored environments, build artifacts, and local datasets
├── start.bat                # Windows automated dual-server launcher
└── README.md                # Comprehensive project documentation
```
