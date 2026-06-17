import os
import json
import urllib.request
import urllib.parse
from datetime import datetime
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

CONFIG_FILE = 'config.json'

# Global in-memory list for demo mode messages
# Pre-populated with poetic, theme-appropriate mock messages
DEMO_MESSAGES = [
    {
        "timestamp": "2026-06-17 18:00:21",
        "name": "우쥬인간",
        "message": "철이 스스로 말하지 않듯, 우리의 발걸음과 마찰 속에서 전시가 비로소 언어를 얻습니다. 찾아주셔서 감사드립니다.",
        "vibe": "ore"
    },
    {
        "timestamp": "2026-06-17 18:12:45",
        "name": "정소윤",
        "message": "차가운 철판에서 뿜어져 나오는 시각적인 에너지와 소리가 온몸으로 전해지네요. 특히 쇳물의 뜨거운 빛을 담은 듯한 붉은 광원이 인상 깊었습니다.",
        "vibe": "steel"
    },
    {
        "timestamp": "2026-06-17 18:24:02",
        "name": "이민재",
        "message": "담금질된 파란색 철의 미학... 날카로우면서도 정돈된 차가움이 긴 여운을 남깁니다. 아주 감각적인 전시예요.",
        "vibe": "blue"
    },
    {
        "timestamp": "2026-06-17 18:35:10",
        "name": "차은우",
        "message": "소리와 빛, 철의 마찰이 빚어내는 소음이 음악처럼 들렸습니다. 어두운 공간 속에서 홀로 빛나는 흔적들이 아름답습니다.",
        "vibe": "charcoal"
    }
]

def load_config():
    if not os.path.exists(CONFIG_FILE):
        default_config = {"sheet_api_url": ""}
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(default_config, f, indent=2, ensure_ascii=False)
        return default_config
        
    try:
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {"sheet_api_url": ""}

def save_config(config):
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin')
def admin():
    config = load_config()
    return render_template('admin.html', sheet_api_url=config.get('sheet_api_url', ''))

@app.route('/api/messages', methods=['GET'])
def get_messages():
    config = load_config()
    api_url = config.get('sheet_api_url', '').strip()
    
    if not api_url:
        # Return local in-memory messages if not configured (Demo Mode)
        # Return sorted by timestamp descending so newest are on top, or ascending depending on front-end preference.
        # We will return in ascending order of arrival (chronological) or let frontend handle it. Let's keep chronological.
        return jsonify({
            "status": "demo",
            "messages": DEMO_MESSAGES
        })
        
    try:
        # Server-to-server GET request to Google Apps Script
        # We set a reasonable timeout of 8 seconds
        req = urllib.request.Request(api_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            # Google Apps Script returns list of messages
            return jsonify({
                "status": "success",
                "messages": data
            })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Google Sheets 연결 실패: {str(e)}",
            "fallback_messages": DEMO_MESSAGES
        }), 502

@app.route('/api/messages', methods=['POST'])
def add_message():
    config = load_config()
    api_url = config.get('sheet_api_url', '').strip()
    
    data = request.json or {}
    name = data.get('name', '').strip()
    message = data.get('message', '').strip()
    vibe = data.get('vibe', 'ore').strip()
    
    if not name or not message:
        return jsonify({"status": "error", "message": "이름과 메시지를 입력해주세요."}), 400
        
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    if not api_url:
        # In-memory save for Demo Mode
        new_msg = {
            "timestamp": now_str,
            "name": name,
            "message": message,
            "vibe": vibe
        }
        DEMO_MESSAGES.append(new_msg)
        return jsonify({
            "status": "demo_success",
            "message": "데모 모드로 흔적이 기록되었습니다.",
            "data": new_msg
        })
        
    try:
        # Send data as JSON to Google Apps Script
        payload = json.dumps({
            "name": name,
            "message": message,
            "vibe": vibe
        }).encode('utf-8')
        
        req = urllib.request.Request(
            api_url,
            data=payload,
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            },
            method='POST'
        )
        
        # Follow redirects automatically (Python handles 302 redirect to script.googleusercontent.com)
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            
            if res_data.get('result') == 'success':
                return jsonify({
                    "status": "success",
                    "message": "구글 스프레드시트에 흔적이 기록되었습니다."
                })
            else:
                return jsonify({
                    "status": "error",
                    "message": f"구글 스크립트 실행 오류: {res_data.get('error')}"
                }), 500
                
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"구글 스프레드시트 전송 실패: {str(e)}"
        }), 502

@app.route('/api/config', methods=['POST'])
def save_api_config():
    data = request.json or {}
    api_url = data.get('sheet_api_url', '').strip()
    
    # Simple validation (must start with script.google.com if provided)
    if api_url and not api_url.startswith('https://script.google.com/'):
        return jsonify({"status": "error", "message": "올바른 Google Apps Script 웹앱 URL이 아닙니다."}), 400
        
    config = {"sheet_api_url": api_url}
    save_config(config)
    
    return jsonify({
        "status": "success",
        "message": "설정이 성공적으로 저장되었습니다." if api_url else "설정이 초기화되어 데모 모드로 동작합니다."
    })

if __name__ == '__main__':
    # Run locally on port 5002 (timetable system is on 5001)
    app.run(host='0.0.0.0', port=5002, debug=True)
