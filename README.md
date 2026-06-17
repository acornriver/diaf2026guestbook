# 철의 언어v2 : 방명록 시스템 (Guestbook System)

전시 관람객들이 자유롭게 감상평을 기록하고, 이 데이터가 **실시간으로 구글 스프레드시트**로 전송되어 축적되는 예술적인 감각의 방명록 웹 애플리케이션입니다.

- **디자인 컨셉**: pure black 어둠 속에서 마찰(Friction)로 빛나는 철의 온도와 온기를 시각화(glow) 및 청각화(Web Audio)한 미니멀 디자인
- **연동 기능**: 구글 스프레드시트(Google Sheets) 실시간 양방향 동기화 및 오프라인 대비용 로컬 데모(Demo) 모드 내장

---

## 1. 실행 방법 (How to Run)

본 시스템은 파이썬 Flask 기반으로 구동됩니다. 터미널에서 아래의 단계를 실행하세요.

1. **프로젝트 폴더로 이동**:
   ```bash
   cd "/Users/acornriver/Library/Mobile Documents/com~apple~CloudDocs/2026/예대/디아페/방명록 시스템"
   ```

2. **Flask 구동**:
   ```bash
   python app.py
   ```

3. **브라우저 접속**:
   - **방명록 화면**: [http://localhost:5002](http://localhost:5002)
   - **관리자 설정**: [http://localhost:5002/admin](http://localhost:5002/admin)

---

## 2. 구글 스프레드시트 실시간 연동 방법 (Google Sheets Integration)

### 1단계: 시트 및 스크립트 작성
1. 본인의 **Google Drive**에서 새로운 **구글 스프레드시트**를 하나 생성합니다. (시트명 무관, 비어있는 시트 가능)
2. 시트 상단 메뉴에서 **확장 프로그램 (Extensions) > Apps Script**를 클릭합니다.
3. 기존 편집기에 있는 코드를 모두 지우고, 아래의 **Google Apps Script 코드**를 그대로 복사하여 붙여넣습니다.

```javascript
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Timestamp", "Name", "Message", "Vibe"]);
  }
  
  var rows = sheet.getDataRange().getValues();
  var data = [];
  
  if (rows.length > 1) {
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var dateVal = row[0];
      var formattedDate = "";
      if (dateVal instanceof Date) {
        formattedDate = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      } else {
        formattedDate = String(dateVal);
      }
      
      data.push({
        timestamp: formattedDate,
        name: String(row[1]),
        message: String(row[2]),
        vibe: String(row[3] || 'ore')
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var name = "";
    var message = "";
    var vibe = "ore";
    
    if (e.postData && e.postData.contents) {
      try {
        var params = JSON.parse(e.postData.contents);
        name = params.name || "";
        message = params.message || "";
        vibe = params.vibe || "ore";
      } catch (parseError) {
        name = e.parameter.name || "";
        message = e.parameter.message || "";
        vibe = e.parameter.vibe || "ore";
      }
    } else {
      name = e.parameter.name || "";
      message = e.parameter.message || "";
      vibe = e.parameter.vibe || "ore";
    }
    
    if (!name || !message) {
      return ContentService.createTextOutput(JSON.stringify({ result: 'error', error: '이름과 메시지는 필수 항목입니다.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Name", "Message", "Vibe"]);
    }
    
    var timestamp = new Date();
    sheet.appendRow([timestamp, name, message, vibe]);
    
    return ContentService.createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

### 2단계: 웹앱으로 배포
1. Apps Script 편집기 우측 상단의 **배포 (Deploy) > 새 배포 (New deployment)**를 클릭합니다.
2. 유형 선택(톱니바퀴 아이콘)에서 **웹앱 (Web app)**을 선택합니다.
3. 배포 설정 항목들을 아래와 같이 지정합니다:
   - **설명**: `철의 언어 방명록 API`
   - **웹앱을 실행할 사용자**: **나 (본인 구글 계정)**
   - **액세스할 수 있는 사용자**: **모든 사람 (Anyone)**
4. **배포 (Deploy)** 버튼을 누릅니다.
5. 구글 로그인 및 권한 승인 창이 열리면 본인 계정을 선택하고 **허용(승인)** 처리를 마칩니다. (경고창이 나오면 '고급 > 안전하지 않음으로 이동'을 눌러 완료합니다.)
6. 배포가 완료되면 화면에 생성되는 **웹앱 URL (Web App URL)**을 복사합니다.

### 3단계: 방명록 설정 반영
1. 브라우저로 [http://localhost:5002/admin](http://localhost:5002/admin) 페이지에 접속합니다.
2. 복사한 웹앱 URL을 입력 칸에 붙여넣습니다.
3. **`[ 연결 테스트 ]`** 버튼을 눌러 성공 문구가 나오는지 확인합니다.
4. **`[ 설정 저장 ]`** 버튼을 누르면 연동이 끝납니다. 이제 모든 방문 기록이 구글 스프레드시트에 저장됩니다.

---

## 3. 기능 안내 (Features)

- **철의 상태(Vibe) 테마**: 
  - 관람객은 흔적을 남길 때 철의 성질에 어울리는 4가지 테마를 선택할 수 있습니다.
  - 선택한 테마에 따라 **배경의 오로라 광원색**이 역동적으로 반응합니다.
  - 남겨진 카드 역시 각 고유의 테마 테두리와 마우스 호버 시 개별 테마 색상으로 발광합니다.
- **예술적 소리 피드백 (Interactive Synth)**:
  - 브라우저 Web Audio API를 활용하여 버튼이나 테마에 마우스를 올릴 때 맑고 정갈한 쇠구슬 소리(`clink`)가 납니다.
  - 작성 완료 시 망치로 철판을 내리쳐 맑게 울려 퍼지는 징 소리(`strike`)가 실감 나게 발생합니다.
- **실시간 자동 새로고침**:
  - 작성 시 즉시 리스트가 업데이트되며, 작성하지 않더라도 10초 주기로 스프레드시트와 실시간 대조하여 새로운 방명록 글을 비동기로 로드합니다.
- **반응형 웹 지원**:
  - 가로폭이 넓은 태블릿이나 노트북에서는 2열 그리드로 표시되며, 스마트폰 등 좁은 기기에서는 세로 1열로 세련되게 쌓여 모든 전시 환경에서 최적화되어 동작합니다.
