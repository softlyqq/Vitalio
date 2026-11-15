"use client";

import { ChevronRight, Plus, Search, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useCreateCustomFood, useDebouncedValue, useFoodSearch, usePopularFoods } from "@/hooks/use-app-data";
import { useNumberFormatter } from "@/hooks/use-formatters";
import { useT } from "@/i18n";
import { useUiStore } from "@/stores/ui-store";
import type { Food, FoodCategory } from "@/types/domain";

interface FoodSearchPanelProps {
  onSelect: (food: Food) => void;
}

/** Підсвічує перше входження запиту в назві (без урахування регістру). */
function highlight(text: string, query: string): ReactNode {
  const needle = query.trim().toLocaleLowerCase("uk-UA");
  if (!needle) return text;
  const firstToken = needle.split(" ")[0] ?? needle;
  const index = text.toLocaleLowerCase("uk-UA").indexOf(firstToken);
  if (index === -1) return text;
  const length = firstToken.length;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-transparent font-bold text-brand-strong">{text.slice(index, index + length)}</mark>
      {text.slice(index + length)}
    </>
  );
}

function FoodRow({ food, query, onSelect }: { food: Food; query: string; onSelect: (food: Food) => void }) {
  const t = useT();
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(food)}
        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-sunken active:bg-sunken"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-semibold">
            {highlight(food.name, query)}
            {food.isCustom ? (
              <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[0.6875rem] font-bold text-brand-strong">
                Мій
              </span>
            ) : null}
          </p>
          <p className="truncate text-xs text-muted">
            {t.foodCategories[food.category]} · Б {food.per100g.protein} · Ж {food.per100g.fat} · В {food.per100g.carbs}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[0.9375rem] font-bold tabular-nums">{food.per100g.kcal}</p>
          <p className="text-[0.6875rem] text-muted">
            {t.common.kcal} {t.addFood.search.per100}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-subtle" aria-hidden="true" />
      </button>
    </li>
  );
}

export function FoodSearchPanel({ onSelect }: FoodSearchPanelProps) {
  const t = useT();
  const formatNumber = useNumberFormatter();
  const pushToast = useUiStore((state) => state.pushToast);
  const createCustomFood = useCreateCustomFood();

  const [query, setQuery] = useState("");
  const [creatingCustom, setCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState<FoodCategory>("dishes");
  const [customKcal, setCustomKcal] = useState("180");
  const [customProtein, setCustomProtein] = useState("12");
  const [customFat, setCustomFat] = useState("8");
  const [customCarbs, setCustomCarbs] = useState("15");
  const [customServing, setCustomServing] = useState("150");

  const debounced = useDebouncedValue(query);
  const search = useFoodSearch(debounced);
  const popular = usePopularFoods();

  const hasQuery = debounced.trim().length > 0;
  const results = hasQuery ? (search.data ?? []) : (popular.data ?? []);
  const showEmpty = hasQuery && !search.isFetching && results.length === 0;

  const handleCreateCustom = (event: React.FormEvent) => {
    event.preventDefault();
    const name = customName.trim();
    const kcal = Math.max(0, Number(customKcal) || 0);
    const protein = Math.max(0, Number(customProtein) || 0);
    const fat = Math.max(0, Number(customFat) || 0);
    const carbs = Math.max(0, Number(customCarbs) || 0);
    const servingGrams = Math.max(10, Number(customServing) || 100);
    if (!name) return;

    createCustomFood.mutate(
      {
        name,
        category: customCategory,
        per100g: { kcal, protein, fat, carbs },
        servings: [{ label: "1 порція", grams: servingGrams }],
      },
      {
        onSuccess: (created) => {
          pushToast(`Додано власний продукт «${created.name}»`);
          setCreatingCustom(false);
          onSelect(created);
        },
      },
    );
  };

  if (creatingCustom) {
    return (
      <form onSubmit={handleCreateCustom} className="flex flex-col gap-3 rounded-3xl bg-sunken p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Новий власний продукт</h3>
          <Button variant="ghost" size="sm" onClick={() => setCreatingCustom(false)}>
            Скасувати
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted sm:col-span-2">
            Назва страви або продукту
            <input
              type="text"
              required
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder="Напр., Домашні сирники"
              className="h-10 rounded-xl bg-surface px-3 text-sm font-medium text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Категорія
            <select
              value={customCategory}
              onChange={(event) => setCustomCategory(event.target.value as FoodCategory)}
              className="h-10 rounded-xl bg-surface px-3 text-sm font-medium text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
            >
              {(Object.keys(t.foodCategories) as FoodCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {t.foodCategories[cat]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Стандартна порція (г)
            <input
              type="number"
              min={5}
              max={2000}
              value={customServing}
              onChange={(event) => setCustomServing(event.target.value)}
              className="h-10 rounded-xl bg-surface px-3 text-sm font-medium text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
            />
          </label>
        </div>

        <p className="text-xs font-semibold text-muted">Поживна цінність на 100 г:</p>
        <div className="grid grid-cols-4 gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Ккал
            <input
              type="number"
              min={0}
              max={900}
              value={customKcal}
              onChange={(event) => setCustomKcal(event.target.value)}
              className="h-10 rounded-xl bg-surface px-2.5 text-sm font-bold text-ink outline-none ring-1 ring-line"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-protein">
            Білки (г)
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={customProtein}
              onChange={(event) => setCustomProtein(event.target.value)}
              className="h-10 rounded-xl bg-surface px-2.5 text-sm font-bold text-ink outline-none ring-1 ring-line"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-fat">
            Жири (г)
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={customFat}
              onChange={(event) => setCustomFat(event.target.value)}
              className="h-10 rounded-xl bg-surface px-2.5 text-sm font-bold text-ink outline-none ring-1 ring-line"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-carbs">
            Вугл. (г)
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={customCarbs}
              onChange={(event) => setCustomCarbs(event.target.value)}
              className="h-10 rounded-xl bg-surface px-2.5 text-sm font-bold text-ink outline-none ring-1 ring-line"
            />
          </label>
        </div>

        <Button type="submit" size="md" className="mt-1 w-full" disabled={!customName.trim()}>
          Зберегти та обрати продукт
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-brand-soft/75 px-3.5 py-2 text-xs font-medium text-ink ring-1 ring-brand/25">
        ⚖️ <strong className="font-bold text-brand-strong">Стандарт сирого продукту:</strong> усі крупи, паста, м&apos;ясо та риба зважуються у <strong className="font-bold">сирому / сухому вигляді до готування</strong> (без похибки на воду та ужарювання).
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-subtle" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.addFood.search.placeholder}
          aria-label={t.addFood.search.label}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          className="h-13 w-full rounded-2xl bg-sunken pl-12 pr-12 text-base font-medium text-ink outline-none ring-1 ring-inset ring-line transition-shadow placeholder:text-subtle focus:ring-2 focus:ring-brand-strong [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={t.addFood.search.clear}
            className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-semibold text-muted" aria-live="polite">
          {hasQuery
            ? showEmpty
              ? ""
              : t.addFood.search.results(formatNumber.format(results.length))
            : t.addFood.search.popular}
        </p>
        <button
          type="button"
          onClick={() => {
            setCustomName(query.trim());
            setCreatingCustom(true);
          }}
          className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-strong transition-opacity hover:opacity-85"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Власний продукт
        </button>
      </div>

      {showEmpty ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-sunken px-6 py-8 text-center">
          <p className="text-base font-semibold">{t.addFood.search.empty}</p>
          <p className="text-sm text-muted">{t.addFood.search.emptyHint}</p>
          <Button
            variant="soft"
            size="sm"
            onClick={() => {
              setCustomName(query.trim());
              setCreatingCustom(true);
            }}
            className="mt-1"
          >
            <Plus className="size-4" aria-hidden="true" />
            Створити «{query.trim()}»
          </Button>
        </div>
      ) : (
        <ul className="-mx-1 flex flex-col gap-1.5">
          {results.map((food) => (
            <FoodRow key={food.id} food={food} query={debounced} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </div>
  );
}
