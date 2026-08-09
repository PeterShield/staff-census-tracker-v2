const sampleEmployees = window.DEFAULT_EMPLOYEES || [];
let employees = [...sampleEmployees];

const startSelect = document.getElementById("startMonth");
const endSelect = document.getElementById("endMonth");
const fileInput = document.getElementById("spreadsheetFile");
const pasteData = document.getElementById("pasteData");
const sourceStatus = document.getElementById("sourceStatus");
const reportBody = document.getElementById("reportBody");
const monthCount = document.getElementById("monthCount");
const latestHeadcount = document.getElementById("latestHeadcount");
const latestMedianAge = document.getElementById("latestMedianAge");
const totalJoiners = document.getElementById("totalJoiners");
const totalLeavers = document.getElementById("totalLeavers");
const dialog = document.getElementById("detailDialog");
const dialogTitle = document.getElementById("dialogTitle");
const dialogKicker = document.getElementById("dialogKicker");
const dialogList = document.getElementById("dialogList");
const tableView = document.querySelector(".table-wrap");
const chartView = document.getElementById("chartView");
const chartTitle = document.getElementById("chartTitle");
const chartKicker = document.getElementById("chartKicker");
const chartCanvas = document.getElementById("reportChart");
const viewButtons = [...document.querySelectorAll(".view-button")];

let currentReport = [];
let currentView = "table";

function parseMonth(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

function formatMonth(key) {
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(parseMonth(key));
}

function monthEnd(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0));
}

function addMonths(key, count) {
  const next = parseMonth(key);
  next.setUTCMonth(next.getUTCMonth() + count);
  return next.toISOString().slice(0, 7);
}

function minMonthFromData() {
  return employees.reduce((min, employee) => (employee.startMonth < min ? employee.startMonth : min), employees[0]?.startMonth || "2001-01");
}

function maxMonthFromData() {
  return employees.reduce((max, employee) => {
    const candidate = employee.leavingMonth || employee.startMonth;
    return candidate > max ? candidate : max;
  }, employees[0]?.startMonth || "2025-12");
}

function getMonths(start, end) {
  const months = [];
  let cursor = start;
  while (cursor <= end) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return months;
}

function fillMonthSelects(preferredStart = "2001-01", preferredEnd = "2025-12") {
  const firstMonth = minMonthFromData();
  const lastMonth = maxMonthFromData();
  const allMonths = getMonths(firstMonth, lastMonth);
  for (const select of [startSelect, endSelect]) {
    select.replaceChildren();
    for (const month of allMonths) {
      const option = document.createElement("option");
      option.value = month;
      option.textContent = formatMonth(month);
      select.appendChild(option);
    }
  }
  startSelect.value = allMonths.includes(preferredStart) ? preferredStart : firstMonth;
  endSelect.value = allMonths.includes(preferredEnd) ? preferredEnd : lastMonth;
}

function dateValue(dateText) {
  return new Date(dateText + "T00:00:00Z").getTime();
}

function isActiveAtMonthEnd(employee, monthKey) {
  const end = monthEnd(monthKey).getTime();
  if (dateValue(employee.startDate) > end) return false;
  if (!employee.leavingDate) return true;
  return dateValue(employee.leavingDate) > end;
}

function ageAt(employee, atDate) {
  if (!employee.birthDate) return null;
  return (atDate.getTime() - dateValue(employee.birthDate)) / 31557600000;
}

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function medianAgeFor(active, month) {
  return median(active.map((employee) => ageAt(employee, monthEnd(month))));
}

function formatAge(value) {
  return value === null ? "n/a" : value.toFixed(1);
}

function formatAxisNumber(value, decimals = 0) {
  return Number(value).toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function employeeLabel(employee, includeDate, dateKind) {
  const bits = [employee.name];
  if (includeDate) bits.push(dateKind === "start" ? employee.startDate : employee.leavingDate);
  bits.push("ID " + employee.employeeId);
  return bits.join(" - ");
}

function buildReport() {
  let start = startSelect.value;
  let end = endSelect.value;
  if (start > end) {
    [start, end] = [end, start];
    startSelect.value = start;
    endSelect.value = end;
  }

  currentReport = getMonths(start, end).map((month) => {
    const active = employees
      .filter((employee) => isActiveAtMonthEnd(employee, month))
      .sort((a, b) => a.name.localeCompare(b.name) || a.employeeId - b.employeeId);
    const joiners = employees
      .filter((employee) => employee.startMonth === month)
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name));
    const leavers = employees
      .filter((employee) => employee.leavingMonth === month)
      .sort((a, b) => a.leavingDate.localeCompare(b.leavingDate) || a.name.localeCompare(b.name));
    return { month, active, joiners, leavers, medianAge: medianAgeFor(active, month) };
  });
}

function listButton(label, rowIndex, type, count) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "list-button";
  button.textContent = label;
  button.disabled = count === 0;
  button.addEventListener("click", () => showDetails(rowIndex, type));
  return button;
}

function render() {
  buildReport();
  reportBody.replaceChildren();

  let joinerTotal = 0;
  let leaverTotal = 0;

  currentReport.forEach((row, rowIndex) => {
    joinerTotal += row.joiners.length;
    leaverTotal += row.leavers.length;

    const tr = document.createElement("tr");
    const monthCell = document.createElement("td");
    monthCell.textContent = formatMonth(row.month);

    const activeCount = document.createElement("td");
    activeCount.className = "number";
    activeCount.innerHTML = '<span class="pill active-pill">' + row.active.length + "</span>";

    const ageCell = document.createElement("td");
    ageCell.className = "number";
    ageCell.innerHTML = '<span class="pill age-pill">' + formatAge(row.medianAge) + "</span>";

    const activeButton = document.createElement("td");
    activeButton.appendChild(listButton("Show team", rowIndex, "active", row.active.length));

    const joinerCount = document.createElement("td");
    joinerCount.className = "number";
    joinerCount.innerHTML = '<span class="pill joiner-pill">' + row.joiners.length + "</span>";

    const joinerButton = document.createElement("td");
    joinerButton.appendChild(listButton("Show joiners", rowIndex, "joiners", row.joiners.length));

    const leaverCount = document.createElement("td");
    leaverCount.className = "number";
    leaverCount.innerHTML = '<span class="pill leaver-pill">' + row.leavers.length + "</span>";

    const leaverButton = document.createElement("td");
    leaverButton.appendChild(listButton("Show leavers", rowIndex, "leavers", row.leavers.length));

    tr.append(monthCell, activeCount, ageCell, activeButton, joinerCount, joinerButton, leaverCount, leaverButton);
    reportBody.appendChild(tr);
  });

  monthCount.textContent = currentReport.length.toLocaleString("en-GB");
  latestHeadcount.textContent = (currentReport.at(-1)?.active.length ?? 0).toLocaleString("en-GB");
  latestMedianAge.textContent = formatAge(currentReport.at(-1)?.medianAge ?? null);
  totalJoiners.textContent = joinerTotal.toLocaleString("en-GB");
  totalLeavers.textContent = leaverTotal.toLocaleString("en-GB");
  renderCurrentView();
}

function reloadReportFromRows(rows, sourceLabel) {
  const parsed = normalizeRows(rows);
  if (!parsed.length) {
    sourceStatus.textContent = "No usable employee rows found. Check the headers and date columns.";
    return;
  }
  employees = parsed;
  const firstMonth = minMonthFromData();
  const lastMonth = maxMonthFromData();
  fillMonthSelects(firstMonth <= "2001-01" && lastMonth >= "2025-12" ? "2001-01" : firstMonth, firstMonth <= "2025-12" && lastMonth >= "2025-12" ? "2025-12" : lastMonth);
  sourceStatus.textContent = sourceLabel + " loaded: " + employees.length.toLocaleString("en-GB") + " employee rows.";
  render();
}

function normalizeRows(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((header) => normalizeHeader(header));
  const index = (...names) => names.map(normalizeHeader).map((name) => headers.indexOf(name)).find((i) => i >= 0);
  const idIndex = index("EmployeeID", "Employee ID", "ID");
  const firstIndex = index("FirstNameShort", "First Name", "FirstName", "Forename");
  const lastIndex = index("LastName", "Last Name", "Surname");
  const nameIndex = index("Name", "Employee", "Employee Name");
  const startIndex = index("Start Date", "Start  Date", "StartDate", "Join Date", "Joining Date");
  const leavingIndex = index("Leaving Date", "Leaving  Date", "Leave Date", "End Date", "LeavingDate");
  const birthIndex = index("Birth date", "Birth Date", "DOB", "Date of Birth");
  if (startIndex === undefined || (nameIndex === undefined && (firstIndex === undefined || lastIndex === undefined))) return [];

  return rows.slice(1).map((row, rowIndex) => {
    const startDate = parseInputDate(row[startIndex]);
    if (!startDate) return null;
    const leavingDate = leavingIndex === undefined ? null : parseInputDate(row[leavingIndex]);
    const birthDate = birthIndex === undefined ? null : parseInputDate(row[birthIndex]);
    const firstName = firstIndex === undefined ? "" : String(row[firstIndex] ?? "").trim();
    const lastName = lastIndex === undefined ? "" : String(row[lastIndex] ?? "").trim();
    const fallbackName = nameIndex === undefined ? "" : String(row[nameIndex] ?? "").trim();
    const name = fallbackName || (firstName + " " + lastName).replace(/\s+/g, " ").trim();
    if (!name) return null;
    return {
      employeeId: idIndex === undefined || row[idIndex] === "" ? rowIndex + 1 : row[idIndex],
      name,
      firstName,
      lastName,
      birthDate,
      startDate,
      leavingDate,
      startMonth: startDate.slice(0, 7),
      leavingMonth: leavingDate ? leavingDate.slice(0, 7) : null,
    };
  }).filter(Boolean).sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name) || String(a.employeeId).localeCompare(String(b.employeeId)));
}

function normalizeHeader(value) {
  return String(value ?? "").toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
}

function parseInputDate(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" || /^\d+(\.\d+)?$/.test(String(value).trim())) {
    const serial = Number(value);
    if (serial > 20000 && serial < 80000) {
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      return date.toISOString().slice(0, 10);
    }
  }
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (iso) return [iso[1], iso[2].padStart(2, "0"), iso[3].padStart(2, "0")].join("-");
  const uk = text.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
  if (uk) {
    const year = uk[3].length === 2 ? "20" + uk[3] : uk[3];
    return [year, uk[2].padStart(2, "0"), uk[1].padStart(2, "0")].join("-");
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function parseDelimited(text) {
  const delimiter = text.includes("\t") ? "\t" : ",";
  return text.trim().split(/\r?\n/).filter(Boolean).map((line) => splitDelimitedLine(line, delimiter));
}

function splitDelimitedLine(line, delimiter) {
  if (delimiter === "\t") return line.split("\t").map((cell) => cell.trim());
  const cells = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

async function parseWorkbook(file) {
  if (!window.JSZip) throw new Error("Spreadsheet reader is unavailable.");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const sharedStrings = await readSharedStrings(zip);
  const workbookXml = await zip.file("xl/workbook.xml").async("text");
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels").async("text");
  const firstSheetPath = getFirstSheetPath(workbookXml, relsXml);
  const sheetXml = await zip.file(firstSheetPath).async("text");
  return readSheetRows(sheetXml, sharedStrings);
}

async function readSharedStrings(zip) {
  const file = zip.file("xl/sharedStrings.xml");
  if (!file) return [];
  const xml = await file.async("text");
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return [...doc.getElementsByTagName("si")].map((si) => [...si.getElementsByTagName("t")].map((t) => t.textContent).join(""));
}

function getFirstSheetPath(workbookXml, relsXml) {
  const workbookDoc = new DOMParser().parseFromString(workbookXml, "application/xml");
  const relsDoc = new DOMParser().parseFromString(relsXml, "application/xml");
  const firstSheet = workbookDoc.getElementsByTagName("sheet")[0];
  const relId = firstSheet.getAttribute("r:id");
  const rel = [...relsDoc.getElementsByTagName("Relationship")].find((item) => item.getAttribute("Id") === relId);
  return "xl/" + rel.getAttribute("Target").replace(/^\//, "").replace(/^xl\//, "");
}

function readSheetRows(sheetXml, sharedStrings) {
  const doc = new DOMParser().parseFromString(sheetXml, "application/xml");
  const rows = [];
  for (const rowEl of doc.getElementsByTagName("row")) {
    const row = [];
    for (const cell of rowEl.getElementsByTagName("c")) {
      const ref = cell.getAttribute("r") || "";
      const col = columnIndex(ref.replace(/\d/g, ""));
      row[col] = readCellValue(cell, sharedStrings);
    }
    rows.push(row.map((value) => value ?? ""));
  }
  return rows;
}

function columnIndex(letters) {
  let index = 0;
  for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
  return Math.max(0, index - 1);
}

function readCellValue(cell, sharedStrings) {
  const type = cell.getAttribute("t");
  if (type === "inlineStr") return cell.getElementsByTagName("t")[0]?.textContent || "";
  const value = cell.getElementsByTagName("v")[0]?.textContent || "";
  if (type === "s") return sharedStrings[Number(value)] || "";
  return value;
}

function setView(view) {
  currentView = view;
  for (const button of viewButtons) {
    const active = button.dataset.view === view;
    button.classList.toggle("active-view", active);
    button.setAttribute("aria-pressed", String(active));
  }
  renderCurrentView();
}

function renderCurrentView() {
  tableView.hidden = currentView !== "table";
  chartView.hidden = currentView === "table";
  if (currentView === "headcount") {
    chartKicker.textContent = "Employee count";
    chartTitle.textContent = "People working by month";
    drawChart({
      values: currentReport.map((row) => row.active.length),
      yLabel: "People",
      color: "#1f6fae",
      decimals: 0,
    });
  }
  if (currentView === "age") {
    chartKicker.textContent = "Median age";
    chartTitle.textContent = "Median age by month";
    drawChart({
      values: currentReport.map((row) => row.medianAge),
      yLabel: "Age",
      color: "#9c6b18",
      decimals: 1,
    });
  }
}

function drawChart({ values, yLabel, color, decimals }) {
  if (!currentReport.length) return;
  const ctx = chartCanvas.getContext("2d");
  const rect = chartCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  chartCanvas.width = Math.max(720, Math.floor(rect.width * dpr));
  chartCanvas.height = Math.max(360, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = chartCanvas.width / dpr;
  const height = chartCanvas.height / dpr;
  const padding = { top: 22, right: 28, bottom: 58, left: 64 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const data = values.map((value) => (Number.isFinite(value) ? value : null));
  const finite = data.filter((value) => value !== null);
  const minValue = Math.min(...finite);
  const maxValue = Math.max(...finite);
  const spread = Math.max(1, maxValue - minValue);
  const yMin = Math.max(0, Math.floor((minValue - spread * 0.12) / 5) * 5);
  const yMax = Math.ceil((maxValue + spread * 0.12) / 5) * 5;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#d7dee9";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#647086";
  ctx.font = "12px Aptos, Segoe UI, Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const ratio = i / yTicks;
    const y = padding.top + plotHeight - ratio * plotHeight;
    const value = yMin + ratio * (yMax - yMin);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(formatAxisNumber(value, decimals), padding.left - 10, y);
  }

  ctx.save();
  ctx.translate(17, padding.top + plotHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();

  const pointFor = (value, index) => {
    const x = padding.left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
    const y = padding.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;
    return { x, y };
  };

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  data.forEach((value, index) => {
    if (value === null) return;
    const { x, y } = pointFor(value, index);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = color;
  const markerEvery = Math.max(1, Math.ceil(data.length / 24));
  data.forEach((value, index) => {
    if (value === null || index % markerEvery !== 0) return;
    const { x, y } = pointFor(value, index);
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.strokeStyle = "#98a8bb";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + plotHeight);
  ctx.lineTo(width - padding.right, padding.top + plotHeight);
  ctx.stroke();

  const labelIndexes = getXAxisLabelIndexes(data.length);
  ctx.fillStyle = "#647086";
  ctx.font = "12px Aptos, Segoe UI, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const index of labelIndexes) {
    const x = padding.left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
    ctx.fillText(formatMonth(currentReport[index].month), x, padding.top + plotHeight + 14);
  }
}

function getXAxisLabelIndexes(length) {
  if (length <= 1) return [0];
  const targetLabels = Math.min(8, length);
  const indexes = new Set([0, length - 1]);
  for (let i = 1; i < targetLabels - 1; i++) {
    indexes.add(Math.round((i / (targetLabels - 1)) * (length - 1)));
  }
  return [...indexes].sort((a, b) => a - b);
}

function showDetails(rowIndex, type) {
  const row = currentReport[rowIndex];
  const list = row[type];
  const labels = {
    active: ["Team at month end", "active", false],
    joiners: ["Joiners during month", "start", true],
    leavers: ["Leavers during month", "leaving", true],
  };
  const [title, dateKind, includeDate] = labels[type];
  dialogKicker.textContent = formatMonth(row.month);
  dialogTitle.textContent = title + " (" + list.length + ")";
  dialogList.replaceChildren();

  for (const employee of list) {
    const li = document.createElement("li");
    li.textContent = employeeLabel(employee, includeDate, dateKind);
    dialogList.appendChild(li);
  }

  dialog.showModal();
}

function downloadCsv() {
  const lines = [["Month", "People working at month end", "Median age", "Joiners", "Leavers"]];
  for (const row of currentReport) {
    lines.push([formatMonth(row.month), row.active.length, formatAge(row.medianAge), row.joiners.length, row.leavers.length]);
  }
  const csv = lines
    .map((cells) => cells.map((cell) => '"' + String(cell).replaceAll('"', '""') + '"').join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "bcp-monthly-headcount.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

document.getElementById("runReport").addEventListener("click", render);
document.getElementById("presetDefault").addEventListener("click", () => {
  startSelect.value = "2001-01";
  endSelect.value = "2025-12";
  render();
});
document.getElementById("presetAll").addEventListener("click", () => {
  startSelect.value = "1981-01";
  endSelect.value = "2026-06";
  render();
});
document.getElementById("downloadCsv").addEventListener("click", downloadCsv);
document.getElementById("loadPastedData").addEventListener("click", () => {
  reloadReportFromRows(parseDelimited(pasteData.value), "Pasted data");
});
document.getElementById("resetSampleData").addEventListener("click", () => {
  employees = [...sampleEmployees];
  pasteData.value = "";
  fillMonthSelects();
  sourceStatus.textContent = "Sample data loaded: " + employees.length.toLocaleString("en-GB") + " employee rows.";
  render();
});
fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  sourceStatus.textContent = "Loading " + file.name + "...";
  try {
    const rows = file.name.toLowerCase().endsWith(".xlsx")
      ? await parseWorkbook(file)
      : parseDelimited(await file.text());
    reloadReportFromRows(rows, file.name);
  } catch (error) {
    sourceStatus.textContent = "Could not read that spreadsheet. Try saving it as .xlsx, .csv, or paste the rows.";
  }
});
document.getElementById("closeDialog").addEventListener("click", () => dialog.close());
viewButtons.forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
window.addEventListener("resize", () => {
  if (currentView !== "table") renderCurrentView();
});
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

fillMonthSelects();
render();
