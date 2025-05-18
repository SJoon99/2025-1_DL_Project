from app.main import app

if __name__ == "__main__":
    # 로컬 환경에서 실행할 때 디버그 모드 활성화
    app.run(debug=True, host="0.0.0.0", port=5000)
