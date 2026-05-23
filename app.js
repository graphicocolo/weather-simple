import { API_KEY } from "./constants.js";
// コードの構成
// 1. HTML要素を取得
// 2. API呼び出し、天気アイコン数値配列定義、天気表示エリア背景色配列定義
// 3. 各関数を作成
//  - submit ボタン状態の切り替え setSubmitEnabled()
//  - 天気エリア表示判定 weatherDisplayIsVisible()
//  - 空文字バリデーション validateNotEmpty()
// 4. イベントリスナー
//  - input
//  - blur
//  - submit
//  - reset

// 1. HTML要素を取得
/** @type {HTMLTextAreaElement | null} */ 
const cityInput = document.querySelector('#city-input');
/** @type {HTMLParagraphElement | null} */
const cityInputError = document.querySelector('#city-input-error');
/** @type {HTMLFormElement | null} */ 
const weatherForm = document.querySelector("#weather-form");
/** @type {HTMLButtonElement | null} */
const submitButton = document.querySelector("button[type='submit']");
/** @type {HTMLButtonElement | null} */
const resetButton = document.querySelector("button[type='reset']");
/** @type {HTMLParagraphElement | null} */
const loadingElement = document.querySelector('#loading');
/** @type {HTMLDivElement | null} */
const weatherDisplayElement = document.querySelector('#display-weather');
/** @type {HTMLParagraphElement | null} */
const cityNameElement = document.querySelector('#city-name');
/** @type {HTMLParagraphElement | null} */
const weatherConditionElement = document.querySelector('#weather-condition');
/** @type {HTMLParagraphElement | null} */
const temperatureElement = document.querySelector('#temperature');
/** @type {HTMLImageElement | null} */
const weatherIconElement = document.querySelector('#weather-icon');

// 2. API呼び出し
async function fetchWeatherData(city) {
  loadingElement.children[0].textContent = "天気情報を読み込み中...";
  loadingElement.classList.remove("hidden");
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&lang=ja&appid=${API_KEY}`;
  try {
    const response = await fetch(url);
    if (response.status === 404) {
      cityInputError.textContent = "入力された都市名が見つかりませんでした";
      return null;
    }
    if (!response.ok) {
      throw new Error(`HTTP: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("エラー:", error);
    return null;
  } finally {
    loadingElement.children[0].textContent = "";
    loadingElement.classList.add("hidden");
  }
}
// 2. 天気アイコン数値配列定義
const weatherConditions = {
  clear: ["01", "02"],
  clouds: ["03", "04", "09", "10", "11", "50"],
  snow: ["13"]
}
// 2. 天気表示エリア背景色配列定義
const bgStyleClasses = ["bg-sky-100", "bg-gray-200", "bg-slate-100", "bg-neutral-100"];

// 3. 各関数を作成
/**
 * submit ボタン状態の切り替え
 * @param {boolean} enabled 活性化状態かどうか
 */
function setSubmitEnabled(enabled) {
  submitButton.disabled = !enabled;
  submitButton.classList.toggle("bg-gray-400", !enabled);
  submitButton.classList.toggle("cursor-not-allowed", !enabled);
  submitButton.classList.toggle("bg-gray-800", enabled);
  submitButton.classList.toggle("cursor-pointer", enabled);
}
setSubmitEnabled(false); // 初期状態は非活性化

/**
 * 天気エリア表示判定
 * @returns {boolean} 判定結果
 */
function weatherDisplayIsVisible() {
  return !weatherDisplayElement.classList.contains("hidden");
}

/**
 * 空文字バリデーション
 * @param {HTMLInputElement} element DOM要素
 * @returns {boolean} バリデーション結果
 */
function validateNotEmpty(element) {
  return element.value.trim() !== "";
}

// 4. イベントリスナー
cityInput.addEventListener("input", () => {
  const isValid = validateNotEmpty(cityInput);
  setSubmitEnabled(isValid);
  isValid && (cityInputError.textContent = "");
  weatherDisplayIsVisible() && (weatherDisplayElement.classList.add("hidden"));
})

cityInput.addEventListener("blur", () => {
  const isValid = validateNotEmpty(cityInput);
  !isValid && (cityInputError.textContent = "都市名を入力してください");
  isValid && (setSubmitEnabled(true), cityInputError.textContent = "");
  // weatherDisplayElement が表示されている間はフォーカスが外れてもエラーを出さないようにする
  weatherDisplayIsVisible() && (cityInputError.textContent = "");
})

weatherForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateNotEmpty(cityInput)) {
    cityInputError.textContent = "都市名を入力してください";
    return;
  }

  // API 呼び出し前に前回の結果をリセット
  cityNameElement.textContent = "";
  weatherConditionElement.textContent = "";
  temperatureElement.textContent = "";
  weatherIconElement.replaceChildren();
  weatherDisplayElement.classList.remove(...bgStyleClasses);

  // API 呼び出し、各種データセット
  const city = cityInput.value.trim();
  const weatherData = await fetchWeatherData(city);
  if (!weatherData) return;
  cityNameElement.textContent = weatherData.name;
  weatherConditionElement.textContent = weatherData.weather[0].description;
  temperatureElement.textContent = weatherData.main.temp;
  const iconCode = weatherData.weather[0].icon;

  // 天気表示エリア背景色切り替え
  const weatherCategory = iconCode.slice(0, 2);
  if (weatherConditions.clear.includes(weatherCategory)) {
    weatherDisplayElement.classList.add(bgStyleClasses[0]);
  } else if (weatherConditions.clouds.includes(weatherCategory)) {
    weatherDisplayElement.classList.add(bgStyleClasses[1]);
  } else if (weatherConditions.snow.includes(weatherCategory)) {
    weatherDisplayElement.classList.add(bgStyleClasses[2]);
  } else {
    weatherDisplayElement.classList.add(bgStyleClasses[3]);
  }

  // 天気アイコン切り替え
  const iconElement = document.createElement("img");
  iconElement.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  iconElement.onload = () => {
    weatherIconElement.appendChild(iconElement);
    weatherDisplayElement.classList.remove("hidden");
  }
  iconElement.addEventListener("error", () => {
    weatherDisplayElement.classList.remove("hidden");
  })

  // 後処理
  cityInput.value = "";
  setSubmitEnabled(false);
})

weatherForm.addEventListener("reset", () => {
  cityInput.value = "";
  cityInputError.textContent = "";
  weatherIconElement.replaceChildren();
  setSubmitEnabled(false);
  if (weatherDisplayIsVisible()) {
    weatherDisplayElement.classList.add("hidden");
  }
})