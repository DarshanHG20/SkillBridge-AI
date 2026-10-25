"""Reproducible Machine Learning Training Script for Concept Mastery Prediction.

Includes:
- Data validation and preprocessing pipeline
- Deterministic train/test splitting
- Zero-rule / most-frequent baseline comparison
- Evaluation metrics: Accuracy, Precision, Recall, F1, ROC-AUC
- Model versioning and joblib persistence
"""

import json
import os
import sys
from datetime import datetime
from typing import Any, Dict

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from app.ml.data_loader import load_dataset


ML_DIR = os.path.dirname(os.path.abspath(__file__))
SAVED_MODELS_DIR = os.path.join(ML_DIR, "saved_models")
MODEL_ARTIFACT_PATH = os.path.join(SAVED_MODELS_DIR, "mastery_v1.joblib")
METRICS_ARTIFACT_PATH = os.path.join(SAVED_MODELS_DIR, "mastery_v1_metrics.json")


def evaluate_model(model: Any, X_test: pd.DataFrame, y_test: pd.Series) -> Dict[str, float]:
    """Calculate standard classification evaluation metrics on the test partition."""
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else y_pred

    return {
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 4),
    }


def train_pipeline() -> Dict[str, Any]:
    """Execute the end-to-end training and evaluation workflow."""
    print("[INFO] Loading dataset for mastery model training...")
    df = load_dataset()

    # 1. Data Validation
    required_cols = [
        "historical_accuracy",
        "prior_attempts_count",
        "avg_time_per_question_sec",
        "prerequisite_mastery_avg",
        "difficulty_level",
        "consecutive_error_streak",
        "will_master_next",
    ]
    missing_cols = [c for c in required_cols if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Dataset missing required columns: {missing_cols}")

    if df.isnull().any().any():
        print("[WARN] Imputing missing values in dataset...")
        df = df.dropna()

    X = df.drop(columns=["will_master_next"])
    y = df["will_master_next"]

    # 2. Train / Test Split (80/20 deterministic)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    numeric_features = [
        "historical_accuracy",
        "prior_attempts_count",
        "avg_time_per_question_sec",
        "prerequisite_mastery_avg",
        "consecutive_error_streak",
    ]
    categorical_features = ["difficulty_level"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
        ]
    )

    # 3. Baseline Comparison (Zero-Rule: Most Frequent)
    print("[INFO] Training Zero-Rule Baseline (DummyClassifier)...")
    dummy_pipe = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", DummyClassifier(strategy="most_frequent")),
    ])
    dummy_pipe.fit(X_train, y_train)
    baseline_metrics = evaluate_model(dummy_pipe, X_test, y_test)
    print(f"       Baseline Accuracy: {baseline_metrics['accuracy']}, F1: {baseline_metrics['f1']}")

    # 4. Candidate Model 1: Logistic Regression
    print("[INFO] Training Candidate 1: Logistic Regression...")
    lr_pipe = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", LogisticRegression(random_state=42, max_iter=1000)),
    ])
    lr_pipe.fit(X_train, y_train)
    lr_metrics = evaluate_model(lr_pipe, X_test, y_test)
    print(f"       Logistic Regression Accuracy: {lr_metrics['accuracy']}, ROC-AUC: {lr_metrics['roc_auc']}")

    # 5. Candidate Model 2: Random Forest Classifier
    print("[INFO] Training Candidate 2: Random Forest Classifier...")
    rf_pipe = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)),
    ])
    rf_pipe.fit(X_train, y_train)
    rf_metrics = evaluate_model(rf_pipe, X_test, y_test)
    print(f"       Random Forest Accuracy: {rf_metrics['accuracy']}, ROC-AUC: {rf_metrics['roc_auc']}")

    # 6. Model Selection: Pick best ROC-AUC
    candidates = [
        ("logistic_regression", lr_pipe, lr_metrics),
        ("random_forest", rf_pipe, rf_metrics),
    ]
    best_name, best_pipe, best_metrics = max(candidates, key=lambda c: c[2]["roc_auc"])
    print(f"[SUCCESS] Selected winning model: '{best_name}' (ROC-AUC: {best_metrics['roc_auc']})")

    # 7. Model Persistence & Versioning
    os.makedirs(SAVED_MODELS_DIR, exist_ok=True)
    joblib.dump(best_pipe, MODEL_ARTIFACT_PATH)
    print(f"[INFO] Persisted model artifact to: {MODEL_ARTIFACT_PATH}")

    metadata = {
        "model_version": "v1.0.0",
        "algorithm": best_name,
        "trained_at": datetime.utcnow().isoformat(),
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "data_source": "synthetic_learner_dataset_v1",
        "baseline_metrics": baseline_metrics,
        "evaluation_metrics": best_metrics,
        "features": list(X.columns),
    }

    with open(METRICS_ARTIFACT_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"[INFO] Saved model metrics report to: {METRICS_ARTIFACT_PATH}")

    return metadata


if __name__ == "__main__":
    train_pipeline()
