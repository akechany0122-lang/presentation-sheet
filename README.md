# ココロノセイセイ — ポートフォリオ

ココロノセイセイ一作品のためのサイトです。ビルド不要の静的サイトで、`main` にプッシュすると GitHub Pages へ自動デプロイされます。

## 動画

Webで使う動画は、軽くしたものだけを置きます（元の撮影データは Git では無視）。GitHub は1ファイル100MBまで。

- `assets/videos/kokoro-movie.mp4` … ヒーローの直後の主役の映像（音つき）。
- `assets/videos/lite/` … セイセイノシクミ・インスタレーションで使う映像（1280×720、音なし）。
- `assets/videos/lite/s/` … インスタレーションの壁（小さく並べる）用の、さらに軽い版（640×360）。
- `assets/videos/posters/` … 同名の jpg（読み込み前に見える静止画）。

映像の割り当ては `index.html`：スキャン＝`data-list="scan,scan2"`、ウゴク＝`rec`、セイセイ＝`seisei`、ヘンカ＝`data-pool` から4本をランダム、インスタレーション＝中心の `move`・`music`・`walk` と、壁の `data-clips`。
