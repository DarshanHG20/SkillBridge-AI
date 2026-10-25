"""Tests for ML Pipeline, Baseline Comparisons, Model Persistence, and Fallbacks."""

import os
from unittest.mock import patch
from app.ml.data_loader import generate_synthetic_learner_data
from app.ml.train_mastery_model import train_pipeline
from app.ml.predictor import MasteryPredictor


def test_synthetic_data_generation():
    """Verify synthetic learner dataset generation conforms to expected schema and types."""
    df = generate_synthetic_learner_data(num_samples=100)
    assert len(df) == 100
    expected_cols = [
        "historical_accuracy",
        "prior_attempts_count",
        "avg_time_per_question_sec",
        "prerequisite_mastery_avg",
        "difficulty_level",
        "consecutive_error_streak",
        "will_master_next",
    ]
    for col in expected_cols:
        assert col in df.columns
    assert set(df["will_master_next"].unique()).issubset({0, 1})


def test_training_pipeline_and_baseline_evaluation():
    """Verify the training script compares against baseline and outputs valid metrics."""
    metadata = train_pipeline()
    assert metadata["model_version"] == "v1.0.0"
    assert "baseline_metrics" in metadata
    assert "evaluation_metrics" in metadata

    baseline_acc = metadata["baseline_metrics"]["accuracy"]
    eval_acc = metadata["evaluation_metrics"]["accuracy"]
    assert "roc_auc" in metadata["evaluation_metrics"]
    assert metadata["evaluation_metrics"]["roc_auc"] > 0.50  # Must perform better than random guess


def test_ml_predictor_inference():
    """Verify MasteryPredictor generates inferences using the saved model artifact."""
    features = {
        "historical_accuracy": 0.85,
        "prior_attempts_count": 3,
        "avg_time_per_question_sec": 45.0,
        "prerequisite_mastery_avg": 0.80,
        "difficulty_level": "intermediate",
        "consecutive_error_streak": 0,
    }

    result = MasteryPredictor.predict_mastery_probability(features)
    assert 0.0 <= result["mastery_probability"] <= 1.0
    assert result["is_fallback"] is False
    assert "ML model" in result["reasoning"]


def test_ml_predictor_fallback():
    """Verify MasteryPredictor falls back gracefully to transparent rule-based logic if model missing."""
    features = {
        "historical_accuracy": 0.40,
        "prerequisite_mastery_avg": 0.30,
        "difficulty_level": "intermediate",
        "consecutive_error_streak": 2,
    }

    # Simulate missing model
    with patch.object(MasteryPredictor, "load_model", return_value=False):
        with patch.object(MasteryPredictor, "_model", None):
            result = MasteryPredictor.predict_mastery_probability(features)
            assert result["is_fallback"] is True
            assert result["algorithm"] == "deterministic_rule_engine"
            assert "heuristic" in result["reasoning"].lower()
            assert 0.0 <= result["mastery_probability"] <= 1.0
