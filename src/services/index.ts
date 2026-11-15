import { LocalDiaryRepository } from "@/services/diary/local-diary-repository";
import { LocalFoodRepository } from "@/services/foods/local-food-repository";
import { LocalProfileRepository } from "@/services/profile/local-profile-repository";
import type { DiaryRepository, FoodRepository, ProfileRepository } from "@/services/ports";

/**
 * Composition root: єдине місце, де обирається реалізація сховища.
 * Перехід на Supabase = замінити три рядки нижче на `Supabase*Repository`.
 */
export interface Services {
  diary: DiaryRepository;
  foods: FoodRepository;
  profile: ProfileRepository;
}

export const services: Services = {
  diary: new LocalDiaryRepository(),
  foods: new LocalFoodRepository(),
  profile: new LocalProfileRepository(),
};
