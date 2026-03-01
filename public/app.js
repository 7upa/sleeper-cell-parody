(function () {
  const meter = document.querySelector('[data-meter-fill]');
  const meterValue = document.querySelector('[data-meter-value]');
  const scoreNode = document.querySelector('[data-score]');
  const terminal = document.querySelector('[data-terminal]');
  const ticker = document.querySelector('[data-ticker]');

  function animateMeter(score) {
    if (!meter) return;
    const s = Math.max(0, Math.min(100, Number(score) || 0));
    meter.style.width = '0%';
    let frame = 0;
    const total = 38;
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
      'loading profile graph...',
      'decrypting context shards...',
      'running absurdity heuristics...',
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
    }, 260);
  }

  function bootTicker() {
    if (!ticker) return;
    const feed = [
      'SIG-13: unusual pineapple discourse spike',
      'SIG-21: phrase "phase two" seen in meme cluster',
      'SIG-07: cat-language anomaly detected (meow)',
      'SIG-31: caffeine ideology argument escalation',
      'SIG-18: spreadsheet fixation pattern observed',
      'SIG-02: unknown "john" code chatter'
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
    }, 2600);
  }

  if (scoreNode) animateMeter(scoreNode.getAttribute('data-score'));
  bootTerminal();
  bootTicker();
})();
