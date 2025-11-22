// LocalStorageのキー
const STORAGE_KEYS = {
  COPY_TYPE: 'copyTabMarkdown_copyType',
  FORMAT: 'copyTabMarkdown_format',
  SETTINGS_OPEN: 'copyTabMarkdown_settingsOpen'
};

// 設定の読み込み
let selectedCopyType = localStorage.getItem(STORAGE_KEYS.COPY_TYPE) || 'title';
let selectedFormat = localStorage.getItem(STORAGE_KEYS.FORMAT) || 'list';
let settingsOpen = localStorage.getItem(STORAGE_KEYS.SETTINGS_OPEN) !== 'false'; // デフォルトはtrue

// DOM要素の取得
const copyButtons = document.querySelectorAll('.copy-action-button');
const copyTypeRadios = document.querySelectorAll('input[name="copyType"]');
const formatRadios = document.querySelectorAll('input[name="format"]');
const settingsDetails = document.querySelector('.settings-section details');
const statusDiv = document.getElementById('status');

// 初期状態の復元
function restoreSettings() {
  // コピー内容の復元
  copyTypeRadios.forEach(radio => {
    if (radio.value === selectedCopyType) {
      radio.checked = true;
    }
  });
  
  // 出力形式の復元
  formatRadios.forEach(radio => {
    if (radio.value === selectedFormat) {
      radio.checked = true;
    }
  });
  
  // 設定パネルの展開状態を復元
  if (settingsDetails) {
    settingsDetails.open = settingsOpen;
  }
}

// コピー内容の変更を監視
copyTypeRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    selectedCopyType = radio.value;
    localStorage.setItem(STORAGE_KEYS.COPY_TYPE, selectedCopyType);
  });
});

// 出力形式の変更を監視
formatRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    selectedFormat = radio.value;
    localStorage.setItem(STORAGE_KEYS.FORMAT, selectedFormat);
  });
});

// 設定パネルの展開状態を監視
if (settingsDetails) {
  settingsDetails.addEventListener('toggle', () => {
    settingsOpen = settingsDetails.open;
    localStorage.setItem(STORAGE_KEYS.SETTINGS_OPEN, settingsOpen);
  });
}

// コピーボタンのクリックイベント
copyButtons.forEach(button => {
  button.addEventListener('click', async () => {
    const target = button.dataset.target;
    await handleCopy(target);
  });
});

// ステータスメッセージの表示（トースト形式）
function showStatus(message, isSuccess = true) {
  statusDiv.textContent = message;
  statusDiv.className = `status show ${isSuccess ? 'success' : 'error'}`;
  
  setTimeout(() => {
    statusDiv.classList.remove('show');
  }, 1000);
}

// タブ情報の取得
async function getTabs(target) {
  const currentWindow = await chrome.windows.getCurrent();
  
  switch (target) {
    case 'current':
      // 現在のタブのみ
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return [activeTab];
      
    case 'all':
      // 現在のウィンドウの全タブ
      return await chrome.tabs.query({ currentWindow: true });
      
    case 'selected':
      // 選択中のタブ（ハイライトされているタブ）
      return await chrome.tabs.query({ highlighted: true, currentWindow: true });
      
    default:
      return [];
  }
}

// Markdown形式の生成
function generateMarkdown(tabs) {
  const prefix = selectedFormat === 'list' ? '- ' : '';
  
  const lines = tabs.map(tab => {
    switch (selectedCopyType) {
      case 'title':
        return `${prefix}${tab.title}`;
      case 'url':
        return `${prefix}${tab.url}`;
      case 'link':
        return `${prefix}[${tab.title}](${tab.url})`;
      default:
        return '';
    }
  });
  
  return lines.join('\n');
}

// クリップボードにコピー
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('クリップボードへのコピーに失敗しました:', err);
    return false;
  }
}

// コピー処理の実行
async function handleCopy(target) {
  try {
    const tabs = await getTabs(target);
    
    if (!tabs || tabs.length === 0) {
      showStatus('タブが見つかりませんでした', false);
      return;
    }
    
    const markdown = generateMarkdown(tabs);
    const success = await copyToClipboard(markdown);
    
    if (success) {
      showStatus('コピーしました。');
    } else {
      showStatus('コピーに失敗しました', false);
    }
  } catch (error) {
    console.error('エラーが発生しました:', error);
    showStatus('エラーが発生しました', false);
  }
}

// 初期設定の復元
restoreSettings();