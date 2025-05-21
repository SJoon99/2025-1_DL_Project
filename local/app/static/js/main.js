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

    sendImageToServer(imageDataUrl);
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

function sendImageToServer(imageDataUrl) {
    const base64Data = imageDataUrl.split(',')[1];
    const blobData = b64toBlob(base64Data, 'image/png');

    const formData = new FormData();
    formData.append('image', blobData, 'captured-image.png');

    fetch('/api/check-eyes', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log('서버 응답:', data);
        
        // 테스트 단계에서는 서버 응답을 확인하기 위한 알림 표시
        alert(`이미지 전송 성공!\n크기: ${data.image_size[0]}x${data.image_size[1]}\n${data.message}`);
        
        // 나중에 eyes_open 기능이 다시 활성화되면 아래 코드 사용
        // if (!data.eyes_open) {
        //     alert('눈을 감은 것이 감지되었습니다! 카메라 녹화가 시작되었습니다.')
        // }
    })
    .catch(error => {
        console.error('서버 오류:', error);
        alert('이미지 전송 중 오류가 발생했습니다.');
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
