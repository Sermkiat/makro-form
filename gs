/**
 * === Google Apps Script สำหรับ expense.html ===
 * ฟีเจอร์:
 * - รองรับ CORS (GET, POST, OPTIONS)
 * - GET ?action=marketlist => ส่งข้อมูล MarketList เป็น JSON สำหรับ autocomplete
 * - POST ข้อมูลบิล => บันทึกลงชีต datalog
 * - Error handling และ validation
 */

// ===== CORS =====
function setCors(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

function doOptions(e) {
  return setCors(ContentService.createTextOutput());
}

// ===== MAIN ENTRY (GET/POST) =====
function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  if (params.action === 'marketlist') {
    var json = getMarketListData();
    var output = ContentService.createTextOutput(json)
                   .setMimeType(ContentService.MimeType.JSON);
    return setCors(output);
  }
  // หากไม่ได้ขอ marketlist ให้ส่งไฟล์ expense.html (กรณีทดสอบใน Apps Script)
  return HtmlService.createHtmlOutputFromFile('expense')
         .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  var result;
  try {
    var payload = JSON.parse(e.postData.getDataAsString());
    result = logExpenseData(payload);
  } catch (err) {
    result = { success: false, message: 'Invalid JSON: ' + err };
  }
  var out = ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
  return setCors(out);
}

// ===== อ่าน MarketList สำหรับ autocomplete =====
function getMarketListData() {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName('MarketList');
  if (!sheet) return '[]';
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return '[]'; // ไม่มีข้อมูล
  var headers = values.shift();
  // Map หัวข้อชีตกับ field ที่ใช้ใน HTML
  var list = values.map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      if (h === 'ชื่อสินค้า')       obj.nm       = row[i];
      if (h === 'หมวดหมู่สินค้า')   obj.gr       = row[i];
      if (h === 'หน่วย')           obj.un       = row[i];
      if (h === 'หน่วยย่อย')      obj.in_unit  = row[i];
      if (h === 'หน่วยในหน่วย')    obj.sec_unit = row[i];
    });
    return obj.nm ? obj : null; // ต้องมีชื่อสินค้า
  }).filter(Boolean);
  return JSON.stringify(list);
}

// ===== บันทึกข้อมูลลงชีต datalog =====
function logExpenseData(payload) {
  // Validation เบื้องต้น
  if (!payload || !payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
    return { success: false, message: 'ไม่มีรายการสินค้า' };
  }
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName('datalog');
  if (!sheet) return { success: false, message: 'Sheet "datalog" not found.' };

  // เตรียมข้อมูลแถวที่จะบันทึก
  var rows = [];
  payload.items.forEach(function(it) {
    // Validation เพิ่มเติม (ชื่อ, จำนวน > 0, ... )
    if (!it.nm || !it.gr || !it.am || isNaN(it.am) || it.am <= 0) return;
    rows.push([
      new Date(payload.date_bill),
      payload.supplier,
      it.nm, it.gr, it.am, it.un,
      it.pu, it.to,
      it.in_unit, it.sec_unit,
      it.note,
      new Date()
    ]);
  });
  if (rows.length === 0) {
    return { success: false, message: 'ไม่มีรายการที่กรอกจำนวน' };
  }
  // หาตำแหน่งแถวต่อไป (กรณีมี header 1 แถว)
  var startRow = sheet.getLastRow() + 1;
  try {
    sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
    return { success: true, message: 'บันทึกข้อมูลสำเร็จ' };
  } catch (err) {
    return { success: false, message: 'บันทึกข้อมูลไม่สำเร็จ: ' + err };
  }
}
