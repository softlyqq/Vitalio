"use client";

import {
  Camera,
  Check,
  ImagePlus,
  Mic,
  MicOff,
  Minus,
  Plus,
  ScanBarcode,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BARCODE_DEMO_FOODS, FOODS } from "@/data/foods";
import { Button } from "@/components/ui/button";
import { usePlanTier } from "@/hooks/use-app-data";
import { useT } from "@/i18n";
import { AI_PHOTO_PRESETS, parseMealDescription, type ParsedMealItem } from "@/lib/ai-food-parser";
import { nutritionForGrams, sumNutrition } from "@/lib/nutrition";
import { services } from "@/services";
import { useUiStore } from "@/stores/ui-store";
import type { Food, MealType } from "@/types/domain";

interface BarcodePanelProps {
  onSelectFood: (food: Food) => void;
}

interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
}

/**
 * Сканер штрих-кодів:
 * 1) Камера пристрою (`getUserMedia` + `BarcodeDetector`, якщо підтримується браузером);
 * 2) Ручне введення штрих-коду EAN-8 / EAN-13;
 * 3) Миттєвий вибір із демо-упаковок для швидкої перевірки без камери.
 */
export function BarcodePanel({ onSelectFood }: BarcodePanelProps) {
  const pushToast = useUiStore((state) => state.pushToast);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!cameraActive) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let timerId: number | undefined;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError("Камера недоступна у цьому браузері — введіть або оберіть штрих-код нижче.");
          setCameraActive(false);
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }

        const DetectorCtor = (
          window as unknown as { BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike }
        ).BarcodeDetector;

        if (DetectorCtor) {
          const detector = new DetectorCtor({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
          const tick = async () => {
            if (cancelled || !videoRef.current) return;
            try {
              const results = await detector.detect(videoRef.current);
              const raw = results[0]?.rawValue;
              if (raw) {
                const matched = await services.foods.findByBarcode(raw);
                if (matched) {
                  pushToast(`Зчитано штрих-код ${raw}: ${matched.name}`);
                  onSelectFood(matched);
                  return;
                }
              }
            } catch {
              // Кадр ще не готовий — продовжуємо сканування.
            }
            timerId = window.setTimeout(tick, 350);
          };
          timerId = window.setTimeout(tick, 400);
        }
      } catch {
        setError("Не вдалося отримати доступ до камери. Використайте поле вводу або швидкі штрих-коди нижче.");
        setCameraActive(false);
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      if (timerId !== undefined) window.clearTimeout(timerId);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraActive, onSelectFood, pushToast]);

  const handleLookup = async (rawCode: string) => {
    setError(null);
    const found = await services.foods.findByBarcode(rawCode);
    if (!found) {
      setError(`Продукт зі штрих-кодом «${rawCode}» не знайдено в базі.`);
      return;
    }
    onSelectFood(found);
  };

  const corner = "absolute size-6 border-brand-strong";

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="relative mx-auto grid h-44 w-full overflow-hidden rounded-3xl bg-sunken ring-1 ring-line">
        {cameraActive ? (
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        ) : (
          <div className="grid place-items-center p-4 text-center">
            <ScanBarcode className="size-12 text-muted" strokeWidth={1.5} aria-hidden="true" />
            <p className="mt-2 text-xs font-medium text-muted">
              Наведіть камеру на штрих-код EAN-13 або оберіть тестовий товар нижче
            </p>
          </div>
        )}
        <span aria-hidden="true" className={`${corner} left-4 top-4 rounded-tl-xl border-l-3 border-t-3`} />
        <span aria-hidden="true" className={`${corner} right-4 top-4 rounded-tr-xl border-r-3 border-t-3`} />
        <span aria-hidden="true" className={`${corner} bottom-4 left-4 rounded-bl-xl border-b-3 border-l-3`} />
        <span aria-hidden="true" className={`${corner} bottom-4 right-4 rounded-br-xl border-b-3 border-r-3`} />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 rounded-full bg-brand" />
      </div>

      <div className="flex gap-2">
        <Button
          variant={cameraActive ? "secondary" : "soft"}
          size="md"
          onClick={() => setCameraActive((prev) => !prev)}
          className="flex-1"
        >
          <Camera className="size-4" aria-hidden="true" />
          {cameraActive ? "Зупинити камеру" : "Увімкнути камеру"}
        </Button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleLookup(code);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(event) => {
            setError(null);
            setCode(event.target.value.replace(/\D/g, "").slice(0, 14));
          }}
          placeholder="Введіть штрих-код (напр. 4820022113355)"
          aria-label="Штрих-код продукту"
          className="h-11 flex-1 rounded-2xl bg-sunken px-4 text-sm font-medium text-ink outline-none ring-1 ring-inset ring-line placeholder:text-subtle focus:ring-2 focus:ring-brand-strong"
        />
        <Button type="submit" size="md" disabled={code.length < 8}>
          Знайти
        </Button>
      </form>

      {error ? (
        <p role="alert" className="rounded-2xl bg-carbs-soft px-3.5 py-2.5 text-xs font-semibold text-carbs">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <p className="px-1 text-xs font-semibold text-muted">Швидка перевірка (натисніть для сканування):</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {BARCODE_DEMO_FOODS.slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectFood(item)}
              className="flex items-center justify-between gap-2 rounded-2xl bg-sunken px-3.5 py-2.5 text-left transition-colors hover:bg-raised"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                <p className="text-[0.6875rem] text-muted tabular-nums">{item.barcode}</p>
              </div>
              <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-brand-strong ring-1 ring-line">
                {item.per100g.kcal} ккал
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface AiScannerPanelProps {
  meal: MealType;
  submitting: boolean;
  onAddBatch: (items: readonly { food: Food; grams: number }[]) => void;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

/**
 * Інтерактивний AI Food Scanner:
 * розпізнає страву за текстовим/голосовим промтом або завантаженим фото тарілки,
 * розкладає на інгредієнти з можливістю підкоригувати грамаж і додає все одним кліком.
 */
export function AiScannerPanel({ meal, submitting, onAddBatch }: AiScannerPanelProps) {
  const t = useT();
  const { data: planTier = "free" } = usePlanTier();
  const openPaywall = useUiStore((state) => state.openPaywall);
  const pushToast = useUiStore((state) => state.pushToast);

  const [prompt, setPrompt] = useState("2 яйця, 1 тост цільнозернового хліба, 70 г авокадо та латте");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionNote, setVisionNote] = useState<string | null>(null);
  const [items, setItems] = useState<ParsedMealItem[]>(() =>
    parseMealDescription("2 яйця, 1 тост цільнозернового хліба, 70 г авокадо та латте"),
  );
  const [listening, setListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const analyze = (text: string) => {
    setVisionNote(null);
    const parsed = parseMealDescription(text);
    setItems(parsed);
    if (parsed.length === 0) {
      pushToast("Не вдалося розпізнати відомі інгредієнти — спробуйте уточнити назву страви.");
    }
  };

  const handlePhotoUpload = async (file: File | undefined) => {
    if (!file) return;
    setPhotoName(file.name);
    setVisionNote(null);

    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve) => {
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.readAsDataURL(file);
    });
    if (dataUrl) {
      setPhotoPreviewUrl(dataUrl);
    }

    const apiKey =
      typeof window !== "undefined" ? window.localStorage.getItem("vitalio:gemini-api-key")?.trim() : "";

    if (apiKey && dataUrl.includes(",")) {
      setVisionLoading(true);
      try {
        const base64Data = dataUrl.split(",")[1] ?? "";
        const mimeType = file.type || "image/jpeg";
        const catalogList = FOODS.map((f) => `${f.id}: ${f.name}`).join("; ");
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Ти спортивний нутриціолог. Проаналізуй це фото страви або етикетки. Обери відповідні продукти ЗІ СПИСКУ КАТАЛОГУ (де всі продукти рахуються у сирій/сухій вазі до приготування): [${catalogList}]. Поверни ТІЛЬКИ валідний JSON формату {"summary":"короткий опис українською","items":[{"foodId":"id з каталогу","rawGrams":число_грам_сирої_сухої_ваги}]}.`,
                    },
                    {
                      inline_data: {
                        mime_type: mimeType,
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
              },
            }),
          },
        );

        if (response.ok) {
          const json = (await response.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          const parsedVision = JSON.parse(rawText) as {
            summary?: string;
            items?: Array<{ foodId: string; rawGrams: number }>;
          };
          const matchedItems: ParsedMealItem[] = [];
          for (const entry of parsedVision.items ?? []) {
            const food = FOODS.find((f) => f.id === entry.foodId);
            if (food) {
              const grams = Math.max(10, Math.min(1000, Math.round(entry.rawGrams || 100)));
              matchedItems.push({
                food,
                grams,
                label: `${grams} г (сира/суха вага)`,
                nutrition: nutritionForGrams(food, grams),
              });
            }
          }
          if (matchedItems.length > 0) {
            setItems(matchedItems);
            if (parsedVision.summary) {
              setPrompt(parsedVision.summary);
              setVisionNote(`Gemini Vision: ${parsedVision.summary}`);
            }
            pushToast(`Gemini Vision розпізнав ${matchedItems.length} інгр. у сирій вазі!`);
            setVisionLoading(false);
            return;
          }
        }
      } catch {
        // Якщо Gemini Vision недоступний — переходимо до локального пресету.
      } finally {
        setVisionLoading(false);
      }
    }

    // Локальний розумний розбір за назвою або збалансований шаблон тарілки
    const lower = file.name.toLocaleLowerCase("uk-UA");
    const preset =
      AI_PHOTO_PRESETS.find((p) => lower.includes(p.id.split("-")[0] ?? "")) ??
      AI_PHOTO_PRESETS[0]!;
    setPrompt(preset.prompt);
    setItems(parseMealDescription(preset.prompt));
    setVisionNote(
      "Локальний розбір тарілки (додайте ключ Gemini в AI-Коучі для Vision-розпізнавання будь-яких фото)",
    );
    pushToast(`Фото «${file.name}» проаналізовано`);
  };

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechCtor = (
      window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
      }
    ).SpeechRecognition ??
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
        }
      ).webkitSpeechRecognition;

    if (!SpeechCtor) {
      pushToast("Голосове введення не підтримується цим браузером — введіть опис текстом.");
      return;
    }

    const recognition = new SpeechCtor();
    recognition.lang = "uk-UA";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) {
        setPrompt(transcript);
        analyze(transcript);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const adjustItemGrams = (foodId: string, delta: number) => {
    setItems((current) =>
      current.map((item) => {
        if (item.food.id !== foodId) return item;
        const grams = Math.max(5, Math.min(2000, item.grams + delta));
        return {
          ...item,
          grams,
          label: `${grams} г`,
          nutrition: nutritionForGrams(item.food, grams),
        };
      }),
    );
  };

  const removeItem = (foodId: string) => {
    setItems((current) => current.filter((item) => item.food.id !== foodId));
  };

  const totals = useMemo(() => sumNutrition(items.map((item) => item.nutrition)), [items]);

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-strong">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-bold leading-tight">{t.addFood.ai.title}</h3>
            <p className="text-xs text-muted">Фото тарілки, голос або текстовий опис страви</p>
          </div>
        </div>
        {planTier === "pro" ? (
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-strong">Pro активний</span>
        ) : (
          <button
            type="button"
            onClick={openPaywall}
            className="rounded-full bg-sunken px-3 py-1 text-xs font-bold text-brand-strong ring-1 ring-line hover:bg-raised"
          >
            Pro · Безліміт →
          </button>
        )}
      </div>

      {/* Кнопки завантаження фото та пресети тарілок */}
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handlePhotoUpload(event.target.files?.[0])}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={visionLoading}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="size-4 text-brand-strong" aria-hidden="true" />
            {visionLoading
              ? "Аналізую фото…"
              : photoName
                ? `Фото: ${photoName.slice(0, 18)}`
                : "Сфотографувати / Завантажити тарілку"}
          </Button>
          <Button variant={listening ? "primary" : "secondary"} size="sm" onClick={toggleVoice}>
            {listening ? <MicOff className="size-4" aria-hidden="true" /> : <Mic className="size-4" aria-hidden="true" />}
            {listening ? "Слухаю…" : "Голосом"}
          </Button>
        </div>

        {photoPreviewUrl ? (
          <div className="flex items-center gap-3 rounded-2xl bg-sunken p-2.5 ring-1 ring-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreviewUrl}
              alt="Завантажене фото страви"
              className="size-14 shrink-0 rounded-xl object-cover ring-1 ring-line"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-ink">{photoName}</p>
              <p className="mt-0.5 text-[11px] text-muted">
                {visionLoading
                  ? "Gemini Vision переводить порцію на тарілці у сиру/суху вагу…"
                  : visionNote ?? "Розпізнано еквівалент у сирій/сухій вазі"}
              </p>
            </div>
          </div>
        ) : null}

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
          {AI_PHOTO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setPrompt(preset.prompt);
                analyze(preset.prompt);
              }}
              className="shrink-0 rounded-xl bg-sunken px-3 py-1.5 text-left text-xs font-semibold text-ink transition-colors hover:bg-raised"
            >
              {preset.title}
            </button>
          ))}
        </div>
      </div>

      {/* Поле опису страви */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Напр.: 2 яйця, тост з авокадо і латте"
            aria-label="Опис прийому їжі для AI-сканера"
            className="h-11 flex-1 rounded-2xl bg-sunken px-4 text-sm font-medium text-ink outline-none ring-1 ring-inset ring-line placeholder:text-subtle focus:ring-2 focus:ring-brand-strong"
          />
          <Button variant="soft" size="md" onClick={() => analyze(prompt)}>
            <Wand2 className="size-4" aria-hidden="true" />
            Розкласти
          </Button>
        </div>
      </div>

      {/* Розпізнані інгредієнти */}
      {items.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-3xl bg-sunken p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-semibold text-muted">Розпізнано інгредієнтів: {items.length}</p>
            <p className="text-sm font-bold text-ink">
              {totals.kcal} {t.common.kcal} · Б {totals.protein}г · Ж {totals.fat}г · В {totals.carbs}г
            </p>
          </div>

          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={item.food.id}
                className="flex items-center justify-between gap-2 rounded-2xl bg-surface px-3 py-2.5 ring-1 ring-line"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.food.name}</p>
                  <p className="text-xs text-muted">
                    {item.grams} г · <span className="font-semibold text-ink">{item.nutrition.kcal} ккал</span> (Б{" "}
                    {item.nutrition.protein} · Ж {item.nutrition.fat} · В {item.nutrition.carbs})
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustItemGrams(item.food.id, -15)}
                    aria-label={`Зменшити вагу ${item.food.name}`}
                    className="grid size-7 place-items-center rounded-full bg-sunken text-ink hover:bg-raised"
                  >
                    <Minus className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustItemGrams(item.food.id, 15)}
                    aria-label={`Збільшити вагу ${item.food.name}`}
                    className="grid size-7 place-items-center rounded-full bg-sunken text-ink hover:bg-raised"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.food.id)}
                    aria-label={`Прибрати ${item.food.name}`}
                    className="grid size-7 place-items-center rounded-full text-subtle hover:bg-sunken hover:text-danger"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <Button
            size="lg"
            className="w-full"
            disabled={submitting}
            onClick={() => onAddBatch(items.map(({ food, grams }) => ({ food, grams })))}
          >
            <Check className="size-5" aria-hidden="true" />
            Додати {items.length} поз. у «{t.meals[meal]}» · {totals.kcal} {t.common.kcal}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
