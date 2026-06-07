const SHIFT_DEFINITIONS = [
    { key: "day", label: "白班", shortLabel: "白", cssClass: "shift-day" },
    { key: "smallNight", label: "小夜", shortLabel: "小夜", cssClass: "shift-small-night" },
    { key: "night", label: "大夜", shortLabel: "大夜", cssClass: "shift-night" }
];

const SHIFT_BY_KEY = Object.fromEntries(
    SHIFT_DEFINITIONS.map((shift) => [shift.key, shift])
);

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

let globalScheduleData = [];
let globalTitle = "";
let globalDoctors = [];
let globalStats = [];
let globalScheduleMeta = null;
let preLeaveMatrix = [];
let modalPreLeaveMatrix = [];
let activePreLeaveContext = null;
let isDraggingPreLeave = false;
let dragPreLeaveValue = false;
let dragVisitedCells = new Set();

function getCurrentYear() {
    return new Date().getFullYear();
}

function normalizeDoctorCount(value, { enforceMin = true } = {}) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
        return NaN;
    }

    const withMax = Math.min(80, parsed);
    return enforceMin ? Math.max(3, withMax) : withMax;
}

function syncDoctorCountInput(options = {}) {
    const input = document.getElementById("inputDoctorCount");
    if (!input) {
        return 10;
    }

    const normalized = normalizeDoctorCount(input.value, options);
    if (Number.isNaN(normalized)) {
        return NaN;
    }

    input.value = String(normalized);
    return normalized;
}

function commitDoctorCountInput() {
    return syncDoctorCountInput();
}

function getDoctorCount() {
    const normalized = normalizeDoctorCount(
        document.getElementById("inputDoctorCount")?.value ?? "10"
    );

    if (Number.isNaN(normalized)) {
        return 10;
    }

    return normalized;
}

function getDoctorList(doctorCount = getDoctorCount()) {
    return Array.from(
        { length: doctorCount },
        (_, index) => `醫師${String(index + 1).padStart(2, "0")}`
    );
}

function getShiftList() {
    return SHIFT_DEFINITIONS.map((shift) => shift.label);
}

function getShiftKeyByLabel(label) {
    return SHIFT_DEFINITIONS.find((shift) => shift.label === label)?.key ?? "";
}

function getCurrentDept() {
    return document.getElementById("inputDept")?.value.trim() ?? "";
}

function getDaysInMonth(month, year = getCurrentYear()) {
    return new Date(year, month, 0).getDate();
}

function getValidMonthValue() {
    const month = Number.parseInt(document.getElementById("inputMonth")?.value ?? "", 10);
    if (Number.isNaN(month) || month < 1 || month > 12) {
        return NaN;
    }
    return month;
}

function syncDaysInMonthFromInput() {
    const input = document.getElementById("inputDays");
    const month = getValidMonthValue();

    if (Number.isNaN(month)) {
        input.value = "";
        return NaN;
    }

    const days = getDaysInMonth(month);
    input.value = String(days);
    return days;
}

function createEmptyPreLeaveMatrix(daysInMonth, doctorCount = getDoctorCount()) {
    return Array.from({ length: doctorCount }, () => Array(daysInMonth).fill(false));
}

function clonePreLeaveMatrix(matrix) {
    return matrix.map((row) => row.slice());
}

function createOptionsHtml(options, selectedValue, placeholder) {
    let html = `<option value="">${placeholder}</option>`;
    options.forEach((option) => {
        const value = typeof option === "string" ? option : String(option.value);
        const label = typeof option === "string" ? option : option.label;
        const isSelected = value === String(selectedValue);
        html += `<option value="${value}"${isSelected ? " selected" : ""}>${label}</option>`;
    });
    return html;
}

function createAvoidRuleRow(doctorValue = "", shiftValue = "") {
    const doctorOptions = getDoctorList().map((doctor, index) => ({
        value: index,
        label: doctor
    }));

    return `
        <div class="avoid-rule-row">
            <select class="avoid-rule-doctor" onchange="renderAvoidRulesSummary()">
                ${createOptionsHtml(doctorOptions, doctorValue, "選擇醫師")}
            </select>
            <select class="avoid-rule-shift" onchange="renderAvoidRulesSummary()">
                ${createOptionsHtml(getShiftList(), shiftValue, "選擇班次")}
            </select>
            <button class="danger-button" type="button" onclick="removeAvoidRuleRow(this)">移除</button>
        </div>
    `;
}

function getAvoidRuleRowDrafts() {
    return Array.from(document.querySelectorAll(".avoid-rule-row")).map((row) => ({
        doctorValue: row.querySelector(".avoid-rule-doctor")?.value ?? "",
        shiftValue: row.querySelector(".avoid-rule-shift")?.value ?? ""
    }));
}

function normalizeAvoidRuleDrafts(ruleDrafts) {
    const doctorCount = getDoctorCount();
    return ruleDrafts.filter((draft) => {
        if (!draft) {
            return false;
        }

        if (draft.doctorValue === "") {
            return true;
        }

        const doctorIndex = Number.parseInt(draft.doctorValue, 10);
        return !Number.isNaN(doctorIndex) && doctorIndex < doctorCount;
    });
}

function renderAvoidRuleRows(ruleDrafts = getAvoidRuleRowDrafts()) {
    const container = document.getElementById("avoidRulesContainer");
    if (!container) {
        return;
    }

    const normalizedDrafts = normalizeAvoidRuleDrafts(ruleDrafts);
    const draftsToRender = normalizedDrafts.length
        ? normalizedDrafts
        : [{ doctorValue: "", shiftValue: "" }];

    container.innerHTML = draftsToRender
        .map((draft) => createAvoidRuleRow(draft.doctorValue, draft.shiftValue))
        .join("");

    renderAvoidRulesSummary();
}

function addAvoidRuleRow(doctorValue = "", shiftValue = "") {
    const ruleDrafts = getAvoidRuleRowDrafts();
    ruleDrafts.push({ doctorValue: String(doctorValue), shiftValue });
    renderAvoidRuleRows(ruleDrafts);
}

function removeAvoidRuleRow(button) {
    const row = button.closest(".avoid-rule-row");
    const rows = Array.from(document.querySelectorAll(".avoid-rule-row"));
    const rowIndex = rows.indexOf(row);
    const ruleDrafts = getAvoidRuleRowDrafts().filter((_, index) => index !== rowIndex);
    renderAvoidRuleRows(ruleDrafts);
}

function collectAvoidRules() {
    const doctorCount = getDoctorCount();
    const rows = document.querySelectorAll(".avoid-rule-row");
    const uniqueKeys = new Set();
    const rules = [];

    rows.forEach((row) => {
        const doctorValue = row.querySelector(".avoid-rule-doctor")?.value ?? "";
        const shiftValue = row.querySelector(".avoid-rule-shift")?.value ?? "";
        const doctorIndex = Number.parseInt(doctorValue, 10);

        if (
            Number.isNaN(doctorIndex)
            || doctorIndex < 0
            || doctorIndex >= doctorCount
            || !shiftValue
        ) {
            return;
        }

        const shiftKey = getShiftKeyByLabel(shiftValue);
        const ruleKey = `${doctorIndex}:${shiftKey}`;

        if (uniqueKeys.has(ruleKey)) {
            return;
        }

        uniqueKeys.add(ruleKey);
        rules.push({ doctorIndex, shiftKey, shiftLabel: shiftValue });
    });

    return rules;
}

function formatAvoidRulesSummary(avoidRules) {
    if (!avoidRules.length) {
        return "尚未設定避排規則。";
    }

    const doctorList = getDoctorList();
    const preview = avoidRules
        .slice(0, 3)
        .map((rule) => `${doctorList[rule.doctorIndex]}不排${rule.shiftLabel}`)
        .join("、");

    if (avoidRules.length <= 3) {
        return `已設定 ${avoidRules.length} 條避排規則：${preview}`;
    }

    return `已設定 ${avoidRules.length} 條避排規則：${preview} 等。`;
}

function renderAvoidRulesSummary() {
    const summary = document.getElementById("avoidRulesSummary");
    if (!summary) {
        return;
    }

    summary.textContent = formatAvoidRulesSummary(collectAvoidRules());
}

function buildAvoidRuleMap(avoidRules, doctorCount = getDoctorCount()) {
    const ruleMap = Array.from({ length: doctorCount }, () => new Set());
    avoidRules.forEach((rule) => {
        ruleMap[rule.doctorIndex].add(rule.shiftKey);
    });
    return ruleMap;
}

function initializeAvoidRulesUI() {
    renderAvoidRuleRows([{ doctorValue: "", shiftValue: "" }]);
}

function getPreLeaveStorageKey(dept, year, month) {
    return `hospital-shift-scheduler:${dept || "default"}:${year}:${month}`;
}

function getActivePreLeaveContext() {
    const month = getValidMonthValue();
    if (Number.isNaN(month)) {
        return null;
    }

    return {
        dept: getCurrentDept(),
        year: getCurrentYear(),
        month,
        daysInMonth: getDaysInMonth(month, getCurrentYear()),
        doctorCount: getDoctorCount()
    };
}

function loadPreLeaveMatrix(context = getActivePreLeaveContext()) {
    if (!context) {
        preLeaveMatrix = [];
        activePreLeaveContext = null;
        return preLeaveMatrix;
    }

    const doctorCount = context.doctorCount ?? getDoctorCount();
    const fallbackMatrix = createEmptyPreLeaveMatrix(context.daysInMonth, doctorCount);
    const storageKey = getPreLeaveStorageKey(context.dept, context.year, context.month);
    const rawValue = localStorage.getItem(storageKey);

    if (!rawValue) {
        preLeaveMatrix = fallbackMatrix;
        activePreLeaveContext = context;
        return preLeaveMatrix;
    }

    try {
        const parsed = JSON.parse(rawValue);
        if (!Array.isArray(parsed)) {
            throw new Error("Invalid pre-leave payload");
        }

        preLeaveMatrix = fallbackMatrix.map((row, doctorIndex) => {
            const savedRow = Array.isArray(parsed[doctorIndex]) ? parsed[doctorIndex] : [];
            return row.map((_, dayIndex) => Boolean(savedRow[dayIndex]));
        });
    } catch (_error) {
        preLeaveMatrix = fallbackMatrix;
    }

    activePreLeaveContext = context;
    return preLeaveMatrix;
}

function savePreLeaveMatrix(context = activePreLeaveContext || getActivePreLeaveContext()) {
    if (!context) {
        return;
    }

    const storageKey = getPreLeaveStorageKey(context.dept, context.year, context.month);
    localStorage.setItem(storageKey, JSON.stringify(preLeaveMatrix));
    activePreLeaveContext = context;
}

function countSelectedPreLeaves(matrix) {
    return matrix.reduce((total, row) => total + row.filter(Boolean).length, 0);
}

function updatePreLeaveSummary(context = activePreLeaveContext || getActivePreLeaveContext()) {
    const summary = document.getElementById("preLeaveSummary");
    if (!summary || !context) {
        return;
    }

    const totalSelected = countSelectedPreLeaves(modalPreLeaveMatrix);
    const deptLabel = context.dept || "未命名單位";
    summary.textContent = `${deptLabel} ${context.year} 年 ${context.month} 月共標記 ${totalSelected} 格預假。`;
}

function renderPreLeaveGrid() {
    const gridContainer = document.getElementById("preLeaveGrid");
    if (!gridContainer || !activePreLeaveContext) {
        return;
    }

    const doctors = getDoctorList(activePreLeaveContext.doctorCount);
    let html = '<table class="preleave-grid"><thead><tr><th class="doctor-header">醫師 / 日期</th>';

    for (let day = 1; day <= activePreLeaveContext.daysInMonth; day++) {
        html += `<th>${day}</th>`;
    }

    html += "</tr></thead><tbody>";

    doctors.forEach((doctorName, doctorIndex) => {
        html += `<tr><th class="doctor-header">${doctorName}</th>`;
        for (let dayIndex = 0; dayIndex < activePreLeaveContext.daysInMonth; dayIndex++) {
            const isSelected = Boolean(modalPreLeaveMatrix[doctorIndex][dayIndex]);
            const cellClass = isSelected ? "preleave-cell is-selected" : "preleave-cell";
            const label = isSelected ? "休" : "";
            html += `<td><button type="button" class="${cellClass}" data-doctor-index="${doctorIndex}" data-day-index="${dayIndex}" aria-pressed="${isSelected}">${label}</button></td>`;
        }
        html += "</tr>";
    });

    html += "</tbody></table>";
    gridContainer.innerHTML = html;
    updatePreLeaveSummary();
}

function setPreLeaveCellValue(doctorIndex, dayIndex, value) {
    if (
        !modalPreLeaveMatrix[doctorIndex]
        || typeof modalPreLeaveMatrix[doctorIndex][dayIndex] === "undefined"
    ) {
        return;
    }

    modalPreLeaveMatrix[doctorIndex][dayIndex] = value;
    const selector = `[data-doctor-index="${doctorIndex}"][data-day-index="${dayIndex}"]`;
    const cell = document.querySelector(selector);

    if (cell) {
        cell.classList.toggle("is-selected", value);
        cell.textContent = value ? "休" : "";
        cell.setAttribute("aria-pressed", value ? "true" : "false");
    }

    updatePreLeaveSummary();
}

function beginPreLeaveDrag(button) {
    const doctorIndex = Number(button.dataset.doctorIndex);
    const dayIndex = Number(button.dataset.dayIndex);
    dragPreLeaveValue = !modalPreLeaveMatrix[doctorIndex][dayIndex];
    isDraggingPreLeave = true;
    dragVisitedCells = new Set();
    applyDraggedPreLeave(button);
}

function applyDraggedPreLeave(button) {
    if (!button || !isDraggingPreLeave) {
        return;
    }

    const doctorIndex = Number(button.dataset.doctorIndex);
    const dayIndex = Number(button.dataset.dayIndex);
    const key = `${doctorIndex}-${dayIndex}`;

    if (dragVisitedCells.has(key)) {
        return;
    }

    dragVisitedCells.add(key);
    setPreLeaveCellValue(doctorIndex, dayIndex, dragPreLeaveValue);
}

function stopPreLeaveDrag() {
    isDraggingPreLeave = false;
    dragVisitedCells = new Set();
}

function handlePreLeaveGridPointerDown(event) {
    const button = event.target.closest(".preleave-cell");
    if (!button) {
        return;
    }

    event.preventDefault();
    beginPreLeaveDrag(button);
}

function handlePreLeaveGridPointerOver(event) {
    const button = event.target.closest(".preleave-cell");
    if (!button || !isDraggingPreLeave) {
        return;
    }

    applyDraggedPreLeave(button);
}

function clearPreLeaveMatrix() {
    if (!activePreLeaveContext) {
        return;
    }

    modalPreLeaveMatrix = createEmptyPreLeaveMatrix(
        activePreLeaveContext.daysInMonth,
        activePreLeaveContext.doctorCount
    );
    renderPreLeaveGrid();
}

function closePreLeaveModal() {
    document.getElementById("preLeaveModal")?.classList.remove("is-open");
    stopPreLeaveDrag();
    modalPreLeaveMatrix = [];
}

function savePreLeaveFromModal() {
    if (!activePreLeaveContext) {
        closePreLeaveModal();
        return;
    }

    preLeaveMatrix = clonePreLeaveMatrix(modalPreLeaveMatrix);
    savePreLeaveMatrix(activePreLeaveContext);
    closePreLeaveModal();
}

function openPreLeaveModal() {
    const context = getActivePreLeaveContext();
    if (!context) {
        alert("請先輸入有效月份，再設定預假。");
        return;
    }

    loadPreLeaveMatrix(context);
    modalPreLeaveMatrix = clonePreLeaveMatrix(preLeaveMatrix);
    renderPreLeaveGrid();
    document.getElementById("preLeaveModal")?.classList.add("is-open");
}

function handleMonthChange() {
    syncDaysInMonthFromInput();
    const context = getActivePreLeaveContext();
    if (!context) {
        preLeaveMatrix = [];
        activePreLeaveContext = null;
        return;
    }

    loadPreLeaveMatrix(context);
    if (document.getElementById("preLeaveModal")?.classList.contains("is-open")) {
        modalPreLeaveMatrix = clonePreLeaveMatrix(preLeaveMatrix);
        renderPreLeaveGrid();
    }
}

function handleDoctorCountChange() {
    const doctorCount = normalizeDoctorCount(
        document.getElementById("inputDoctorCount")?.value ?? "10",
        { enforceMin: false }
    );

    if (Number.isNaN(doctorCount)) {
        return;
    }

    const doctorCountInput = document.getElementById("inputDoctorCount");
    if (doctorCountInput && doctorCount > 80) {
        doctorCountInput.value = "80";
    }

    renderAvoidRuleRows();

    const context = getActivePreLeaveContext();
    if (!context) {
        return;
    }

    if (document.getElementById("preLeaveModal")?.classList.contains("is-open")) {
        closePreLeaveModal();
    }

    loadPreLeaveMatrix(context);
    savePreLeaveMatrix(context);
}

function initializePreLeaveModalEvents() {
    const modal = document.getElementById("preLeaveModal");
    const grid = document.getElementById("preLeaveGrid");

    grid.addEventListener("pointerdown", handlePreLeaveGridPointerDown);
    grid.addEventListener("pointerover", handlePreLeaveGridPointerOver);
    window.addEventListener("pointerup", stopPreLeaveDrag);
    window.addEventListener("pointercancel", stopPreLeaveDrag);

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closePreLeaveModal();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.classList.contains("is-open")) {
            closePreLeaveModal();
        }
    });
}

function createStats() {
    return SHIFT_DEFINITIONS.reduce(
        (stats, shift) => ({ ...stats, [shift.key]: 0 }),
        { off: 0 }
    );
}

function applyPreLeaveToSchedule(daySchedule, availableWorkers, dayIndex, stats) {
    const filteredWorkers = [];

    availableWorkers.forEach((workerIndex) => {
        if (preLeaveMatrix[workerIndex] && preLeaveMatrix[workerIndex][dayIndex]) {
            daySchedule[workerIndex] = "off";
            stats[workerIndex].off++;
            return;
        }

        filteredWorkers.push(workerIndex);
    });

    return filteredWorkers;
}

function getScheduleTitle(dept, year, month) {
    const deptLabel = dept || "未命名單位";
    return `${deptLabel} ${year}年${month}月醫師排班表`;
}

function resetGeneratedOutput(message = "設定月份與醫師人數後即可產生班表。") {
    globalScheduleData = [];
    globalTitle = "";
    globalDoctors = [];
    globalStats = [];
    globalScheduleMeta = null;

    const resultTitle = document.getElementById("resultTitle");
    const tableContainer = document.getElementById("tableContainer");
    const statsContainer = document.getElementById("statsContainer");
    const statsTable = document.getElementById("statsTable");

    if (resultTitle) {
        resultTitle.innerText = "尚未產生班表";
    }

    if (tableContainer) {
        tableContainer.classList.add("empty-state");
        tableContainer.textContent = message;
    }

    if (statsTable) {
        statsTable.innerHTML = "";
    }

    if (statsContainer) {
        statsContainer.hidden = true;
    }
}

function renderScheduleTable(schedule, doctorCount, month, year) {
    let html = "<table><thead><tr><th>日期</th><th>星期</th>";
    globalDoctors.forEach((doctor) => {
        html += `<th>${doctor}</th>`;
    });
    html += "</tr></thead><tbody>";

    for (let dayIndex = 0; dayIndex < schedule.length; dayIndex++) {
        const dateObj = new Date(year, month - 1, dayIndex + 1);
        const dayOfWeek = dateObj.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const rowClass = isWeekend ? "weekend-row" : "";

        html += `<tr class="${rowClass}"><td>${dayIndex + 1}</td><td>${WEEKDAY_LABELS[dayOfWeek]}</td>`;

        for (let doctorIndex = 0; doctorIndex < doctorCount; doctorIndex++) {
            const value = schedule[dayIndex][doctorIndex];
            const shift = SHIFT_BY_KEY[value];
            const displayText = shift ? shift.shortLabel : "休";
            const cssClass = shift ? shift.cssClass : "shift-off";
            html += `<td class="${cssClass}">${displayText}</td>`;
        }

        html += "</tr>";
    }

    html += "</tbody></table>";
    const tableContainer = document.getElementById("tableContainer");
    tableContainer.classList.remove("empty-state");
    tableContainer.innerHTML = html;
}

function renderStatsTable(stats) {
    let html = "<table><thead><tr><th>醫師</th><th>白班</th><th>小夜</th><th>大夜</th><th>休假 / 預假</th><th>總工作班數</th></tr></thead><tbody>";

    for (let index = 0; index < stats.length; index++) {
        const totalWork =
            stats[index].day
            + stats[index].smallNight
            + stats[index].night;

        html += `<tr>
            <td>${globalDoctors[index]}</td>
            <td>${stats[index].day}</td>
            <td>${stats[index].smallNight}</td>
            <td>${stats[index].night}</td>
            <td>${stats[index].off}</td>
            <td><strong>${totalWork}</strong></td>
        </tr>`;
    }

    html += "</tbody></table>";
    document.getElementById("statsTable").innerHTML = html;
    document.getElementById("statsContainer").hidden = false;
}

function generateSchedule() {
    const dept = getCurrentDept();
    const monthVal = document.getElementById("inputMonth")?.value.trim() ?? "";
    let daysInMonth = syncDaysInMonthFromInput();
    const doctorCount = syncDoctorCountInput();
    const avoidRules = collectAvoidRules();
    const avoidRuleMap = buildAvoidRuleMap(avoidRules, doctorCount);

    if (!monthVal || Number.isNaN(Number(monthVal))) {
        alert("請輸入 1 到 12 的月份。");
        return;
    }

    if (Number.isNaN(doctorCount)) {
        alert("請輸入 3 到 80 之間的醫師人數。");
        return;
    }

    if (doctorCount < 3) {
        alert("至少需要 3 位醫師才能分配白班、小夜與大夜。");
        return;
    }

    const month = Number.parseInt(monthVal, 10);
    if (month < 1 || month > 12) {
        alert("月份必須介於 1 到 12。");
        return;
    }

    if (Number.isNaN(daysInMonth) || daysInMonth < 28 || daysInMonth > 31) {
        alert("天數設定有誤，系統會依月份自動修正。");
        daysInMonth = getDaysInMonth(month);
        document.getElementById("inputDays").value = String(daysInMonth);
    }

    loadPreLeaveMatrix({
        dept,
        year: getCurrentYear(),
        month,
        daysInMonth,
        doctorCount
    });

    globalTitle = getScheduleTitle(dept, getCurrentYear(), month);
    document.getElementById("resultTitle").innerText = globalTitle;

    let schedule = [];
    let lastShift = new Array(doctorCount).fill("");
    let workCounts = new Array(doctorCount).fill(0);
    let stats = Array.from({ length: doctorCount }, () => createStats());

    let attemptCount = 0;
    let isSuccess = false;

    while (attemptCount < 1500) {
        attemptCount++;
        isSuccess = true;
        schedule = [];
        lastShift = new Array(doctorCount).fill("");
        workCounts = new Array(doctorCount).fill(0);
        stats = Array.from({ length: doctorCount }, () => createStats());

        for (let day = 0; day < daysInMonth; day++) {
            const daySchedule = new Array(doctorCount).fill("");
            let availableWorkers = Array.from({ length: doctorCount }, (_, index) => index);
            availableWorkers = applyPreLeaveToSchedule(daySchedule, availableWorkers, day, stats);

            if (availableWorkers.length < SHIFT_DEFINITIONS.length) {
                isSuccess = false;
                break;
            }

            for (const shift of SHIFT_DEFINITIONS) {
                let validPick = false;
                let safetyCount = 0;
                const minCurrentCounts = Math.min(...workCounts);

                while (!validPick && safetyCount < 80) {
                    safetyCount++;

                    if (!availableWorkers.length) {
                        break;
                    }

                    const randomIndex = Math.floor(Math.random() * availableWorkers.length);
                    const candidate = availableWorkers[randomIndex];
                    validPick = true;

                    if (shift.key === "day" && lastShift[candidate] === "smallNight") {
                        validPick = false;
                    }

                    if (avoidRuleMap[candidate]?.has(shift.key)) {
                        validPick = false;
                    }

                    if (workCounts[candidate] >= minCurrentCounts + 2 && safetyCount < 20) {
                        validPick = false;
                    }

                    if (validPick) {
                        daySchedule[candidate] = shift.key;
                        workCounts[candidate]++;
                        stats[candidate][shift.key]++;
                        availableWorkers.splice(randomIndex, 1);
                    }
                }

                if (!validPick) {
                    isSuccess = false;
                    break;
                }
            }

            if (!isSuccess) {
                break;
            }

            while (availableWorkers.length) {
                const candidate = availableWorkers.shift();
                daySchedule[candidate] = "off";
                stats[candidate].off++;
            }

            schedule.push(daySchedule);
            lastShift = daySchedule.slice();
        }

        if (isSuccess) {
            const maxCount = Math.max(...workCounts);
            const minCount = Math.min(...workCounts);
            if (maxCount - minCount <= 1) {
                break;
            }
        }
    }

    if (!isSuccess) {
        resetGeneratedOutput("目前條件下無法產生班表，請調整條件後再試一次。");
        alert("目前條件下無法產生符合規則的班表，請調整醫師人數、預假或避排規則後再試一次。");
        return;
    }

    globalScheduleData = schedule;
    globalDoctors = getDoctorList(doctorCount);
    globalStats = stats;
    globalScheduleMeta = {
        dept,
        month,
        year: getCurrentYear(),
        doctorCount
    };

    renderScheduleTable(schedule, doctorCount, month, getCurrentYear());
    renderStatsTable(stats);
}

function exportToCSV() {
    if (!globalScheduleData.length) {
        alert("請先產生班表，再匯出 CSV。");
        return;
    }

    const exportMonth = globalScheduleMeta?.month ?? getValidMonthValue();
    const exportYear = globalScheduleMeta?.year ?? getCurrentYear();

    let csvContent = "\uFEFF";
    csvContent += "日期,星期," + globalDoctors.join(",") + "\n";

    globalScheduleData.forEach((row, index) => {
        const dateObj = new Date(exportYear, exportMonth - 1, index + 1);
        const weekday = WEEKDAY_LABELS[dateObj.getDay()];
        const scheduleText = row.map((shiftKey) => SHIFT_BY_KEY[shiftKey]?.label ?? "休");
        csvContent += `${index + 1},${weekday},${scheduleText.join(",")}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${globalTitle || "schedule"}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function parseDemoQuery() {
    const params = new URLSearchParams(window.location.search);
    return {
        dept: params.get("dept"),
        month: params.get("month"),
        doctors: params.get("doctors"),
        demo: params.get("demo") === "1"
    };
}

function applyDemoPreset() {
    const config = parseDemoQuery();
    const deptInput = document.getElementById("inputDept");
    const monthInput = document.getElementById("inputMonth");
    const doctorInput = document.getElementById("inputDoctorCount");

    if (config.dept && deptInput) {
        deptInput.value = config.dept;
    }

    if (config.month && monthInput) {
        monthInput.value = config.month;
    }

    if (config.doctors && doctorInput) {
        doctorInput.value = config.doctors;
    }

    syncDaysInMonthFromInput();
    syncDoctorCountInput();

    if (!config.demo) {
        return;
    }

    renderAvoidRuleRows([
        { doctorValue: "0", shiftValue: "大夜" },
        { doctorValue: "1", shiftValue: "白班" }
    ]);

    const context = getActivePreLeaveContext();
    if (context) {
        preLeaveMatrix = createEmptyPreLeaveMatrix(context.daysInMonth, context.doctorCount);
        if (preLeaveMatrix[0] && typeof preLeaveMatrix[0][2] !== "undefined") {
            preLeaveMatrix[0][2] = true;
        }
        if (preLeaveMatrix[1] && typeof preLeaveMatrix[1][4] !== "undefined") {
            preLeaveMatrix[1][4] = true;
        }
        savePreLeaveMatrix(context);
    }

    generateSchedule();
}

function bootstrapDefaults() {
    const monthInput = document.getElementById("inputMonth");
    const deptInput = document.getElementById("inputDept");

    if (monthInput && !monthInput.value) {
        monthInput.value = String(new Date().getMonth() + 1);
    }

    if (deptInput && !deptInput.value) {
        deptInput.value = "內科";
    }

    syncDaysInMonthFromInput();
    syncDoctorCountInput();
}

document.addEventListener("DOMContentLoaded", () => {
    bootstrapDefaults();
    initializeAvoidRulesUI();
    initializePreLeaveModalEvents();
    loadPreLeaveMatrix();
    applyDemoPreset();
});
