"""Prediction service interface for learner mastery probability with seamless rule-based fallback."""

import json
import logging
import os
from typing import Any, Dict, Optional, Tuple

import joblib
import pandas as pd


logger = logging.getLogger(__name__)

ML_DIR = os.path.dirname(os.path.abspath(__file__))
SAVED_MODELS_DIR = os.path.join(ML_DIR, "saved_models")
MODEL_ARTIFACT_PATH = os.path.join(SAVED_MODELS_DIR, "mastery_v1.joblib")
METRICS_ARTIFACT_PATH = os.path.join(SAVED_MODELS_DIR, "mastery_v1_metrics.json")


class MasteryPredictor:
    """Predictor service encapsulating ML inference and rule-based fallback logic."""

    _model: Optional[Any] = None
    _metadata: Optional[Dict[str, Any]] = None

    @classmethod
    def load_model(cls) -> bool:
        """Attempt to load persisted model pipeline and version metadata."""
        if cls._model is not None:
            return True

        if not os.path.exists(MODEL_ARTIFACT_PATH):
            logger.info("Mastery model artifact not found. Rule-based heuristic fallback will be active.")
            return False

        try:
            cls._model = joblib.load(MODEL_ARTIFACT_PATH)
            if os.path.exists(METRICS_ARTIFACT_PATH):
                with open(METRICS_ARTIFACT_PATH, "r") as f:
                    cls._metadata = json.load(f)
            logger.info("Successfully loaded ML mastery model artifact.")
            return True
        except Exception as exc:
            logger.warning(f"Failed to load ML model artifact: {exc}. Active fallback enabled.")
            cls._model = None
            return False

    @classmethod
    def predict_mastery_probability(cls, features: Dict[str, Any]) -> Dict[str, Any]:
        """Predict probability of mastery transition on next attempt.

        Required keys in features:
        - historical_accuracy: float [0.0 - 1.0]
        - prior_attempts_count: int [1 - 10]
        - avg_time_per_question_sec: float
        - prerequisite_mastery_avg: float [0.0 - 1.0]
        - difficulty_level: 'beginner' | 'intermediate' | 'advanced'
        - consecutive_error_streak: int
        """
        model_ready = cls.load_model()

        if model_ready and cls._model is not None:
            try:
                df = pd.DataFrame([features])
                prob = float(cls._model.predict_proba(df)[0, 1])
                version = cls._metadata.get("model_version", "v1.0.0") if cls._metadata else "v1.0.0"
                algorithm = cls._metadata.get("algorithm", "trained_model") if cls._metadata else "trained_model"

                return {
                    "mastery_probability": round(prob, 4),
                    "is_fallback": False,
                    "model_version": version,
                    "algorithm": algorithm,
                    "reasoning": (
                        f"Evaluated via ML model ({algorithm}) using learner's historical accuracy "
                        f"({int(features.get('historical_accuracy', 0.5) * 100)}%) and prerequisite readiness."
                    ),
                }
            except Exception as exc:
                logger.error(f"Error during ML inference: {exc}. Falling back to rule-based engine.")

        # --- Rule-Based Fallback Engine ---
        hist_acc = float(features.get("historical_accuracy", 0.5))
        prereq = float(features.get("prerequisite_mastery_avg", 0.5))
        streak = int(features.get("consecutive_error_streak", 0))
        diff = features.get("difficulty_level", "beginner")

        diff_penalty = {"beginner": 0.0, "intermediate": -0.10, "advanced": -0.20}.get(diff, 0.0)
        streak_penalty = min(0.30, streak * 0.08)

        base_prob = (0.55 * hist_acc) + (0.35 * prereq) - streak_penalty + diff_penalty
        clamped_prob = round(max(0.05, min(0.95, base_prob)), 4)

        return {
            "mastery_probability": clamped_prob,
            "is_fallback": True,
            "model_version": "heuristic_rule_v1",
            "algorithm": "deterministic_rule_engine",
            "reasoning": (
                f"Calculated via transparent domain heuristic: historical accuracy ({int(hist_acc * 100)}%) "
                f"weighted with prerequisite mastery ({int(prereq * 100)}%) minus streak penalty."
            ),
        }
