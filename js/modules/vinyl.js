import { showToast } from './ui.js';

const TRACKS = [
  {
    id: 'track1',
    title: '我爱你 · 暖夜八音盒',
    artist: '10.05 彩蛋旋律 · 小狗 & 小猪',
    audioSrc: './assets/audio/our-song.mp3',
    // Warm Cmaj7 -> Am7 -> Fmaj7 -> G6 arpeggio frequencies (Hz)
    notes: [261.63, 329.63, 392.0, 493.88, 220.0, 261.63, 329.63, 392.0, 174.61, 220.0, 261.63, 329.63, 196.0, 246.94, 293.66, 392.0]
  },
  {
    id: 'track2',
    title: '山海星轨 · 海风钢琴',
    artist: 'BJ ⇄ LYG 午夜电台',
    audioSrc: './assets/audio/sea-breeze.mp3',
    notes: [293.66, 369.99, 440.0, 554.37, 246.94, 293.66, 369.99, 440.0, 196.0, 246.94, 293.66, 369.99, 220.0, 277.18, 329.63, 440.0]
  }
];

function createSynthEngine() {
  let ctx = null;
  let timer = null;
  let step = 0;

  const playNote = (freq) => {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 2, now);

    const overGain = ctx.createGain();
    overGain.gain.setValueAtTime(0.06, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.55);

    osc.connect(gain);
    overtone.connect(overGain);
    overGain.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + 1.6);
    overtone.stop(now + 1.6);
  };

  return {
    start(notes) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      if (!ctx) ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      this.stop();
      step = 0;
      playNote(notes[0]);
      step = 1;
      timer = window.setInterval(() => {
        playNote(notes[step % notes.length]);
        step += 1;
      }, 680);
      return true;
    },
    stop() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }
  };
}

export function initVinylModule() {
  const widget = document.getElementById('vinylWidget');
  const toggleBtn = document.getElementById('vinylToggleBtn');
  const discEl = document.getElementById('vinylDisc');
  const panelEl = document.getElementById('vinylPanel');
  const playBtn = document.getElementById('vinylPlayBtn');
  const nextBtn = document.getElementById('vinylNextBtn');
  const titleEl = document.getElementById('vinylTrackTitle');
  const artistEl = document.getElementById('vinylTrackArtist');
  const closePanelBtn = document.getElementById('vinylClosePanelBtn');

  if (!widget) return;

  const synth = createSynthEngine();
  const audioEl = new Audio();
  audioEl.loop = true;
  audioEl.volume = 0.55;

  let trackIndex = 0;
  let isPlaying = false;
  let panelOpen = false;
  let usingAudioFile = false;

  const updateUI = () => {
    const track = TRACKS[trackIndex];
    if (titleEl) titleEl.textContent = track.title;
    if (artistEl) artistEl.textContent = track.artist;
    if (playBtn) playBtn.textContent = isPlaying ? '⏸ 暂停' : '▶ 播放';
    discEl?.classList.toggle('vinyl-spinning', isPlaying);
    panelEl?.classList.toggle('hidden', !panelOpen);
  };

  const stopPlayback = () => {
    isPlaying = false;
    synth.stop();
    audioEl.pause();
    usingAudioFile = false;
    updateUI();
  };

  const startPlayback = async () => {
    const track = TRACKS[trackIndex];
    isPlaying = true;
    updateUI();

    // Try real custom audio file in assets/audio/ first; fall back cleanly to built-in warm music-box synth
    try {
      const head = await fetch(track.audioSrc, { method: 'HEAD' });
      if (head.ok) {
        audioEl.src = track.audioSrc;
        await audioEl.play();
        usingAudioFile = true;
        return;
      }
    } catch {
      // No local mp3 present; use built-in gentle synth
    }

    usingAudioFile = false;
    const ok = synth.start(track.notes);
    if (!ok) {
      isPlaying = false;
      updateUI();
      showToast('当前浏览器不支持音频播放', 'error');
    }
  };

  toggleBtn?.addEventListener('click', () => {
    panelOpen = !panelOpen;
    if (!isPlaying && panelOpen) {
      // Stay muted until user explicitly clicks play — never auto-play unexpectedly!
      updateUI();
    } else {
      updateUI();
    }
  });

  closePanelBtn?.addEventListener('click', () => {
    panelOpen = false;
    updateUI();
  });

  playBtn?.addEventListener('click', () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  });

  nextBtn?.addEventListener('click', () => {
    trackIndex = (trackIndex + 1) % TRACKS.length;
    if (isPlaying) {
      stopPlayback();
      startPlayback();
    } else {
      updateUI();
    }
  });

  updateUI();

  return { stopPlayback };
}
