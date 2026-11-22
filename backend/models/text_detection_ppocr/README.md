# Bounded text-detection model

text_detection_en_ppocrv3_2023may.onnx is the PP-OCRv3 English scene-text
detection model (DB architecture) exported by OpenCV Zoo, Apache-2.0 licensed
(see LICENSE; model card: https://github.com/opencv/opencv_zoo). SHA-256:
03f550c6b406fda8bf54bd8327815f6c7e2edd98cea02348c93d879254366587 (pinned and
verified at load in backend/photo_text.py). Used for text-REGION detection
only — never OCR, recognition, identity or content reading — to screen member
photos for prominent overlaid text/watermarks before staff review. Telugu
overlay detection is empirical (region shapes, not language recognition).
