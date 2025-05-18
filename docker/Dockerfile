# Python 3.9 이미지를 베이스로 사용
FROM python:3.9-slim

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 파일 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY . /app

# 환경 변수 설정
ENV FLASK_APP=main.py

# 컨테이너 포트 설정
EXPOSE 5000

# 애플리케이션 실행 명령
CMD ["python", "app.py"]