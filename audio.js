"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  let mode = "text";
  let phase = "idle";
  let session = null;
  let requestId = 0;
  let audioUrl = null;
  let timerId = null;
  let utterance = null;
  let speechWatchdog = null;
  const synth = window.speechSynthesis;
  const canRecord = window.isSecureContext && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
  const status = (message) => { $("record-status").textContent = message; };
  const speechSupported = !!synth && typeof SpeechSynthesisUtterance !== "undefined";
  const voices = () => { try { return synth ? synth.getVoices() : []; } catch { return []; } };
  const localEnglishVoices = () => voices().filter(v => v.localService === true && /^en(?:[-_]|$)/i.test(v.lang));
  const voiceKey = v => JSON.stringify([v.voiceURI, v.name, v.lang]);
  function updateSpeech() {
    const available = localEnglishVoices();
    const selected = $("speech-voice").value;
    $("speech-voice").replaceChildren();
    for (const voice of available) {
      const option = document.createElement("option");
      option.value = voiceKey(voice);
      option.textContent = `${voice.name} (${voice.lang})`;
      $("speech-voice").append(option);
    }
    if (available.some(v => voiceKey(v) === selected)) $("speech-voice").value = selected;
    $("speech-voice").disabled = !available.length || phase !== "idle";
    for (const id of ["speak", "speech-test", "speech-refresh"]) $(id).disabled = !speechSupported || phase !== "idle";
    if (utterance) return;
    if (!speechSupported) $("speech-status").textContent = "このブラウザは読み上げに対応していません。表示された英文で練習してください。";
    else if (!available.length) $("speech-status").textContent = voices().length
      ? "利用できる端末内の英語音声がありません。「読み上げの設定」を開き、英語の音声合成を追加してください。追加後はブラウザを開き直して音声一覧を再確認してください。"
      : "音声一覧をまだ取得できていません。「面接官の英語を聞く」を押すと再確認します。繰り返す場合は「読み上げの設定」を確認してください。";
    else $("speech-status").textContent = "端末内の英語音声を選択できます。音声入力を終了してから読み上げボタンを押してください。";
  }
  function cancelSpeech() {
    clearTimeout(speechWatchdog);
    const wasActive = utterance || synth?.speaking || synth?.pending;
    utterance = null;
    if (synth && wasActive) synth.cancel();
  }
  function speakText(text) {
    if (!speechSupported || phase !== "idle") return;
    cancelSpeech();
    updateSpeech(); // Re-query on the user gesture even if voiceschanged never fired.
    const available = localEnglishVoices();
    const voice = available.find(v => voiceKey(v) === $("speech-voice").value) || available[0];
    if (!voice || !text) return;
    $("answer").blur();
    $("audio").pause();
    const current = new SpeechSynthesisUtterance(text);
    utterance = current;
    current.voice = voice;
    current.lang = voice.lang;
    current.rate = 0.9;
    current.volume = 1;
    current.onstart = () => {
      if (utterance !== current) return;
      clearTimeout(speechWatchdog);
      $("speech-status").textContent = `読み上げ中：${voice.name}。聞こえない場合はPCの音量・出力先・タブのミュートを確認してください。`;
    };
    current.onend = () => {
      if (utterance !== current) return;
      clearTimeout(speechWatchdog); utterance = null;
      $("speech-status").textContent = "読み上げが終了しました。もう一度聞く場合はボタンを押してください。";
    };
    current.onerror = event => {
      if (utterance !== current) return;
      clearTimeout(speechWatchdog); utterance = null;
      $("speech-status").textContent = `読み上げに失敗しました（${event.error || "unknown"}）。別の英語音声を選ぶか、ブラウザを開き直して再試行してください。`;
    };
    $("speech-status").textContent = "読み上げの開始を待っています…";
    speechWatchdog = setTimeout(() => {
      if (utterance !== current) return;
      cancelSpeech();
      $("speech-status").textContent = "読み上げが開始されませんでした。別の音声でテストするか、ブラウザを開き直してください。";
    }, 8000);
    try {
      if (synth.paused) synth.resume();
      synth.speak(current); // Keep this synchronous with the click for Safari.
    } catch (error) {
      current.onerror({ error: error.name || "unknown" });
    }
  }
  function render() {
    const busy = phase !== "idle";
    $("text-mode").disabled = busy;
    $("record-mode").disabled = busy;
    $("next").disabled = busy || !window.InterviewApp.canNext();
    window.InterviewApp.onBusy(busy);
    $("start").disabled = !canRecord || busy;
    $("stop").disabled = phase !== "recording";
    $("delete").disabled = busy;
    $("audio").controls = !busy;
    $("answer").disabled = mode !== "text" || busy;
    $("record-indicator").classList.toggle("active", phase === "recording");
    $("record-state").textContent = ({ idle: "録音待機中", requesting: "マイクの許可を確認中", recording: "録音中", stopping: "録音を準備中" })[phase];
    updateSpeech();
  }
  function switchMode(nextMode) {
    if (phase !== "idle") return;
    document.activeElement?.blur();
    cancelSpeech();
    $("audio").pause();
    mode = nextMode;
    $("text-panel").hidden = mode !== "text";
    $("record-panel").hidden = mode !== "record";
    $("text-mode").setAttribute("aria-pressed", String(mode === "text"));
    $("record-mode").setAttribute("aria-pressed", String(mode === "record"));
    render();
  }
  const release = (stream) => stream?.getTracks().forEach(track => track.stop());
  function removeAudio() {
    $("audio").pause();
    $("audio").removeAttribute("src");
    $("audio").load();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = null;
    $("playback").hidden = true;
  }
  function stopRecording(message = "録音ができました。再生ボタンで確認してください。") {
    if (!session || phase !== "recording") return;
    const current = session;
    current.message = message;
    phase = "stopping";
    clearInterval(timerId);
    render();
    if (current.recorder.state !== "inactive") current.recorder.stop();
    release(current.stream);
  }
  const errors = {
    NotAllowedError: "マイクを使用できません。サイトのマイク許可とHTTPS接続を確認してください。",
    NotFoundError: "マイクが見つかりません。端末のマイク接続を確認してください。",
    NotReadableError: "マイクを使用中の可能性があります。音声入力や他のアプリを終了して、もう一度お試しください。",
    SecurityError: "ブラウザの設定により録音が制限されています。SafariまたはChromeで直接開いてください。"
  };
  async function startRecording() {
    if (!canRecord || phase !== "idle" || mode !== "record") return;
    cancelSpeech();
    $("audio").pause();
    phase = "requesting";
    const token = ++requestId;
    render();
    status("マイクの使用を許可してください。音声入力は先に終了してください。");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (token !== requestId || document.hidden) { release(stream); return; }
      const types = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
      const type = types.find(t => typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(t));
      let recorder;
      try { recorder = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream); }
      catch { recorder = new MediaRecorder(stream); }
      const current = { recorder, stream, chunks: [], failed: false, message: "録音ができました。再生ボタンで確認してください。" };
      session = current;
      recorder.ondataavailable = (event) => { if (event.data.size) current.chunks.push(event.data); };
      recorder.onerror = () => {
        current.failed = true;
        status("録音中にエラーが発生しました。もう一度録音してください。");
        stopRecording();
      };
      recorder.onstop = () => {
        clearInterval(timerId);
        release(stream);
        if (!current.failed && current.chunks.length) {
          const blob = new Blob(current.chunks, { type: recorder.mimeType || current.chunks[0].type });
          removeAudio();
          audioUrl = URL.createObjectURL(blob);
          $("audio").src = audioUrl;
          $("playback").hidden = false;
          window.InterviewApp.onRecording(blob);
          status(current.message);
        } else if (!current.failed) status("音声データを取得できませんでした。もう一度録音してください。");
        current.chunks.length = 0;
        session = null;
        phase = "idle";
        render();
      };
      recorder.start();
      phase = "recording";
      const started = performance.now();
      $("timer").textContent = "00:00";
      timerId = setInterval(() => {
        const seconds = Math.floor((performance.now() - started) / 1000);
        $("timer").textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
        if (seconds >= 120) stopRecording("2分になったため停止しました。録音を再生して確認してください。");
      }, 250);
      stream.getAudioTracks().forEach(track => track.addEventListener("ended", () => stopRecording("マイクが切断されたため停止しました。録音を確認してください。")));
      status("録音中です。回答が終わったら「録音停止」を押してください。");
      render();
    } catch (error) {
      release(stream);
      if (token !== requestId) return;
      session = null;
      phase = "idle";
      status(errors[error.name] || "この環境では録音を開始できませんでした。ブラウザを更新するか、文字で回答してください。");
      render();
    }
  }
  function interrupt() {
    cancelSpeech();
    $("audio").pause();
    if (phase === "requesting") {
      ++requestId;
      phase = "idle";
      status("画面を離れたため録音開始を取り消しました。もう一度開始してください。");
      render();
    }
    stopRecording("画面を離れたため録音を停止しました。音声を確認してください。");
  }
  $("text-mode").addEventListener("click", () => switchMode("text"));
  $("record-mode").addEventListener("click", () => switchMode("record"));
  $("start").addEventListener("click", startRecording);
  $("stop").addEventListener("click", () => stopRecording());
  $("delete").addEventListener("click", () => { removeAudio(); window.InterviewApp.onDeleteRecording(); $("timer").textContent = "00:00"; status("録音を削除しました。"); });
  $("speak").addEventListener("click", () => {
    speakText(window.InterviewApp.prompt());
  });
  $("speech-test").addEventListener("click", () => speakText("Hello. Let's practice English together."));
  $("speech-refresh").addEventListener("click", () => { if (phase === "idle") { cancelSpeech(); updateSpeech(); } });
  $("speech-voice").addEventListener("change", cancelSpeech);
  $("answer").addEventListener("focus", cancelSpeech);
  $("audio").addEventListener("play", () => { cancelSpeech(); if (phase !== "idle") $("audio").pause(); });
  $("audio").addEventListener("error", () => status("音声を再生できませんでした。録り直すか、別のブラウザでお試しください。"));
  document.addEventListener("visibilitychange", () => { if (document.hidden) interrupt(); });
  window.addEventListener("pagehide", interrupt);
  synth?.addEventListener("voiceschanged", updateSpeech);
  $("record-support").textContent = canRecord ? "録音機能を利用できます（実際の録音にはマイクの許可が必要です）。" : !window.isSecureContext ? "録音にはHTTPSが必要です。Windowsでは http://localhost:8000 でも確認できます。" : "このブラウザは録音機能に対応していません。文字での回答をご利用ください。";
  window.VoiceLab = {
    busy: () => phase !== "idle",
    silence: () => { cancelSpeech(); $("audio").pause(); },
    reset: () => {
      if (phase !== "idle") return;
      cancelSpeech(); removeAudio(); switchMode("text");
      $("timer").textContent = "00:00";
      status("録音は最長2分。音声は今回の練習中だけ保持します。");
    }
  };
  render();
})();
