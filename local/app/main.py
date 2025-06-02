import base64
import time
from io import BytesIO
from flask import Flask, request, jsonify, render_template  # render_template 추가
from PIL import Image
import cv2
import numpy as np
from datetime import datetime
from ultralytics import YOLO
import timm
import torchvision.transforms as transforms
import torch
import imageio
import os

# 얼굴 탐지용 YOLOv8 모델
YOLO_MODEL_PATH = '/home/joon/GIST/lecture/dl/2025-1_DL_Project/local/best2.pt'
face_detector = YOLO(YOLO_MODEL_PATH)

# 눈 상태 분류용 CoAtNet 모델
DEVICE = torch.device("cpu")
eye_model = timm.create_model('coatnet_1_rw_224', pretrained=True, num_classes=2)
eye_model.load_state_dict(
    torch.load(r'/home/joon/GIST/lecture/dl/2025-1_DL_Project/local/datat-c1.pth',
               map_location=DEVICE)
)
eye_model.to(DEVICE)
eye_model.eval()

# 눈 상태 분류 전처리
eye_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize((0.5, 0.5, 0.5),
                         (0.5, 0.5, 0.5))
])


def detect_faces_yolo(model_weight, orig_img, device='cpu'):
    faces = []
    model = YOLO(model_weight)
    yolo_results = model.predict(orig_img, imgsz=640, conf=0.5, device=device)
    for idx, result in enumerate(yolo_results):
        if result.boxes is None or len(result.boxes) == 0:
            continue

        orig_img = cv2.cvtColor(result.orig_img, cv2.COLOR_BGR2RGB)
        for i,box in enumerate(result.boxes.xyxy.cpu().numpy()):
            x1, y1, x2, y2 = np.array(np.round(box), dtype=np.int32)
            cropped = orig_img[y1:y2, x1:x2]
            faces.append(cropped)

            # 저장
            save_path = f"detected_face_{idx}_{i}.jpg"
            cv2.imwrite(save_path, cv2.cvtColor(cropped, cv2.COLOR_RGB2BGR))

    return faces

# 눈 감음/뜸 예측 함수
def predict_eye_state(face_img_np: np.ndarray) -> bool:
    # RGB numpy 이미지를 받아 CoAtNet으로 눈 상태 예측.
    # True = 눈 뜬 상태, False = 눈 감은 상태
    pil = Image.fromarray(face_img_np)
    tensor = eye_transform(pil).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        out = eye_model(tensor)
        pred = out.argmax(dim=1).item()

    return (pred == 1)

# 동영상에서 눈을 뜬 프레임 추출
def extract_frames_with_faces(video_path, every_n=15, output_dir='video_frames'):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    reader = imageio.get_reader(video_path)
    found_open_eyes = False

    for i, frame in enumerate(reader):
        if i % every_n != 0:
            continue

        # 프레임 저장 (디버깅용, 나눠진 프레임 확인)
        frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        frame_path = os.path.join(output_dir, f'frame_{i}.jpg')
        cv2.imwrite(frame_path, frame_bgr)
        print(f"[프레임 저장] {frame_path}")

        # 얼굴 검출 및 눈 예측
        faces = detect_faces_yolo(YOLO_MODEL_PATH, frame, device='cpu')
        if not faces:
            print(f"프레임 {i}: 얼굴 없음")
            continue

        eye_states = [predict_eye_state(face) for face in faces]
        print(f"프레임 #{i}: 예측 결과(eye_states) = {eye_states}")

        # 얼굴 crop 이미지도 저장 (디버깅용)
        for idx, face in enumerate(faces):
            print(f"[DEBUG] frame {i}, face {idx} crop shape: {face.shape}")
            print(f"[DEBUG] frame {i}, face {idx} crop 첫 픽셀: {face[0,0]}")

            crop_path = os.path.join(output_dir, f'debug_face_{i}_{"open" if eye_states else "closed"}.jpg')
            cv2.imwrite(crop_path, face)

        if all(eye_states):
            print(f"✅ 눈을 뜬 프레임 발견! 프레임 #{i}")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = os.path.join(output_dir, f'eyes_open_frame_{timestamp}.jpg')
            cv2.imwrite(output_path, frame_bgr)
            print(f"✅ 눈을 뜬 프레임 저장 완료: {output_path}")
            found_open_eyes = True
            reader.close()
            return frame  
    reader.close()
    if not found_open_eyes:
        print("눈을 뜬 프레임을 찾지 못함")
    return None



app = Flask(__name__, template_folder='templates', static_folder='static')


# 루트 화면을 띄우는 라우트
@app.route('/')
def index():
    return render_template('main.html')

# 눈 상태 예측 API
@app.route('/api/predict-eyes', methods=['POST'])
def predict_eyes():
    """이미지 받아서 눈 감음/뜸 예측만"""
    if 'image' not in request.files:
        return jsonify({'error': 'no image uploaded'}), 400

    file = request.files['image']
    img = Image.open(BytesIO(file.read())).convert('RGB')
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    img.save(f'captured_image_{timestamp}.jpg')

    cv_img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

    faces = detect_faces_yolo(YOLO_MODEL_PATH, cv_img, device='cpu')
    if not faces:
        return jsonify({'error': 'No face detected'}), 400

    # 각 얼굴별 눈 상태 예측
    eye_states = [predict_eye_state(face) for face in faces]
    all_open = all(eye_states)

    # 결과 반환
    return jsonify({
        'status': 'success',
        'eyes_open': all_open,
        'message': 'All eyes open' if all_open else 'At least one person has eyes closed',
        'faces_detected': len(faces),
        'timestamp': timestamp
    }), 200



@app.route('/api/save-video', methods=['POST'])
def save_video():
    """동영상 저장 + 프레임 분석"""
    if 'video' not in request.files:
        return jsonify({'error': 'no video uploaded'}), 400

    video_file = request.files['video']
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f'closed_eyes_video_{timestamp}.webm'
    video_file.save(filename)

    # 눈 뜬 프레임 추출 시도
    final_frame = extract_frames_with_faces(filename)

    if final_frame is not None:
        # PIL Image로 저장 + base64 변환
        pil_img = Image.fromarray(final_frame)
        buffered = BytesIO()
        pil_img.save(buffered, format="JPEG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

        return jsonify({
            'status': 'success',
            'message': 'Video processed and eyes-open frame found.',
            'filename': filename,
            'eyes_open_frame': img_base64  # base64로 전달
        }), 200
    else:
        return jsonify({
            'status': 'fail',
            'message': 'No eyes-open frame found.',
            'filename': filename
        }), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)