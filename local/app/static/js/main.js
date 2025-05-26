// 웹캠 관련 변수
const video = document.getElementById('video-element');
const canvas = document.getElementById('canvas');
const capturedImage = document.getElementById('captured-image');
const captureBtn = document.getElementById('capture-btn');
const retakeBtn = document.getElementById('retake-btn');
const downloadBtn = document.getElementById('download-btn');
const resultContainer = document.getElementById('result-container');
const resolutionText = document.getElementById('resolution-text');
const resolutionBadge = document.getElementById('resolution-badge');
const flash = document.getElementById('flash');
let mediaRecorder;
let recordedChunks = [];

function showSpinner() {
    document.getElementById('loading-spinner').style.display = 'block';
}

function hideSpinner() {
    document.getElementById('loading-spinner').style.display = 'none';
}


// 카메라 시작 함수
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            const track = stream.getVideoTracks()[0];
            const { width, height } = track.getSettings();
            const megapixels = (width * height / 1000000).toFixed(2);
            resolutionText.textContent = `해상도: ${width}×${height} (${megapixels}MP)`;
            resolutionBadge.textContent = `${width}×${height}`;
            canvas.width = width;
            canvas.height = height;
        };
    } catch (err) {
        console.error("웹캠 접근 오류:", err);
        alert("웹캠에 접근할 수 없습니다. 카메라 권한을 확인해주세요.");
    }
}

// 사진 촬영 함수
function capturePhoto() {
    // 버튼을 누르는 순간 촬영 효과 음향 재생 (비동기 분리)
    const audio = new Audio('/static/sound/camera_sound.mp3');
    audio.play().catch(() => {}); // 자동재생 정책 대응

    // 바로 효과음 재생 후 이미지 캡처 진행
    setTimeout(() => {
        const context = canvas.getContext('2d');
        flash.style.opacity = '0.8';
        setTimeout(() => flash.style.opacity = '0', 100);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/png');
        capturedImage.src = imageDataUrl;
        capturedImage.style.display = 'block';
        video.style.display = 'none';
        resultContainer.style.display = 'block';
        captureBtn.style.display = 'none';

        // 이미지 먼저 서버로 전송해서 예측
        sendImageForPrediction(imageDataUrl);
    }, 0);
}

// 다시 찍기 함수 (기존 함수 그대로 활용)
function retakePhoto() {
    capturedImage.style.display = 'none';
    video.style.display = 'block';
    resultContainer.style.display = 'none';
    captureBtn.style.display = 'inline-flex';
}

// 이미지 다운로드 함수
function downloadPhoto() {
    const link = document.createElement('a');
    link.href = capturedImage.src;
    link.download = `webcam-capture-${new Date().toISOString()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 이미지 예측 요청 함수
function sendImageForPrediction(imageDataUrl) {
    const base64Data = imageDataUrl.split(',')[1];
    const blobData = b64toBlob(base64Data, 'image/png');

    const formData = new FormData();
    formData.append('image', blobData, 'captured-image.png');

    fetch('/api/predict-eyes', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log('예측 결과:', data);
        if (data.eyes_open) {
            // 눈이 떠있는 경우
            // retakePhoto(); // 기존 함수 활용해서 카메라 화면으로 돌아감
        } else {
            // 눈이 감긴 경우 - 1초 동영상 캡처
            startVideoRecording();
        }
    })
    .catch(error => {
        console.error('예측 오류:', error);
        retakePhoto(); // 오류 시에도 카메라 화면으로 돌아감
    });
}

// 1초 동영상 녹화 시작
function startVideoRecording() {
    const stream = video.srcObject;
    recordedChunks = [];

    showSpinner(); // 로딩 스피너 표시
    
    // MediaRecorder 설정
    mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'video/webm;codecs=vp8' 
    });
    
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };
    
    mediaRecorder.onstop = () => {
        // 동영상 녹화 완료 후 서버로 전송
        const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
        sendVideoToServer(videoBlob);
    };
    
    // 1초 녹화 시작
    mediaRecorder.start();
    console.log('동영상 녹화 시작...');
    
    setTimeout(() => {
        mediaRecorder.stop();
        console.log('동영상 녹화 완료');
    }, 1200);
}

// 동영상 서버 전송
function sendVideoToServer(videoBlob) {
    const formData = new FormData();
    formData.append('video', videoBlob, 'recorded-video.webm');

    fetch('/api/save-video', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log('동영상 저장 결과:', data);
        hideSpinner(); // 로딩 스피너 숨김
        if (data.eyes_open_frame) {
            // base64로 된 최종 이미지 표시
            const imgSrc = 'data:image/jpeg;base64,' + data.eyes_open_frame;
            const capturedImage = document.getElementById('captured-image');
            capturedImage.src = imgSrc;
            capturedImage.style.display = 'block';
            video.style.display = 'none';
            resultContainer.style.display = 'block';
            captureBtn.style.display = 'none';
        } else {
            alert("눈 뜬 프레임을 찾지 못했습니다.");
            retakePhoto();
        }
    })
    .catch(error => {
        console.error('동영상 저장 오류:', error);
        hideSpinner(); // 로딩 스피너 숨김
        retakePhoto(); // 오류 시에도 카메라 화면으로 돌아감
    });
}

// Base64 문자열을 Blob으로 변환하는 함수
function b64toBlob(b64Data, contentType='', sliceSize=512) {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
}

// 필터 옵션 처리
document.querySelectorAll('.filter-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        switch (option.textContent) {
            case '흑백':    video.style.filter = 'grayscale(100%)'; break;
            case '세피아':  video.style.filter = 'sepia(100%)'; break;
            case '빈티지':  video.style.filter = 'sepia(50%) contrast(110%) brightness(110%) saturate(80%)'; break;
            case '선명하게': video.style.filter = 'contrast(130%) brightness(110%) saturate(130%)'; break;
            case '부드럽게': video.style.filter = 'contrast(90%) brightness(105%) saturate(90%) blur(1px)'; break;
            default:        video.style.filter = 'none';
        }
    });
});

// 이벤트 리스너 등록 & 카메라 시작
captureBtn.addEventListener('click', capturePhoto);
retakeBtn.addEventListener('click', retakePhoto);
downloadBtn.addEventListener('click', downloadPhoto);
startCamera();