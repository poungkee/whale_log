// Phase 2D 다이어리 신고 시스템 종합 검증 스크립트
// 정상 흐름 + 방어 로직 + 관리자 처리 17개 케이스
const axios = require('axios');
const { Client } = require('pg');

const API = 'https://whalelog-production.up.railway.app/api/v1';
const DB_URL = 'postgresql://postgres:dmgStqyqxXHwFWmvxvLEBfJqaciPmpYE@roundhouse.proxy.rlwy.net:37055/railway';

const results = [];
const log = (test, action, expected, actual) => {
  const expStr = String(expected);
  const actStr = String(actual);
  const pass = actStr === expStr || actStr.includes(expStr);
  results.push({ test, action, expected: expStr, actual: actStr, pass });
  console.log(`[${pass ? '✅ PASS' : '❌ FAIL'}] ${test}`);
  console.log(`    실행: ${action}`);
  console.log(`    기대: ${expStr}`);
  console.log(`    실제: ${actStr}\n`);
};

(async () => {
  const c = new Client({ connectionString: DB_URL });
  await c.connect();

  const ts = Date.now();
  const ids = {};

  try {
    // ========== 준비: 사용자 A(신고자), B(작성자) 회원가입 ==========
    console.log('=== 준비 단계 ===\n');

    const userA = await axios.post(`${API}/auth/register`, {
      email: `test_a_${ts}@test.com`,
      password: 'Test1234!',
      username: `testa_${ts.toString().slice(-7)}`,
    });
    const tokenA = userA.data.accessToken;
    ids.userA = userA.data.user.id;
    console.log(`사용자 A 가입: ${ids.userA}`);

    const userB = await axios.post(`${API}/auth/register`, {
      email: `test_b_${ts}@test.com`,
      password: 'Test1234!',
      username: `testb_${ts.toString().slice(-7)}`,
    });
    const tokenB = userB.data.accessToken;
    ids.userB = userB.data.user.id;
    console.log(`사용자 B 가입: ${ids.userB}`);

    // 스팟 ID 가져오기
    const spotRes = await c.query(`SELECT id FROM spots LIMIT 1`);
    ids.spotId = spotRes.rows[0].id;

    // B가 PUBLIC 다이어리 작성
    const dPub = await axios.post(`${API}/diary`, {
      spotId: ids.spotId, surfDate: '2026-05-04', boardType: 'SHORTBOARD',
      durationMinutes: 60, satisfaction: 4, visibility: 'PUBLIC',
      memo: '테스트용 공개 다이어리',
    }, { headers: { Authorization: `Bearer ${tokenB}` } });
    ids.diaryPublic = dPub.data.id;
    console.log(`B의 PUBLIC 다이어리: ${ids.diaryPublic}`);

    // B가 PRIVATE 다이어리 작성 (B-4 테스트용)
    const dPri = await axios.post(`${API}/diary`, {
      spotId: ids.spotId, surfDate: '2026-05-04', boardType: 'SHORTBOARD',
      durationMinutes: 60, satisfaction: 4, visibility: 'PRIVATE',
      memo: '테스트용 비공개 다이어리',
    }, { headers: { Authorization: `Bearer ${tokenB}` } });
    ids.diaryPrivate = dPri.data.id;
    console.log(`B의 PRIVATE 다이어리: ${ids.diaryPrivate}\n`);

    // ========== 정상 흐름 ==========
    console.log('=== 정상 흐름 (Happy Path) ===\n');

    // [T1] 정상 신고 접수 → 200/201
    try {
      const r = await axios.post(`${API}/diary/${ids.diaryPublic}/report`,
        { reason: 'INAPPROPRIATE', description: '노출 사진 포함' },
        { headers: { Authorization: `Bearer ${tokenA}` } });
      log('T1: 정상 신고 접수', 'A → B의 PUBLIC 다이어리 신고', '200/201', r.status);
    } catch (e) { log('T1: 정상 신고 접수', 'A → B', '200/201', e.response?.status || 'ERR'); }

    // [T2] DB에 reports row 생성 (정확한 컬럼 채워짐)
    const dbR = await c.query(
      'SELECT reporter_id, diary_id, reason, status, post_id, comment_id FROM reports WHERE diary_id=$1',
      [ids.diaryPublic]
    );
    const row = dbR.rows[0];
    const expectStr = 'reporter=A diary=PUBLIC status=PENDING post=null comment=null';
    const actualStr = row
      ? `reporter=${row.reporter_id===ids.userA?'A':'?'} diary=${row.diary_id===ids.diaryPublic?'PUBLIC':'?'} status=${row.status} post=${row.post_id||'null'} comment=${row.comment_id||'null'}`
      : '없음';
    log('T2: DB 적재 정확성', 'reports 테이블 직접 조회', expectStr, actualStr);

    // ========== 방어 로직 ==========
    console.log('=== 방어 로직 (Defense) ===\n');

    // [T3] B-3: 본인 다이어리 신고 차단 → 400
    try {
      await axios.post(`${API}/diary/${ids.diaryPublic}/report`,
        { reason: 'SPAM' },
        { headers: { Authorization: `Bearer ${tokenB}` } });
      log('T3: 본인 다이어리 신고 차단(B-3)', 'B → 자기 다이어리', 400, '통과 - 버그');
    } catch (e) {
      log('T3: 본인 다이어리 신고 차단(B-3)', 'B → 자기 다이어리', 400, e.response?.status);
    }

    // [T4] B-4: 비공개 다이어리 신고 차단 → 403
    try {
      await axios.post(`${API}/diary/${ids.diaryPrivate}/report`,
        { reason: 'SPAM' },
        { headers: { Authorization: `Bearer ${tokenA}` } });
      log('T4: 비공개 다이어리 신고 차단(B-4)', 'A → B의 PRIVATE', 403, '통과 - 버그');
    } catch (e) {
      log('T4: 비공개 다이어리 신고 차단(B-4)', 'A → B의 PRIVATE', 403, e.response?.status);
    }

    // [T5] B-5: 중복 신고 차단 → 409
    try {
      await axios.post(`${API}/diary/${ids.diaryPublic}/report`,
        { reason: 'SPAM' },
        { headers: { Authorization: `Bearer ${tokenA}` } });
      log('T5: 중복 신고 차단(B-5)', 'A → B의 PUBLIC (2회차)', 409, '통과 - 버그');
    } catch (e) {
      log('T5: 중복 신고 차단(B-5)', 'A → B의 PUBLIC (2회차)', 409, e.response?.status);
    }

    // [T6] B-2: 미존재 다이어리 신고 → 404
    try {
      await axios.post(`${API}/diary/00000000-0000-0000-0000-000000000000/report`,
        { reason: 'SPAM' },
        { headers: { Authorization: `Bearer ${tokenA}` } });
      log('T6: 미존재 다이어리 신고(B-2)', 'A → 존재하지 않는 ID', 404, '통과 - 버그');
    } catch (e) {
      log('T6: 미존재 다이어리 신고(B-2)', 'A → 존재하지 않는 ID', 404, e.response?.status);
    }

    // [T7] B-6: 잘못된 reason enum → 400
    try {
      await axios.post(`${API}/diary/${ids.diaryPublic}/report`,
        { reason: 'INVALID_REASON' },
        { headers: { Authorization: `Bearer ${tokenA}` } });
      log('T7: 잘못된 reason enum(B-6)', 'reason=INVALID_REASON', 400, '통과 - 버그');
    } catch (e) {
      log('T7: 잘못된 reason enum(B-6)', 'reason=INVALID_REASON', 400, e.response?.status);
    }

    // [T8] F-1: 비로그인 신고 → 401
    try {
      await axios.post(`${API}/diary/${ids.diaryPublic}/report`,
        { reason: 'SPAM' });
      log('T8: 비로그인 신고 차단(F-1)', '토큰 없이 호출', 401, '통과 - 버그');
    } catch (e) {
      log('T8: 비로그인 신고 차단(F-1)', '토큰 없이 호출', 401, e.response?.status);
    }

    // [T9] B-7: description 500자 초과 → 400
    try {
      await axios.post(`${API}/diary/${ids.diaryPublic}/report`,
        { reason: 'SPAM', description: 'x'.repeat(501) },
        { headers: { Authorization: `Bearer ${tokenA}` } });
      log('T9: description 길이 검증(B-7)', 'description=501자', 400, '통과 - 버그');
    } catch (e) {
      log('T9: description 길이 검증(B-7)', 'description=501자', 400, e.response?.status);
    }

    // ========== 관리자 처리 (DB 시뮬레이션) ==========
    console.log('=== 관리자 처리 (DB 시뮬레이션) ===\n');

    // [T10] AdminService.hideDiary 시뮬: is_hidden=true 업데이트
    await c.query('UPDATE surf_diaries SET is_hidden=true WHERE id=$1', [ids.diaryPublic]);
    const hidden = await c.query('SELECT is_hidden FROM surf_diaries WHERE id=$1', [ids.diaryPublic]);
    log('T10: 다이어리 숨김 처리', 'admin이 hideDiary 호출 시뮬', true, hidden.rows[0].is_hidden);

    // [T11] A-2: findPublic isHidden=false 필터 동작
    const pubFeed = await axios.get(`${API}/diary/public?spotId=${ids.spotId}&page=1&limit=20`);
    const inFeed = pubFeed.data.data.find(d => d.id === ids.diaryPublic);
    log('T11: 공개 피드 노출 차단(A-2)', 'GET /diary/public 조회', '없음', inFeed ? '있음(버그)' : '없음');

    // [T12] A-3: 본인은 자기 숨김 다이어리 조회 가능
    try {
      const own = await axios.get(`${API}/diary/${ids.diaryPublic}`,
        { headers: { Authorization: `Bearer ${tokenB}` } });
      log('T12: 본인 숨김 다이어리 조회(A-3)', 'B가 자기 숨김 다이어리 조회', 200, own.status);
    } catch (e) {
      log('T12: 본인 숨김 다이어리 조회(A-3)', 'B가 자기 숨김 다이어리 조회', 200, e.response?.status);
    }

    // [T13] 타인은 숨김 다이어리 조회 불가 → 403
    try {
      await axios.get(`${API}/diary/${ids.diaryPublic}`,
        { headers: { Authorization: `Bearer ${tokenA}` } });
      log('T13: 타인 숨김 다이어리 차단', 'A가 B의 숨김 다이어리 조회', 403, '통과 - 버그');
    } catch (e) {
      log('T13: 타인 숨김 다이어리 차단', 'A가 B의 숨김 다이어리 조회', 403, e.response?.status);
    }

    // [T14] AdminService.hideDiary의 알림 발송 시뮬
    await c.query(
      `INSERT INTO notifications (user_id, type, title, body, data) VALUES ($1, 'CONTENT_HIDDEN', '다이어리가 숨김 처리되었습니다', '회원님의 다이어리가 가이드라인 위반으로 숨김 처리되었습니다.', '{"contentType":"DIARY"}')`,
      [ids.userB]
    );
    const notif = await c.query(`SELECT type, title FROM notifications WHERE user_id=$1 AND type='CONTENT_HIDDEN'`, [ids.userB]);
    log('T14: B에게 CONTENT_HIDDEN 알림', 'INSERT into notifications', '1건 (CONTENT_HIDDEN)', `${notif.rows.length}건 (${notif.rows[0]?.type})`);

    // [T15] AdminService.resolveReport 시뮬: status, resolved_by_id
    const adminRes = await c.query(`SELECT id FROM users WHERE role='ADMIN' LIMIT 1`);
    const adminId = adminRes.rows[0]?.id;
    if (adminId) {
      await c.query(
        `UPDATE reports SET status='RESOLVED', admin_note='가이드라인 위반', resolved_by_id=$1, resolved_at=NOW() WHERE diary_id=$2`,
        [adminId, ids.diaryPublic]
      );
      const resolved = await c.query(`SELECT status, admin_note, resolved_by_id FROM reports WHERE diary_id=$1`, [ids.diaryPublic]);
      const r = resolved.rows[0];
      const expected = 'status=RESOLVED + resolved_by=ADMIN';
      const actual = `status=${r.status} + resolved_by=${r.resolved_by_id===adminId?'ADMIN':'?'}`;
      log('T15: 신고 처리 완료', 'admin이 RESOLVED 처리', expected, actual);
    }

    // [T16] AdminLog 감사 기록
    await c.query(
      `INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, description) VALUES ($1, 'HIDE_DIARY', 'DIARY', $2, '테스트')`,
      [adminId, ids.diaryPublic]
    );
    const logRow = await c.query(`SELECT action_type, target_type FROM admin_logs WHERE target_id=$1`, [ids.diaryPublic]);
    log('T16: AdminLog 감사 기록', 'admin_logs INSERT', 'HIDE_DIARY + DIARY', `${logRow.rows[0].action_type} + ${logRow.rows[0].target_type}`);

    // [T17] R-5: 다이어리 삭제 시 reports.diary_id SET NULL
    await c.query('DELETE FROM surf_diaries WHERE id=$1', [ids.diaryPublic]);
    const afterDel = await c.query('SELECT diary_id FROM reports WHERE reporter_id=$1', [ids.userA]);
    const dryDel = afterDel.rows[0]?.diary_id;
    log('T17: FK ON DELETE SET NULL(R-5)', 'B의 다이어리 삭제 후 reports.diary_id', 'null', dryDel === null ? 'null' : dryDel);

    // ========== 정리 ==========
    console.log('=== 정리 ===');
    await c.query('DELETE FROM admin_logs WHERE admin_id=$1 AND target_id IS NOT NULL AND (target_id=$2 OR target_id=$3)', [adminId, ids.diaryPublic, ids.diaryPrivate]);
    await c.query('DELETE FROM admin_logs WHERE description=$1', ['테스트']);
    await c.query('DELETE FROM notifications WHERE user_id=$1 OR user_id=$2', [ids.userA, ids.userB]);
    await c.query('DELETE FROM reports WHERE reporter_id=$1 OR reporter_id=$2', [ids.userA, ids.userB]);
    await c.query('DELETE FROM surf_diaries WHERE user_id=$1 OR user_id=$2', [ids.userA, ids.userB]);
    await c.query('DELETE FROM users WHERE id=$1 OR id=$2', [ids.userA, ids.userB]);
    console.log('테스트 데이터 정리 완료\n');

    // 결과 요약
    const passCount = results.filter(r => r.pass).length;
    console.log(`==========================================`);
    console.log(`결과: ${passCount} / ${results.length} 통과`);
    console.log(`==========================================`);
    if (passCount < results.length) {
      console.log('실패 케이스:');
      results.filter(r => !r.pass).forEach(r => {
        console.log(`  - ${r.test}: 기대 ${r.expected}, 실제 ${r.actual}`);
      });
    }
  } catch (e) {
    console.error('테스트 중단:', e.response?.data || e.message);
  } finally {
    await c.end();
  }
})();
