﻿const root = document.documentElement;
const blueColor = getComputedStyle(root).getPropertyValue('--bargraph-bar-fill-1');
const redColor = getComputedStyle(root).getPropertyValue('--bargraph-bar-fill-2');
const greenColor = getComputedStyle(root).getPropertyValue('--bargraph-bar-fill-3');

function ProdDataCalls(URL, sURL, company, plant, line, R_url, user1, web_url) {
	this.URL = URL;
	this.sURL = sURL;
	this.company = company;
	this.plant = plant;
	this.line = line;
	this.R_url = R_url;
	this.user1 = user1;
	this.Shift = "S1";
	this.CurrentShift = "";
	this.firstLoad = true;
	this.pageLoad = true;
	this.timeoutId = "";
	getSetCurrentShift();
}

// Get and Set current shift for tab
function getSetCurrentShift() {

	var myData = {
		"CompanyCode": this.company,
		"PlantCode": this.plant,
		"Line_Code": this.line,
		"Shift": this.Shift
	};

	$.ajax({
		type: "POST",
		url: sURL + 'api/LineOverviewProd/get_Current_Shift',
		data: myData,
		headers: {
			Authorization: 'Bearer ' + user1
		},
		dataType: "json",
		beforeSend: function () {
			$('.loading').show();
		},
		success: function (response) {
			if (response.status != "Error") {

				var currentShift = response.data.Table[0].ShiftName;

				var tabS1 = document.querySelector(`[data-tab="${currentShift}"]`);

				if (tabS1) {
					var clickEvent = new Event('click', { bubbles: true });
					tabS1.dispatchEvent(clickEvent);
				}
			}
			else {

			}
		},
		error: function (response) {
			if (response.status == "401") {
				swal({
					icon: "warning",
					title: "Session Expired",
					button: true,
					closeModal: false
				})
				window.location = R_url;
			}
			else {
				swal({
					icon: "warning",
					title: response.responseText,
					button: true,
					closeModal: false
				})
			}
		}
	});
}

// All Graph calls
function graphsCall(Shift) {
	this.Shift = Shift;
	firstLoad = true;
	var TCT = 0;
	//getProductionData();
	get_prod_data();
	get_Utilisation();
	getCycleTime("");
	//modalDesign('.container-modal-data', '#chartTarget');
	modalDesign('.container-modal-data-1', '#charts1');
	modalDesign('.container-modal-data-2', '#charts');
}

// Loads content on modal for graph
function loadContentOfModals(container, ele) {
	//if (ele == '#chartTarget') {
	//	getCycleTime(container);
	//}

	if (ele == '#charts1') {
		getAlarmData(container);
	}

	if (ele == '#charts') {
		getRejectionReason(container);
	}
}

function get_prod_data() {
	$.getScript(web_url + 'Scripts/d3.min.js', function () {
		getProductionData();
	});
}
// Selected shift data for graphs
function getProductionData() {
	var myData = {
		"CompanyCode": this.company,
		"PlantCode": this.plant,
		"Line_Code": this.line,
		"Shift": this.Shift
	};
	$.ajax({
		type: "POST",
		url: sURL + 'api/LineOverviewProd/get_Data_Production',
		data: myData,
		headers: {
			Authorization: 'Bearer ' + user1
		},
		dataType: "json",
		beforeSend: function () {
			if (firstLoad === true) {
				firstLoad = false;
				$('.loading').show();
			}
		},
		complete: function () {
			$('.loading').hide();
		},
		success: function (response) {
			if (response.status != "Error") {

				var tooltips = document.querySelectorAll('.tooltip');
				tooltips.forEach(function (container) {
					container.remove();
				});

				//KPI
				let dataKPI = response.data.Table5;
				if (dataKPI != "") {

					$("#batchDetails").html(`Batch Start Time : ${dataKPI[0].Start_time}</br>Batch End Time : ${dataKPI[0].End_time}`);
					let chart = radialProgress(`.${Shift} #chartKPI .box-211`, 'OEE')
					let progress = [`${dataKPI[0].OEE}`]
					let state = 0
					chart.update(progress[state])
					state = (state + 1) % progress.length

					//KPI-APQ
					var tableData = $(`
						<table class="table-simple">
							<tr>
								<th>A%</th>
								<th>P%</th>
								<th>Q%</th>
							</tr>
							<tr>
								<td>${dataKPI[0].Availability}</td>
								<td>${dataKPI[0].Performance}</td>
								<td>${dataKPI[0].Quality}</td>
							</tr>
						</table>
					`);
					$("#KPI_APQ").html(tableData);

					var Total_parts = parseInt(dataKPI[0].OK_Parts) + parseInt(dataKPI[0].NOK_Parts);
					//KPI-Production
					var tableData = $(`
						<table class="table-simple" style="width:105% !important;">
							<tr>
								<th>OK Parts</th>
								<th>NOK Parts</th>
								<th>Total Parts</th>
								<th>Rejected Parts</th>
							</tr>
							<tr>
								<td>${dataKPI[0].OK_Parts}</td>
								<td>${dataKPI[0].NOK_Parts}</td>
								<td>${Total_parts}</td>
								<td>${dataKPI[0].NOK_Parts}</td>
							</tr>
						</table>
					`);
					$("#KPI_Prod").html(tableData);

					TCT = dataKPI[0].TCT;

					$("#Target_CT").html(TCT);
					//KPI-Cycletime
					var tableData = $(`
							<table class="table-simple" style="margin-bottom:100px !important;">
								<tr>
									<th>Variant Name</th>
									<th>Theoritcal Cycletime (sec)</th>
									<th>Average Cycletime (sec)</th>
								</tr>
								<tr>
									<td>${dataKPI[0].Variantname}</td>
									<td>${dataKPI[0].TCT}</td>
									<td>
										<div id="lefttooltip">
												${dataKPI[0].avgCT}
											<span class="tooltiptexts">
											<span class="name">Last Part Cycletime : ${dataKPI[0].CT}</span>
											</span>
										</div>
									</td>
								</tr>
							</table>
					`);
					$("#KPI_CT").html(tableData);

					//KPI-Alarm
					var tableData = $(`
						<table class="table-simple">
							<tr>
								<th id="mpop">Shiftwise MTTR(min)</th>
								<th>Shiftwise MTBF(min)</th>
								<th>Shiftwise Stoppages</th>
							</tr>
							<tr>
								<td>${dataKPI[0].MTTR}</td>
								<td>
									<div id="lefttooltip">
										${dataKPI[0].MTBF}
										<span class="tooltiptexts">
										<span class="name">UPTIME (min) : ${dataKPI[0].UpTime}</span>
										</span>
									</div>
								</td>
								<td>${dataKPI[0].no_of_stoppage}</td>
							</tr>
						</table>
					`);
					$("#KPI_Alarm").html(tableData);

					// Onclick opens Modal for Variantwise Production
					var navBar = document.querySelector('#mpop');
					navBar.addEventListener('click', e => {
						//console.log('mttrpop');
						getMTTRPopupData();
					});


				}
				else {
					var elementID = `.${Shift} #chartKPI .box2-2`;
					displayScenarioText(elementID, '', 'No Data for the entire Shift');
				}

				// Hourly Production
				let dataHourly = response.data.Table;
				if (dataHourly != "") {
					var propertyValues = Object.values(dataHourly[0]);
					var columns = Object.keys(dataHourly[0]);
					var firstColumnValue = propertyValues[0];

					//var chartTitle = 'Hourly Production';
					var chartTitle = '';
					var elementID = `.${Shift} #chartTarget`;

					if (typeof (firstColumnValue) == 'string' && columns[0] == 'StatusText') {

						displayScenarioText(elementID, chartTitle, firstColumnValue)
					}
					else {

						var labelTilte = ['Hours-Batch', 'Production Count', chartTitle, 'Production Reached the Target', 'Production Less than the Target', 'lessThanEqual'];
						var tooltipBar1Labels = ['Target Parts', 'Hour', 'Batch', 'Hour Start time', 'Hour End time'];
						var tooltipBar1Data = ['Target_part', 'Hour', 'Batch', 'start', 'end'];
						var tooltipBar2Labels = ['OK Parts', 'NOK Parts', 'Variant', 'Hour', 'Batch', 'Hour Start time', 'Hour End time'];
						var tooltipBar2Data = ['okparts', 'nokparts', 'Variant_name', 'Hour', 'Batch', 'start', 'end'];
						var toolitpLineLabels = ['Gap', 'Hour', 'Batch', 'Hour Start time', 'Hour End time'];
						var tooltipLineData = ['Gap', 'Hour', 'Batch', 'start', 'end'];
						createGroupedBarLineGraph(dataHourly, "Hour_Batch", "Target_part", "totalparts", "Gap", elementID, 5, labelTilte, tooltipBar1Labels, tooltipBar2Labels, toolitpLineLabels, tooltipBar1Data, tooltipBar2Data, tooltipLineData, "hourly");
						setColorOfBar(elementID, 'Target_part', 'totalparts');

						const chart = document.querySelector(elementID);
						var tickTextElements = chart.querySelectorAll('.x-axis .tick text');
						tickTextElements.forEach(function (element) {
							element.style.display = 'none';
						});
					}
				}
				else {
					//var chartTitle = 'Hourly Production';
					var chartTitle = '';
					var elementID = `.${Shift} #chartTarget`;
					displayScenarioText(elementID, chartTitle, 'No Data for the entire Shift');
				}

				// Daily Production
				let dataDaily = response.data.Table1;

				if (dataDaily != "") {

					var propertyValues = Object.values(dataDaily[0]);
					var columns = Object.keys(dataDaily[0]);
					var firstColumnValue = propertyValues[0];

					var currentDate = new Date();
					var formattedDate = currentDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });

					var chartTitle = `EOL - Daily Production (${formattedDate.toUpperCase()})`;
					var elementID = `.${Shift} #chartTarget1`;

					if (typeof (firstColumnValue) == 'string' && columns[0] == 'StatusText') {

						displayScenarioText(elementID, chartTitle, firstColumnValue)
					}
					else {

						var labelTilte = ['Days', 'Production Count', chartTitle, 'Production Reached the Target', 'Production Less than the Target', 'lessThanEqual'];
						var tooltipBar1Labels = ['Date', 'Shift', 'Target Count'];
						var tooltipBar1Data = ['DateChar', 'Shift_id', 'Target_Count'];
						var tooltipBar2Labels = ['Date', 'Shift', 'Production Count'];
						var tooltipBar2Data = ['DateChar', 'Shift_id', 'Production_Count'];
						var toolitpLineLabels = ['Date', 'Shift', 'Gap'];
						var tooltipLineData = ['DateChar', 'Shift_id', 'Gap'];

						createGroupedBarLineGraph(dataDaily, "DateNumber", "Target_Count", "Production_Count", "Gap", elementID, 5, labelTilte, tooltipBar1Labels, tooltipBar2Labels, toolitpLineLabels, tooltipBar1Data, tooltipBar2Data, tooltipLineData, "");

						setColorOfBar(elementID, 'Target_Count', 'Production_Count');

						// Onclick opens Modal for Variantwise Production
						var navBar = document.querySelectorAll(elementID);
						navBar.forEach(childElement => {
							childElement.querySelectorAll('rect').forEach(react => {
								react.addEventListener('click', (e) => {
									if (childElement.firstElementChild.tagName == 'svg') {
										getDayVariantProdData(e.target.__data__)
									}
								});
							})
						});


					}
				}
				else {
					var chartTitle = 'Daily Production';
					var elementID = `.${Shift} #chartTarget1`;
					displayScenarioText(elementID, chartTitle, 'No Data for the entire Shift');
				}

				// Monthly Production
				let dataMonthly = response.data.Table2;
				if (dataMonthly != "") {
					var propertyValues = Object.values(dataMonthly[0]);
					var columns = Object.keys(dataMonthly[0]);
					var firstColumnValue = propertyValues[0];

					var currentDate = new Date();
					var formattedDate = currentDate.toLocaleString('en-US', { year: 'numeric' });

					var chartTitle = `EOL - Monthly Production (${formattedDate})`;
					var elementID = `.${Shift} #charts2`;

					if (typeof (firstColumnValue) == 'string' && columns[0] == 'StatusText') {

						displayScenarioText(elementID, chartTitle, firstColumnValue)
					}
					else {
						var labelTilte = ['Month', 'Production Count', chartTitle, 'Production Reached the Target', 'Production Less than the Target', 'lessThanEqual'];
						var tooltipBar1Labels = ['Month', 'Shift', 'Target Count'];
						var tooltipBar1Data = ['Month', 'Shift_id', 'Target_Count'];
						var tooltipBar2Labels = ['Month', 'Shift', 'Production Count'];
						var tooltipBar2Data = ['Month', 'Shift_id', 'Production_Count'];
						var toolitpLineLabels = ['Month', 'Shift', 'Gap'];
						var tooltipLineData = ['Month', 'Shift_id', 'Gap'];

						createGroupedBarLineGraph(dataMonthly, "MonthLetter", "Target_Count", "Production_Count", "Gap", elementID, 5, labelTilte, tooltipBar1Labels, tooltipBar2Labels, toolitpLineLabels, tooltipBar1Data, tooltipBar2Data, tooltipLineData, "");

						setColorOfBar(elementID, 'Target_Count', 'Production_Count');
					}
				}
				else {
					var chartTitle = 'Monthly Production';
					var elementID = `.${Shift} #charts2`;
					displayScenarioText(elementID, chartTitle, 'No Data for the entire Shift');
				}

				// Stationwise Downtime
				let dataStnDown = response.data.Table3;
				if (dataStnDown != "") {

					var propertyValues = Object.values(dataStnDown[0]);
					var columns = Object.keys(dataStnDown[0]);
					var firstColumnValue = propertyValues[0];

					var chartTitle = 'Top 10 Station-wise Downtime Duration';
					var elementID = `.${Shift} #charts1`;

					if (typeof (firstColumnValue) == 'string' && columns[0] == 'StatusText') {

						displayScenarioText(elementID, chartTitle, firstColumnValue)
					}
					else {
						var labelTilte = ['Station', 'Downtime (min)', chartTitle];
						var tooltipLabels = ['Station Name', 'Duration (min)'];
						var tooltipData = ['AssetName', 'downtime'];
						createBarGraph(dataStnDown, "AssetName", "downtime", elementID, 20, labelTilte, tooltipLabels, tooltipData);
					}
				}
				else {
					var chartTitle = 'Top 10 Station-wise Downtime Duration';
					var elementID = `.${Shift} #charts1`;
					displayScenarioText(elementID, chartTitle, 'No Data for the entire Shift');
				}

				// Stationwise Rejection
				let dataStnRej = response.data.Table4;
				if (dataStnRej != "") {
					var propertyValues = Object.values(dataStnRej[0]);
					var columns = Object.keys(dataStnRej[0]);
					var firstColumnValue = propertyValues[0];

					var chartTitle = 'Top 10 Station-wise Rejection';
					var elementID = `.${Shift} #charts`;

					if (typeof (firstColumnValue) == 'string' && columns[0] == 'StatusText') {

						displayScenarioText(elementID, chartTitle, firstColumnValue)
					}
					else {
						var labelTilte = ['Station', 'No. of Rejection', chartTitle];
						var tooltipLabels = ['Station Name', 'No. of Rejections'];
						var tooltipData = ['AssetName', 'nok'];
						createBarGraph(dataStnRej, "AssetName", "nok", elementID, 20, labelTilte, tooltipLabels, tooltipData);

					}
				}
				else {
					var chartTitle = 'Top 10 Station-wise Rejection';
					var elementID = `.${Shift} #charts`;
					displayScenarioText(elementID, chartTitle, 'No Data for the entire Shift');
				}

			}
			else {

			}
			get_drilldown_chart();
		},
		error: function (response) {
			if (response.status == "401") {
				swal({
					icon: "warning",
					title: "Session Expired",
					button: true,
					closeModal: false
				})
				window.location = R_url;
			}
			else {
				swal({
					icon: "warning",
					title: response.responseText,
					button: true,
					closeModal: false
				})

			}
		}
	});
}

// Rejection Popup
function getRejectionReason(container) {

	var myData = {

		"CompanyCode": this.company,
		"PlantCode": this.plant,
		"Line_Code": this.line,
		"Shift": this.Shift

	};

	$.ajax({
		type: "POST",
		url: sURL + 'api/LineOverviewProd/get_Data_Rejection_Reason',
		data: myData,
		headers: {
			Authorization: 'Bearer ' + user1
		},
		dataType: "json",
		beforeSend: function () {
			$('.loading').show();
		},
		complete: function () {
			$('.loading').hide();
		},
		success: function (response) {
			if (response.status != "Error") {

				// Rejection Reason
				let dataRejReason = response.data.Table;
				if (dataRejReason != "") {

					var propertyValues = Object.values(dataRejReason[0]);
					var columns = Object.keys(dataRejReason[0]);
					var firstColumnValue = propertyValues[0];

					var chartTitle = 'Top 10 Rejection Reason';
					var elementID = `${container} #charts13`;

					if (typeof (firstColumnValue) == 'string' && columns[0] == 'StatusText') {

						displayScenarioText(elementID, chartTitle, firstColumnValue)
					}
					else {
						var labelTilte = ['Rejection Reason', 'No. of Rejections', chartTitle];
						var tooltipLabels = ['Station Name', 'Reject Reason', 'No. of Rejections'];
						var tooltipData = ['AssetName', 'Reject_Reason_Name', 'Frequency'];
						createBarGraph(dataRejReason, "Reject_Reason_Name", "Frequency", elementID, 20, labelTilte, tooltipLabels, tooltipData);

					}
				}
				else {
					var chartTitle = 'Top 10 Rejection Reason';
					var elementID = `${container} #charts13`;
					displayScenarioText(elementID, chartTitle, 'No Data for the entire Shift');
				}

			}
			else {

			}
		},
		error: function (response) {
			if (response.status == "401") {
				swal({
					icon: "warning",
					title: "Session Expired",
					button: true,
					closeModal: false
				})
				window.location = R_url;
			}
			else {
				swal({
					icon: "warning",
					title: response.responseText,
					button: true,
					closeModal: false
				})

			}
		}
	});
}

// Cycletime popup
function getCycleTime(container) {
	var myData = {

		"CompanyCode": this.company,
		"PlantCode": this.plant,
		"Line_Code": this.line,
		"Shift": this.Shift

	};

	$.ajax({
		type: "POST",
		url: sURL + 'api/LineOverviewProd/get_Cycletime_last_ten_parts',
		data: myData,
		headers: {
			Authorization: 'Bearer ' + user1
		},
		dataType: "json",
		beforeSend: function () {
			$('.loading').show();
		},
		complete: function () {
			$('.loading').hide();
		},
		success: function (response) {
			if (response.status != "Error") {

				// Cycletime
				let dataCycleTime = response.data.Table;
				if (dataCycleTime != "") {


					var propertyValues = Object.values(dataCycleTime[0]);
					var columns = Object.keys(dataCycleTime[0]);
					var firstColumnValue = propertyValues[0];

					//var chartTitle = 'Last 10 Parts CycleTime';
					var chartTitle = '';
					//var elementID = `${container} #chartTarget11`;
					var elementID = `#chartTarget11`;

					if (typeof (firstColumnValue) == 'string' && columns[0] == 'StatusText') {

						displayScenarioText(elementID, chartTitle, firstColumnValue)
					}
					else {

						var labelTilte = ['Parts Number', 'CycleTime (sec)', chartTitle, 'Cycletime greater than Theoritical Cycletime', 'Cycletime less than Theoritical Cycletime', 'greaterThanEqual'];
						var tooltipBar1Labels = ['Part', 'Target CycleTime (sec)', 'Variant'];
						var tooltipBar1Data = ['Part', 'Target_CT', 'VariantName'];
						var tooltipBar2Labels = ['Part', 'Actual CycleTime (sec)', 'Variant'];
						var tooltipBar2Data = ['Part', 'CT', 'VariantName'];
						var toolitpLineLabels = ['Part', 'Gap (Sec)', 'Variant'];
						var tooltipLineData = ['Part', 'Gap', 'VariantName'];

						createGroupedBarLineGraph(dataCycleTime, "Part", "Target_CT", "CT", "Gap", elementID, 5, labelTilte, tooltipBar1Labels, tooltipBar2Labels, toolitpLineLabels, tooltipBar1Data, tooltipBar2Data, tooltipLineData, "");

						const chart = document.querySelector(elementID);
						const bars2 = chart.querySelectorAll('.bar2');
						const bars1 = chart.querySelectorAll('.bar1');

						bars2.forEach((bar) => {
							const ct = parseInt(bar.__data__.CT, 10);
							const targetCT = parseInt(bar.__data__.Target_CT, 10);
							if (!isNaN(ct) && !isNaN(targetCT)) {
								const fillColor = ct <= targetCT ? greenColor : redColor;
								bar.style.fill = fillColor;
							} else {
								console.error("Invalid numeric values for CT or Target_CT");
							}
						});
						bars1.forEach((bar) => {
							bar.style.fill = blueColor;
						});


					}
				}
				else {
					//var chartTitle = 'Last 10 Parts CycleTime';
					var chartTitle = '';
					//var elementID = `${container} #chartTarget11`;
					var elementID = `#chartTarget11`;
					displayScenarioText(elementID, chartTitle, 'No Data for the entire Shift');
				}

			}
			else {

			}
		},
		error: function (response) {
			if (response.status == "401") {
				swal({
					icon: "warning",
					title: "Session Expired",
					button: true,
					closeModal: false
				})
				window.location = R_url;
			}
			else {
				swal({
					icon: "warning",
					title: response.responseText,
					button: true,
					closeModal: false
				})

			}
		}
	});
}

// Breakdown analysis popup
function getAlarmData(container) {
	var myData = {

		"CompanyCode": this.company,
		"PlantCode": this.plant,
		"Line_Code": this.line,
		"Shift": this.Shift

	};

	$.ajax({
		type: "POST",
		url: sURL + 'api/LineOverviewProd/get_Data_Alarms',
		data: myData,
		headers: {
			Authorization: 'Bearer ' + user1
		},
		dataType: "json",
		beforeSend: function () {
			$('.loading').show();
		},
		complete: function () {
			$('.loading').hide();
		},
		success: function (response) {
			if (response.status != "Error") {



				// Downtime Reason
				let dataStnDown = response.data.Table;
				if (dataStnDown != "") {

					var propertyValues = Object.values(dataStnDown[0]);
					var columns = Object.keys(dataStnDown[0]);
					var firstColumnValue = propertyValues[0];

					var chartTitle = 'Downtime Reason Duration';
					var elementID = `${container} #charts12`;

					if (typeof (firstColumnValue) == 'string' && columns[0] == 'StatusText') {

						displayScenarioText(elementID, chartTitle, firstColumnValue)
					}
					else {
						var labelTilte = ['Alarms', 'Downtime (min)', chartTitle];
						var tooltipLabels = ['Station Name', 'Alarm Description', 'Duration (min)'];
						var tooltipData = ['AssetName', 'Alarm_Description', 'Total_Downtime'];

						createBarGraph(dataStnDown, "Alarm_Description", "Total_Downtime", elementID, 12, labelTilte, tooltipLabels, tooltipData);

					}
				}
				else {
					var chartTitle = 'Downtime Reason Duration';
					var elementID = `${container} #charts12`;
					displayScenarioText(elementID, chartTitle, 'No Data for the entire Shift');
				}

				// Stationwise No. of Stoppage
				let dataStoppage = response.data.Table1;
				if (dataStoppage != "") {

					var propertyValues = Object.values(dataStoppage[0]);
					var columns = Object.keys(dataStoppage[0]);
					var firstColumnValue = propertyValues[0];

					var chartTitle = 'Station-wise No.of Stoppages';
					var elementID = `${container} #charts11`;

					if (typeof (firstColumnValue) == 'string' && columns[0] == 'StatusText') {
						displayScenarioText(elementID, chartTitle, firstColumnValue)
					}
					else {
						var labelTilte = ['Station', 'No. of Stoppage', chartTitle];
						var tooltipLabels = ['Station Name', 'No. of Stoppage'];
						var tooltipData = ['AssetName', 'Stoppage'];
						createBarGraph(dataStoppage, "AssetName", "Stoppage", elementID, 12, labelTilte, tooltipLabels, tooltipData);

					}
				}
				else {
					var chartTitle = 'Station-wise No.of Stoppages';
					var elementID = `${container} #charts11`;
					displayScenarioText(elementID, chartTitle, 'No Data for the entire Shift');
				}

				// Downtime Reason Occurence
				let dataOcc = response.data.Table2;
				if (dataOcc != "") {

					var propertyValues = Object.values(dataOcc[0]);
					var columns = Object.keys(dataOcc[0]);
					var firstColumnValue = propertyValues[0];

					var chartTitle = 'Downtime Reason Occurence';
					var elementID = `${container} #charts13`;

					if (typeof (firstColumnValue) == 'string' && columns[0] == 'StatusText') {

						displayScenarioText(elementID, chartTitle, firstColumnValue)
					}
					else {
						var labelTilte = ['Alarms', 'Occurence', chartTitle];
						var tooltipLabels = ['Station Name', 'Occurence', 'Alarm Description'];
						var tooltipData = ['AssetName', 'no_of_occurence', 'Alarm_Description'];
						createBarGraph(dataOcc, "Alarm_ID", "no_of_occurence", elementID, 12, labelTilte, tooltipLabels, tooltipData);

					}

				}
				else {
					var chartTitle = 'Downtime Reason Occurence';
					var elementID = `${container} #charts13`;
					displayScenarioText(elementID, chartTitle, 'No Data for the entire Shift');
				}

			}
			else {

			}
		},
		error: function (response) {
			if (response.status == "401") {
				swal({
					icon: "warning",
					title: "Session Expired",
					button: true,
					closeModal: false
				})
				window.location = R_url;
			}
			else {
				swal({
					icon: "warning",
					title: response.responseText,
					button: true,
					closeModal: false
				})

			}
		}
	});
}

// Variantwise production popup
function getDayVariantProdData(barData) {
	//debugger;
	var container = '.container-modal-data-3';
	document.querySelector(container).style.display = 'block';
	$(`${container} #table_data`).empty();

	var myData = {

		"CompanyCode": this.company,
		"PlantCode": this.plant,
		"Line_Code": this.line,
		"Shift": this.Shift,
		"Date": barData.Date

	};

	$.ajax({
		type: "POST",
		url: sURL + 'api/LineOverviewProd/get_Daily_Variantwise_Production',
		data: myData,
		headers: {
			Authorization: 'Bearer ' + user1
		},
		dataType: "json",
		beforeSend: function () {
			$('.loading').show();
		},
		complete: function () {
			$('.loading').hide();
		},
		success: function (response) {
			if (response.status != "Error") {

				var dates = new Date(barData.Date);
				var formattedDate = dates.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

				// Variantwise Production
				var dataVarProd = response.data.Table;
				if (dataVarProd != "") {
					var propertyValues = Object.values(dataVarProd[0]);
					var columns = Object.keys(dataVarProd[0]);
					var firstColumnValue = propertyValues[0];

					var chartTitle = `Variant-wise Production on ${formattedDate}`;
					var elementID = `#chartTarget12`;

					if (typeof (firstColumnValue) == 'string' && columns[0] == 'StatusText') {

						displayScenarioText(elementID, chartTitle, firstColumnValue)
					}
					else {

						var labelTilte = ['Variant', 'Production Count', chartTitle, 'Production Reached the Target', 'Production Less than the Target', 'lessThanEqual'];
						var tooltipBar1Labels = ['Variant Name', 'Target Count', 'Production Count'];
						var tooltipBar1Data = ['Variant_name', 'Target_Count', 'Production_Count'];
						var tooltipBar2Labels = ['Variant Name', 'Target Count', 'Production Count'];
						var tooltipBar2Data = ['Variant_name', 'Target_Count', 'Production_Count'];
						var toolitpLineLabels = ['Variant Name', 'Target Count', 'Production Count', 'Gap'];
						var tooltipLineData = ['Variant_name', 'Target_Count', 'Production_Count', 'Gap'];


						createGroupedBarLineGraph(dataVarProd, "Variant_name", "Target_Count", "Production_Count", "Gap", elementID, 20, labelTilte, tooltipBar1Labels, tooltipBar2Labels, toolitpLineLabels, tooltipBar1Data, tooltipBar2Data, tooltipLineData, "");

						setColorOfBar(elementID, 'Target_Count', 'Production_Count');


					}

				}

			}
		},
		error: function (response) {
			if (response.status == "401") {
				swal({
					icon: "warning",
					title: "Session Expired",
					button: true,
					closeModal: false
				})
				window.location = R_url;
			}
			else {
				swal({
					icon: "warning",
					title: response.responseText,
					button: true,
					closeModal: false
				})

			}
		}
	});


	// Add event listener for the close icon
	document.querySelector(`${container} .close-icon`).addEventListener('click', closeModal);

	// Function to close the modal
	function closeModal() {
		document.querySelector(container).style.display = 'none';
	}
}

// Get Current running shift
function getCurrentShift() {
	var myData = {

		"CompanyCode": this.company,
		"PlantCode": this.plant,
		"Line_Code": this.line

	};

	$.ajax({
		type: "POST",
		url: sURL + 'api/LineOverviewProd/get_Current_Shift',
		data: myData,
		headers: {
			Authorization: 'Bearer ' + user1
		},
		dataType: "json",
		async: false,
		success: function (response) {
			if (response.status != "Error") {

				var currentShift = response.data.Table[0].ShiftName;
				CurrentShift = currentShift;

			}
			else {

			}
		},
		error: function (response) {
			if (response.status == "401") {
				swal({
					icon: "warning",
					title: "Session Expired",
					button: true,
					closeModal: false
				})
				window.location = R_url;
			}
			else {
				swal({
					icon: "warning",
					title: response.responseText,
					button: true,
					closeModal: false
				})

			}
		}
	});
}

function setColorOfBar(elementID, bar1Name, bar2Name) {

	const chart = document.querySelector(elementID);
	const bars2 = chart.querySelectorAll('.bar2');
	const bars1 = chart.querySelectorAll('.bar1');

	bars2.forEach((bar) => {
		const fillColor =
			bar.__data__[bar2Name] >= bar.__data__[bar1Name]
				? greenColor
				: redColor;
		bar.style.fill = fillColor;
	});
	bars1.forEach((bar) => {
		bar.style.fill = blueColor;
	});

}

// Refresh data of current shift
function reloadGraph() {


	getCurrentShift();

	// Check if a shift is selected and it matches with the current shift
	if (this.Shift !== null && this.Shift === CurrentShift) {


		var modalContainers = document.querySelectorAll('.container-modal');
		var displayValues = [];

		for (let modalContainer of modalContainers) {
			var displayValue = window.getComputedStyle(modalContainer).getPropertyValue('display');
			displayValues.push(displayValue);
		}


		if (displayValues.includes('block')) {
			//console.log('The displayValues array contains "block".');
		}
		else {
			//console.log('Graph reloaded at ' + new Date().toLocaleTimeString() + ' for Shift ' + this.Shift);
			if (pageLoad == true) {
				pageLoad = false;
			}
			else {
				//getProductionData();
				get_prod_data();
				get_Utilisation();
				getCycleTime("");
			}
			clearTimeout(timeoutId);
			timeoutId = setTimeout(reloadGraph, 60000);
		}
	}
	else {
		//console.log('Graph not reloaded. Please select the correct shift.');
	}
}

function getMTTRPopupData() {
	var container = '.container-modal-data-4';
	document.querySelector(container).style.display = 'block';
	$(`${container} #chartTarget13`).empty();
	var tableCreation = `
<div class="box-21 box-title">
				<center>Shiftwise Overall Line Stoppage</center>
</div>
<div class="box-22 table-advance">
<div class="table-search-container">
<input type="text" class="search-table" id="searchInput" placeholder="Search..." onkeyup="searchFun()">
</div>
<div class="table-container">
<table class="table-simple" id="data-table">
<!-- Table content goes here -->
</table>
</div>
<div class="pagination-container">
<div class="pagination" id="pagination-container">
<!-- Pagination buttons go here -->
</div>
<div class="pagination-status-container" id="pagination-status-container">
<!-- Pagination status goes here -->
</div>
</div>
</div> `

	$('#chartTarget13').append(tableCreation);



	var container = '.container-modal-data-4';
	document.querySelector(container).style.display = 'block';
	//$(`${container} #chartTarget13`).empty();
	var myData = {

		"CompanyCode": this.company,
		"PlantCode": this.plant,
		"Line_Code": this.line,
		"Shift": this.Shift

	};

	$.ajax({
		type: "POST",
		data: myData,
		url: sURL + 'api/LineOverviewProd/get_Daily_Overall_line_Alarm_data',
		headers: {
			Authorization: 'Bearer ' + user1
		},
		dataType: "json",
		beforeSend: function () {
			$('.loading').show();
		},
		complete: function () {
			$('.loading').hide();
		},
		success: function (response) {

			const table = document.getElementById('data-table');
			const paginationContainer = document.getElementById('pagination-container');
			const statusContainer = document.getElementById('pagination-status-container');
			const itemsPerPage = 10;

			var dataMMS = response.data.Table;

			if (dataMMS != "") {
				var propertyValues = Object.values(dataMMS[0]);
				var columns = Object.keys(dataMMS[0]);

				var firstColumnValue = propertyValues[0];

				var chartTitle = 'Overall Line Stoppage';
				var elementID = '#chartTarget13';
				if (typeof (firstColumnValue) == 'string' && columns[0] == 'StatusText') {

				}
				else {

					//table, table pagination
					const data1 = dataMMS;
					initPagination(data1, itemsPerPage, paginationContainer, table, statusContainer);
				}


			}
			else {
				// If no data available, show message
				table.innerHTML = '<tr><td colspan="6" class="no-data">No Alarm as Occured</td></tr>';
			}

		},

		error: function (response) {
			if (response.status == "401") {
				swal({
					icon: "warning",
					title: "Session Expired",
					button: true,
					closeModal: false
				})
				window.location = R_url;
			}
			else {
				swal({
					icon: "warning",
					title: response.responseText,
					button: true,
					closeModal: false
				})

			}
		}
	});



	// Add event listener for the close icon
	document.querySelector(`${container} .close-icon`).addEventListener('click', closeModal);

	// Function to close the modal
	function closeModal() {
		document.querySelector(container).style.display = 'none';
	}
}

function searchFun() {
	var input, filter, table, tr, td, i, txtValue;
	input = document.getElementById("searchInput");
	filter = input.value.toUpperCase();
	table = document.getElementById("data-table");
	tr = table.getElementsByTagName("tr");
	let matchFound = false;
	for (i = 0; i < tr.length; i++) {
		td = tr[i].getElementsByTagName("td");
		for (var j = 0; j < td.length; j++) {
			txtValue = td[j].textContent || td[j].innerHTML;
			if (txtValue.toUpperCase().indexOf(filter) > -1) {
				tr[i].style.display = "";
				matchFound = true;
				break;
			}
			else {
				tr[i].style.display = "none";
			}
		}
	}
	if (!matchFound) {
		table.innerHTML = '<tr><td colspan="6" class="no-data">Not Matching</td></tr>'
	}
}


function get_Utilisation() {
	var myData = {
		"CompanyCode": this.company,
		"PlantCode": this.plant,
		"line": this.line,
		"Line_Code": this.line,
		"Shift": this.Shift,
	};

	$.ajax({
		type: "POST",
		url: sURL + 'api/LineOverviewProd/get_Prod_Utilisation',
		data: myData,
		headers: {
			Authorization: 'Bearer ' + user1
		},
		dataType: "json",
		beforeSend: function () {
			$('.loading').show();
		},
		complete: function () {
			$('.loading').hide();
		},
		success: function (response) {
			var responseData = response.data.Table;
			var totalCal = parseInt(responseData[0].Uptime) + parseInt(responseData[0].Losstime) + parseInt(responseData[0].Downtime);

			if (totalCal > 0) {
				if (response.data.Table.length > 0) {

					d3.select("#utli_overview svg").remove();
					d3.select("#utli_overview div").remove();

					var data = [
						{ name: "Production Time", value: responseData[0].Uptime },
						{ name: "Loss/Idle Time", value: responseData[0].Losstime },
						{ name: "Down Time", value: responseData[0].Downtime }

					];


					var text = "";

					var width = 150;
					var height = 160;
					var thickness = 20;
					var duration = 750;
					var padding = 2;
					var opacity = 0.9;
					var opacityHover = 1;
					var otherOpacityOnHover = 0.8;
					var tooltipMargin = 2;


					//var radius = Math.min(width - padding, height - padding) / 2;
					var radius = Math.min(width, height) / 2;
					var color = d3.scaleOrdinal(["#4CAF50", "#FFBF00", "#F44336", "#3D85C6", "#BBBBBB"]);

					var svg = d3.select("#utli_overview")
						.append('svg')
						.attr('class', 'pie')
						.attr('width', width)
						.attr('height', height);

					var g = svg.append('g')
						.attr('transform', 'translate(75,110)');
					//var g = svg.append('g')
					//	.attr('transform', 'translate(' + (height / 2) + ',' + (height / 2) + ')');

					var arc = d3.arc()
						.innerRadius(0)
						.outerRadius(radius);

					var pie = d3.pie()
						.value(function (d) { return d.value; })
						.sort(null);

					var path = g.selectAll('path')
						.data(pie(data))
						.enter()
						.append("g")
						.append('path')
						.attr('d', arc)
						.attr('fill', (d, i) => color(i))
						.style('stroke', 'white')
						.on("mouseover", function (event, d) {
							const darkenFactor = 0.2;
							const enlargedRadius = radius + 2; // Increase the radius by 10 (adjust as needed)
							d3.select(this)
								.transition()
								.duration(200) // Set the duration of the transition
								.attr("d", d3.arc().innerRadius(0).outerRadius(enlargedRadius))
								.attr("fill", d3.rgb(color(d)).darker(darkenFactor));
						})
						.on("mouseout", function (event, d) {
							d3.select(this)
								.transition()
								.duration(200) // Set the duration of the transition
								.attr("d", arc)
								.attr("fill", color(d));
						})


						.each(function (d, i) { this._current = i; });

					let legend = d3.select("#utli_overview").append('div')
						.attr('class', 'legend')
						.style('margin-left', '125px')
						.style('margin-top', '-160px')
						.style('box-shadow', 'none');

					let keys = legend.selectAll('.key')
						.data(data)
						.enter().append('div')
						.attr('class', 'key')
						.style('display', 'flex')
						.style('align-items', 'center')
						.style('height', '20px');
					//.style('margin-right', '40px');

					keys.append('div')
						.attr('class', 'symbol')
						.style('height', '7px')
						.style('width', '7px')
						.style('margin', '0px 10px 1px 1px')
						//.style('opacity', opacity)
						.style('background-color', (d, i) => color(i));

					keys.append('div')
						.attr('class', 'name')
						.html(d => `${d.name} - ${d.value} (min) ${(Math.round((d.value * 100) / totalCal))}%`)
						.style('line-height', '105%')
						.style('font-size', '10px');

					keys.exit().remove();

				}
				else {

				}
			}
			else {
				var chartTitle = '';
				var elementID = `.${Shift} #utli_overview`;
				displayScenarioText(elementID, chartTitle, 'No Data for the entire Shift');
			}
		},
		error: function (response) {

		}
	});

}


//Drill down Start

//Rejection Reason Drilldown

var rejection_chartData = [];

rejection_chartOptions = [{
	"xaxis": "Station",
	"xaxisl1": "Reject_Reason_Name",
	"yaxis": "Total"
}]

var Title_name = "";
function get_drilldown_chart() {
	$.getScript(web_url + 'Scripts/d3_v2.min.js', function () {
		var downtime_option = $("#downtime_option").val();
		if (downtime_option == "1") {
			Downtime_Plot();
		}
		else {
			Occurence_Plot();
		}
		Rejection_Plot();
	});
}

function Rejection_Plot() {

	var myData = {
		"CompanyCode": this.company,
		"PlantCode": this.plant,
		"line": this.line,
		"Line_Code": this.line,
		"Shift": this.Shift,
	};

	$.ajax({
		type: "POST",
		url: sURL + 'api/LineOverviewProd/get_Prod_Stationwise_Rejection',
		data: myData,
		headers: {
			Authorization: 'Bearer ' + user1
		},
		dataType: "json",
		//beforeSend: function () {
		//	$('.loading').show();
		//},
		//complete: function () {
		//	$('.loading').hide();
		//},
		success: function (response) {
			var rejection_data = response.data.Table;
			if (rejection_data != "") {
				if (response.data.Table.length > 0) {
					rejection_chartData = response.data.Table;
					Rejection_ChartData(rejection_chartData, rejection_chartOptions);
					Build_Rejection_Bar("charts_drilldown", rejection_chartData, rejection_chartOptions);
				}
			}
			else {
				var chartTitle = '';
				var elementID = `.${Shift} #charts_drilldown #c11`;
				displayScenarioText(elementID, chartTitle, 'No Data for the entire Shift');
			}
		}
	});
}

function Build_Rejection_Bar(id, chartData, options, level) {

	chart = d3.select("#" + id + " #c11");

	$("#" + id + " #c11").empty();

	var margin = "";
	if (level == "1") {
		margin = { top: 50, right: 10, bottom: 30, left: 50 },
			width = $(chart[0]).outerWidth() - margin.left - margin.right,
			height = 230 - margin.top - margin.bottom
	}
	else {
		margin = { top: 50, right: 10, bottom: 30, left: 50 },
			width = $(chart[0]).outerWidth() - margin.left - margin.right,
			height = 300 - margin.top - margin.bottom
	}

	//var margin = { top: 50, right: 10, bottom: 30, left: 50 },
	//	width = $(chart[0]).outerWidth() - margin.left - margin.right,
	//	height = 200 - margin.top - margin.bottom
	//height = "140"
	var xVarName;
	var yVarName = options[0].yaxis;

	if (level == 1) {
		xVarName = options[0].xaxisl1;
	}
	else {
		xVarName = options[0].xaxis;
	}

	var xAry = runningData.map(function (el) {

		return el[xVarName];
	});

	var yAry = runningData.map(function (el) {
		return el[yVarName];
	});

	var capAry = runningData.map(function (el) { return el.caption; });


	const min_axis = d3.max(runningData, d => d[yVarName]) / 5;
	const max_axis = d3.max(runningData, d => d[yVarName]);

	var x = d3.scale.ordinal().domain(xAry).rangeRoundBands([0, width], .5);

	var y = d3.scale.linear()
		.domain([0, d3.max(runningData, function (d) { return d[yVarName]; })])
		.range([height, 0]);

	const tickValues = [parseInt(min_axis), (parseInt(min_axis) * 2), (parseInt(min_axis) * 3), (parseInt(min_axis) * 4), max_axis];


	var rcolor = d3.scale.ordinal().range(runningColors);

	chart = chart
		.append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", "150");

	var bar = chart.selectAll("g")
		.data(runningData)
		.enter()
		.append("g")
		.attr("transform", function (d) {
			return "translate(" + x(d[xVarName]) + ", 0)";
		});

	var ctrtxt = 0;
	var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom")
		.ticks(xAry.length)

		.tickFormat(function (d) {
			if (level == 0) {
				return d;
			}
			else {
				ctrtxt += 1;
				return d;
			}
		});

	var yAxis = d3.svg.axis()
		.scale(y)
		.orient("left")
		.tickValues(tickValues)
		.ticks(5); //orient left because y-axis tick labels will appear on the left side of the axis.



	bar.append("rect")
		.attr("y", function (d) {
			return y(d.Total) + margin.top - 15;
		})
		.attr("x", function (d) {
			return (margin.left);
		})

		//.on("mouseenter", function (d) {
		//	d3.select(this)
		//		.attr("stroke", "white")
		//		.attr("stroke-width", 1)
		//		.attr("height", function (d) {
		//			return height - y(d[yVarName]) + 5;
		//		})
		//		.attr("y", function (d) {
		//			return y(d.Total) + margin.top - 20;
		//		})
		//		.attr("width", x.rangeBand() + 10)
		//		.attr("x", function (d) {
		//			return (margin.left - 5);
		//		})
		//		.transition()
		//		.duration(200);


		//})

		//.on("mouseleave", function (d) {
		//	d3.select(this)
		//		.attr("stroke", "none")
		//		.attr("height", function (d) {
		//			return height - y(d[yVarName]);;
		//		})
		//		.attr("y", function (d) {
		//			return y(d[yVarName]) + margin.top - 15;
		//		})
		//		.attr("width", x.rangeBand())
		//		.attr("x", function (d) {
		//			return (margin.left);
		//		})
		//		.transition()
		//		.duration(200);

		//})

		.on("click", function (d) {
			Title_name = d.title;

			if (this._listenToEvents) {
				// Reset inmediatelly
				d3.select(this).attr("transform", "translate(0,0)")
				// Change level on click if no transition has started
				path.each(function () {
					this._listenToEvents = false;
				});
			}
			d3.selectAll("#" + id + " #c11 svg").remove();
			if (level == 1) {
				Rejection_ChartData(chartData, options, 0, d[xVarName]);
				Build_Rejection_Bar(id, chartData, options, 0);
			}
			else {
				var nonSortedChart = chartData.sort(function (a, b) {
					return parseFloat(b[options[0].yaxis]) - parseFloat(a[options[0].yaxis]);
				});
				Rejection_ChartData(nonSortedChart, options, 1, d[xVarName]);
				Build_Rejection_Bar(id, nonSortedChart, options, 1);
			}
		});


	bar.selectAll("rect").attr("height", function (d) {
		return height - y(d[yVarName]);
	})
		.transition().delay(function (d, i) { return i * 300; })
		.duration(1000)
		.attr("width", x.rangeBand())
		.transition().delay(function (d, i) { return i * 300; })
		.duration(1000);

	bar.selectAll("rect").style("fill", function (d) {
		return rcolor(d[xVarName]);
	})
		.style("opacity", function (d) {
			return d["op"];
		});

	bar.append("text")
		.attr("x", x.rangeBand() / 2 + margin.left - 10)
		.attr("y", function (d) { return y(d[yVarName]) + margin.top - 25; })
		.attr("dy", ".35em")
		.text(function (d) {
			return d[yVarName];
		});

	bar.append("svg:title")
		.text(function (d) {
			//return xVarName + ":  " + d["title"] + " \x0A" + yVarName + ":  " + d[yVarName];
			return d["title"] + " (" + d[yVarName] + ")";
		});

	chart.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(" + margin.left + "," + (height + margin.top - 15) + ")")
		.call(xAxis)
		.append("text")
		.attr("x", width)
		.attr("y", -6)
		.style("text-anchor", "end")
	//.text("Year");

	chart.append("g")
		.attr("class", "y axis")
		.attr("transform", "translate(" + margin.left + "," + (margin.top - 15) + ")")
		.call(yAxis)
		.append("text")
		.attr("transform", "rotate(-90)")
		.attr("y", 6)
		.attr("dy", ".71em")
		.style("text-anchor", "end")
	//.style("font-size", "12px");
	//.text("Sales Data");



	chart.append("text")
		.attr("class", "y-axis-label")
		.attr("x", -height / 2)
		.attr("y", margin.left / 4)
		.attr("transform", "rotate(-90)")
		.attr("text-anchor", "middle")
		.text("No. Of Rejection");



	chart.select(".y.axis")
		.selectAll("text")
		.style("font-size", "10px");

	if (level == "1") {
		var value = chart.append("text")
			.attr("class", "x-axis-label")
			.text("Rejection Reason")
			.style("font-size", "12px");
		value.attr("transform", "translate(140,280)");

		var button = $('<span class="close-btn" id="dangerButton">&times;</span>');
		$('#charts_drilldown #c11').append(button);

		$("#dangerButton").click(function () {
			;
			d3.select("#charts_drilldown #c11").select("svg").select("rect").each(function (d) {
				d3.select(this).on("click")(d);
			});
		});

		chart.select(".x.axis")
			.selectAll("text")
			.attr("y", "30")
			.style("font-size", "10px")
			.attr("transform", " translate(-60,10) rotate(-35)");
		var title = chart.append("text")
			.attr("class", "x-axis-title")
			.text(Title_name + " Top Rejection Reason");
	}
	else {
		var value = chart.append("text")
			.attr("class", "x-axis-label")
			.text("Station")
			.style("top", "10px")
			.style("font-size", "12px");
		//value.attr("transform", "translate(180,295)");
		var xValueTranslate = height - 50;
		value.attr("transform", "translate(" + xValueTranslate + "," + ((height - (margin.bottom / 2)) + 90) + ")");

		chart.select(".x.axis")
			.selectAll("text")
			.attr("y", "5")
			.style("font-size", "10px")
			.attr("transform", " translate(-15,10) rotate(-35)");

		var title = chart.append("text")
			.attr("class", "x-axis-title")
			.text("Top 10 Station-wise Rejection");
	}

	var titleWidth = title.node().getComputedTextLength();
	title.attr("transform", "translate(100,12)");

	//if (level == 1) {
	//	chart.select(".x.axis")
	//		.selectAll("text")
	//		.attr("transform", " translate(-60,10) rotate(-35)");
	//}
}

function Rejection_ChartData(chartData, opts, level, filter) {
	var result = [];
	var resultColors = [];
	var counter = 0;
	var hasMatch;
	var xVarName;
	var yVarName = opts[0].yaxis;

	if (level == 1) {
		xVarName = opts[0].xaxisl1;

		for (var i in chartData) {
			hasMatch = false;
			for (var index = 0; index < result.length; ++index) {
				var data = result[index];

				if ((data[xVarName] == chartData[i][xVarName]) && (chartData[i][opts[0].xaxis]) == filter) {
					result[index][yVarName] = result[index][yVarName] + chartData[i][yVarName];
					hasMatch = true;
					break;
				}

			}
			if ((hasMatch == false) && ((chartData[i][opts[0].xaxis]) == filter)) {
				if (result.length < 9) {
					ditem = {}
					ditem[xVarName] = chartData[i][xVarName];
					ditem[yVarName] = chartData[i][yVarName];
					ditem["caption"] = chartData[i][xVarName].substring(0, 10) + '...';
					ditem["title"] = chartData[i][xVarName];
					ditem["op"] = 1.0 - parseFloat("0." + (result.length));
					result.push(ditem);

					//resultColors[counter] = opts[0].col`or[0][chartData[i][opts[0].xaxis]];
					resultColors[counter] = "#4C88CD";

					counter += 1;
				}
			}
		}
	}
	else {
		xVarName = opts[0].xaxis;

		for (var i in chartData) {
			hasMatch = false;
			for (var index = 0; index < result.length; ++index) {
				var data = result[index];

				if (data[xVarName] == chartData[i][xVarName]) {
					result[index][yVarName] = result[index][yVarName] + chartData[i][yVarName];
					hasMatch = true;
					break;
				}
			}
			if (hasMatch == false) {
				ditem = {};
				ditem[xVarName] = chartData[i][xVarName];
				ditem[yVarName] = chartData[i][yVarName];
				//ditem["caption"] = opts[0].captions != undefined ? opts[0].captions[0][chartData[i][xVarName]] : "";
				//ditem["title"] = opts[0].captions != undefined ? opts[0].captions[0][chartData[i][xVarName]] : "";

				ditem["caption"] = chartData[i][xVarName];
				ditem["title"] = chartData[i][xVarName];

				ditem["op"] = 1;
				result.push(ditem);

				//resultColors[counter] = opts[0].color != undefined ? opts[0].color[0][chartData[i][xVarName]] : "";
				resultColors[counter] = "#4C88CD";

				counter += 1;
			}
		}
	}


	runningData = result;
	runningColors = resultColors;
	return;
}

//Rejection Reason Drill down

//Duration Drill down

var downtime_dur_chartData = [];

downtime_dur_chartOptions = [{
	"xaxis": "AssetName",
	"xaxisl1": "Alarm_Description",
	"yaxis": "Total_Downtime"
}]

function Downtime_Plot() {

	var myData = {
		"CompanyCode": this.company,
		"PlantCode": this.plant,
		"line": this.line,
		"Line_Code": this.line,
		"Shift": this.Shift,
	};

	$.ajax({
		type: "POST",
		url: sURL + 'api/LineOverviewProd/get_Prod_downtime_reasons',
		data: myData,
		headers: {
			Authorization: 'Bearer ' + user1
		},
		dataType: "json",
		//beforeSend: function () {
		//	$('.loading').show();
		//},
		//complete: function () {
		//	$('.loading').hide();
		//},
		success: function (response) {
			var downtime_data = response.data.Table;
			if (downtime_data != "") {
				if (response.data.Table.length > 0) {
					downtime_dur_chartData = response.data.Table;
					Downtime_ChartData(downtime_dur_chartData, downtime_dur_chartOptions);
					Downtime_Bar("charts_drilldown", downtime_dur_chartData, downtime_dur_chartOptions);
				}
			}
			else {
				var chartTitle = '';
				var elementID = `.${Shift} #charts_drilldown #c22`;
				displayScenarioText(elementID, chartTitle, 'No Data for the entire Shift');
			}
		}
	});
}

function Downtime_Bar(id, chartData, options, level) {

	chart = d3.select("#" + id + " #c22");

	$("#" + id + " #c22").empty();

	var margin = "";
	if (level == "1") {
		margin = { top: 50, right: 10, bottom: 30, left: 50 },
			width = $(chart[0]).outerWidth() - margin.left - margin.right,
			height = 200 - margin.top - margin.bottom
	}
	else {
		margin = { top: 50, right: 10, bottom: 30, left: 50 },
			width = $(chart[0]).outerWidth() - margin.left - margin.right,
			height = 280 - margin.top - margin.bottom
	}


	var xVarName;
	var yVarName = options[0].yaxis;

	if (level == 1) {
		xVarName = options[0].xaxisl1;
	}
	else {
		xVarName = options[0].xaxis;
	}

	var xAry = runningData_1.map(function (el) {

		return el[xVarName];
	});

	var yAry = runningData_1.map(function (el) {
		return el[yVarName];
	});

	var capAry = runningData_1.map(function (el) { return el.caption; });


	const min_axis = d3.max(runningData_1, d => d[yVarName]) / 5;
	const max_axis = d3.max(runningData_1, d => d[yVarName]);

	var x = d3.scale.ordinal().domain(xAry).rangeRoundBands([0, width], .5);

	var y = d3.scale.linear()
		.domain([0, d3.max(runningData_1, function (d) { return d[yVarName]; })])
		.range([height, 0]);

	const tickValues = [parseInt(min_axis), (parseInt(min_axis) * 2), (parseInt(min_axis) * 3), (parseInt(min_axis) * 4), max_axis];


	var rcolor = d3.scale.ordinal().range(runningColors_1);

	chart = chart
		.append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", "150");

	var bar = chart.selectAll("g")
		.data(runningData_1)
		.enter()
		.append("g")
		.attr("transform", function (d) {
			return "translate(" + x(d[xVarName]) + ", 0)";
		});

	var ctrtxt = 0;
	var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom")
		.ticks(xAry.length)

		.tickFormat(function (d) {
			if (level == 0) {
				return d;
			}
			else {
				ctrtxt += 1;
				return d;
			}
		});

	var yAxis = d3.svg.axis()
		.scale(y)
		.orient("left")
		.tickValues(tickValues)
		.ticks(5); //orient left because y-axis tick labels will appear on the left side of the axis.



	bar.append("rect")
		.attr("y", function (d) {
			return y(d.Total_Downtime) + margin.top - 15;
		})
		.attr("x", function (d) {
			return (margin.left);
		})

		//.on("mouseenter", function (d) {
		//	d3.select(this)
		//		.attr("stroke", "white")
		//		.attr("stroke-width", 1)
		//		.attr("height", function (d) {
		//			return height - y(d[yVarName]) + 5;
		//		})
		//		.attr("y", function (d) {
		//			return y(d.Total_Downtime) + margin.top - 20;
		//		})
		//		.attr("width", x.rangeBand() + 10)
		//		.attr("x", function (d) {
		//			return (margin.left - 5);
		//		})
		//		.transition()
		//		.duration(200);

		//})

		//.on("mouseleave", function (d) {
		//	d3.select(this)
		//		.attr("stroke", "none")
		//		.attr("height", function (d) {
		//			return height - y(d[yVarName]);;
		//		})
		//		.attr("y", function (d) {
		//			return y(d[yVarName]) + margin.top - 15;
		//		})
		//		.attr("width", x.rangeBand())
		//		.attr("x", function (d) {
		//			return (margin.left);
		//		})
		//		.transition()
		//		.duration(200);

		//})

		.on("click", function (d) {
			Title_name = d.title;

			if (this._listenToEvents) {
				// Reset inmediatelly
				d3.select(this).attr("transform", "translate(0,0)")
				// Change level on click if no transition has started
				path.each(function () {
					this._listenToEvents = false;
				});
			}
			d3.selectAll("#" + id + " #c22 svg").remove();
			if (level == 1) {
				Downtime_ChartData(chartData, options, 0, d[xVarName]);
				Downtime_Bar(id, chartData, options, 0);
			}
			else {
				var nonSortedChart = chartData.sort(function (a, b) {
					return parseFloat(b[options[0].yaxis]) - parseFloat(a[options[0].yaxis]);
				});
				Downtime_ChartData(nonSortedChart, options, 1, d[xVarName]);
				Downtime_Bar(id, nonSortedChart, options, 1);
			}
		});


	bar.selectAll("rect").attr("height", function (d) {
		return height - y(d[yVarName]);
	})
		.transition().delay(function (d, i) { return i * 300; })
		.duration(1000)
		.attr("width", x.rangeBand())
		.transition().delay(function (d, i) { return i * 300; })
		.duration(1000);

	bar.selectAll("rect").style("fill", function (d) {
		return rcolor(d[xVarName]);
	})
		.style("opacity", function (d) {
			return d["op"];
		});

	bar.append("text")
		.attr("x", x.rangeBand() / 2 + margin.left - 10)
		.attr("y", function (d) { return y(d[yVarName]) + margin.top - 25; })
		.attr("dy", ".35em")
		.text(function (d) {
			return d[yVarName];
		});

	bar.append("svg:title")
		.text(function (d) {
			return d["title"] + " (" + d[yVarName] + ")";
		});

	chart.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(" + margin.left + "," + (height + margin.top - 15) + ")")
		.call(xAxis)
		.append("text")
		.attr("x", width)
		.attr("y", -6)
		.style("text-anchor", "end")

	chart.append("g")
		.attr("class", "y axis")
		.attr("transform", "translate(" + margin.left + "," + (margin.top - 15) + ")")
		.call(yAxis)
		.append("text")
		.attr("transform", "rotate(-90)")
		.attr("y", 6)
		.attr("dy", ".71em")
		.style("text-anchor", "end")

	chart.append("text")
		.attr("class", "y-axis-label")
		.attr("x", -height / 2)
		.attr("y", margin.left / 4)
		.attr("transform", "rotate(-90)")
		.attr("text-anchor", "middle")
		.text("Downtime(min)");



	chart.select(".y.axis")
		.selectAll("text")
		.style("font-size", "10px");

	if (level == "1") {
		var value = chart.append("text")
			.attr("class", "x-axis-label")
			.text("Alarms")
			.style("font-size", "12px");
		value.attr("transform", "translate(140,250)");

		var button = $('<span class="close-btn_1" id="dangerButton_1">&times;</span>');
		$('#charts_drilldown #c22').append(button);

		$("#dangerButton_1").click(function () {
			;
			d3.select("#charts_drilldown #c22").select("svg").select("rect").each(function (d) {
				d3.select(this).on("click")(d);
			});
		});
		chart.select(".x.axis")
			.selectAll("text")
			.attr("y", "30")
			.style("font-size", "10px")
			.attr("transform", " translate(-60,10) rotate(-35)");
		var title = chart.append("text")
			.attr("class", "x-axis-title")
			.text(Title_name + " Downtime Reason");
	}
	else {
		var value = chart.append("text")
			.attr("class", "x-axis-label")
			.text("Station")
			.style("font-size", "12px");
		//value.attr("transform", "translate(180,255)");
		var xValueTranslate = height - 50;
		value.attr("transform", "translate(" + xValueTranslate + "," + ((height - (margin.bottom / 2)) + 90) + ")");

		chart.select(".x.axis")
			.selectAll("text")
			.attr("y", "5")
			.style("font-size", "10px")
			.attr("transform", " translate(-15,10) rotate(-35)");

		var title = chart.append("text")
			.attr("class", "x-axis-title")
			.text("Top 10 Station-wise Downtime Duration");
	}

	var titleWidth = title.node().getComputedTextLength();
	title.attr("transform", "translate(10,12)");
}

function Downtime_ChartData(chartData, opts, level, filter) {
	var result = [];
	var resultColors = [];
	var counter = 0;
	var hasMatch;
	var xVarName;
	var yVarName = opts[0].yaxis;

	if (level == 1) {
		xVarName = opts[0].xaxisl1;

		for (var i in chartData) {
			hasMatch = false;
			for (var index = 0; index < result.length; ++index) {
				var data = result[index];

				if ((data[xVarName] == chartData[i][xVarName]) && (chartData[i][opts[0].xaxis]) == filter) {
					result[index][yVarName] = result[index][yVarName] + chartData[i][yVarName];
					hasMatch = true;
					break;
				}

			}
			if ((hasMatch == false) && ((chartData[i][opts[0].xaxis]) == filter)) {
				if (result.length < 9) {
					ditem = {}
					ditem[xVarName] = chartData[i][xVarName];
					ditem[yVarName] = chartData[i][yVarName];
					ditem["caption"] = chartData[i][xVarName].substring(0, 10) + '...';
					ditem["title"] = chartData[i][xVarName];
					ditem["op"] = 1.0 - parseFloat("0." + (result.length));
					result.push(ditem);

					//resultColors[counter] = opts[0].col`or[0][chartData[i][opts[0].xaxis]];
					resultColors[counter] = "#4C88CD";

					counter += 1;
				}
			}
		}
	}
	else {
		xVarName = opts[0].xaxis;

		for (var i in chartData) {
			hasMatch = false;
			for (var index = 0; index < result.length; ++index) {
				var data = result[index];

				if (data[xVarName] == chartData[i][xVarName]) {
					result[index][yVarName] = result[index][yVarName] + chartData[i][yVarName];
					hasMatch = true;
					break;
				}
			}
			if (hasMatch == false) {
				ditem = {};
				ditem[xVarName] = chartData[i][xVarName];
				ditem[yVarName] = chartData[i][yVarName];
				//ditem["caption"] = opts[0].captions != undefined ? opts[0].captions[0][chartData[i][xVarName]] : "";
				//ditem["title"] = opts[0].captions != undefined ? opts[0].captions[0][chartData[i][xVarName]] : "";

				ditem["caption"] = chartData[i][xVarName];
				ditem["title"] = chartData[i][xVarName];

				ditem["op"] = 1;
				result.push(ditem);

				//resultColors[counter] = opts[0].color != undefined ? opts[0].color[0][chartData[i][xVarName]] : "";
				resultColors[counter] = "#4C88CD";

				counter += 1;
			}
		}
	}


	runningData_1 = result;
	runningColors_1 = resultColors;
	return;
}

//Duration Drill down

//Occurece Drill down

var downtime_occ_chartData = [];
downtime_occ_chartOptions = [{
	"xaxis": "AssetName",
	"xaxisl1": "Alarm_Description",
	"yaxis": "no_of_occurence"
}];

function Occurence_Plot() {

	var myData = {
		"CompanyCode": this.company,
		"PlantCode": this.plant,
		"line": this.line,
		"Line_Code": this.line,
		"Shift": this.Shift,
	};

	$.ajax({
		type: "POST",
		url: sURL + 'api/LineOverviewProd/get_Prod_downtime_reasons',
		data: myData,
		headers: {
			Authorization: 'Bearer ' + user1
		},
		//dataType: "json",
		//beforeSend: function () {
		//	$('.loading').show();
		//},
		//complete: function () {
		//	$('.loading').hide();
		//},
		success: function (response) {
			var datas = response.data.Table;
			if (datas != "") {
				if (response.data.Table.length > 0) {
					downtime_occ_chartData = response.data.Table;
					Occurence_ChartData(downtime_occ_chartData, downtime_occ_chartOptions);
					Occurence_Bar("charts_drilldown", downtime_occ_chartData, downtime_occ_chartOptions);
				}
			}
			else {
				var chartTitle = '';
				var elementID = `.${Shift} #charts_drilldown #c22`;
				displayScenarioText(elementID, chartTitle, 'No Data for the entire Shift');
			}
		}
	});
}

function Occurence_Bar(id, chartData, options, level) {

	chart = d3.select("#" + id + " #c22");

	$("#" + id + " #c22").empty();

	var margin = "";
	if (level == "1") {
		margin = { top: 50, right: 10, bottom: 30, left: 50 },
			width = $(chart[0]).outerWidth() - margin.left - margin.right,
			height = 200 - margin.top - margin.bottom
	}
	else {
		margin = { top: 50, right: 10, bottom: 30, left: 50 },
			width = $(chart[0]).outerWidth() - margin.left - margin.right,
			height = 280 - margin.top - margin.bottom
	}


	var xVarName;
	var yVarName = options[0].yaxis;

	if (level == 1) {
		xVarName = options[0].xaxisl1;
	}
	else {
		xVarName = options[0].xaxis;
	}

	var xAry = runningData_1.map(function (el) {

		return el[xVarName];
	});

	var yAry = runningData_1.map(function (el) {
		return el[yVarName];
	});

	var capAry = runningData_1.map(function (el) { return el.caption; });


	const min_axis = d3.max(runningData_1, d => d[yVarName]) / 5;
	const max_axis = d3.max(runningData_1, d => d[yVarName]);

	var x = d3.scale.ordinal().domain(xAry).rangeRoundBands([0, width], .5);

	var y = d3.scale.linear()
		.domain([0, d3.max(runningData_1, function (d) { return d[yVarName]; })])
		.range([height, 0]);

	const tickValues = [parseInt(min_axis), (parseInt(min_axis) * 2), (parseInt(min_axis) * 3), (parseInt(min_axis) * 4), max_axis];


	var rcolor = d3.scale.ordinal().range(runningColors_1);

	chart = chart
		.append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", "150");

	var bar = chart.selectAll("g")
		.data(runningData_1)
		.enter()
		.append("g")
		.attr("transform", function (d) {
			return "translate(" + x(d[xVarName]) + ", 0)";
		});

	var ctrtxt = 0;
	var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom")
		.ticks(xAry.length)

		.tickFormat(function (d) {
			if (level == 0) {
				return d;
			}
			else {
				ctrtxt += 1;
				return d;
			}
		});

	var yAxis = d3.svg.axis()
		.scale(y)
		.orient("left")
		.tickValues(tickValues)
		.ticks(5); //orient left because y-axis tick labels will appear on the left side of the axis.



	bar.append("rect")
		.attr("y", function (d) {
			return y(d.no_of_occurence) + margin.top - 15;
		})
		.attr("x", function (d) {
			return (margin.left);
		})

		//.on("mouseenter", function (d) {
		//	d3.select(this)
		//		.attr("stroke", "white")
		//		.attr("stroke-width", 1)
		//		.attr("height", function (d) {
		//			return height - y(d[yVarName]) + 5;
		//		})
		//		.attr("y", function (d) {
		//			return y(d.Total_Downtime) + margin.top - 20;
		//		})
		//		.attr("width", x.rangeBand() + 10)
		//		.attr("x", function (d) {
		//			return (margin.left - 5);
		//		})
		//		.transition()
		//		.duration(200);

		//})

		//.on("mouseleave", function (d) {
		//	d3.select(this)
		//		.attr("stroke", "none")
		//		.attr("height", function (d) {
		//			return height - y(d[yVarName]);;
		//		})
		//		.attr("y", function (d) {
		//			return y(d[yVarName]) + margin.top - 15;
		//		})
		//		.attr("width", x.rangeBand())
		//		.attr("x", function (d) {
		//			return (margin.left);
		//		})
		//		.transition()
		//		.duration(200);

		//})

		.on("click", function (d) {
			Title_name = d.title;

			if (this._listenToEvents) {
				// Reset inmediatelly
				d3.select(this).attr("transform", "translate(0,0)")
				// Change level on click if no transition has started
				path.each(function () {
					this._listenToEvents = false;
				});
			}
			d3.selectAll("#" + id + " #c22 svg").remove();
			if (level == 1) {
				Occurence_ChartData(chartData, options, 0, d[xVarName]);
				Occurence_Bar(id, chartData, options, 0);
			}
			else {
				var nonSortedChart = chartData.sort(function (a, b) {
					return parseFloat(b[options[0].yaxis]) - parseFloat(a[options[0].yaxis]);
				});
				Occurence_ChartData(nonSortedChart, options, 1, d[xVarName]);
				Occurence_Bar(id, nonSortedChart, options, 1);
			}
		});


	bar.selectAll("rect").attr("height", function (d) {
		return height - y(d[yVarName]);
	})
		.transition().delay(function (d, i) { return i * 300; })
		.duration(1000)
		.attr("width", x.rangeBand())
		.transition().delay(function (d, i) { return i * 300; })
		.duration(1000);

	bar.selectAll("rect").style("fill", function (d) {
		return rcolor(d[xVarName]);
	})
		.style("opacity", function (d) {
			return d["op"];
		});

	bar.append("text")
		.attr("x", x.rangeBand() / 2 + margin.left - 10)
		.attr("y", function (d) { return y(d[yVarName]) + margin.top - 25; })
		.attr("dy", ".35em")
		.text(function (d) {
			return d[yVarName];
		});

	bar.append("svg:title")
		.text(function (d) {
			return d["title"] + " (" + d[yVarName] + ")";
		});

	chart.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(" + margin.left + "," + (height + margin.top - 15) + ")")
		.call(xAxis)
		.append("text")
		.attr("x", width)
		.attr("y", -6)
		.style("text-anchor", "end")

	chart.append("g")
		.attr("class", "y axis")
		.attr("transform", "translate(" + margin.left + "," + (margin.top - 15) + ")")
		.call(yAxis)
		.append("text")
		.attr("transform", "rotate(-90)")
		.attr("y", 6)
		.attr("dy", ".71em")
		.style("text-anchor", "end")

	chart.append("text")
		.attr("class", "y-axis-label")
		.attr("x", -height / 2)
		.attr("y", margin.left / 4)
		.attr("transform", "rotate(-90)")
		.attr("text-anchor", "middle")
		.text("No of Occurence");



	chart.select(".y.axis")
		.selectAll("text")
		.style("font-size", "10px");

	if (level == "1") {
		var value = chart.append("text")
			.attr("class", "x-axis-label")
			.text("Alarms")
			.style("font-size", "12px");
		value.attr("transform", "translate(140,250)");

		var button = $('<span class="close-btn_1" id="dangerButton_1">&times;</span>');
		$('#charts_drilldown #c22').append(button);

		$("#dangerButton_1").click(function () {
			;
			d3.select("#charts_drilldown #c22").select("svg").select("rect").each(function (d) {
				d3.select(this).on("click")(d);
			});
		});
		chart.select(".x.axis")
			.selectAll("text")
			.attr("y", "30")
			.style("font-size", "10px")
			.attr("transform", " translate(-60,10) rotate(-35)");
		var title = chart.append("text")
			.attr("class", "x-axis-title")
			.text(Title_name + " Downtime Occurence");
	}
	else {
		var value = chart.append("text")
			.attr("class", "x-axis-label")
			.text("Station")
			.style("font-size", "12px");
		//value.attr("transform", "translate(180,255)");
		var xValueTranslate = height - 50;
		value.attr("transform", "translate(" + xValueTranslate + "," + ((height - (margin.bottom / 2)) + 90) + ")");

		chart.select(".x.axis")
			.selectAll("text")
			.attr("y", "5")
			.style("font-size", "10px")
			.attr("transform", " translate(-15,10) rotate(-35)");

		var title = chart.append("text")
			.attr("class", "x-axis-title")
			.text("Top 10 Station-wise Downtime Occurence");
	}

	var titleWidth = title.node().getComputedTextLength();
	title.attr("transform", "translate(10,12)");
}

function Occurence_ChartData(chartData, opts, level, filter) {
	var result = [];
	var resultColors = [];
	var counter = 0;
	var hasMatch;
	var xVarName;
	var yVarName = opts[0].yaxis;

	if (level == 1) {
		xVarName = opts[0].xaxisl1;

		for (var i in chartData) {
			hasMatch = false;
			for (var index = 0; index < result.length; ++index) {
				var data = result[index];

				if ((data[xVarName] == chartData[i][xVarName]) && (chartData[i][opts[0].xaxis]) == filter) {
					result[index][yVarName] = result[index][yVarName] + chartData[i][yVarName];
					hasMatch = true;
					break;
				}

			}
			if ((hasMatch == false) && ((chartData[i][opts[0].xaxis]) == filter)) {
				if (result.length < 9) {
					ditem = {}
					ditem[xVarName] = chartData[i][xVarName];
					ditem[yVarName] = chartData[i][yVarName];
					ditem["caption"] = chartData[i][xVarName].substring(0, 10) + '...';
					ditem["title"] = chartData[i][xVarName];
					ditem["op"] = 1.0 - parseFloat("0." + (result.length));
					result.push(ditem);

					//resultColors[counter] = opts[0].col`or[0][chartData[i][opts[0].xaxis]];
					resultColors[counter] = "#4C88CD";

					counter += 1;
				}
			}
		}
	}
	else {
		xVarName = opts[0].xaxis;

		for (var i in chartData) {
			hasMatch = false;
			for (var index = 0; index < result.length; ++index) {
				var data = result[index];

				if (data[xVarName] == chartData[i][xVarName]) {
					result[index][yVarName] = result[index][yVarName] + chartData[i][yVarName];
					hasMatch = true;
					break;
				}
			}
			if (hasMatch == false) {
				ditem = {};
				ditem[xVarName] = chartData[i][xVarName];
				ditem[yVarName] = chartData[i][yVarName];
				//ditem["caption"] = opts[0].captions != undefined ? opts[0].captions[0][chartData[i][xVarName]] : "";
				//ditem["title"] = opts[0].captions != undefined ? opts[0].captions[0][chartData[i][xVarName]] : "";

				ditem["caption"] = chartData[i][xVarName];
				ditem["title"] = chartData[i][xVarName];

				ditem["op"] = 1;
				result.push(ditem);

				//resultColors[counter] = opts[0].color != undefined ? opts[0].color[0][chartData[i][xVarName]] : "";
				resultColors[counter] = "#4C88CD";

				counter += 1;
			}
		}
	}


	runningData_1 = result;
	runningColors_1 = resultColors;
	return;
}
//Occurence Drill down


function get_value() {
	var downtime_option = $("#downtime_option").val();
	if (downtime_option == "1") {
		Downtime_Plot();
	}
	else {
		Occurence_Plot();
	}
}


//Drill down End


