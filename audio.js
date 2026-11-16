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
  const synth = window.speechSynthesis;
  const canRecord = window.isSecureContext && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
  const status = (message) => { $("record-status").textContent = message; };
  const localEnglishVoices = () => synth ? synth.getVoices().filter(v => v.localService && /^en(?:[-_]|$)/i.test(v.lang)) : [];
  function updateSpeech() {
    const available = !!synth && typeof SpeechSynthesisUtterance !== "undefined" && localEnglishVoices().length > 0;
    $("speak").disabled = !available || phase !== "idle";
    if (!available) $("speech-status").textContent = "端末内の英語音声が見つかりません。表示された質問を読んで練習できます。";
    else $("speech-status").textContent = "端末内の英語音声で読み上げます。音声入力を終了してから押してください。";
  }
  function cancelSpeech() { if (synth) synth.cancel(); utterance = null; }
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
    const voice = localEnglishVoices()[0];
    if (!voice || phase !== "idle") return;
    cancelSpeech();
    $("answer").blur();
    $("audio").pause();
    utterance = new SpeechSynthesisUtterance(window.InterviewApp.prompt());
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.9;
    utterance.onerror = (event) => { if (!["canceled", "interrupted"].includes(event.error)) $("speech-status").textContent = "読み上げができませんでした。表示された質問を読んでください。"; };
    synth.speak(utterance);
  });
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
