"""Synthetic learner dataset generator for ML pipeline training and demonstration.

NOTE: This module generates explicitly labeled SYNTHETIC training data to demonstrate
the machine learning lifecycle when production historical logs are nascent.
"""

import os
from typing import Tuple
import numpy as np
import pandas as pd


DATA_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATA_PATH = os.path.join(DATA_DIR, "data", "synthetic_learner_dataset.csv")


def generate_synthetic_learner_data(
    num_samples: int = 1500,
    random_seed: int = 42,
    save_path: str = DEFAULT_DATA_PATH,
) -> pd.DataFrame:
    """Generate a realistic synthetic learner performance dataset for mastery prediction.

    Features:
    - historical_accuracy: float [0.0, 1.0]
    - prior_attempts_count: int [1, 10]
    - avg_time_per_question_sec: float [15.0, 150.0]
    - prerequisite_mastery_avg: float [0.0, 1.0]
    - difficulty_level: 'beginner', 'intermediate', 'advanced'
    - consecutive_error_streak: int [0, 5]

    Target:
    - will_master_next: binary 0 or 1
    """
    np.random.seed(random_seed)

    # 1. Feature generation
    historical_accuracy = np.random.beta(a=5, b=3, size=num_samples)
    prior_attempts = np.random.randint(1, 11, size=num_samples)
    avg_time_sec = np.random.normal(loc=65, scale=25, size=num_samples).clip(15, 180)
    prereq_mastery = np.random.beta(a=4, b=3, size=num_samples)

    diff_choices = ["beginner", "intermediate", "advanced"]
    difficulty = np.random.choice(diff_choices, size=num_samples, p=[0.4, 0.35, 0.25])
    error_streak = np.random.poisson(lam=0.8, size=num_samples).clip(0, 5)

    # 2. Realistic ground-truth probability calculation
    diff_penalty = {"beginner": 0.0, "intermediate": -0.6, "advanced": -1.2}
    diff_values = np.array([diff_penalty[d] for d in difficulty])

    # Log-odds linear combination
    z = (
        -1.5
        + (3.5 * historical_accuracy)
        + (0.15 * prior_attempts)
        + (2.2 * prereq_mastery)
        - (0.8 * error_streak)
        + diff_values
    )
    # Sigmoid function
    probabilities = 1.0 / (1.0 + np.exp(-z))
    will_master = (np.random.rand(num_samples) < probabilities).astype(int)

    df = pd.DataFrame({
        "historical_accuracy": np.round(historical_accuracy, 3),
        "prior_attempts_count": prior_attempts,
        "avg_time_per_question_sec": np.round(avg_time_sec, 1),
        "prerequisite_mastery_avg": np.round(prereq_mastery, 3),
        "difficulty_level": difficulty,
        "consecutive_error_streak": error_streak,
        "will_master_next": will_master,
    })

    # Add explicit labeling metadata
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    df.to_csv(save_path, index=False)
    return df


def load_dataset(data_path: str = DEFAULT_DATA_PATH) -> pd.DataFrame:
    """Load or generate synthetic dataset."""
    if not os.path.exists(data_path):
        return generate_synthetic_learner_data(save_path=data_path)
    return pd.read_csv(data_path)


if __name__ == "__main__":
    df = generate_synthetic_learner_data()
    print(f"[INFO] Generated synthetic dataset with shape {df.shape}")
    print(f"[INFO] Target distribution: {dict(df['will_master_next'].value_counts())}")
