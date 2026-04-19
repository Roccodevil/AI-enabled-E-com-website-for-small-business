import os
from dataclasses import dataclass

import joblib

from core.config import settings


@dataclass
class PricingFeatures:
    base_price: float
    user_tier_weight: float
    order_quantity: int
    historical_purchase_frequency: float
    current_season: str


class PricingPredictor:
    def __init__(self, model_path: str):
        self.model_path = model_path
        self.model = self._load_model()

    def _load_model(self):
        if not os.path.exists(self.model_path):
            return None
        return joblib.load(self.model_path)

    def _encode_season(self, season: str) -> int:
        season_map = {"regular": 0, "festive": 1, "wedding": 2, "clearance": 3}
        return season_map.get(season.lower(), 0)

    def predict(self, features: PricingFeatures) -> float:
        if self.model is None:
            quantity_discount = min(0.35, max(0.0, (features.order_quantity - 1) * 0.0025))
            tier_adjustment = max(0.6, min(1.1, features.user_tier_weight))
            season_adjustment = 1.05 if features.current_season.lower() in {"festive", "wedding"} else 1.0
            predicted = features.base_price * tier_adjustment * season_adjustment * (1 - quantity_discount)
            return round(max(predicted, 0), 2)

        input_vector = [
            [
                features.base_price,
                features.user_tier_weight,
                features.order_quantity,
                features.historical_purchase_frequency,
                self._encode_season(features.current_season),
            ]
        ]
        prediction = float(self.model.predict(input_vector)[0])
        return round(max(prediction, 0), 2)


_predictor: PricingPredictor | None = None


def get_pricing_predictor() -> PricingPredictor:
    global _predictor
    if _predictor is None:
        _predictor = PricingPredictor(settings.pricing_model_path)
    return _predictor
