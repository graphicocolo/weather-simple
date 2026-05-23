# 天気アプリ 制作ロードマップ

> JavaScript 卒業制作アプリ  
> 使う技術：fetch / 外部API / DOM操作 / エラーハンドリング  
> 難易度：★★☆

---

## 完成イメージ

- 都市名を入力して検索すると、現在の天気・気温・天気アイコンを表示する
- GitHub Pages でデプロイして URL を持つ

---

## フェーズ1：API の準備

- [x] OpenWeatherMap に登録して APIキーを取得する
  - https://openweathermap.org/api
  - 無料プランで Current Weather Data が使える
- [x] APIドキュメントを読んで、エンドポイントとレスポンスの構造を確認する
  - `https://api.openweathermap.org/data/2.5/weather?q={city}&appid={APIkey}&units=metric&lang=ja`
  - レスポンスのどのキーに何のデータが入るかメモする
    - weather 天気
      - description 晴天
    - temperature 気温
      - value 9.23
      - unit celsius
    - humidity 湿度
      - value 75
      - unit %
- [x] ブラウザまたは curl でAPIを叩いて、レスポンスを確認する

### Current Weather Data エンドポイントとレスポンスの構造

`https://openweathermap.org/api/current?collection=current_forecast`

```txt
// lat 緯度 必須
// lon 経度 必須
https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API key}

// 他
// mode （オプション） レスポンスの形式 default は JSON、他 XML, HTML
// units （オプション） 測定単位 default は standard 標準単位、他 metric メートル法単位、imperial ヤード・ポンド法単位
// metric にすると温度が摂氏で返ってくる
// lang （オプション） 言語
```

```
call
https://api.openweathermap.org/data/2.5/weather?lat=51.5073219&lon=-0.1276474&mode=xml&units=metric&lang=ja&appid=*****

response
<current>
<city id="2643743" name="ロンドン">
<coord lon="-0.1276" lat="51.5073"/>
<country>GB</country>
<timezone>3600</timezone>
<sun rise="2026-04-29T04:36:20" set="2026-04-29T19:19:12"/>
</city>
<temperature value="9.23" min="8.65" max="9.99" unit="celsius"/>
<feels_like value="6.78" unit="celsius"/>
<humidity value="75" unit="%"/>
<pressure value="1023" unit="hPa"/>
<wind>
<speed value="4.63" unit="m/s" name="Gentle Breeze"/>
<gusts/>
<direction value="70" code="ENE" name="East-northeast"/>
</wind>
<clouds value="0" name="晴天"/>
<visibility value="10000"/>
<precipitation mode="no"/>
<weather number="800" value="晴天" icon="01d"/>
<lastupdate value="2026-04-29T05:40:20"/>
</current>
```

```txt
call
https://api.openweathermap.org/data/2.5/weather?id=2643743&units=metric&lang=ja&appid=*****

response
{"coord":{"lon":-0.1257,"lat":51.5085},"weather":[{"id":800,"main":"Clear","description":"晴天","icon":"01d"}],"base":"stations","main":{"temp":9.4,"feels_like":6.99,"temp_min":8.64,"temp_max":10,"pressure":1023,"humidity":75,"sea_level":1023,"grnd_level":1019},"visibility":10000,"wind":{"speed":4.63,"deg":70},"clouds":{"all":0},"dt":1777441645,"sys":{"type":2,"id":268730,"country":"GB","sunrise":1777437379,"sunset":1777490351},"timezone":3600,"id":2643743,"name":"ロンドン","cod":200}
```

### 実装への注意

ユーザーに入力させる値を緯度経度にするわけにはいかないので、都市名か国で入力させ、対応コード表と照らし合わせて API を組み立てデータを取得する流れ

↓この形に組み立てる

```txt
https://api.openweathermap.org/data/2.5/weather?id=2643743&units=metric&lang=ja&appid=*****
```

検索フォームは、input よりも select で実装の方が良い(都市名限定の場合)

都市名で option をリストする

もしくは郵便番号 郵便番号は煩雑になるかも

> OpenWeatherMapで都市名を使って天気を取得するには、APIリクエストのqパラメータに「都市名,国コード」を英数字（ローマ字）で指定します（例: Tokyo,JP）。より正確に指定したい場合は、公式city.list.json.gzを使用して正確な都市IDを取得することをお勧めします。

```zsh
curl 'https://api.openweathermap.org/data/2.5/weather?zip=169-0072,JP&appid={APIキー}&lang=ja&units=metric' | python3 -m json.tool
```

```txt
https://api.openweathermap.org/data/2.5/weather?q=Tokyo,JP&appid={APIキー}
```

都市名や郵便番号の API は現在非推奨らしい
[Geocoding API](https://openweathermap.org/api/geocoding-api?collection=other)
を使って、都市名から座標に変換することが推奨されている

```txt
call
http://api.openweathermap.org/geo/1.0/direct?q={city name},{state code},{country code}&limit={limit}&appid={API key}

response
...
```

---

## フェーズ2：ファイル構成・基本実装

### 仕様

都市名を入力して検索すると、現在の天気・気温・天気アイコンを表示する

- [x] ファイルを作成する
  ```
  weather/
    index.html
    style.css
    app.js
  ```
- [x] HTML に検索フォーム（入力欄 + ボタン）と、結果表示エリアを作る
- [x] `fetch` でAPIを呼び出し、コンソールにレスポンスを表示できる状態にする
- [x] `async / await` で非同期処理を書く

`.env` ファイルは Node.js の機能なので今回は使えない。ES Modules を利用して、定数ファイルを作成し、それを app.js に import させることで対応する

> type="module" にすると HTTP サーバー経由でないと動きません（file:// で直接開くとCORSエラーになります）。

> VS Code の Live Server 拡張機能 か、ターミナルで以下を使えばOKです：

```zsh
npx serve .
```

---

## フェーズ3：DOM に天気を表示する

- [x] 取得したデータから必要な値を取り出す ← **今ここを作業中**  🔥 現在地
  - 都市名
  - 天気の説明
  - 気温
  - 天気アイコン
- [x] 取り出した値を DOM に反映して画面に表示する
- [x] 天気アイコンを `<img>` タグで表示する
  - `https://openweathermap.org/img/wn/{icon}@2x.png`

---

## フェーズ4：エラーハンドリング・UX改善

- [x] sumit 後、表示領域を表示させる
- [x] 存在しない都市名を入力したときにエラーメッセージを表示する（APIが404を返すケース）
- [x] 入力欄が空のまま検索したときにバリデーションメッセージを表示する
- [x] 通信中にローディング表示をする
- [x] Enter キーでも検索できるようにする → `submit` イベントリスナーの記述があるため他には何も指定していない（`input` フィールドで `Enter` キーを押下で `submit` イベントが発生するため）

### 通信中にローディング表示をする 実装のヒント

**考え方：「通信中かどうか」を表すフラグ変数を1つ用意する**

```js
let isLoading = false;
```

**フラグを切り替えるタイミング**

```
fetch 開始前 → isLoading = true  （ローディング表示）
fetch 終了後 → isLoading = false （ローディング非表示）
```

成功・失敗どちらでも「終了後」に非表示にする必要があるため、`finally` を使う。

**HTML にローディング要素を用意する**

```html
<div id="loading">読み込み中...</div>
```

**JS でフラグに応じて表示/非表示を切り替える**

```js
// 表示
document.getElementById('loading').style.display = 'block';

// 非表示
document.getElementById('loading').style.display = 'none';
```

**全体の流れ**

```
ボタンクリック
  ↓
ローディング表示
  ↓
fetch（通信）
  ↓（成功 or 失敗どちらでも finally が実行される）
ローディング非表示
  ↓
結果を表示 or エラー表示
```

---

## フェーズ5：スタイリング

- [x] レイアウトを整える（Tailwind CSS または 自前CSS）
- [x] 天気によって背景色やアイコンの雰囲気を変える（オプション）
  - https://openweathermap.org/api/weather-conditions#How-to-get-icon-URL
- [x] スマホでも見やすいレスポンシブデザインにする

---

## フェーズ6：GitHub Pages でデプロイ

- [x] GitHubリポジトリを作成する（例：`weather-app`） ← **今このテーマを学習中**  🔥 現在地
- [x] コードをプッシュする
- [ ] GitHub Pages を有効にして URL を確認する
- [ ] README.md を書く
  - 何ができるアプリか
  - 使った技術
  - デモ URL

---

## 注意点

### APIキーの扱い
フロントエンドのみの構成では、APIキーがソースコードに含まれてしまう。  
学習目的のため今回はそのまま使うが、実務では環境変数やバックエンド経由で隠すのが原則。

### CORS
OpenWeatherMap はブラウザからの直接リクエストを許可しているため、今回は CORS エラーは発生しない。

---

## 参考

- [OpenWeatherMap API ドキュメント](https://openweathermap.org/current)
- [fetch MDN](https://developer.mozilla.org/ja/docs/Web/API/fetch)
