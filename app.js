const DEFAULT_CONFIG = {
  leaderboard: {
    mode: "local",
    endpoint: "",
    apiKey: "",
    timeoutMs: 2500,
    pollIntervalMs: 12000
  }
};

const APP_CONFIG = mergeConfig(DEFAULT_CONFIG, window.SUDOKU_APP_CONFIG || {});
const STORAGE_KEYS = {
  player: "neon-sudoku-player",
  unlocked: "neon-sudoku-unlocked"
};

const LEVELS = {
  "level-1": {
    id: "level-1",
    label: "训练模式",
    hintsAllowed: 0,
    unlocksNext: true,
    introduction:
      "这关以教学为主。系统会高亮三个关键落点，带你体验行、列、九宫格三种基础推理。",
    puzzle: [
      [5, 3, 0, 6, 7, 8, 0, 1, 2],
      [6, 0, 2, 1, 9, 5, 3, 4, 0],
      [1, 9, 8, 0, 4, 2, 5, 0, 7],
      [8, 5, 0, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 0, 3, 0, 9, 1],
      [7, 1, 3, 9, 2, 0, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 0, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 0],
      [3, 4, 0, 2, 8, 6, 1, 7, 9]
    ],
    solution: [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9]
    ],
    tutorialSteps: [
      {
        row: 1,
        col: 1,
        title: "第一步：列排除",
        text: "第 2 行第 2 列只可能是 7。先看这一列，除了 7 之外其他数字都已经出现了。"
      },
      {
        row: 1,
        col: 8,
        title: "第二步：行补全",
        text: "填入上一步后，第 2 行只剩一个空位，因此最后一个数字必定是 8。"
      },
      {
        row: 2,
        col: 3,
        title: "第三步：列唯一解",
        text: "第 3 行第 4 列现在只剩下 3。你已经同时用了行和列的约束。"
      }
    ]
  },
  "level-2": {
    id: "level-2",
    label: "深空模式",
    hintsAllowed: 5,
    unlocksNext: false,
    introduction:
      "高难关卡，空位更少但陷阱更多。你有 5 次提示机会，每次会直接修复一个空格。",
    puzzle: [
      [8, 0, 0, 0, 5, 0, 0, 9, 0],
      [0, 0, 5, 3, 0, 0, 0, 0, 8],
      [0, 4, 0, 0, 0, 9, 0, 0, 0],
      [0, 9, 0, 0, 0, 0, 2, 0, 0],
      [4, 0, 0, 5, 0, 3, 0, 0, 9],
      [0, 0, 8, 0, 0, 0, 0, 3, 0],
      [0, 0, 0, 2, 0, 0, 0, 1, 0],
      [1, 0, 0, 0, 0, 6, 8, 0, 0],
      [0, 3, 0, 0, 4, 0, 0, 0, 7]
    ],
    solution: [
      [8, 2, 7, 1, 5, 4, 3, 9, 6],
      [9, 6, 5, 3, 2, 7, 1, 4, 8],
      [3, 4, 1, 6, 8, 9, 7, 5, 2],
      [5, 9, 3, 4, 6, 8, 2, 7, 1],
      [4, 7, 2, 5, 1, 3, 6, 8, 9],
      [6, 1, 8, 9, 7, 2, 4, 3, 5],
      [7, 8, 6, 2, 3, 5, 9, 1, 4],
      [1, 5, 4, 7, 9, 6, 8, 2, 3],
      [2, 3, 9, 8, 4, 1, 5, 6, 7]
    ],
    tutorialSteps: []
  }
};

const elements = {
  board: document.querySelector("#board"),
  briefing: document.querySelector("#briefing"),
  timer: document.querySelector("#timer"),
  hintCount: document.querySelector("#hint-count"),
  progress: document.querySelector("#progress"),
  hintButton: document.querySelector("#hint-button"),
  newRun: document.querySelector("#new-run"),
  leaderboard: document.querySelector("#leaderboard"),
  leaderboardLevelLabel: document.querySelector("#leaderboard-level-label"),
  leaderboardSource: document.querySelector("#leaderboard-source"),
  leaderboardSyncStatus: document.querySelector("#leaderboard-sync-status"),
  playerName: document.querySelector("#player-name"),
  levelTabs: Array.from(document.querySelectorAll(".level-tab")),
  keypad: document.querySelector("#keypad"),
  resultModal: document.querySelector("#result-modal"),
  resultTitle: document.querySelector("#result-title"),
  resultSummary: document.querySelector("#result-summary"),
  resultRanking: document.querySelector("#result-ranking"),
  closeModal: document.querySelector("#close-modal"),
  nextLevel: document.querySelector("#next-level")
};

const leaderboardStore = createLeaderboardStore(APP_CONFIG.leaderboard);

const state = {
  activeLevelId: "level-1",
  board: [],
  selectedCell: null,
  hintsRemaining: 0,
  hintsUsed: 0,
  tutorialIndex: 0,
  startedAt: 0,
  timerId: null,
  finished: false,
  leaderboardCache: {},
  leaderboardPollId: null,
  leaderboardSource: "local",
  playerName: localStorage.getItem(STORAGE_KEYS.player) || "",
  level2Unlocked: localStorage.getItem(STORAGE_KEYS.unlocked) === "true"
};

bootstrap();

function bootstrap() {
  elements.playerName.value = state.playerName;
  elements.playerName.addEventListener("input", handlePlayerNameInput);
  elements.newRun.addEventListener("click", () => resetLevel(state.activeLevelId));
  elements.hintButton.addEventListener("click", useHint);
  elements.keypad.addEventListener("click", handleKeypadClick);
  elements.closeModal.addEventListener("click", closeResultModal);
  elements.nextLevel.addEventListener("click", handleNextLevel);
  document.addEventListener("keydown", handleKeyboardInput);

  elements.levelTabs.forEach((button) => {
    button.addEventListener("click", () => {
      const nextLevelId = button.dataset.level;
      if (!nextLevelId) {
        return;
      }
      if (nextLevelId === "level-2" && !state.level2Unlocked) {
        flashBriefing("深空模式需要先完成训练模式。");
        return;
      }
      switchLevel(nextLevelId);
    });
  });

  startLeaderboardPolling();
  window.addEventListener("focus", () => {
    void refreshLeaderboard(state.activeLevelId);
  });

  setLeaderboardSourceLabel("local");
  setLeaderboardSyncStatus("等待同步");
  updateLevelButtons();
  resetLevel(state.activeLevelId);
}

function switchLevel(levelId) {
  if (!LEVELS[levelId]) {
    return;
  }
  state.activeLevelId = levelId;
  updateLevelButtons();
  resetLevel(levelId);
}

function resetLevel(levelId) {
  const level = LEVELS[levelId];
  if (elements.resultModal.open) {
    closeResultModal();
  }
  stopTimer();
  state.board = level.puzzle.map((row) => row.slice());
  state.selectedCell = null;
  state.hintsRemaining = level.hintsAllowed;
  state.hintsUsed = 0;
  state.tutorialIndex = 0;
  state.startedAt = Date.now();
  state.finished = false;

  renderBoard();
  updateStatus();
  renderBriefing();
  startTimer();
  void refreshLeaderboard(levelId);
}

function renderBoard() {
  elements.board.innerHTML = "";
  const tutorialTarget = getCurrentTutorialTarget();
  const selectedValue =
    state.selectedCell ? state.board[state.selectedCell.row][state.selectedCell.col] : 0;
  state.board.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      const cell = document.createElement("button");
      const fixed = LEVELS[state.activeLevelId].puzzle[rowIndex][colIndex] !== 0;
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = String(rowIndex);
      cell.dataset.col = String(colIndex);
      cell.dataset.fixed = String(fixed);
      cell.dataset.editable = String(!fixed);
      cell.dataset.subgridRow = String(rowIndex);
      cell.dataset.subgridCol = String(colIndex);
      cell.textContent = value === 0 ? "" : String(value);
      cell.setAttribute("role", "gridcell");
      cell.setAttribute(
        "aria-label",
        `Row ${rowIndex + 1} Column ${colIndex + 1} ${value === 0 ? "empty" : value}`
      );

      if (state.selectedCell && state.selectedCell.row === rowIndex && state.selectedCell.col === colIndex) {
        cell.classList.add("is-selected");
      } else if (isRelatedCell(rowIndex, colIndex)) {
        cell.classList.add("is-related");
      }

      if (
        selectedValue !== 0 &&
        value === selectedValue &&
        !(state.selectedCell && state.selectedCell.row === rowIndex && state.selectedCell.col === colIndex)
      ) {
        cell.classList.add("is-value-match");
      }

      if (tutorialTarget && tutorialTarget.row === rowIndex && tutorialTarget.col === colIndex) {
        cell.classList.add("is-highlighted");
      }

      cell.addEventListener("click", () => selectCell(rowIndex, colIndex));
      elements.board.appendChild(cell);
    });
  });
}

function selectCell(row, col) {
  if (state.finished) {
    return;
  }
  state.selectedCell = { row, col };
  renderBoard();
}

function handleKeypadClick(event) {
  const button = event.target.closest("[data-value]");
  if (!button) {
    return;
  }
  const { value } = button.dataset;
  if (!value) {
    return;
  }
  placeValue(value === "clear" ? 0 : Number(value));
}

function handleKeyboardInput(event) {
  if (elements.resultModal.open) {
    return;
  }
  if (/^[1-9]$/.test(event.key)) {
    placeValue(Number(event.key));
  }
  if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
    placeValue(0);
  }
}

function placeValue(value) {
  if (!state.selectedCell || state.finished) {
    return;
  }
  const { row, col } = state.selectedCell;
  if (LEVELS[state.activeLevelId].puzzle[row][col] !== 0) {
    return;
  }

  if (value === 0) {
    state.board[row][col] = 0;
    updateAfterBoardChange();
    return;
  }

  const expected = LEVELS[state.activeLevelId].solution[row][col];
  if (value !== expected) {
    shakeCell(row, col);
    flashBriefing(`第 ${row + 1} 行第 ${col + 1} 列不是 ${value}，再检查一下行列约束。`);
    return;
  }

  state.board[row][col] = value;
  advanceTutorialIfNeeded(row, col);
  updateAfterBoardChange();
}

function updateAfterBoardChange() {
  renderBoard();
  updateStatus();
  renderBriefing();
  checkCompletion();
}

function updateStatus() {
  const filled = state.board.flat().filter(Boolean).length;
  elements.hintCount.textContent = String(state.hintsRemaining);
  elements.progress.textContent = `${filled} / 81`;
  elements.hintButton.disabled = state.finished || state.hintsRemaining === 0;
}

function renderBriefing(message) {
  if (message) {
    elements.briefing.innerHTML = `<h3>系统提示</h3><p>${message}</p>`;
    return;
  }

  const level = LEVELS[state.activeLevelId];
  const tutorialStep = getCurrentTutorialTarget();
  const paragraphs = [
    `<h3>${level.label}</h3>`,
    `<p>${level.introduction}</p>`
  ];

  if (tutorialStep) {
    paragraphs.push(`<p><strong>${tutorialStep.title}</strong><br />${tutorialStep.text}</p>`);
  } else if (state.activeLevelId === "level-2") {
    paragraphs.push(
      `<p>提示会直接填入一个正确数字，优先修复你当前选中的空格。深空模式的排行榜会同步记录你的用时与提示使用量。</p>`
    );
  } else {
    paragraphs.push(`<p>训练模式剩余步骤已完成，继续把整张盘面清空到 81 / 81 即可通关。</p>`);
  }

  elements.briefing.innerHTML = paragraphs.join("");
}

function flashBriefing(message) {
  renderBriefing(message);
  window.clearTimeout(flashBriefing.timeoutId);
  flashBriefing.timeoutId = window.setTimeout(() => renderBriefing(), 2100);
}

function getCurrentTutorialTarget() {
  const level = LEVELS[state.activeLevelId];
  if (!level.tutorialSteps.length) {
    return null;
  }
  const step = level.tutorialSteps[state.tutorialIndex];
  return step || null;
}

function advanceTutorialIfNeeded(row, col) {
  const tutorialStep = getCurrentTutorialTarget();
  if (tutorialStep && tutorialStep.row === row && tutorialStep.col === col) {
    state.tutorialIndex += 1;
  }
}

function isRelatedCell(row, col) {
  if (!state.selectedCell) {
    return false;
  }
  const selectedValue = state.board[state.selectedCell.row][state.selectedCell.col];
  if (selectedValue !== 0) {
    return false;
  }
  const sameRow = state.selectedCell.row === row;
  const sameCol = state.selectedCell.col === col;
  const sameBox =
    Math.floor(state.selectedCell.row / 3) === Math.floor(row / 3) &&
    Math.floor(state.selectedCell.col / 3) === Math.floor(col / 3);
  return sameRow || sameCol || sameBox;
}

function startTimer() {
  stopTimer();
  updateTimerText();
  state.timerId = window.setInterval(updateTimerText, 1000);
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function updateTimerText() {
  const seconds = Math.floor((Date.now() - state.startedAt) / 1000);
  elements.timer.textContent = formatDuration(seconds);
}

function useHint() {
  if (state.finished || state.hintsRemaining <= 0) {
    return;
  }

  const editableEmptyCells = getEmptyEditableCells();
  if (!editableEmptyCells.length) {
    return;
  }

  let targetCell = editableEmptyCells[0];
  if (state.selectedCell && state.board[state.selectedCell.row][state.selectedCell.col] === 0) {
    targetCell = state.selectedCell;
  } else {
    targetCell = pickMostConstrainedCell(editableEmptyCells);
  }

  const correctValue = LEVELS[state.activeLevelId].solution[targetCell.row][targetCell.col];
  state.board[targetCell.row][targetCell.col] = correctValue;
  state.hintsRemaining -= 1;
  state.hintsUsed += 1;
  advanceTutorialIfNeeded(targetCell.row, targetCell.col);
  flashBriefing(
    `提示已生效：第 ${targetCell.row + 1} 行第 ${targetCell.col + 1} 列填入 ${correctValue}。`
  );
  updateAfterBoardChange();
}

function getEmptyEditableCells() {
  const cells = [];
  state.board.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (value === 0 && LEVELS[state.activeLevelId].puzzle[rowIndex][colIndex] === 0) {
        cells.push({ row: rowIndex, col: colIndex });
      }
    });
  });
  return cells;
}

function pickMostConstrainedCell(cells) {
  return cells
    .map((cell) => ({
      ...cell,
      score: getConstraintScore(cell.row, cell.col)
    }))
    .sort((left, right) => right.score - left.score)[0];
}

function getConstraintScore(row, col) {
  const rowFilled = state.board[row].filter(Boolean).length;
  const colFilled = state.board.map((currentRow) => currentRow[col]).filter(Boolean).length;
  const boxFilled = getBoxValues(row, col).filter(Boolean).length;
  return rowFilled + colFilled + boxFilled;
}

function getBoxValues(row, col) {
  const values = [];
  const rowStart = Math.floor(row / 3) * 3;
  const colStart = Math.floor(col / 3) * 3;
  for (let rowIndex = rowStart; rowIndex < rowStart + 3; rowIndex += 1) {
    for (let colIndex = colStart; colIndex < colStart + 3; colIndex += 1) {
      values.push(state.board[rowIndex][colIndex]);
    }
  }
  return values;
}

function checkCompletion() {
  const solved = state.board.every((row, rowIndex) =>
    row.every((value, colIndex) => value === LEVELS[state.activeLevelId].solution[rowIndex][colIndex])
  );

  if (!solved) {
    return;
  }

  state.finished = true;
  stopTimer();
  if (state.activeLevelId === "level-1") {
    state.level2Unlocked = true;
    localStorage.setItem(STORAGE_KEYS.unlocked, "true");
    updateLevelButtons();
  }

  void finalizeRun();
}

async function finalizeRun() {
  const level = LEVELS[state.activeLevelId];
  const elapsedSeconds = Math.floor((Date.now() - state.startedAt) / 1000);
  const playerName = getPlayerName();

  const saveResult = await leaderboardStore.save({
    playerName,
    levelId: level.id,
    seconds: elapsedSeconds,
    hintsUsed: state.hintsUsed,
    completedAt: new Date().toISOString()
  });

  const ranking = await refreshLeaderboard(level.id, saveResult.entry?.id);
  openResultModal(level, elapsedSeconds, ranking, saveResult.entry?.id || null);
}

async function refreshLeaderboard(levelId, highlightId = null) {
  const result = await leaderboardStore.list(levelId);
  const records = result.records;
  state.leaderboardCache[levelId] = records;
  state.leaderboardSource = result.source;
  setLeaderboardSourceLabel(result.source);
  setLeaderboardSyncStatus(
    result.source === "remote" ? `已同步 ${getSyncTimeLabel()}` : "本地记录"
  );
  renderLeaderboard(levelId, records, highlightId);
  return records;
}

function renderLeaderboard(levelId, records, highlightId = null, target = elements.leaderboard) {
  const level = LEVELS[levelId];
  const visibleRecords = records.slice(0, 8);
  elements.leaderboardLevelLabel.textContent = level.label;

  if (!visibleRecords.length) {
    target.innerHTML = `<div class="leaderboard-empty">当前还没有通关记录，成为第一个留下时间的人。</div>`;
    return;
  }

  target.innerHTML = visibleRecords
    .map((entry, index) => {
      const extra = levelId === "level-2" ? `提示 ${entry.hintsUsed} 次` : "教学通关";
      const current = entry.id === highlightId ? " style=\"border-color: rgba(63, 255, 213, 0.65);\"" : "";
      return `
        <article class="leaderboard-item"${current}>
          <div class="leaderboard-rank">#${index + 1}</div>
          <div>
            <span class="leaderboard-name">${escapeHtml(entry.playerName)}</span>
            <span class="leaderboard-sub">${extra}</span>
          </div>
          <div class="leaderboard-time">${formatDuration(entry.seconds)}</div>
        </article>
      `;
    })
    .join("");
}

function openResultModal(level, elapsedSeconds, ranking, highlightId) {
  const playerName = getPlayerName();
  const latestEntry =
    ranking.find((entry) => entry.id === highlightId) ||
    ranking.find((entry) => entry.playerName === playerName && entry.seconds === elapsedSeconds);
  const position = latestEntry ? ranking.indexOf(latestEntry) + 1 : ranking.length;
  const summary =
    level.id === "level-2"
      ? `${playerName} 用时 ${formatDuration(elapsedSeconds)} 完成 ${level.label}，使用提示 ${state.hintsUsed} 次，当前排名第 ${position}。`
      : `${playerName} 用时 ${formatDuration(elapsedSeconds)} 完成训练模式，深空模式已解锁，当前排名第 ${position}。`;

  elements.resultTitle.textContent = `${level.label} 完成`;
  elements.resultSummary.textContent = summary;
  renderLeaderboard(level.id, ranking, latestEntry?.id || null, elements.resultRanking);
  elements.nextLevel.style.display = level.id === "level-1" ? "inline-flex" : "none";
  elements.resultModal.showModal();
}

function closeResultModal() {
  elements.resultModal.close();
}

function handleNextLevel() {
  closeResultModal();
  switchLevel("level-2");
}

function updateLevelButtons() {
  elements.levelTabs.forEach((button) => {
    const levelId = button.dataset.level;
    if (!levelId) {
      return;
    }
    const isActive = levelId === state.activeLevelId;
    const isLocked = levelId === "level-2" && !state.level2Unlocked;
    button.classList.toggle("is-active", isActive);
    button.classList.toggle("is-locked", isLocked);
  });
}

function handlePlayerNameInput(event) {
  const nextName = event.target.value.trimStart().slice(0, 16);
  event.target.value = nextName;
  state.playerName = nextName;
  localStorage.setItem(STORAGE_KEYS.player, nextName);
}

function getPlayerName() {
  const value = state.playerName.trim();
  return value || "Anonymous Pilot";
}

function shakeCell(row, col) {
  const selector = `.cell[data-row="${row}"][data-col="${col}"]`;
  const cell = document.querySelector(selector);
  if (!cell) {
    return;
  }
  cell.classList.remove("is-error");
  void cell.offsetWidth;
  cell.classList.add("is-error");
}

function mergeConfig(base, override) {
  return {
    ...base,
    ...override,
    leaderboard: {
      ...base.leaderboard,
      ...(override.leaderboard || {})
    }
  };
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function setLeaderboardSourceLabel(nextSource) {
  elements.leaderboardSource.textContent = nextSource === "remote" ? "Supabase Live" : "本地回退";
}

function setLeaderboardSyncStatus(text) {
  elements.leaderboardSyncStatus.textContent = text;
}

function getSyncTimeLabel() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
}

function startLeaderboardPolling() {
  stopLeaderboardPolling();
  state.leaderboardPollId = window.setInterval(() => {
    void refreshLeaderboard(state.activeLevelId);
  }, APP_CONFIG.leaderboard.pollIntervalMs);
}

function stopLeaderboardPolling() {
  if (!state.leaderboardPollId) {
    return;
  }
  window.clearInterval(state.leaderboardPollId);
  state.leaderboardPollId = null;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createLeaderboardStore(config) {
  const localKey = "neon-sudoku-leaderboard";

  return {
    async list(levelId) {
      if (config.mode === "remote" && config.endpoint) {
        try {
          const query = new URLSearchParams({ levelId, limit: "50" });
          const response = await fetchWithTimeout(`${config.endpoint}?${query.toString()}`, {
            method: "GET",
            headers: buildHeaders(config)
          }, config.timeoutMs);
          if (!response.ok) {
            throw new Error(`Remote read failed: ${response.status}`);
          }
          const payload = await response.json();
          return {
            records: normalizeEntries(payload.records || []),
            source: "remote"
          };
        } catch (error) {
          console.warn("Remote leaderboard unavailable, falling back to local storage.", error);
        }
      }
      return {
        records: readLocalEntries(localKey, levelId),
        source: "local"
      };
    },

    async save(entry) {
      if (config.mode === "remote" && config.endpoint) {
        try {
          const response = await fetchWithTimeout(
            config.endpoint,
            {
              method: "POST",
              headers: buildHeaders(config),
              body: JSON.stringify(entry)
            },
            config.timeoutMs
          );
          if (!response.ok) {
            throw new Error(`Remote write failed: ${response.status}`);
          }
          const payload = await response.json();
          return {
            entry: normalizeEntry(payload.record || entry),
            source: "remote"
          };
        } catch (error) {
          console.warn("Remote save unavailable, storing record locally.", error);
        }
      }

      const localEntry = normalizeEntry(entry);
      const store = readLocalStore(localKey);
      store.push(localEntry);
      localStorage.setItem(localKey, JSON.stringify(store));
      return {
        entry: localEntry,
        source: "local"
      };
    }
  };
}

function buildHeaders(config) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  return headers;
}

function normalizeEntries(entries) {
  return entries
    .map((entry) => normalizeEntry(entry))
    .sort((left, right) => left.seconds - right.seconds || left.hintsUsed - right.hintsUsed);
}

function normalizeEntry(entry) {
  return {
    id: entry.id || `run-${entry.levelId}-${entry.playerName}-${entry.seconds}-${entry.completedAt}`,
    playerName: entry.playerName || "Anonymous Pilot",
    levelId: entry.levelId,
    seconds: Number(entry.seconds) || 0,
    hintsUsed: Number(entry.hintsUsed) || 0,
    completedAt: entry.completedAt || new Date().toISOString()
  };
}

function readLocalStore(localKey) {
  try {
    return JSON.parse(localStorage.getItem(localKey) || "[]");
  } catch (error) {
    console.warn("Unable to parse local leaderboard store.", error);
    return [];
  }
}

function readLocalEntries(localKey, levelId) {
  return normalizeEntries(readLocalStore(localKey).filter((entry) => entry.levelId === levelId));
}

async function fetchWithTimeout(resource, options, timeoutMs) {
  const controller = new AbortController();
  const timerId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, {
      ...options,
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timerId);
  }
}
