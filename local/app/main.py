import time
from io import BytesIO

from flask import Flask, request, jsonify, render_template  # render_template 추가
from PIL import Image
import cv2
import numpy as np
from datetime import datetime
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


@app.route('/api/predict-eyes', methods=['POST'])
def predict_eyes():
    """이미지 받아서 눈 감음/뜸 예측만"""
    if 'image' not in request.files:
        return jsonify({'error': 'no image uploaded'}), 400

    file = request.files['image']
    img = Image.open(BytesIO(file.read())).convert('RGB')

    # 640 x 640 크기로 리사이즈
    img = img.resize((640, 640))
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    img.save(f'captured_image_{timestamp}.jpg')

    # TODO: 실제 AI 모델로 예측
    import random
    eyes_open = random.choice([True, False])  # 테스트용
    
    return jsonify({
        'status': 'success',
        'eyes_open': eyes_open,
        'message': 'Eyes open' if eyes_open else 'Eyes closed',
        'timestamp': timestamp
    }), 200

@app.route('/api/save-video', methods=['POST'])
def save_video():
    """동영상 파일 저장"""
    if 'video' not in request.files:
        return jsonify({'error': 'no video uploaded'}), 400

    video_file = request.files['video']
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f'closed_eyes_video_{timestamp}.webm'
    
    video_file.save(filename)
    
    return jsonify({
        'status': 'success',
        'message': 'Video saved successfully',
        'filename': filename
    }), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
