function doGet(e) {
  var callback = e.parameter.callback;
  var action = e.parameter.action;
  var result = { result: 'error', message: 'invalid request' };

  try {
    var ss = SpreadsheetApp.openById('1bniIL-y285kEHvF_bzRRBOUYGrwcjwEaIrxWGIwh71s');

    if (action === 'marketlist') {
      // --- ส่งข้อมูล marketlist กลับในรูปแบบ JSON ---
      var sheet = ss.getSheetByName('marketlist');
      if (!sheet) throw new Error("ไม่พบแผ่นงาน marketlist ในไฟล์ชีท");
      var values = sheet.getDataRange().getValues();
      var headers = values[0].map(String); // ให้ headers เป็น string
      var data = [];
      for (var i = 1; i < values.length; i++) {
        var row = {};
        for (var j = 0; j < headers.length; j++) {
          row[headers[j]] = values[i][j];
        }
        data.push(row);
      }
      result = { result: 'success', data: data };

    } else if (e.parameter.data) {
      // --- รับข้อมูลบิล/รายจ่ายและบันทึกลงชีท ---
      var arr = JSON.parse(e.parameter.data);
      var sheet = ss.getSheetByName('datalog'); // ใช้ datalog ตามที่กำหนด
      if (!sheet) throw new Error("ไม่พบแผ่นงาน datalog ในไฟล์ชีท");

      var values = [];
      arr.forEach(function(row) {
        values.push([
          row.date_bill || "",      // วันที่ซื้อ
          row.supplier || "",       // แหล่งที่ซื้อ
          row.name || "",           // ชื่อสินค้า
          row.unit || "",           // หน่วย
          row.group || "",          // หมวดหมู่สินค้า
          row.amount || "",         // จำนวน
          row.price_unit || "",     // ราคาต่อหน่วย
          row.total || "",          // รวม
          row.in_unit || "",        // หน่วยย่อย
          row.sec_unit || "",       // หน่วยในหน่วย
          row.remarks || "",        // หมายเหตุ
          row.records_time || ""    // records_time
        ]);
      });
      if (values.length > 0) {
        var startRow = sheet.getLastRow() + 1;
        sheet.getRange(startRow, 1, values.length, values[0].length).setValues(values);
      }
      result = { result: 'success' };
    }
  } catch (err) {
    result = { result: 'error', message: err.message };
  }

  if (callback) {
    var content = callback + '(' + JSON.stringify(result) + ')';
    return ContentService.createTextOutput(content).setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }
}
