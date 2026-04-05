// ============================================================
//  MY FINANCE TRACKER — Google Sheets Script (Updated)
//  Paste this into Apps Script, then re-deploy as a NEW deployment
//  Extensions → Apps Script → replace everything → Deploy → New deployment
// ============================================================

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Parse data — supports both JSON body and form field named "payload"
    var data;
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch(ex) {
        // If raw body isn't JSON, try reading the "payload" form field
        data = JSON.parse(e.parameter.payload);
      }
    } else if (e.parameter && e.parameter.payload) {
      data = JSON.parse(e.parameter.payload);
    } else {
      throw new Error('No data received.');
    }

    var rows = data.rows;
    if (!rows || rows.length === 0) {
      throw new Error('No rows to insert.');
    }

    // Add header row if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Date', 'Amount (RM)', 'Account', 'Category', 'Sub-category', 'Remarks', 'Type']);

      var headerRange = sheet.getRange(1, 1, 1, 7);
      headerRange.setBackground('#1a7a5e');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      headerRange.setFontSize(11);

      sheet.setColumnWidth(1, 110);
      sheet.setColumnWidth(2, 110);
      sheet.setColumnWidth(3, 100);
      sheet.setColumnWidth(4, 110);
      sheet.setColumnWidth(5, 120);
      sheet.setColumnWidth(6, 180);
      sheet.setColumnWidth(7, 90);
      sheet.setFrozenRows(1);
    }

    // Append each row
    rows.forEach(function(row) {
      sheet.appendRow(row);
    });

    // Colour-code Type column and format Amount for new rows
    var lastRow  = sheet.getLastRow();
    var firstNew = lastRow - rows.length + 1;

    for (var i = firstNew; i <= lastRow; i++) {
      var typeCell = sheet.getRange(i, 7);
      var typeVal  = String(typeCell.getValue()).toLowerCase();

      if (typeVal === 'expense') {
        typeCell.setBackground('#fdecea');
        typeCell.setFontColor('#c0392b');
      } else if (typeVal === 'income') {
        typeCell.setBackground('#eafaf1');
        typeCell.setFontColor('#27ae60');
      } else if (typeVal === 'savings') {
        typeCell.setBackground('#e8f8f5');
        typeCell.setFontColor('#16a085');
      }

      sheet.getRange(i, 2).setNumberFormat('#,##0.00');
    }

    // Return success — redirects back so the iframe handles it silently
    return ContentService
      .createTextOutput('OK: ' + rows.length + ' rows added.')
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return ContentService
      .createTextOutput('ERROR: ' + err.toString())
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

// For testing — visit the URL in browser to confirm script is live
function doGet(e) {
  return ContentService
    .createTextOutput('Finance Tracker script is running OK.')
    .setMimeType(ContentService.MimeType.TEXT);
}
