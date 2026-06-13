# デプロイ手順（GitHub Pages）

手順帳（STEP CARDS）は **単一HTML＋静的アセットのみ・ビルド不要**。GitHub Pages にそのまま置けば動く。
PWA（オフライン動作・ホーム画面追加）は **HTTPS が必須**で、GitHub Pages は自動でHTTPS化されるため要件を満たす。
（`file://` で開くと Service Worker が登録されず、オフライン化・インストールは無効。）

## 前提
- リポジトリ直下に `index.html` / `manifest.json` / `sw.js` / `icons/` / `fonts/` がある（このリポジトリの構成）。
- 直下に空の `.nojekyll` を置く（Jekyll処理を無効化。`_` 始まりやサブフォルダの取りこぼしを防ぐ）。すでに同梱済み。
- パスはすべて相対なので、`https://<user>.github.io/<repo>/` のような**サブパス配信でもそのまま動く**。

## 公開手順（ブランチ配信・最も簡単）
1. GitHub にリポジトリを用意し、`master` を push する。
2. GitHub のリポジトリ → **Settings → Pages**。
3. **Build and deployment → Source** を **「Deploy from a branch」** にする。
4. **Branch** を `master` ／ フォルダを **`/ (root)`** に設定して **Save**。
5. 数十秒〜数分待つと、ページURLが表示される（例：`https://<user>.github.io/<repo>/`）。
6. そのURLをタブレット等で開く。

## 公開後の動作確認（PWA）
1. URLを開いて数秒待つ（Service Worker がアプリシェルをキャッシュ）。
   - PCのDevToolsがあれば **Application → Service Workers** が `activated` を確認。
2. **ホーム画面に追加**：
   - iOS（Safari）：共有ボタン →「ホーム画面に追加」。※アプリ内にも初回案内が出る。
   - Android（Chrome）：アドレスバーのインストール、または設定内「インストール」ボタン。
3. **機内モード（オフライン）**にして、ホーム画面アイコンから起動 → 正常に表示・操作できるか。
4. **データ保持**：手順を1件登録 → アプリを完全終了 → （オフラインのまま）再起動 → 残っているか。
   - データは IndexedDB（端末内）に保存。Pages にはコードのみ公開され、**ユーザーデータは外部に出ない**。

## 更新の反映
- 変更を `master` に push すれば Pages が再デプロイされる。
- **アプリシェル（HTML/CSS/JS/アイコン/フォント）を更新したときは [sw.js](sw.js) の `CACHE` を上げる**（例：`tejun-cho-v1` → `tejun-cho-v2`）。
  - 次回アクセス時に新しい Service Worker が有効化され、旧キャッシュを削除。
  - アプリ内に「更新しました。再読み込みで反映されます」とトーストが出る（自動リロードはしない）。
- バックアップ/インポート等の**ユーザーデータは IndexedDB にあり、シェル更新では消えない**。

## 補足
- 独自ドメインを使う場合は Settings → Pages → Custom domain（任意）。相対パス構成なので追加設定は基本不要。
- アイコンを差し替えるときは `icons/icon.svg` を編集し、`node tools/make-icons.js` で PNG を再生成する（外部ライブラリ不要）。
- Vercel 等の静的ホスティングでも同様に「そのまま配信」で動作する（ビルド設定なし／出力ディレクトリ＝リポジトリ直下）。
