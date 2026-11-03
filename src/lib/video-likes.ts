/** Ads Points granted per rewarded like (daily cap = plan.adsPerDay). */
export const LIKE_ADS_POINTS = 5;

export type LikeResult = {
  liked: boolean;
  awarded: number;
  ads_points: number;
  likes_rewarded_today: number;
  daily_cap: number;
};
