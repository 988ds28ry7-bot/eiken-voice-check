# 英語音声機能チェック

英検2級の面接練習アプリを作る前に、音声入力・録音・再生・読み上げを確認する小さな試作品です。採点、AI、会員登録、データベースはありません。HTML / CSS / JavaScriptのみで動き、外部ライブラリやAPIキーは使いません。

## ファイルの役割

| ファイル | 役割 |
| --- | --- |
| index.html | 質問・入力欄・ボタン・日本語の説明など、画面の内容 |
| style.css | 配色、文字の大きさ、スマートフォン向けの配置 |
| app.js | 質問の切り替え、録音・再生、モード切り替え、読み上げ |
| README.md | この説明書。起動方法と確認項目 |
| .nojekyll | GitHub PagesでJekyllによる変換をせず、そのまま配信する指定 |
| .gitignore | Gitで扱うファイルを上記の公開用ファイルだけに限定する設定 |

6ファイルを同じフォルダーに置いてください。アプリ本体に必要なのは `index.html`、`style.css`、`app.js` の3ファイルです。ビルド、npm install、サーバー側プログラム、環境変数、APIキーの設定は不要です。

GitHub Pagesの `https://ユーザー名.github.io/リポジトリ名/` のようなURLでも読み込めるよう、CSSとJavaScriptは相対パスで参照しています。独自ドメインや追加のHTTPS用コードは不要です。録音にはHTTPSに加えて、対応ブラウザと利用者によるマイクの許可が必要です。

## Windowsで起動する

見た目だけなら `index.html` をダブルクリックして開けます。ただし、録音の検証には次のローカルサーバーを使ってください。「サーバー」はこのPC内でファイルをブラウザに渡すだけのものです。外部には公開されません。

この開発環境にはNode.jsが入っています。Pythonは確認できなかったため、Node.jsの標準機能だけで起動する方法を案内します。

1. WindowsのスタートメニューからPowerShellを開きます。
2. 次を貼り付けてEnterを押します。

```powershell
Set-Location (Join-Path ([Environment]::GetFolderPath('Desktop')) 'eiken2-interview')
```

3. 次の1行を、そのまま貼り付けてEnterを押します。追加インストールは不要です。

```powershell
node -e 'const http=require("node:http"),fs=require("node:fs");const files={"/":"index.html","/index.html":"index.html","/style.css":"style.css","/app.js":"app.js"};http.createServer((req,res)=>{const file=files[req.url];if(req.method!=="GET"||!file){res.writeHead(404);res.end();return;}res.setHeader("Content-Type",file.endsWith("html")?"text/html; charset=utf-8":file.endsWith("css")?"text/css; charset=utf-8":"text/javascript; charset=utf-8");fs.createReadStream(file).pipe(res);}).listen(8000,"127.0.0.1",()=>console.log("http://localhost:8000"));'
```

4. ChromeかEdgeで [http://127.0.0.1:8000](http://127.0.0.1:8000) を開きます。PowerShellは開いたままにします。
5. 「録音で回答」→「録音開始」を押し、マイクを許可します。話したら「録音停止」→音声プレーヤーの再生を押します。
6. 終了するときはPowerShellで `Ctrl+C` を押します。

`node` が見つからない場合はNode.jsのインストールが必要です。`EADDRINUSE` は8000番が使用中という意味です。以前起動したこのサーバーを終了するか、コマンド内の8000と開くURLの8000を8001に変更してください。

## アプリの使い方

1. 質問を読みます。「質問を読み上げる」は端末内の英語音声がある場合だけ使えます。
2. 「文字で回答」で回答欄をタップし、英語キーボードへ切り替えてキーボードのマイクを押します。入力された英文を確認・修正します。手入力もできます。
3. キーボードの音声入力を終了してから「録音で回答」へ切り替えます。再度声に出して答え、停止後に再生します。
4. 「次の質問」で2つの質問を切り替えられます。回答文と直前の録音は残るため、新しい回答文は自分で書き換えてください。質問ごとの保存はありません。

録音中はモード切り替え・質問変更・読み上げを無効にします。録音は最長2分で自動停止します。別画面への移動時にも停止を試みますが、OSによる強制終了・着信・画面ロックの挙動は端末次第です。ページを開いたまま練習してください。

録音と音声入力は別の練習です。録音の自動文字起こしは行いません。WebページからOSの音声入力が終了したかは判定できないので、利用者が終了する必要があります。

## iPhoneで確認する

PCの `localhost` はPC自身、iPhoneの `localhost` はiPhone自身を指します。上記のURLをiPhoneに入力してもこのアプリは開けません。また、PCのIPアドレスにHTTPでアクセスするだけでは通常マイクを利用できません。iPhoneで録音まで確認するには、有効な証明書のHTTPSが必要です。

公開はまだ実施していません。下の公開手順は、公開を許可した後に使うための説明です。公開しないで確認する場合は、iPhoneが信頼する証明書を使ったローカルHTTPS環境が別途必要です。この試作品にはその設定は含めていません。

HTTPSのURLを用意した後：

1. SafariでそのURLを直接開きます（他のアプリ内のブラウザではなくSafari）。
2. iPhoneの「設定」→「一般」→「キーボード」で英語キーボードを追加し、音声入力を有効にします。表示名はiOSにより異なります。
3. 回答欄をタップし、地球儀などで英語キーボードへ切り替えてから、キーボードのマイクを押します。`lang="en-US"` は指定していますが、キーボード言語の強制変更はできません。
4. “I usually play tennis after school.” など短い英文を話し、表示された英文を編集します。
5. 音声入力を終了して録音モードに切り替えます。Safariのマイク許可を承認し、録音・停止・再生を試します。

ChromebookはChromeで同じHTTPSのURLを開きます。手入力、録音・再生は同じ操作です。音声入力は利用できるChromeOSの機能を別途英語に設定してください。アプリがOSの音声入力を提供するわけではありません。

## HTTPSで公開する手順（許可後のみ）

例：GitHub Pages。アプリ利用者の会員登録は不要ですが、この方法で公開する管理者にはGitHubアカウントが必要です。無料の公開リポジトリを使う場合、ソースとページは他の人も閲覧できます。個人情報や実際の回答・録音をアップロードしないでください。

1. 公開してよいことを確認します。ここまでの作業ではGitHubへのアップロードや外部公開は一切行っていません。
2. [GitHub](https://github.com/) にサインインします。アカウントがない場合は先に作成します。右上の「+」→「New repository」を選びます。リポジトリはファイルの保管場所です。
3. 「Owner」は自分のアカウント、「Repository name」は `eiken-voice-check` などにします。名前やDescriptionには娘さんの名前・学校名などを入れないでください。
4. 無料の公開リポジトリを使う手順なので「Public」を選びます。**ソースコードもサイトも誰でも閲覧できます。家族限定にはなりません。** README、.gitignore、Licenseの自動作成は選ばず、「Create repository」を押します。これで空の保管場所ができます。[リポジトリ作成の公式説明](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
5. 空のリポジトリ画面では「uploading an existing file」を選びます。ファイル一覧がある画面では「Add file」→「Upload files」です。「choose your files」から、このフォルダーの6ファイルだけを選びます。フォルダー全体やZIPはアップロードしないでください。
6. アップロード一覧を確認し、コミットメッセージに `Add voice test app` などを入力します。「Commit changes」で保存します（コミットは変更内容の保存です）。ブランチの選択が表示されたら、この新規リポジトリの `main` に保存します。新しいブランチへ保存した場合は、作成されたPull requestを `main` にマージしてから進みます。[ファイル追加の公式説明](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
7. 「Code」のファイル一覧で、次の配置になっていることを確認します。`index.html.txt` のようになっていないこと、大文字・小文字も確認します。

```text
リポジトリ直下
├── index.html
├── style.css
├── app.js
├── README.md
├── .nojekyll
└── .gitignore
```

`.nojekyll` がファイル選択に表示されない場合は「Add file」→「Create new file」で名前を `.nojekyll` にして保存する方法も使えます。空ファイルが保存できない場合は改行だけ、または `Static site` と書いて保存しても構いません。ファイルの存在が指定になります。`.gitignore` はWeb画面からの手動アップロードを防ぎません。選択したファイルを必ず確認してください。

8. リポジトリの「Settings」を開き、左側の「Code and automation」にある「Pages」を選びます。アカウント全体のSettingsではなく、このリポジトリのSettingsです。
9. 「Build and deployment」で次を指定して「Save」を押します。この操作でサイトの公開が始まります。

| 設定項目 | 選ぶ値 |
| --- | --- |
| Source | Deploy from a branch |
| Branch | main |
| フォルダー | / (root) |
| Custom domain | 空欄のまま |

`main` が選べない場合は、ファイルがまだ保存されていないか、違うブランチに保存されています。「Code」で確認してください。独自のGitHub Actionsワークフローを作る必要はありません。GitHub内部では配信用の処理が実行されます。[公開元設定の公式説明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

10. 公開処理が終わるまで数分待ち、「Settings」→「Pages」を再表示します。「Your site is live at …」や「Visit site」に示されたURLを開きます。まだ表示されなければ「Actions」でPagesの処理が完了しているか、失敗していないか確認します。
11. 「Enforce HTTPS」が有効なことを確認します。選択可能ならチェックします。標準の `github.io` ドメインを使い、HTTPSのURLを利用します。[HTTPSの公式説明](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
12. URLは通常 `https://ユーザー名.github.io/eiken-voice-check/` です。これは例なので、実際にはPages欄からコピーしてください。`https://github.com/...` はソースを見る画面であり、アプリの公開URLではありません。
13. そのURLをiPhoneのSafariのアドレス欄へ貼り付けます。ChromebookではChromeで同じURLを開きます。端末をPCと同じWi-Fiにつなぐ必要はなく、インターネット接続があれば利用できます。公開後、PCのローカルサーバーは不要です。
14. 下のチェック表を各端末で実施します。HTTPSはマイク利用の前提条件であり、実機での録音成功を保証するものではありません。

公開設定後は、公開元の `main` にファイルを追加・更新するとサイトも自動更新されます。更新するときも公開対象を確認してください。今後、こちらでアップロード・push・公開設定を行うには、引き続き明示的な許可が必要です。

### 公開後に困ったとき

- **404になる：** 公開処理の完了、URLのリポジトリ名、`main / (root)`、直下の小文字の `index.html` を確認します。
- **見た目が崩れる／ボタンが動かない：** `style.css` と `app.js` が同じ階層にあるか確認し、ページを再読み込みします。
- **マイクを使えない：** `https://` のURLをSafari／Chromeで直接開き、サイトのマイク許可とOSの制限を確認します。キーボード音声入力や別の録音アプリは終了します。学校管理のChromebookでは管理者の制限がある場合があります。
- **読み上げだけ使えない：** 端末内の英語音声がない場合は仕様どおりテキスト表示になります。

GitHub PagesではHTMLなどのアプリファイルが配信されます。アプリに音声・回答をアップロードする処理はありません。サービス側には通常のページアクセス記録が残り得ます。

## 公開対象と個人情報の確認

準備時点の全4ファイルを確認し、その後追加した `.nojekyll` と `.gitignore` を含む6ファイルを公開対象としました。READMEに含まれていたWindowsのユーザー名付き絶対パスは一般化しました。現時点の公開対象にはAPIキー、パスワード、メールアドレス、娘さんの名前・学校名、実際の回答、録音ファイルは見つかりませんでした。コード中の英文は練習用の例です。

以下はアップロードしないでください：

- `.env`、秘密鍵、証明書の秘密鍵、認証情報、アクセストークン
- 録音ファイル、回答履歴、実機チェック表に書き込んだ個人情報、写真、スクリーンショット
- `.codex`、`.agents`、`.aws`、エディター設定、ログ、一時ファイル、バックアップ、`node_modules`

今回の `.gitignore` は6ファイル以外をGitの追加対象から外す設定です。将来ファイルを増やす場合は見直しが必要です。すでにGitで追跡されているファイルやWeb画面で手動選択したファイルには保護が効きません。

GitHubのプロフィール名やコミット作成者情報も公開され得ます。個人のメールアドレスを公開したくない場合は、アップロード前にアカウントのメール公開設定を確認してください。

### 公開前チェックリスト

- [ ] 公開リポジトリとサイトが誰でも閲覧できることを確認した
- [ ] 公開用の6ファイルだけを選択した
- [ ] 名前、学校名、連絡先、秘密情報、録音や回答の実データを入れていない
- [ ] `index.html`、`style.css`、`app.js` が直下にある
- [ ] 公開元を `main / (root)` に設定する準備ができた

## プライバシーと技術上の範囲

- アプリには通信API、解析タグ、外部CDN、外部フォント、SpeechRecognition APIを使用していません。CSPでも `connect-src 'none'` を指定しています。
- 録音は `getUserMedia` と `MediaRecorder` で取得し、メモリー内のBlobを音声プレーヤーで再生します。録音形式は対応状況からMP4 / WebM / Oggを選び、必要に応じブラウザ既定へ切り替えます。
- 回答と録音をlocalStorageやデータベースに保存しません。再読み込みで消えます。ブラウザの戻る操作やページ復元では画面の状態が残る場合があります。
- **OS標準の音声入力はアプリとは別です。** Appleは多くの言語で端末内処理が可能としていますが、端末・言語・設定によって処理方法が異なります。Chromebookの音声入力にも独自の処理条件があります。アプリから「一切の音声が端末外へ出ない」と保証することはできません。厳密に外部送信を避ける必要がある場合は、OS音声入力を使わず手入力とアプリ内録音を使ってください。
- 読み上げはSpeechSynthesisの英語音声のうち `localService === true` のものだけを選択します。未対応・未インストールの場合はボタンを無効にしてテキストで案内します。英語音声の追加インストールにはOS側の操作が必要な場合があります。
- OS音声入力を止める・英語に切り替える操作は利用者が行います。アプリがキーボードのマイクを押すことはできません。

## 実施した検証と残る確認

2026年11月15日実施：

- `node --check app.js`：構文エラーなし。
- Node.js上でブラウザAPIを模擬したテスト：録音の開始・停止、形式選択、録音中のモード制限、マイク解放、再生用URLの設定、削除、許可拒否後の復帰、非HTTPS・未対応環境の案内、バックグラウンド停止、遅れて許可されたマイクの解放、端末内の英語音声限定を確認しました。
- テストで停止イベントの処理順に依存する箇所を検出し、録音セッションの参照を保持するよう修正して再テストに合格しました。
- ローカルサーバーの起動メッセージは確認できましたが、検証ツールからのローカル接続はアクセス制限・タイムアウトとなりました。ブラウザでの画面表示、実際のマイク録音、スピーカー出力、iPhone / Chromebook実機は未検証です。模擬テストの成功は実機の音声動作を保証しません。

### 実機チェック表

端末名：＿＿＿＿　OS：＿＿＿＿　ブラウザ：＿＿＿＿　確認日：＿＿＿＿

iPhone SafariとChromebook Chromeで、それぞれコピーして記録してください。記入後のチェック表はローカルに保管し、個人情報入りのREADMEを再アップロードしないでください。

| 確認内容 | 結果・メモ |
| --- | --- |
| Pagesの公開処理が成功し、HTTPSの公開URLが開く | 未確認 |
| 証明書の警告がなく、CSS・JavaScriptが読み込まれる | 未確認 |
| 縦画面で横スクロールせず、大きなボタンを押せる | 未確認 |
| キーボード表示中も英文入力・修正・スクロールができる | 未確認 |
| 英語キーボードの音声入力で英文が入る | 未確認 |
| 音声入力を終了して録音へ切り替えられる | 未確認 |
| マイクを許可し、10秒録音→停止→自分の声を再生できる | 未確認 |
| 停止後、OSのマイク使用表示が解除される | 未確認 |
| 録り直し・削除・連続した録音ができる | 未確認 |
| 許可を拒否すると案内が出る。サイト設定を直して再試行できる | 未確認 |
| 2分で自動停止して再生できる | 未確認 |
| 別タブ・ホーム画面・ロック・着信後に停止し、再開できる | 未確認 |
| 英語読み上げが聞こえる／利用不可なら説明が出る | 未確認 |
| 読み上げ・再生から録音へ移ると音声が競合しない | 未確認 |
| Bluetoothイヤホン使用時も録音・再生ができる | 未確認 |
| 再読み込みで回答・録音が消える | 未確認 |

音量、Bluetooth出力先、マイク権限、OSの音声入力設定も確認してください。認識結果が日本語になる場合はキーボードの言語を英語に切り替えます。

## 参考にした公式・技術資料

- [Apple：iPhoneでテキストを音声入力する](https://support.apple.com/guide/iphone/dictate-text-iph2c0651d2/ios)
- [MDN：getUserMediaと安全なコンテキスト](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [MDN：MediaRecorderの形式判定](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static)
- [GitHub：PagesのHTTPS設定](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
