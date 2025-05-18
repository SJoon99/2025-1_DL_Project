from flask import Flask

def create_app():
    app = Flask(__name__)
    
    # 기본 라우트 설정
    @app.route('/')
    def home():
        return "Flask App Running!"
    
    return app
