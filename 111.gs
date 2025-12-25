/**
 * 蜜桃快逃 RPG - Google Apps Script
 * 功能：
 * 1. 初始化存檔表格
 * 2. 提供 CRUD API
 */

const SHEET_NAME = 'SAVE_DATA';

// 在 Code.gs 裡面新增這個，否則無法跳轉頁面
function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

/**
 * 初始化 Sheet（第一次手動執行一次即可）
 */
function initSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'user_id',       // 0
      'slot_id',       // 1
      'current_scene', // 2
      'current_page',  // 3
      'visited_scenes',// 4 JSON
      'unlocked_endings', // 5 JSON
      'is_dead',       // 6
      'saved_at'       // 7 timestamp
    ]);
  }
}

/**
 * 取得使用者所有存檔
 */
function getUserSaves(userId) {
  initSheet();
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  return rows
    .slice(1)
    .filter(r => r[0] === userId)
    .map(r => ({
      slot_id: r[1],
      current_scene: r[2],
      current_page: r[3],
      visited_scenes: r[4],
      unlocked_endings: r[5],
      is_dead: r[6],
      saved_at: r[7]
    }));
}

/**
 * 新增或更新存檔
 */
function upsertSave(userId, data) {
  initSheet();
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === userId && rows[i][1] === data.slot_id) {
      sheet.getRange(i + 1, 3, 1, 5).setValues([[
        data.current_scene,
        data.current_page,
        data.visited_scenes,
        data.unlocked_endings,
        data.is_dead
      ]]);
      sheet.getRange(i + 1, 8).setValue(new Date(data.saved_at));
      return { isOk: true, action: 'updated' };
    }
  }

  sheet.appendRow([
    userId,
    data.slot_id,
    data.current_scene,
    data.current_page,
    data.visited_scenes,
    data.unlocked_endings,
    data.is_dead,
    new Date(data.saved_at)
  ]);
  return { isOk: true, action: 'created' };
}

/**
 * 刪除存檔
 */
function deleteSave(userId, slotId) {
  initSheet();
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  
  for (let i = rows.length - 1; i > 0; i--) {
    if (rows[i][0] === userId && rows[i][1] === slotId) {
      sheet.deleteRow(i + 1);
      return { isOk: true };
    }
  }
  return { isOk: false, message: "未找到存檔" };
}

/**
 * Web App GET
 * ?user=xxx
 */
function doGet(e) {
  const userId = e.parameter.user || 'guest';
  const data = getUserSaves(userId);
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Web App POST
 * body._action = 'create' | 'update' | 'delete'
 */
function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const userId = body.user_id || 'guest';
  let result;

  if (body._action === 'delete') {
    result = deleteSave(userId, body.slot_id);
  } else {
    result = upsertSave(userId, body);
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
