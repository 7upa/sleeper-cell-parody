(function () {
  if (window.location.pathname === '/analyze') {
    window.history.replaceState({}, '', '/');
  }

  const terminal = document.querySelector('[data-terminal]');
  const ticker = document.querySelector('[data-ticker]');
  const scanFeed = document.querySelector('[data-scan-feed]');
  const chipRow = document.querySelector('[data-chip-row]');
  const scanStage = document.querySelector('[data-scan-stage]');
  const scanForm = document.querySelector('[data-scan-form]');
  const scanSubmit = document.querySelector('[data-scan-submit]');
  const scanLoading = document.querySelector('[data-scan-loading]');
  const resultsRoot = document.querySelector('[data-results-root]');

  let lineLoop;
  let chipLoop;

  function getRevealCards() {
    return document.querySelectorAll('[data-reveal-card]');
  }

  function getScoreNode() {
    return document.querySelector('[data-reveal-card][data-score]');
  }

  function getMeter() {
    return document.querySelector('[data-meter-fill]');
  }

  function getMeterValue() {
    return document.querySelector('[data-meter-value]');
  }

  function animateMeter(score) {
    const meter = getMeter();
    const meterValue = getMeterValue();
    if (!meter) return;
    const s = Math.max(0, Math.min(100, Number(score) || 0));
    meter.style.width = '0%';
    let frame = 0;
    const total = 42;
    const timer = setInterval(() => {
      frame += 1;
      const p = Math.min(1, frame / total);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(s * eased);
      meter.style.width = `${val}%`;
      if (meterValue) meterValue.textContent = `${val}%`;
      if (frame >= total) clearInterval(timer);
    }, 18);
  }

  function bootTerminal() {
    if (!terminal) return;
    const lines = [
      'booting surveillance stack...',
      'opening intelligence socket...',
      'decrypting context shards...',
      'running anomaly heuristics...',
      'locking canonical snapshot...'
    ];

    let i = 0;
    terminal.innerHTML = '';
    const loop = setInterval(() => {
      if (i >= lines.length) return clearInterval(loop);
      const div = document.createElement('div');
      div.className = 'term-line';
      div.textContent = `> ${lines[i]}`;
      terminal.appendChild(div);
      terminal.scrollTop = terminal.scrollHeight;
      i += 1;
    }, 300);
  }

  function bootTicker() {
    if (!ticker) return;
    const feed = [
      'SIG-13: narrative volatility rising',
      'SIG-21: coded phrase collisions detected',
      'SIG-07: unusual reply-chain geometry',
      'SIG-31: context drift at 03:11 UTC',
      'SIG-18: semantic entropy spike'
    ];
    let idx = 0;
    ticker.textContent = feed[idx];
    setInterval(() => {
      idx = (idx + 1) % feed.length;
      ticker.style.opacity = '0';
      setTimeout(() => {
        ticker.textContent = feed[idx];
        ticker.style.opacity = '1';
      }, 180);
    }, 2300);
  }

  function shuffled(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function bootScanDrama(dynamicWords) {
    if (!scanFeed || !scanStage) return;

    clearInterval(lineLoop);
    clearInterval(chipLoop);

    const lines = [
      'Summoning basement analysts and one suspicious raccoon...',
      'Scraping lexical fingerprints and cursed vibes...',
      'Comparing posts against the forbidden keyword grimoire...',
      'Estimating threat vectors, meme density, and cope levels...',
      'Preparing dramatic reveal with maximum cinema...'
    ];

    const words = (dynamicWords && dynamicWords.length)
      ? dynamicWords
      : [
          'phase two', 'sleeper', 'wallahi', 'inshallah', 'alpha co', 'watchlist',
          'disclosure', 'red flag', 'signal', 'entropy', 'cells', 'coded'
        ];

    scanFeed.innerHTML = '';
    if (chipRow) chipRow.innerHTML = '';

    let i = 0;
    lineLoop = setInterval(() => {
      if (i >= lines.length) return clearInterval(lineLoop);
      const d = document.createElement('div');
      d.className = 'scan-line';
      d.textContent = `• ${lines[i]}`;
      scanFeed.appendChild(d);
      scanFeed.scrollTop = scanFeed.scrollHeight;
      i += 1;
    }, 420);

    if (chipRow) {
      let j = 0;
      let queue = shuffled(words);
      chipLoop = setInterval(() => {
        if (!queue.length) queue = shuffled(words);
        const chip = document.createElement('span');
        chip.className = 'scan-chip';
        chip.textContent = queue.shift();
        chipRow.appendChild(chip);
        j += 1;
        if (j > 12 && chipRow.firstChild) chipRow.removeChild(chipRow.firstChild);
      }, 250);
    }
  }

  function hideResults() {
    getRevealCards().forEach((c) => c.classList.add('reveal-hidden'));
  }

  function stagedReveal() {
    const revealCards = getRevealCards();
    if (!revealCards.length) return;
    hideResults();
    setTimeout(() => {
      revealCards.forEach((c, idx) => {
        setTimeout(() => c.classList.remove('reveal-hidden'), idx * 220);
      });
      const scoreNode = getScoreNode();
      if (scoreNode) animateMeter(scoreNode.getAttribute('data-score'));
    }, 250);
  }

  function setBusyState(isBusy) {
    if (scanLoading) scanLoading.classList.toggle('reveal-hidden', !isBusy);
    if (scanStage) scanStage.classList.toggle('reveal-hidden', !isBusy);
    if (scanSubmit) {
      scanSubmit.disabled = isBusy;
      scanSubmit.textContent = isBusy ? 'Scanning…' : 'Run Deep Scan';
    }
  }

  async function submitScan(handle) {
    hideResults();
    setBusyState(true);
    bootScanDrama();

    const minDramaMs = 1900;
    const startedAt = Date.now();

    let payload;
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ handle })
      });
      payload = await response.json();
    } catch (err) {
      payload = {
        ok: false,
        html: '<div data-results-payload data-chip-words="[]"><section class="card"><strong>Network failure. Try again.</strong></section></div>'
      };
    }

    const wait = Math.max(0, minDramaMs - (Date.now() - startedAt));
    setTimeout(() => {
      if (resultsRoot) resultsRoot.innerHTML = payload.html || '';
      const payloadNode = document.querySelector('[data-results-payload]');
      let dynamicWords = [];
      try {
        dynamicWords = JSON.parse(payloadNode?.getAttribute('data-chip-words') || '[]');
      } catch {}
      bootScanDrama(dynamicWords);
      setTimeout(() => {
        setBusyState(false);
        stagedReveal();
      }, 1550);
    }, wait);
  }

  if (scanForm) {
    scanForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(scanForm);
      submitScan(String(formData.get('handle') || ''));
    });
  }

  bootTerminal();
  bootTicker();
  if (document.querySelector('[data-results-payload]')) {
    stagedReveal();
  }
})();

window.shareResult = function(handle, score, verdict) {
  const emoji = verdict === 'SLEEPER_CELL' ? '🔴' : verdict === 'WATCHLIST' ? '🟡' : '🟢';
  const text = `${emoji} SCAN RESULT: @${handle}\n\nThreat Level: ${score}% (${verdict})\n\nRun your own analysis →`;
  const url = 'https://x.com/intent/post?text=' + encodeURIComponent(text);
  window.open(url, '_blank');
};
