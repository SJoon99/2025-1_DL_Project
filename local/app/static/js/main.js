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
    const context = canvas.getContext('2d');
    flash.style.opacity = '0.8';
    setTimeout(() => flash.style.opacity = '0', 100);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/png');
    capturedImage.src = imageDataUrl;
    capturedImage.style.display = 'block';
    video.style.display = 'none';
    resultContainer.style.display = 'block';
    captureBtn.style.display = 'inline-flex';
    captureBtn.style.display = 'none';
}

// 다시 찍기 함수
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
