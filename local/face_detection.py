from ultralytics import YOLO
import os
import numpy as np
import matplotlib.pyplot as plt
import cv2

def Detection_face_YOLO(model_weight, orig_img, device='cpu'):
    
    faces = []

    model = YOLO(model_weight)
    input_img = orig_img

    yolo_results = model.predict(input_img, imgsz=640, conf=0.5, device=device)

    for idx, result in enumerate(yolo_results):
        if result.boxes is None or len(result.boxes) == 0:
            continue

        orig_img = cv2.cvtColor(result.orig_img, cv2.COLOR_BGR2RGB)
        x1,y1,x2,y2 = np.array(np.round(result.boxes.xyxy.cpu().numpy()[0]),dtype=np.int32)
        cropped = orig_img[y1:y2, x1:x2]
        faces.append(cropped)

        # 저장  
        save_path = f"detected_face_{idx}.jpg"
        cv2.imwrite(save_path, cv2.cvtColor(cropped, cv2.COLOR_RGB2BGR))

    return faces

