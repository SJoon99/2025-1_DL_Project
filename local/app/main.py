import time
from io import BytesIO

from flask import Flask, request, jsonify, render_template  # render_template 추가
from PIL import Image
import cv2
import numpy as np
# import torch  # 예: PyTorch 모델을 쓴다면

def load_model():
    """
    TODO: 학습된 딥러닝 모델을 로드해서 반환
    예) model = torch.jit.load('model.pt'); model.eval()
    """
    model = None
    return model

def predict_eyes_open(model, pil_img):
    """
    TODO: PIL 이미지를 전처리 한 뒤 모델에 넣고,
    눈 뜸(True)/감음(False)을 리턴하도록 구현
    """
    return True  # 임시로 항상 뜸으로 리턴

# Flask 인스턴스 생성 시 templates 경로 지정 (필요하다면)
app = Flask(__name__)
model = load_model()

# ① 루트 화면을 띄우는 라우트 추가
@app.route('/')
def index():
    return render_template('main.html')


@app.route('/api/check-eyes', methods=['POST'])
def check_eyes():
    # 1) 클라이언트에서 보낸 이미지 받기
    if 'image' not in request.files:
        return jsonify({'error': 'no image uploaded'}), 400

    file = request.files['image']
    img = Image.open(BytesIO(file.read())).convert('RGB')

    # 2) 눈 뜸/감음 예측
    eyes_open = predict_eyes_open(model, img)

    if eyes_open:
        # 눈 다 뜬 경우
        return jsonify({'eyes_open': True}), 200
    else:
        # 눈 감은 경우: 1초 동안 영상 녹화
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            return jsonify({'error': 'cannot open camera'}), 500

        fourcc = cv2.VideoWriter_fourcc(*'XVID')
        out = cv2.VideoWriter('closed_eye_capture.avi', fourcc, 20.0, (
            int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        ))

        start = time.time()
        while time.time() - start < 1.0:
            ret, frame = cap.read()
            if not ret:
                break
            out.write(frame)

        cap.release()
        out.release()

        return jsonify({
            'eyes_open': False,
            'video_path': 'closed_eye_capture.avi'
        }), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
