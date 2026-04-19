from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

MODEL_PATH = Path(__file__).with_name("pricing_model.pkl")


def main() -> None:
    rng = np.random.default_rng(seed=7)
    n_samples = 800
    base_price = rng.uniform(700, 6000, n_samples)
    tier_weight = rng.uniform(0.65, 1.05, n_samples)
    quantity = rng.integers(1, 200, n_samples)
    purchase_freq = rng.uniform(0, 12, n_samples)
    season = rng.integers(0, 4, n_samples)

    X = np.column_stack([base_price, tier_weight, quantity, purchase_freq, season])
    y = (
        base_price
        * tier_weight
        * (1 - np.clip((quantity - 1) * 0.0028, 0, 0.42))
        * np.where(np.isin(season, [1, 2]), 1.05, 1.0)
        + purchase_freq * 4
    )

    model = GradientBoostingRegressor(random_state=7)
    model.fit(X, y)

    joblib.dump(model, MODEL_PATH)
    print(f"Saved model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
