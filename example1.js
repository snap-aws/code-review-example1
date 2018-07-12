function attacheEvents(tableID) {
  focusOnTd(tableID)

  $("#" + tableID).on('validate', 'td', function(evt, newValue) {
    // here we should add proper validation for numbers and percentage
    if ($(this).hasClass('currency')) {
      if (!!newValue.match(/^[\$\-]+$/)) return false;
      var format1 = !!newValue.match(/(?=.)^\$?\-?(([1-9][0-9]{0,2}(,[0-9]{3})*)|[0-9]+)?(\.[0-9]{0,2})?$/);
      var format2 = !!newValue.match(/(?=.)^\-?\$?(([1-9][0-9]{0,2}(,[0-9]{3})*)|[0-9]+)?(\.[0-9]{0,2})?$/);

      return format1 || format2;
    } else if ($(this).hasClass('rate') || $(this).hasClass('interest')) {
      if (!!newValue.match(/^[\$\-%]+$/)) return false;
      return !!newValue.match(/(?=.)^\-?(([1-9][0-9]{0,2}(,[0-9]{3})*)|[0-9]+)?(\.[0-9]{0,2})?%?$/);
    }
    if (newValue.length === 0 || newValue.length > 20) {
      return false; // mark cell as invalid
    }
  });



  $("#" + tableID).on('change', 'td', function(evt, newValue) {
    // the validation is not firing for the datepicker so we have to do it here.
    // we allow empty string in the date

    if (newValue == null)
      newValue = $(this).val();

    if ($(this).hasClass('noNegative'))
      newValue = newValue.replace('-', '')

    if ($(this).hasClass('date')) {
      var datepicker = $(this).find('input:first');
      var value = datepicker.val();
      if (value !== '' && (!moment(value, 'DD/MM/YYYY').isValid() || !isValidDate(value))) {
        // invalid date
        $(this).focus();
        datepicker.addClass('error');

        // alternative would be that we just reset it to the original date string
        return;
      } else {
        datepicker.removeClass('error');
      }
    }

    // for currency and percentage, change the display but save the real value in an attribute data-value
    if ($(this).hasClass('currency')) {
      var value
      if (newValue == "0") {
        $(this).html("$0");
        $(this).attr("data-value", "0");
        value = 0
      } else {
        value = accounting.unformat(newValue);
        var formatedText
        if ($(this).prop('id') == "monthlyPayment")
          formatedText = formatToCurrencyToTwoDecimals(value);
        else
          formatedText = formatToCurrency(value);
        $(this).html(formatedText);
        $(this).attr("data-value", value);
      }

      if ($(this).is('#debtValue')) {
        var currentrow = $(this).closest('tr');
        var repayment = currentrow.find('td#repayment').find('select:first').val();
        if (repayment == "true") {
          var td = currentrow.find('td#monthlyPayment');
          var debtValue = currentrow.find('td#debtValue');
          var debtRate = currentrow.find('td#debtRate');
          recalculatePaymentSetHTML(debtValue, debtRate, td, false);
          td.change();
        }
      } else if ($(this).closest('tr').hasClass('newRow') && $(this).is('#value')) {
        var currentrow = $(this).closest('tr');
        var acb = currentrow.find('td#totalCost').html();
        if (acb == "") {
          currentrow.find('td#totalCost').html(currentrow.find('td#value').html())
          currentrow.find('td#totalCost').attr("data-value", value);
        }
      }

    } else if ($(this).hasClass('rate') || $(this).hasClass('interest')) {
      if (newValue == "0") {
        $(this).html("0.00%");
        $(this).attr("data-value", "0");
      } else {
        if (newValue != null) {
          newValue = newValue.replace('%', '');
          var value = accounting.unformat(newValue);
          var formatedText = formatToPercent(value);
          $(this).html(formatedText);
          $(this).attr("data-value", value);
        }

      }
      if ($(this).is('#debtRate')) {
        var currentrow = $(this).closest('tr');
        var repayment = currentrow.find('td#repayment').find('select:first').val();
        if (repayment == "true") {
          var td = currentrow.find('td#monthlyPayment');
          var debtValue = currentrow.find('td#debtValue');
          var debtRate = currentrow.find('td#debtRate');
          recalculatePaymentSetHTML(debtValue, debtRate, td, false);
          td.change();
        }
      } else if ($(this).closest('tr').hasClass('newRow') && ($(this).is('#cash') || $(this).is('#fixedIncome') || $(this).is('#equity'))) {
        //equity calculations
        var currentrow = $(this).closest('tr');

        var cash = currentrow.find('td#cash').html().replace('%', '');
        var fixedIncome = currentrow.find('td#fixedIncome').html().replace('%', '');
        var equity = currentrow.find('td#equity').html().replace('%', '');

        if ($(this).is('#cash') && cash == "100.00") {
          fixedIncome = "0"
          currentrow.find('td#fixedIncome').html("0.00%")
          currentrow.find('td#fixedIncome').attr("data-value", 0);
          equity = "0"
          currentrow.find('td#equity').html("0.00%")
          currentrow.find('td#equity').attr("data-value", 0);
        } else if ($(this).is('#fixedIncome') && fixedIncome == "100.00") {
          cash = "0"
          currentrow.find('td#cash').html("0.00%")
          currentrow.find('td#cash').attr("data-value", 0);
          equity = "0"
          currentrow.find('td#equity').html("0.00%")
          currentrow.find('td#equity').attr("data-value", 0);
        } else if ($(this).is('#equity') && equity == "100.00") {
          cash = "0"
          currentrow.find('td#cash').html("0.00%")
          currentrow.find('td#cash').attr("data-value", 0);
          fixedIncome = "0"
          currentrow.find('td#fixedIncome').html("0.00%")
          currentrow.find('td#fixedIncome').attr("data-value", 0);
        } else if (cash == "" && fixedIncome != "" && equity != "") {
          var e = 100.0 - parseFloat(fixedIncome) - parseFloat(equity)
          if (!isNaN(e)) {
            e = e.toFixed(2)
            currentrow.find('td#cash').html(e + "%")
            currentrow.find('td#cash').attr("data-value", e);
          }
        } else if (cash != "" && fixedIncome == "" && equity != "") {
          var e = 100.0 - parseFloat(cash) - parseFloat(equity)
          if (!isNaN(e)) {
            e = e.toFixed(2)
            currentrow.find('td#fixedIncome').html(e + "%")
            currentrow.find('td#fixedIncome').attr("data-value", e);
          }
        } else if (cash != "" && fixedIncome != "" && equity == "") {
          var e = 100.0 - parseFloat(cash) - parseFloat(fixedIncome)
          if (!isNaN(e)) {
            e = e.toFixed(2)
            currentrow.find('td#equity').html(e + "%")
            currentrow.find('td#equity').attr("data-value", e);
          }
        }

      }

      if ($(this).is('#cash') || $(this).is('#fixedIncome') || $(this).is('#equity')) {
        var currentrow = $(this).closest('tr');
        addErrorCSSToAssetMix(currentrow)
      }

    } else if ($(this).hasClass('repayment')) {
      var disableMonhtlPayment = $(this).find('select:first').val();
      var currentrow = $(this).closest('tr');
      var td = currentrow.find('td#monthlyPayment');
      if (disableMonhtlPayment == "true") {
        var debtValue = currentrow.find('td#debtValue');
        var debtRate = currentrow.find('td#debtRate');
        recalculatePaymentSetHTML(debtValue, debtRate, td, true)
        td.addClass("edit-disabled")
        td.change();
      } else {
        td.removeClass("edit-disabled")
      }
    }

    if ($(this).hasClass('expectedToBuyDate')) {
      var currentrow = $(this).closest('tr');
      var currentValue = currentrow.find('td.currentValue');
      var originalValue = currentrow.find('td.originalValue');
      var dateVal = $(this).children().val() //get inside datepicker
      if (dateVal === "" || dateVal === null) {
        currentValue.removeClass("edit-disabled")
        var htm = originalValue.html()
        currentValue.html(htm)
        var val = originalValue.attr("data-value")
        currentValue.val(val);
        currentValue.change();
      } else {
        if (originalValue.html() === "$0" && currentValue.html() !== "") {
          originalValue.html(currentValue.html())
          var val = currentValue.attr("data-value")
          originalValue.val(val);
          originalValue.change()
        }
        currentValue.html('$0')
        currentValue.val(0)
        currentValue.addClass("edit-disabled")
        currentValue.change();
      }
    }

    var completeLen;
    if (tableID === 'asset' || tableID === 'dcpp' || tableID === 'corpAsset') {
      if (tableID === 'asset')
        completeLen = updateACB ? 10 : 9;
      if (tableID === 'corpAsset')
        completeLen = updateACB ? 9 : 8;
      else if (tableID === 'dcpp')
        completeLen = 10;

      //calculate Total RoR
      var currentrow = $(this).closest('tr');
      var cash = currentrow.find('td#cash').html().replace('%', '');
      var cashRor = currentrow.find('td#cashRor').html().replace('%', '');
      var fixedIncome = currentrow.find('td#fixedIncome').html().replace('%', '');
      var fixedIncomeRor = currentrow.find('td#fixedIncomeRor').html().replace('%', '');
      var equity = currentrow.find('td#equity').html().replace('%', '');
      var equityRor = currentrow.find('td#equityRor').html().replace('%', '');
      var totalRor = parseFloat(cash) * parseFloat(cashRor) + parseFloat(fixedIncome) * parseFloat(fixedIncomeRor) + parseFloat(equity) * parseFloat(equityRor)
      if (!isNaN(totalRor)) {
        var t = totalRor / 100;
        t = t.toFixed(2)
        currentrow.find('td#totalRor').html(t + "%")
      }
    } else if (tableID === 'realAsset') {
      completeLen = 7;
      if (isSpouseInScenario)
        completeLen = 8;
    } else {
      completeLen = 7;
      if (isSpouseInScenario)
        completeLen = 8;
    }
    if ($(this).closest('tr').hasClass('newRow')) {
      // check all cells. If they are all filled, post data to the server
      // if everything works out, remove the newRow class on the row
      var values = [];
      var currentRow = $(this).closest('tr');
      currentRow.find('td:not(.actions)').each(function() {
        var value;
        if ($(this).hasClass('select')) {
          value = $(this).find('select:first').val();
        } else if ($(this).hasClass('date')) {
          value = $(this).find('input:first').val();
          if (value === '') values.push(value); // we allow empty string for date
        } else if ($(this).hasClass('currency') || $(this).hasClass('rate') || $(this).hasClass('interest')) {
          value = $(this).attr("data-value");
        } else {
          value = $(this).html();
        }

        // if the
        if (value !== '' && value !== '--' && value !== undefined) {
          values.push(value);
        }
      });
      if (values.length == completeLen) {
        var obj;
        if (tableID == 'asset') {
          if (updateACB) {
            obj = {
              description: values[0],
              value: values[1],
              totalCost: values[2],
              type: values[3],
              cash: values[4],
              cashRor: values[5],
              fixedIncome: values[6],
              fixedIncomeRor: values[7],
              equity: values[8],
              equityRor: values[9],
              scenarioID: $('#scenarioID').val(),
              isSpouse: isSpouse
            };
          } else {
            obj = {
              description: values[0],
              value: values[1],
              type: values[2],
              cash: values[3],
              cashRor: values[4],
              fixedIncome: values[5],
              fixedIncomeRor: values[6],
              equity: values[7],
              equityRor: values[8],
              scenarioID: $('#scenarioID').val(),
              isSpouse: isSpouse
            };
          }
        } else if (tableID == 'corpAsset') {
          if (updateACB) {
            obj = {
              description: values[0],
              value: values[1],
              totalCost: values[2],
              cash: values[3],
              cashRor: values[4],
              fixedIncome: values[5],
              fixedIncomeRor: values[6],
              equity: values[7],
              equityRor: values[8],
              corporationId: $('#corporationId').val()
            };
          } else {
            obj = {
              description: values[0],
              value: values[1],
              cash: values[2],
              cashRor: values[3],
              fixedIncome: values[4],
              fixedIncomeRor: values[5],
              equity: values[6],
              equityRor: values[7],
              corporationId: $('#corporationId').val()
            };
          }
        } else if (tableID == 'dcpp') {
          obj = {
            description: values[0],
            value: values[1],
            employeeContribution: values[2],
            employerContribution: values[3],
            type: 'DCPP',
            cash: values[4],
            cashRor: values[5],
            fixedIncome: values[6],
            fixedIncomeRor: values[7],
            equity: values[8],
            equityRor: values[9],
            scenarioID: $('#scenarioID').val(),
            isSpouse: isSpouse
          };
        } else if (tableID == 'realAsset') {
          if (isSpouseInScenario) {
            obj = {
              description: values[0],
              currentValue: values[1],
              originalValue: values[2],
              annualAppreciation: values[3],
              expectedToBuyDate: values[4],
              expectedSellDate: values[5],
              isJointlyOwned: values[6],
              isCapitalGainTaxable: values[7],
              scenarioID: $('#scenarioID').val(),
              isSpouse: isSpouse
            };
          } else {
            obj = {
              description: values[0],
              currentValue: values[1],
              originalValue: values[2],
              annualAppreciation: values[3],
              expectedToBuyDate: values[4],
              expectedSellDate: values[5],
              isCapitalGainTaxable: values[6],
              scenarioID: $('#scenarioID').val(),
              isSpouse: isSpouse
            };
          }
        } else {
          if (isSpouseInScenario) {
            obj = {
              description: values[0],
              value: values[1],
              rate: values[2],
              startDate: values[3],
              payIntrestOnly: values[4],
              monthlyPayment: values[5],
              isJointlyOwned: values[6],
              isInterestTaxDeductible: values[7],
              scenarioID: $('#scenarioID').val(),
              isSpouse: isSpouse
            };
          } else {
            obj = {
              description: values[0],
              value: values[1],
              rate: values[2],
              startDate: values[3],
              payIntrestOnly: values[4],
              monthlyPayment: values[5],
              isInterestTaxDeductible: values[6],
              scenarioID: $('#scenarioID').val(),
              isSpouse: isSpouse
            };
          }
        }

        $.ajax({
          async: false,
          url: $('#' + tableID + 'Save').attr('href'),
          data: obj,
          dataType: 'json',
          success: function(data) {
            if (data['status'] === true) {
              currentRow.removeClass('newRow');
              currentRow.find('td').each(function() {
                $(this).attr('data-pk', data['id']);
              });
              $('.add-empty[data-target=' + tableID + ']').removeAttr("disabled");
              var deleteLink = $('#' + tableID + 'DeleteLink').attr('href');
              var deleteButton = '<form action="' + deleteLink + '/' + data['id'] + '" method="post" style="display:inline"><input type="hidden" name="_method" value="DELETE" id="_method">'

              if (tableID == 'corpAsset')
                deleteButton += '<input type="hidden" name="corporationId" value="' + $('#corporationId').val() + '" id="corporationId">'
              else {
                deleteButton += '<input type="hidden" name="scenarioID" value="' + $('#scenarioID').val() + '" id="scenarioID">' +
                  '<input type="hidden" name="simulationID" value="' + $('#simulationID').val() + '" id="simulationID">' +
                  '<input type="hidden" name="isSpouse" value="' + isSpouse + '" id="isSpouse">'
              }

              deleteButton += '<a href="#" data-toggle="modal" data-target="#confirmDelete" data-title="Delete Assets" data-message="Are you sure you want to delete this asset?" title="Delete"><span class="glyphicon glyphicon-trash trash"></span></a>' +
                '</form>';
              var actionTD = currentRow.find('td.actions').first();
              actionTD.empty();
              actionTD.append(deleteButton);
              if (tableID == 'realAsset' && isSpouseInScenario) {
                var transferLink = $('#transferRealAsset').attr('href');
                var copyLink = $('#copyRealAsset').attr('href');
                var newId = 'transferRealAssetForm' + data['id'];
                var newIdCopy = 'copyRealAssetForm' + data['id'];

                var transferButton = '<form id="' + newId + '" action="' + transferLink + '/' + data['id'] + '" method="post" style="display:inline; margin-left:8px"><input type="hidden" name="_method" value="POST" id="_method">' +
                  '<input type="hidden" name="scenarioID" value="' + $('#scenarioID').val() + '" id="scenarioID">' +
                  '<input type="hidden" name="simulationID" value="' + $('#simulationID').val() + '" id="simulationID">' +
                  '<input type="hidden" name="isSpouse" value="' + isSpouse + '" id="isSpouse">' +
                  '<a href="javascript:{}" class="hideForJointlyOwned" onclick="document.getElementById(\'' + newId + '\').submit(); return false;" title="Move Real Asset"><span style="color: #357EBD" class="glyphicon glyphicon-transfer"></span></a>' +
                  '</form>';
                actionTD.append(transferButton);

                var copyButton = '<form id="' + newIdCopy + '" action="' + copyLink + '/' + data['id'] + '" method="post" style="display:inline; margin-left:8px"><input type="hidden" name="_method" value="POST" id="_method">' +
                  '<input type="hidden" name="scenarioID" value="' + $('#scenarioID').val() + '" id="scenarioID">' +
                  '<input type="hidden" name="simulationID" value="' + $('#simulationID').val() + '" id="simulationID">' +
                  '<input type="hidden" name="isSpouse" value="' + isSpouse + '" id="isSpouse">' +
                  '<a href="javascript:{}" class="hideForJointlyOwned" onclick="document.getElementById(\'' + newIdCopy + '\').submit(); return false;" title="Copy Real Asset to Spouse"><span class="glyphicon glyphicon-repeat repeat"></span></a>' +
                  '</form>';
                actionTD.append(copyButton);

                hideForJointlyOwned(currentRow)
              } else if (tableID == 'asset' && isSpouseInScenario) {
                var copyLink = $('#copyAsset').attr('href');
                var newIdCopy = 'copyAssetForm' + data['id'];
                var copyButton = '<form id="' + newIdCopy + '" action="' + copyLink + '/' + data['id'] + '" method="post" style="display:inline; margin-left:8px"><input type="hidden" name="_method" value="POST" id="_method">' +
                  '<input type="hidden" name="scenarioID" value="' + $('#scenarioID').val() + '" id="scenarioID">' +
                  '<input type="hidden" name="simulationID" value="' + $('#simulationID').val() + '" id="simulationID">' +
                  '<input type="hidden" name="isSpouse" value="' + isSpouse + '" id="isSpouse">' +
                  '<a href="javascript:{}" onclick="document.getElementById(\'' + newIdCopy + '\').submit(); return false;" title="Copy Asset to Spouse"><span class="glyphicon glyphicon-repeat repeat"></span></a>' +
                  '</form>';
                actionTD.append(copyButton);
              } else if (tableID == 'debt' && isSpouseInScenario) {

                var copyLink = $('#copyDebt').attr('href');
                var newIdCopy = 'copyDebtForm' + data['id'];
                var copyButton = '<form id="' + newIdCopy + '" action="' + copyLink + '/' + data['id'] + '" method="post" style="display:inline; margin-left:8px"><input type="hidden" name="_method" value="POST" id="_method">' +
                  '<input type="hidden" name="scenarioID" value="' + $('#scenarioID').val() + '" id="scenarioID">' +
                  '<input type="hidden" name="simulationID" value="' + $('#simulationID').val() + '" id="simulationID">' +
                  '<input type="hidden" name="isSpouse" value="' + isSpouse + '" id="isSpouse">' +
                  '<a href="javascript:{}" class="hideForJointlyOwned" onclick="document.getElementById(\'' + newIdCopy + '\').submit(); return false;" title="Copy Loan to Spouse"><span class="glyphicon glyphicon-repeat repeat"></span></a>' +
                  '</form>';
                actionTD.append(copyButton);

                hideForJointlyOwned(currentRow)

              }
              //    			            $('a[data-target='+tableID+']').focus(); // in case they need to add another

            };

            if (data['infoMsg'] != null && data['infoMsg'] != "") {
              $('#infoMsg').html(data['infoMsg'])
              if (!$('#infoMsg').is(':visible')) {
                $('#infoMsg').removeClass('hide');
                $('#infoMsg').fadeIn();
                $('#infoMsg').delay(4000).fadeOut();
              }
            }

            if (data['warnMsg'] != null && data['warnMsg'] != "") {
              $('#warnMsg').html(data['warnMsg'])
              if (!$('#warnMsg').is(':visible')) {
                $('#warnMsg').removeClass('hide');
                $('#warnMsg').fadeIn();
                $('#warnMsg').delay(10000).fadeOut();
              }
            }

            if (data['errorMsg'] != null && data['errorMsg'] != "") {
              $('#errorMsg').html(data['errorMsg'])
              if (!$('#errorMsg').is(':visible')) {
                $('#errorMsg').removeClass('hide');
                $('#errorMsg').fadeIn();
                $('#errorMsg').delay(7000).fadeOut();
              }
            }

            if (tableID === 'realAsset') {
              //$("#addNewRealAssetBtn").focus()
              //currentRow.find('td:last').focus();
            } else {
              //$("#addNewAssetBtn").focus()
              currentRow.find('td:last').focus();
            }

          }
        });
      }
    } else {
      var name = $(this).attr('data-name');
      var id = $(this).attr('data-pk');
      var value;
      if ($(this).hasClass('select')) {
        value = $(this).find('select:first').val();
        if (value == '0') return;
      } else if ($(this).hasClass('date')) {
        var picker = $(this).find('input:first');
        picker.removeClass('error');
        value = picker.val();
        if (value !== '' && (!moment(value, 'DD/MM/YYYY').isValid() || !isValidDate(value))) {
          // invalid date
          $(this).focus();
          //					picker.datepicker("setDate", "");
          picker.addClass('error');

          // alternative would be that we just reset it to the original date string
          return;
        }
      } else {
        value = $(this).attr("data-value");
        if (!value) value = $(this).html();
      }
      var obj = {
        name: name,
        value: value,
        pk: id
      };

      var currentRow = $(this).closest('tr');
      $.ajax({
        async: false,
        url: $('#' + tableID + 'Update').attr('href'),
        data: obj,
        dataType: 'json',
        success: function(data) {

          hideForJointlyOwned(currentRow)

          if (data['infoMsg'] != null && data['infoMsg'] != "") {
            $('#infoMsg').html(data['infoMsg'])
            if (!$('#infoMsg').is(':visible')) {
              $('#infoMsg').removeClass('hide')
              $('#infoMsg').fadeIn();
              $('#infoMsg').delay(4000).fadeOut();
            }
          }

          if (data['warnMsg'] != null && data['warnMsg'] != "") {
            $('#warnMsg').html(data['warnMsg'])
            if (!$('#warnMsg').is(':visible')) {
              $('#warnMsg').removeClass('hide');
              $('#warnMsg').fadeIn();
              $('#warnMsg').delay(10000).fadeOut();
            }
          }

          if (data['errorMsg'] != null && data['errorMsg'] != "") {
            $('#errorMsg').html(data['errorMsg'])
            if (!$('#errorMsg').is(':visible')) {
              $('#errorMsg').removeClass('hide');
              $('#errorMsg').fadeIn();
              $('#errorMsg').delay(7000).fadeOut();
            }
          }
        }
      });
    }
  });
}
