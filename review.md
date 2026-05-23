# app.js コードレビュー

## 良い点

- DOM 要素への JSDoc 型注釈が丁寧
- `setSubmitEnabled` / `validateNotEmpty` / `weatherDisplayIsVisible` の関数化で責務が整理されている
- `replaceChildren()` でアイコンを毎回クリーンリセットしている
- `reset` イベントの後処理が漏れなく書けている
- `bgStyleClasses` で背景色を配列管理しているのはきれい

---

## 要修正：重大バグ

### `weatherData` が `undefined` のままアクセスしてクラッシュする（147行目）

`fetchWeatherData` のエラー時、`catch` ブロックが `console.error` するだけで何も `return` していないため `undefined` が返る。

```js
// submit ハンドラ（147行目付近）
const weatherData = await fetchWeatherData(city);
cityNameElement.textContent = weatherData.name; // ← weatherData が undefined なら TypeError
```

エラー時（存在しない都市名など）に `Cannot read properties of undefined` でクラッシュする。

**修正方針：** `fetchWeatherData` がエラー時に `null` を返し、submit ハンドラ側でガードする。

```js
// fetchWeatherData の catch 内
} catch (error) {
  console.error("エラー:", error);
  return null; // ← 追加
}

// submit ハンドラ側
const weatherData = await fetchWeatherData(city);
if (!weatherData) return; // ← ガード追加
cityNameElement.textContent = weatherData.name;
```

---

## 要改善：`setTimeout` の多重タイミング問題

エラー時にローディング非表示処理が **1秒後** と **2秒後** の2回走る。

```js
// !response.ok 時
setTimeout(() => {
  // 1秒後：ローディング非表示 + エラーメッセージ
}, 1000);
throw new Error(...);

// finally（常に実行される）
setTimeout(() => {
  // 2秒後：またローディング非表示
}, 2000);
```

正常時も `finally` の2秒後タイマーと、submit ハンドラの2秒後タイマーが重なって動作が把握しづらい。

**修正方針：** `finally` でのみローディングを制御し、`setTimeout` は1か所に集約する。

```js
async function fetchWeatherData(city) {
  loadingElement.children[0].textContent = "天気情報を読み込み中...";
  loadingElement.classList.remove("hidden");
  try {
    const response = await fetch(url);
    if (!response.ok) {
      cityInputError.textContent = "入力された都市名が見つかりませんでした";
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("エラー:", error);
    return null;
  } finally {
    loadingElement.children[0].textContent = "";
    loadingElement.classList.add("hidden");
  }
}
```

---

## 軽微：コメントアウトされたコードが残っている

54〜57行目と174〜178行目に使わなくなったコメントアウトが残っている。削除してOK。

---

## 軽微：`weatherConditions` の型の不統一

```js
const weatherConditions = {
  clear: ["01", "02"],                          // 配列
  clouds: ["03", "04", "09", "10", "11", "50"], // 配列
  snow: "13"                                    // 文字列（配列でない）
}
```

比較方法が `clouds.includes()` と `snow ===` で統一されていない。`snow: ["13"]` にして `.includes()` で統一する方が読みやすい。

---

## まとめ

| 優先度 | 内容 |
|--------|------|
| 重大 | `weatherData` が `undefined` 時にクラッシュ |
| 改善 | `setTimeout` タイミングの多重競合 |
| 軽微 | コメントアウトの残骸を削除 |
| 軽微 | `weatherConditions.snow` を配列に統一 |

---

## 入力値に該当する都市名が見当たらない場合のコンソールエラーについて

エラー後に正常な都市名で再検索しても、コンソールにエラーが残り続ける。

### 結論：問題なし

- コンソールは開発者ツールであり、ユーザーには見えないため動作・表示への影響はない
- `console.clear()` でコンソール全体を消す手段はあるが、実務では使わない
- 特定のエラーログだけを後から消す手段はない

### 改善できること

404 のような想定内のエラーは `console.error`（赤）ではなく `console.warn`（黄）を使う方が適切。

```js
} catch (error) {
  console.warn("エラー:", error); // error → warn
  return null;
}
```

- `console.error`：予期しないバグに使う
- `console.warn`：仕様上ありうるエラー（404 など）に使う

コンソールが赤くならなくなり、視覚的なノイズが減る。

---

## 実務でのエラー処理の考え方

### 1. エラーの種類を分けて処理する

「ユーザーの入力ミス」と「システムエラー」を区別して対処する。

| 種類 | 例 | 対処 |
|------|------|------|
| ユーザーエラー | 404（都市名が存在しない） | ユーザーに案内するだけ・ログ不要 |
| システムエラー | 500・ネットワーク切断 | ログに記録・汎用エラーメッセージを表示 |

404 は「存在しない都市名を入力した」だけなので `console.warn` すら不要なケースが多い。

```js
if (response.status === 404) {
  cityInputError.textContent = "入力された都市名が見つかりませんでした";
  return null; // ログは出さない
}
if (!response.ok) {
  console.error("システムエラー:", response.status); // 500 系は記録
  throw new Error(`HTTP ${response.status}`);
}
```

### 2. 本番環境では console ではなく外部ログサービスを使う

`console.error` はブラウザの開発者ツールにしか出ないため、本番障害の調査に使えない。実務では Sentry・Datadog などのエラートラッキングサービスにエラーを送る。

```js
// 開発
console.error("エラー:", error);

// 本番（Sentry の例）
Sentry.captureException(error);
```

エラーが発生した時刻・ユーザー・入力値などの文脈情報も一緒に記録できる。

### 3. ユーザーへのフィードバックを丁寧にする

エラーメッセージを出すだけでなく、次のアクションを促す表示にすることが多い。

```
「"Tokio" は見つかりませんでした。スペルを確認してください。」
```

検索候補のサジェストや、よく使われる都市名のリストを出すなども一般的なUX改善。

### まとめ：今回のコードに当てはめると

| ケース | 対処 |
|--------|------|
| 404（都市名なし） | `console` 出力なし・ユーザーにメッセージのみ |
| 500・ネットワークエラー | `console.error` または本番では外部ログサービス |
| ユーザー向けメッセージ | 「もう一度試してください」などの汎用メッセージ |
