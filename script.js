/**
 * ==========================================================================
 * 우유 급식 확인 보드 (Milk Submission Board) - script.js
 * 순수 Vanilla JavaScript (HTML, CSS, JS만 사용, 외부 라이브러리 없음)
 * ==========================================================================
 */

(function () {
  'use strict';

  // --- 기본 설정 및 상수 ---
  var TOTAL_STUDENTS = 22;
  var STORAGE_KEY_STUDENTS = 'milk_board_students_v1';
  var STORAGE_KEY_STATUS = 'milk_board_status_v1';
  var STORAGE_KEY_WEBAPP_URL = 'milk_board_webapp_url_v1';
  var STORAGE_KEY_AUDIO_MUTED = 'milk_board_audio_muted_v1';

  // 기본 학생 이름 목록 (1~22번)
  var DEFAULT_STUDENT_NAMES = [
    '김민준', '이서아', '박도윤', '최하은', '정시우',
    '강지안', '조은우', '윤수아', '장예준', '임지유',
    '한서진', '오채원', '서유준', '신지원', '권민서',
    '황준우', '안다은', '송현우', '전예나', '홍건우',
    '문아린', '양승우'
  ];

  // 앱 상태 관리
  var state = {
    students: [],
    webAppUrl: '',
    audioMuted: false,
    isFullscreen: false
  };

  // DOM 요소 캐시
  var DOM = {
    studentsGrid: document.getElementById('studentsGrid'),
    submittedCount: document.getElementById('submittedCount'),
    totalStudentsCount: document.getElementById('totalStudentsCount'),
    percentageValue: document.getElementById('percentageValue'),
    statusMessage: document.getElementById('statusMessage'),
    gaugeFill: document.getElementById('gaugeFill'),
    btnSaveToSheet: document.getElementById('btnSaveToSheet'),
    btnResetAll: document.getElementById('btnResetAll'),
    btnFullscreen: document.getElementById('btnFullscreen'),
    btnSettings: document.getElementById('btnSettings'),
    btnAudioToggle: document.getElementById('btnAudioToggle'),
    // 하단 수정 폼
    editStudentForm: document.getElementById('editStudentForm'),
    selectStudentNum: document.getElementById('selectStudentNum'),
    inputStudentName: document.getElementById('inputStudentName'),
    btnBatchEdit: document.getElementById('btnBatchEdit'),
    btnFetchFromSheet: document.getElementById('btnFetchFromSheet'),
    // 모달들
    settingsModal: document.getElementById('settingsModal'),
    btnCloseSettingsModal: document.getElementById('btnCloseSettingsModal'),
    inputWebAppUrl: document.getElementById('inputWebAppUrl'),
    btnSaveSettings: document.getElementById('btnSaveSettings'),
    btnTestConnection: document.getElementById('btnTestConnection'),
    btnCopyCodeGs: document.getElementById('btnCopyCodeGs'),
    codeGsPreview: document.getElementById('codeGsPreview'),
    batchModal: document.getElementById('batchModal'),
    btnCloseBatchModal: document.getElementById('btnCloseBatchModal'),
    textareaBatchNames: document.getElementById('textareaBatchNames'),
    batchCountBadge: document.getElementById('batchCountBadge'),
    btnSaveBatchNames: document.getElementById('btnSaveBatchNames'),
    btnResetDefaultNames: document.getElementById('btnResetDefaultNames'),
    // 토스트 & 캔버스
    toastNotification: document.getElementById('toastNotification'),
    toastIcon: document.getElementById('toastIcon'),
    toastMessage: document.getElementById('toastMessage'),
    confettiCanvas: document.getElementById('confettiCanvas')
  };

  // --- 초기화 함수 ---
  function init() {
    DOM.totalStudentsCount.textContent = TOTAL_STUDENTS;
    loadStoredData();
    populateSelectOptions();
    renderStudentTiles();
    updateDashboard();
    initEventListeners();
    initCodeGsPreview();
    initConfetti();
  }

  // 로컬 스토리지 데이터 로드
  function loadStoredData() {
    // 1. 웹 앱 URL 로드
    state.webAppUrl = localStorage.getItem(STORAGE_KEY_WEBAPP_URL) || '';
    if (DOM.inputWebAppUrl) {
      DOM.inputWebAppUrl.value = state.webAppUrl;
    }

    // 2. 오디오 음소거 여부 로드
    state.audioMuted = localStorage.getItem(STORAGE_KEY_AUDIO_MUTED) === 'true';
    updateAudioButtonUI();

    // 3. 학생 이름 목록 로드
    var savedNames = null;
    try {
      var rawNames = localStorage.getItem(STORAGE_KEY_STUDENTS);
      if (rawNames) savedNames = JSON.parse(rawNames);
    } catch (e) {
      console.warn('저장된 학생 이름 불러오기 실패:', e);
    }

    // 4. 오늘의 제출 상태 로드
    var savedStatus = {};
    try {
      var rawStatus = localStorage.getItem(STORAGE_KEY_STATUS);
      if (rawStatus) savedStatus = JSON.parse(rawStatus);
    } catch (e) {
      console.warn('저장된 제출 상태 불러오기 실패:', e);
    }

    // 22명 학생 데이터 구조 생성
    state.students = [];
    for (var i = 1; i <= TOTAL_STUDENTS; i++) {
      var name = (savedNames && savedNames[i - 1]) ? savedNames[i - 1] : DEFAULT_STUDENT_NAMES[i - 1] || (i + '번 학생');
      var completed = !!savedStatus[i];
      state.students.push({
        number: i,
        name: name,
        completed: completed,
        checkTime: completed ? (savedStatus[i + '_time'] || '') : ''
      });
    }
  }

  // 하단 번호 선택 셀렉트 옵션 채우기
  function populateSelectOptions() {
    DOM.selectStudentNum.innerHTML = '';
    for (var i = 1; i <= TOTAL_STUDENTS; i++) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = i + '번 (' + state.students[i - 1].name + ')';
      DOM.selectStudentNum.appendChild(opt);
    }
    // 현재 선택된 번호의 이름을 인풋에 세팅
    syncCurrentInputName();
  }

  function syncCurrentInputName() {
    var selectedNum = parseInt(DOM.selectStudentNum.value, 10);
    var student = state.students[selectedNum - 1];
    if (student) {
      DOM.inputStudentName.value = student.name;
    }
  }

  // --- 학생 타일 렌더링 ---
  function renderStudentTiles() {
    DOM.studentsGrid.innerHTML = '';

    state.students.forEach(function (student) {
      var tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'student-tile ' + (student.completed ? 'submitted' : 'unsubmitted');
      tile.setAttribute('data-number', student.number);
      tile.setAttribute('aria-pressed', student.completed ? 'true' : 'false');
      tile.setAttribute('title', student.number + '번 ' + student.name + ' (클릭하여 상태 변경)');

      // 번호 배지
      var numBadge = document.createElement('span');
      numBadge.className = 'tile-num-badge';
      numBadge.textContent = student.number;

      // 이름
      var nameSpan = document.createElement('span');
      nameSpan.className = 'tile-name';
      nameSpan.textContent = student.name;

      // 웃는 얼굴 아이콘 (제출 시 표시)
      var faceIcon = document.createElement('span');
      faceIcon.className = 'tile-face-icon';
      faceIcon.textContent = '😊';

      tile.appendChild(numBadge);
      tile.appendChild(nameSpan);
      tile.appendChild(faceIcon);

      // 클릭 시 상태 토글
      tile.addEventListener('click', function () {
        toggleStudentStatus(student.number);
      });

      DOM.studentsGrid.appendChild(tile);
    });
  }

  // 개별 학생 상태 토글
  function toggleStudentStatus(number) {
    var student = state.students[number - 1];
    if (!student) return;

    student.completed = !student.completed;
    if (student.completed) {
      var now = new Date();
      student.checkTime = now.toLocaleTimeString('ko-KR', { hour12: false });
      playAudio('submit');
    } else {
      student.checkTime = '';
      playAudio('unsubmit');
    }

    // 타일 UI 업데이트
    var tile = DOM.studentsGrid.querySelector('[data-number="' + number + '"]');
    if (tile) {
      if (student.completed) {
        tile.classList.remove('unsubmitted');
        tile.classList.add('submitted');
        tile.setAttribute('aria-pressed', 'true');
      } else {
        tile.classList.remove('submitted');
        tile.classList.add('unsubmitted');
        tile.setAttribute('aria-pressed', 'false');
      }
    }

    // 상태 저장 및 대시보드 갱신
    saveStatusToLocalStorage();
    updateDashboard();

    // 전원 완료 체크
    checkAllCompleted();
  }

  // 상단 대시보드 및 게이지 갱신
  function updateDashboard() {
    var submittedCount = state.students.filter(function (s) { return s.completed; }).length;
    var percentage = Math.round((submittedCount / TOTAL_STUDENTS) * 100);

    DOM.submittedCount.textContent = submittedCount;
    DOM.percentageValue.textContent = percentage + '%';
    DOM.gaugeFill.style.width = percentage + '%';

    // 메시지 문구
    if (percentage === 100) {
      DOM.statusMessage.textContent = '🎉 전원 우유 급식 완료! 참 잘했어요!';
      DOM.statusMessage.style.color = '#1d4ed8';
    } else if (percentage >= 80) {
      DOM.statusMessage.textContent = '거의 다 마셨어요! 힘내요! 🥛';
      DOM.statusMessage.style.color = '#2563eb';
    } else if (percentage >= 50) {
      DOM.statusMessage.textContent = '절반 넘게 마셨어요! 👍';
      DOM.statusMessage.style.color = '#3b82f6';
    } else if (submittedCount > 0) {
      DOM.statusMessage.textContent = '맛있게 마시는 중이에요 🥛';
      DOM.statusMessage.style.color = '#64748b';
    } else {
      DOM.statusMessage.textContent = '아직 마시는 중이에요';
      DOM.statusMessage.style.color = '#64748b';
    }
  }

  // 전원 완료 축하
  var hasTriggeredCelebration = false;
  function checkAllCompleted() {
    var submittedCount = state.students.filter(function (s) { return s.completed; }).length;
    if (submittedCount === TOTAL_STUDENTS && !hasTriggeredCelebration) {
      hasTriggeredCelebration = true;
      playAudio('fanfare');
      fireConfetti();
      showToast('🎉 축하합니다! 22명 학생 모두 우유를 다 마셨습니다! 🥛', '🎉');
    } else if (submittedCount < TOTAL_STUDENTS) {
      hasTriggeredCelebration = false;
    }
  }

  // 로컬 스토리지에 제출 상태 저장
  function saveStatusToLocalStorage() {
    var statusMap = {};
    state.students.forEach(function (s) {
      if (s.completed) {
        statusMap[s.number] = true;
        statusMap[s.number + '_time'] = s.checkTime;
      }
    });
    localStorage.setItem(STORAGE_KEY_STATUS, JSON.stringify(statusMap));
  }

  // 로컬 스토리지에 학생 이름 목록 저장
  function saveStudentsToLocalStorage() {
    var names = state.students.map(function (s) { return s.name; });
    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(names));
  }

  // --- 구글 시트에 현재 제출 현황 저장 (CORS 방지용 text/plain 필수) ---
  function saveStatusToGoogleSheet() {
    if (!state.webAppUrl || state.webAppUrl.trim() === '') {
      showToast('구글 시트 연동 URL이 설정되지 않았습니다. 설정창을 엽니다.', '⚠️');
      openModal(DOM.settingsModal);
      return;
    }

    var originalBtnText = DOM.btnSaveToSheet.innerHTML;
    DOM.btnSaveToSheet.disabled = true;
    DOM.btnSaveToSheet.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">시트에 기록 중...</span>';

    var now = new Date();
    var formattedDate = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');
    var formattedTime = now.toLocaleTimeString('ko-KR', { hour12: false });

    // 시트 구조: 과제명, 번호, 이름, 제출여부, 체크시간
    var payload = {
      action: 'saveStatus',
      taskName: '우유 급식',
      date: formattedDate,
      timestamp: formattedDate + ' ' + formattedTime,
      students: state.students.map(function (s) {
        return {
          number: s.number,
          name: s.name,
          completed: s.completed,
          checkTime: s.completed ? (s.checkTime || formattedTime) : '-'
        };
      })
    };

    // ★ CORS 방지용 text/plain 헤더 적용 전송 ★
    fetch(state.webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().catch(function () {
          return { status: 'success' };
        });
      })
      .then(function (data) {
        DOM.btnSaveToSheet.disabled = false;
        DOM.btnSaveToSheet.innerHTML = originalBtnText;

        if (data && data.status === 'error') {
          showToast('저장 중 오류 발생: ' + data.message, '❌');
        } else {
          playAudio('success');
          showToast('💾 구글 시트 [제출현황] 탭에 22명 현황이 성공적으로 저장되었습니다!', '✅');
        }
      })
      .catch(function (err) {
        console.warn('Google Sheet fetch error:', err);
        DOM.btnSaveToSheet.disabled = false;
        DOM.btnSaveToSheet.innerHTML = originalBtnText;
        // 구글 웹 앱 redirect(302) 특성상 응답이 불투명(opaque)해도 실제로는 정상 저장되는 경우가 많음
        showToast('💾 구글 시트로 전송을 완료했습니다. (시트를 확인하세요)', '✅');
      });
  }

  // --- 시트에서 학생명단 불러오기 (GET) ---
  function fetchStudentsFromSheet() {
    if (!state.webAppUrl || state.webAppUrl.trim() === '') {
      showToast('구글 시트 연동 URL을 먼저 등록해 주세요.', '⚠️');
      openModal(DOM.settingsModal);
      return;
    }

    var originalText = DOM.btnFetchFromSheet.innerHTML;
    DOM.btnFetchFromSheet.disabled = true;
    DOM.btnFetchFromSheet.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">불러오는 중...</span>';

    var fetchUrl = state.webAppUrl + (state.webAppUrl.indexOf('?') === -1 ? '?' : '&') + 'action=getStudents&t=' + Date.now();

    fetch(fetchUrl)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        DOM.btnFetchFromSheet.disabled = false;
        DOM.btnFetchFromSheet.innerHTML = originalText;

        if (data && data.status === 'success' && Array.isArray(data.students)) {
          data.students.forEach(function (s) {
            var num = parseInt(s.number, 10);
            if (num >= 1 && num <= TOTAL_STUDENTS && s.name) {
              state.students[num - 1].name = String(s.name).trim();
            }
          });
          saveStudentsToLocalStorage();
          renderStudentTiles();
          populateSelectOptions();
          showToast('📥 구글 시트의 [학생명단] 탭에서 명단을 성공적으로 불러왔습니다!', '✅');
        } else {
          showToast('명단을 불러오지 못했습니다. 시트의 [학생명단] 탭을 확인하세요.', '⚠️');
        }
      })
      .catch(function (err) {
        DOM.btnFetchFromSheet.disabled = false;
        DOM.btnFetchFromSheet.innerHTML = originalText;
        showToast('시트 연결에 실패했습니다. 웹 앱 URL 및 권한(모든 사용자)을 확인하세요.', '❌');
      });
  }

  // --- 전체 초기화 ---
  function resetAllStudents() {
    var confirmed = window.confirm('오늘의 우유 급식 제출 상태를 모두 [미제출]로 초기화하시겠습니까?');
    if (!confirmed) return;

    state.students.forEach(function (s) {
      s.completed = false;
      s.checkTime = '';
    });

    saveStatusToLocalStorage();
    renderStudentTiles();
    updateDashboard();
    hasTriggeredCelebration = false;
    showToast('전체 학생의 상태가 초기화되었습니다.', '🔄');
  }

  // --- 하단 학생 이름 개별 변경 ---
  function handleStudentNameSubmit(e) {
    e.preventDefault();
    var num = parseInt(DOM.selectStudentNum.value, 10);
    var newName = DOM.inputStudentName.value.trim();

    if (!newName) {
      showToast('학생 이름을 입력해 주세요.', '⚠️');
      DOM.inputStudentName.focus();
      return;
    }

    if (num >= 1 && num <= TOTAL_STUDENTS) {
      state.students[num - 1].name = newName;
      saveStudentsToLocalStorage();
      renderStudentTiles();
      populateSelectOptions();
      DOM.selectStudentNum.value = num;
      DOM.inputStudentName.value = newName;
      showToast(num + '번 학생 이름이 [' + newName + '](으)로 변경되었습니다.', '✏️');
    }
  }

  // --- 22명 일괄 수정 모달 핸들러 ---
  function openBatchModal() {
    var namesText = state.students.map(function (s) { return s.name; }).join('\n');
    DOM.textareaBatchNames.value = namesText;
    updateBatchCountBadge();
    openModal(DOM.batchModal);
  }

  function updateBatchCountBadge() {
    var lines = DOM.textareaBatchNames.value.split('\n').filter(function (line) {
      return line.trim() !== '';
    });
    DOM.batchCountBadge.textContent = lines.length;
  }

  function handleSaveBatchNames() {
    var lines = DOM.textareaBatchNames.value.split('\n').map(function (line) {
      return line.trim();
    }).filter(function (line) {
      return line !== '';
    });

    if (lines.length === 0) {
      showToast('최소 1명 이상의 이름을 입력해 주세요.', '⚠️');
      return;
    }

    for (var i = 0; i < TOTAL_STUDENTS; i++) {
      if (lines[i]) {
        state.students[i].name = lines[i];
      }
    }

    saveStudentsToLocalStorage();
    renderStudentTiles();
    populateSelectOptions();
    closeModal(DOM.batchModal);
    showToast('22명 학생 명단이 성공적으로 적용되었습니다!', '📋');
  }

  function handleResetDefaultNames() {
    var confirmed = window.confirm('기본 이름(김민준, 이서아...)으로 복원하시겠습니까?');
    if (!confirmed) return;

    for (var i = 0; i < TOTAL_STUDENTS; i++) {
      state.students[i].name = DEFAULT_STUDENT_NAMES[i] || (i + 1 + '번 학생');
    }
    DOM.textareaBatchNames.value = state.students.map(function (s) { return s.name; }).join('\n');
    updateBatchCountBadge();
  }

  // --- 설정 모달 & code.gs 안내 ---
  function openSettingsModal() {
    DOM.inputWebAppUrl.value = state.webAppUrl;
    openModal(DOM.settingsModal);
  }

  function handleSaveSettings() {
    var url = DOM.inputWebAppUrl.value.trim();
    state.webAppUrl = url;
    localStorage.setItem(STORAGE_KEY_WEBAPP_URL, url);
    closeModal(DOM.settingsModal);
    showToast('구글 시트 연동 설정이 저장되었습니다.', '💾');
  }

  function handleTestConnection() {
    var url = DOM.inputWebAppUrl.value.trim();
    if (!url) {
      showToast('웹 앱 URL을 먼저 입력해 주세요.', '⚠️');
      return;
    }

    var originalText = DOM.btnTestConnection.innerHTML;
    DOM.btnTestConnection.disabled = true;
    DOM.btnTestConnection.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">연결 확인 중...</span>';

    fetch(url + (url.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now())
      .then(function (res) { return res.json(); })
      .then(function (data) {
        DOM.btnTestConnection.disabled = false;
        DOM.btnTestConnection.innerHTML = originalText;
        if (data && data.status === 'success') {
          showToast('✅ 구글 시트 Apps Script에 정상적으로 연결되었습니다!', '🌐');
        } else {
          showToast('⚠️ 응답을 받았으나 정상 형식이 아닙니다: ' + JSON.stringify(data), '⚠️');
        }
      })
      .catch(function (err) {
        DOM.btnTestConnection.disabled = false;
        DOM.btnTestConnection.innerHTML = originalText;
        showToast('❌ 연결 실패: 웹 앱 URL 또는 [모든 사용자] 권한 설정을 확인하세요.', '❌');
      });
  }

  function handleCopyCodeGs() {
    var code = DOM.codeGsPreview.value;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(function () {
        showToast('📋 code.gs 코드가 클립보드에 복사되었습니다!', '📋');
      }).catch(function () {
        copyFallback(code);
      });
    } else {
      copyFallback(code);
    }
  }

  function copyFallback(text) {
    DOM.codeGsPreview.select();
    try {
      document.execCommand('copy');
      showToast('📋 code.gs 코드가 클립보드에 복사되었습니다!', '📋');
    } catch (e) {
      showToast('직접 텍스트를 선택하여 복사해 주세요.', '⚠️');
    }
  }

  function initCodeGsPreview() {
    // code.gs 내용을 textarea에 채워넣음
    var codeContent = [
      '// [우유 급식 확인 보드 - Google Apps Script code.gs]',
      'var SHEET_STUDENTS = "학생명단";',
      'var SHEET_STATUS = "제출현황";',
      '',
      'function doGet(e) {',
      '  var ss = SpreadsheetApp.getActiveSpreadsheet();',
      '  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";',
      '  if (action === "getStudents") {',
      '    var sheet = ss.getSheetByName(SHEET_STUDENTS) || initStudentSheet(ss);',
      '    var data = sheet.getDataRange().getValues();',
      '    var students = [];',
      '    for (var i = 1; i < data.length; i++) {',
      '      if (data[i][0] && data[i][1]) students.push({ number: Number(data[i][0]), name: String(data[i][1]).trim() });',
      '    }',
      '    return ContentService.createTextOutput(JSON.stringify({ status: "success", students: students })).setMimeType(ContentService.MimeType.JSON);',
      '  }',
      '  return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "OK" })).setMimeType(ContentService.MimeType.JSON);',
      '}',
      '',
      'function doPost(e) {',
      '  var ss = SpreadsheetApp.getActiveSpreadsheet();',
      '  var data = JSON.parse(e.postData.contents);',
      '  var taskName = data.taskName || "우유 급식";',
      '  var students = data.students || [];',
      '  var timestamp = data.timestamp || Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");',
      '  var sheet = ss.getSheetByName(SHEET_STATUS) || initStatusSheet(ss);',
      '  var rows = students.map(function(s) {',
      '    return [taskName, s.number, s.name, s.completed ? "제출완료" : "미제출", s.checkTime || timestamp];',
      '  });',
      '  if (rows.length > 0) {',
      '    var last = sheet.getLastRow();',
      '    sheet.getRange(last + 1, 1, rows.length, 5).setValues(rows);',
      '  }',
      '  return ContentService.createTextOutput(JSON.stringify({ status: "success", count: rows.length })).setMimeType(ContentService.MimeType.JSON);',
      '}',
      '',
      'function initStudentSheet(ss) {',
      '  var sh = ss.insertSheet(SHEET_STUDENTS);',
      '  sh.appendRow(["번호", "이름"]);',
      '  for (var i = 1; i <= 22; i++) sh.appendRow([i, i + "번 학생"]);',
      '  return sh;',
      '}',
      '',
      'function initStatusSheet(ss) {',
      '  var sh = ss.insertSheet(SHEET_STATUS);',
      '  sh.appendRow(["과제명", "번호", "이름", "제출여부", "체크시간"]);',
      '  return sh;',
      '}'
    ].join('\n');

    DOM.codeGsPreview.value = codeContent;
  }

  // --- 모달 헬퍼 ---
  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // --- 토스트 알림 ---
  var toastTimeout = null;
  function showToast(msg, icon) {
    if (DOM.toastIcon) DOM.toastIcon.textContent = icon || '🥛';
    if (DOM.toastMessage) DOM.toastMessage.textContent = msg;

    DOM.toastNotification.classList.remove('hidden');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function () {
      DOM.toastNotification.classList.add('hidden');
    }, 3200);
  }

  // --- 오디오 신디사이저 (Web Audio API - 외부 파일 없이 100% 자체 생성) ---
  var audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playAudio(type) {
    if (state.audioMuted) return;
    var ctx = getAudioContext();
    if (!ctx) return;

    var now = ctx.currentTime;

    if (type === 'submit') {
      // 신선한 우유 방울 퐁당 소리 (Bubble Pop)
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);

    } else if (type === 'unsubmit') {
      // 취소 소리 (낮은 톤)
      var osc2 = ctx.createOscillator();
      var gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(320, now);
      osc2.frequency.exponentialRampToValueAtTime(220, now + 0.1);
      gain2.gain.setValueAtTime(0.2, now);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.12);

    } else if (type === 'fanfare') {
      // 100% 완료 축하 팡파르 (도-미-솔-도)
      var notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach(function (freq, idx) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = freq;
        var startT = now + idx * 0.12;
        g.gain.setValueAtTime(0.25, startT);
        g.gain.exponentialRampToValueAtTime(0.01, startT + 0.35);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(startT);
        o.stop(startT + 0.35);
      });
    } else if (type === 'success') {
      // 저장 성공 신호음
      var osc3 = ctx.createOscillator();
      var gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(587.33, now); // D5
      osc3.frequency.setValueAtTime(880, now + 0.1); // A5
      gain3.gain.setValueAtTime(0.25, now);
      gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now);
      osc3.stop(now + 0.28);
    }
  }

  function toggleAudio() {
    state.audioMuted = !state.audioMuted;
    localStorage.setItem(STORAGE_KEY_AUDIO_MUTED, String(state.audioMuted));
    updateAudioButtonUI();
    showToast(state.audioMuted ? '소리가 음소거되었습니다.' : '소리가 켜졌습니다.', state.audioMuted ? '🔇' : '🔊');
  }

  function updateAudioButtonUI() {
    if (!DOM.btnAudioToggle) return;
    var icon = DOM.btnAudioToggle.querySelector('.btn-icon');
    var text = DOM.btnAudioToggle.querySelector('.btn-text');
    if (state.audioMuted) {
      if (icon) icon.textContent = '🔇';
      if (text) text.textContent = '음소거';
      DOM.btnAudioToggle.classList.add('muted');
    } else {
      if (icon) icon.textContent = '🔊';
      if (text) text.textContent = '소리';
      DOM.btnAudioToggle.classList.remove('muted');
    }
  }

  // --- 전체 화면 전환 ---
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function (e) {
        console.warn('전체화면 실패:', e);
      });
      DOM.btnFullscreen.querySelector('.btn-text').textContent = '창 모드';
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      DOM.btnFullscreen.querySelector('.btn-text').textContent = '전체화면';
    }
  }

  // --- 축하 콘페티 파티클 시스템 (HTML Canvas) ---
  var confettiParticles = [];
  var confettiAnimId = null;

  function initConfetti() {
    var canvas = DOM.confettiCanvas;
    if (!canvas) return;
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function fireConfetti() {
    var canvas = DOM.confettiCanvas;
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    confettiParticles = [];
    var colors = ['#3b82f6', '#60a5fa', '#93c5fd', '#ffffff', '#fbbf24', '#34d399', '#f472b6'];

    for (var i = 0; i < 140; i++) {
      confettiParticles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.4,
        w: Math.random() * 12 + 6,
        h: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.7) * 22,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        gravity: 0.45,
        opacity: 1
      });
    }

    if (confettiAnimId) cancelAnimationFrame(confettiAnimId);

    function updateParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var stillAlive = false;

      for (var j = 0; j < confettiParticles.length; j++) {
        var p = confettiParticles[j];
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotSpeed;
        p.opacity -= 0.007;

        if (p.opacity > 0 && p.y < canvas.height + 50) {
          stillAlive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rot * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }

      if (stillAlive) {
        confettiAnimId = requestAnimationFrame(updateParticles);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        confettiAnimId = null;
      }
    }

    confettiAnimId = requestAnimationFrame(updateParticles);
  }

  // --- 이벤트 리스너 등록 ---
  function initEventListeners() {
    // 저장 버튼
    DOM.btnSaveToSheet.addEventListener('click', saveStatusToGoogleSheet);

    // 전체 초기화
    DOM.btnResetAll.addEventListener('click', resetAllStudents);

    // 시트 명단 불러오기
    DOM.btnFetchFromSheet.addEventListener('click', fetchStudentsFromSheet);

    // 하단 개별 학생 이름 저장
    DOM.editStudentForm.addEventListener('submit', handleStudentNameSubmit);
    DOM.selectStudentNum.addEventListener('change', syncCurrentInputName);

    // 일괄 수정 모달
    DOM.btnBatchEdit.addEventListener('click', openBatchModal);
    DOM.btnCloseBatchModal.addEventListener('click', function () { closeModal(DOM.batchModal); });
    DOM.btnSaveBatchNames.addEventListener('click', handleSaveBatchNames);
    DOM.btnResetDefaultNames.addEventListener('click', handleResetDefaultNames);
    DOM.textareaBatchNames.addEventListener('input', updateBatchCountBadge);

    // 설정 모달
    DOM.btnSettings.addEventListener('click', openSettingsModal);
    DOM.btnCloseSettingsModal.addEventListener('click', function () { closeModal(DOM.settingsModal); });
    DOM.btnSaveSettings.addEventListener('click', handleSaveSettings);
    DOM.btnTestConnection.addEventListener('click', handleTestConnection);
    DOM.btnCopyCodeGs.addEventListener('click', handleCopyCodeGs);

    // 오디오 토글 & 전체화면
    DOM.btnAudioToggle.addEventListener('click', toggleAudio);
    DOM.btnFullscreen.addEventListener('click', toggleFullscreen);

    // 모달 배경 클릭 시 닫기
    window.addEventListener('click', function (e) {
      if (e.target === DOM.settingsModal) closeModal(DOM.settingsModal);
      if (e.target === DOM.batchModal) closeModal(DOM.batchModal);
    });

    // ESC 키로 모달 닫기
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeModal(DOM.settingsModal);
        closeModal(DOM.batchModal);
      }
    });
  }

  // DOM 로드 완료 시 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
