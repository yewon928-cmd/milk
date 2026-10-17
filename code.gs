/**
 * ============================================================
 * [우유 급식 확인 보드 - Google Apps Script 연동 코드 (code.gs)]
 * ============================================================
 * 
 * 📌 [설치 및 배포 방법]
 * 1. 구글 스프레드시트(새 시트 또는 기존 시트)를 엽니다.
 * 2. 상단 메뉴에서 [확장 프로그램] -> [Apps Script]를 클릭합니다.
 * 3. 기존의 Code.gs 내용을 모두 지우고, 이 파일의 전체 코드를 복사하여 붙여넣습니다.
 * 4. 상단 메뉴 [저장(💾)] 버튼을 누릅니다.
 * 5. 우측 상단 파란색 [배포] -> [새 배포]를 클릭합니다.
 * 6. 왼쪽 톱니바퀴 아이콘 [유형 선택] -> [웹 앱(Web App)]을 선택합니다.
 * 7. 아래 설정을 반드시 확인하세요:
 *    - 설명: 우유 급식 연동
 *    - 다음 사용자로 실행: [나 (내 계정)]
 *    - 액세스 권한이 있는 사용자: ★ [모든 사용자 (Anyone)] ★ (로그인 불필요)
 * 8. [배포] 버튼을 클릭하고, 권한 검토 안내가 나오면 허용(고급 -> 안전하지 않은 페이지로 이동 클릭)합니다.
 * 9. 생성된 '웹 앱 URL'을 복사하여 '우유 급식 확인 보드'의 [⚙️ 시트 연동 설정]에 붙여넣으면 완료!
 */

// 시트 탭 이름 상수
var SHEET_STUDENTS = '학생명단';
var SHEET_STATUS = '제출현황';

/**
 * GET 요청 처리 (웹 앱 상태 확인 및 학생 명단 조회)
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

    if (action === 'getStudents') {
      var studentSheet = ss.getSheetByName(SHEET_STUDENTS);
      if (!studentSheet) {
        studentSheet = initStudentSheet(ss);
      }
      
      var data = studentSheet.getDataRange().getValues();
      var students = [];
      // 1행(헤더: 번호, 이름)을 제외하고 읽기
      for (var i = 1; i < data.length; i++) {
        var num = data[i][0];
        var name = data[i][1];
        if (num !== '' && name !== '') {
          students.push({
            number: Number(num),
            name: String(name).trim()
          });
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        students: students
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 기본 응답
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: '우유 급식 확인 보드 Apps Script가 정상 실행 중입니다.'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * POST 요청 처리 (현재 제출 현황 시트에 저장)
 * 클라이언트에서 CORS 방지용 'text/plain;charset=utf-8' 헤더로 전송된 JSON 본문을 수신
 */
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var contents = e.postData.contents;
    var data = JSON.parse(contents);
    
    var action = data.action || 'saveStatus';
    var taskName = data.taskName || '우유 급식';
    var students = data.students || [];
    var saveTimestamp = data.timestamp || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
    var dateString = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');

    // 1. '제출현황' 시트 가져오기 (없으면 자동 생성)
    var statusSheet = ss.getSheetByName(SHEET_STATUS);
    if (!statusSheet) {
      statusSheet = initStatusSheet(ss);
    }

    // 2. 제출 현황 데이터 행 추가
    // 시트 구조: 과제명, 번호, 이름, 제출여부, 체크시간
    var rowsToAdd = [];
    for (var i = 0; i < students.length; i++) {
      var s = students[i];
      var isSubmitted = s.completed ? '제출완료' : '미제출';
      var checkTime = s.completed ? (s.checkTime || saveTimestamp) : '-';
      var fullTaskName = taskName + ' (' + dateString + ')';

      rowsToAdd.push([
        fullTaskName,
        s.number,
        s.name,
        isSubmitted,
        checkTime
      ]);
    }

    if (rowsToAdd.length > 0) {
      var lastRow = statusSheet.getLastRow();
      statusSheet.getRange(lastRow + 1, 1, rowsToAdd.length, 5).setValues(rowsToAdd);

      // 마지막 추가된 제출완료/미제출에 맞춤 서식 (가운데 정렬)
      statusSheet.getRange(lastRow + 1, 1, rowsToAdd.length, 5).setHorizontalAlignment('center');
    }

    // 3. 만약 명단 동기화 플래그가 켜져 있으면 '학생명단' 탭도 갱신
    if (data.syncStudentList) {
      var studentSheet = ss.getSheetByName(SHEET_STUDENTS);
      if (!studentSheet) {
        studentSheet = initStudentSheet(ss);
      }
      updateStudentSheet(studentSheet, students);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      savedCount: rowsToAdd.length,
      timestamp: saveTimestamp,
      message: '총 ' + rowsToAdd.length + '명의 우유 급식 현황이 성공적으로 저장되었습니다.'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * '학생명단' 시트 초기화 헬퍼
 */
function initStudentSheet(ss) {
  var sheet = ss.insertSheet(SHEET_STUDENTS);
  sheet.appendRow(['번호', '이름']);
  
  // 기본 1~22번 세팅
  var defaultRows = [];
  for (var i = 1; i <= 22; i++) {
    defaultRows.push([i, i + '번 학생']);
  }
  sheet.getRange(2, 1, defaultRows.length, 2).setValues(defaultRows);
  
  // 헤더 스타일링 (밀크 블루 헤더)
  var headerRange = sheet.getRange('A1:B1');
  headerRange.setBackground('#3B82F6');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 80);
  sheet.setColumnWidth(2, 160);
  sheet.getRange(2, 1, defaultRows.length, 2).setHorizontalAlignment('center');
  
  return sheet;
}

/**
 * '제출현황' 시트 초기화 헬퍼
 * 헤더: 과제명, 번호, 이름, 제출여부, 체크시간
 */
function initStatusSheet(ss) {
  var sheet = ss.insertSheet(SHEET_STATUS);
  sheet.appendRow(['과제명', '번호', '이름', '제출여부', '체크시간']);
  
  // 헤더 스타일링
  var headerRange = sheet.getRange('A1:E1');
  headerRange.setBackground('#1D4ED8');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 80);
  sheet.setColumnWidth(3, 140);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 180);
  
  return sheet;
}

/**
 * '학생명단' 시트 최신화
 */
function updateStudentSheet(sheet, students) {
  // 기존 데이터 지우고 새로 쓰기
  sheet.clearContents();
  sheet.appendRow(['번호', '이름']);
  var rows = students.map(function(s) {
    return [s.number, s.name];
  });
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
    sheet.getRange(2, 1, rows.length, 2).setHorizontalAlignment('center');
  }
}
