import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
})

// ---- Types ----------------------------------------------------------------

export interface ValidationDetail {
  image_name: string
  errors: string[]
}

export interface ScanResponse {
  image_count: number
  label_count: number
  missing_labels: number
  invalid_annotations: number
  class_distribution: Record<string, number>
  image_files: string[]
  validation_errors: ValidationDetail[]
  classes_file: string[] | null
}

export interface ImagePreviewResponse {
  image_b64: string
  annotation_text: string
  width: number
  height: number
  boxes: number[][]
  validation_errors: string[]
}

export interface AugPreviewResponse {
  original_b64: string
  augmented_b64: string
  original_width: number
  original_height: number
  augmented_width: number
  augmented_height: number
  original_annotation: string
  augmented_annotation: string
  original_boxes: number[][]
  augmented_boxes: number[][]
}

export interface AugmentationConfig {
  type: string
  params: Record<string, unknown>
}

export interface EstimateResponse {
  original_count: number
  augmented_count: number
  total_count: number
}

export interface GenerateResponse {
  job_id: string
}

export interface JobStatusResponse {
  status: 'running' | 'done' | 'error'
  progress: number
  processed: number
  total: number
  errors: string[]
  output_count: number
  message: string
}

// ---- API calls ------------------------------------------------------------

export const scanDataset = (datasetPath: string): Promise<ScanResponse> =>
  api.post('/scan', { dataset_path: datasetPath }).then(r => r.data)

export const previewImage = (datasetPath: string, imageName: string): Promise<ImagePreviewResponse> =>
  api.post('/preview-image', { dataset_path: datasetPath, image_name: imageName }).then(r => r.data)

export const previewAugmentation = (
  datasetPath: string,
  imageName: string,
  augType: string,
  params: Record<string, unknown>
): Promise<AugPreviewResponse> =>
  api.post('/preview-augmentation', {
    dataset_path: datasetPath,
    image_name: imageName,
    aug_type: augType,
    params,
  }).then(r => r.data)

export const estimateOutput = (
  datasetPath: string,
  augmentations: AugmentationConfig[],
  preserveOriginals: boolean
): Promise<EstimateResponse> =>
  api.post('/estimate', {
    dataset_path: datasetPath,
    augmentations,
    preserve_originals: preserveOriginals,
  }).then(r => r.data)

export const generateDataset = (payload: {
  dataset_path: string
  output_path: string
  augmentations: AugmentationConfig[]
  preserve_originals: boolean
  create_classes_file: boolean
  validate_output: boolean
}): Promise<GenerateResponse> =>
  api.post('/generate', payload).then(r => r.data)

export const getJobStatus = (jobId: string): Promise<JobStatusResponse> =>
  api.get(`/job/${jobId}`).then(r => r.data)

export const checkHealth = (): Promise<{ status: string }> =>
  api.get('/health').then(r => r.data)
