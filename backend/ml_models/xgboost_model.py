import logging
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Try importing xgboost, fallback to sklearn GradientBoostingClassifier
XGBOOST_AVAILABLE = False
try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    try:
        from sklearn.ensemble import GradientBoostingClassifier
    except ImportError:
        GradientBoostingClassifier = None

def train_xgboost_classifier(df: pd.DataFrame) -> dict:
    """
    Phase 2 Supervised ML Classifier.
    Trains on 3 years of daily OHLCV technical indicators (RSI, MACD, Returns, Volatility)
    to predict 30-day directional probabilities and compute feature importance scores.
    """
    if df is None or df.empty or len(df) < 50:
        return {
            "prediction_prob": 0.5,
            "directional_signal": "NEUTRAL",
            "feature_importance": {},
            "model_used": "FALLBACK"
        }

    try:
        data = df.copy()
        
        # Target: 1 if close price 30 days ahead is higher than current close, else 0
        data["target"] = (data["close"].shift(-30) > data["close"]).astype(int)
        
        # Feature Engineering
        data["rsi"] = data["close"].diff().clip(lower=0).rolling(14).mean() / (data["close"].diff().clip(upper=0).abs().rolling(14).mean() + 1e-9)
        data["rsi"] = 100 - (100 / (1 + data["rsi"]))
        
        ema12 = data["close"].ewm(span=12, adjust=False).mean()
        ema26 = data["close"].ewm(span=26, adjust=False).mean()
        data["macd"] = ema12 - ema26
        
        data["returns"] = data["close"].pct_change()
        data["volatility"] = data["returns"].rolling(20).std()
        data["ma50_ratio"] = data["close"] / (data["close"].rolling(50).mean() + 1e-9)
        data["ma200_ratio"] = data["close"] / (data["close"].rolling(200).mean() + 1e-9)

        features = ["rsi", "macd", "returns", "volatility", "ma50_ratio", "ma200_ratio"]
        
        # Drop NaN rows caused by rolling windows and shift
        clean_df = data.dropna(subset=features + ["target"])
        
        if len(clean_df) < 30:
            return {
                "prediction_prob": 0.5,
                "directional_signal": "NEUTRAL",
                "feature_importance": {},
                "model_used": "INSUFFICIENT_DATA"
            }

        X = clean_df[features]
        y = clean_df["target"]
        
        # Current feature vector for latest prediction
        latest_X = data[features].iloc[[-1]].fillna(0)

        if XGBOOST_AVAILABLE:
            model = xgb.XGBClassifier(
                n_estimators=50,
                max_depth=3,
                learning_rate=0.05,
                eval_metric="logloss",
                random_state=42
            )
            model.fit(X, y)
            prob = float(model.predict_proba(latest_X)[0][1])
            importances = model.feature_importances_
            model_name = "XGBoost Classifier"
        elif GradientBoostingClassifier is not None:
            model = GradientBoostingClassifier(
                n_estimators=50,
                max_depth=3,
                learning_rate=0.05,
                random_state=42
            )
            model.fit(X, y)
            prob = float(model.predict_proba(latest_X)[0][1])
            importances = model.feature_importances_
            model_name = "GradientBoosting (scikit-learn)"
        else:
            return {
                "prediction_prob": 0.5,
                "directional_signal": "NEUTRAL",
                "feature_importance": {},
                "model_used": "NONE"
            }

        feature_imp_dict = {feat: float(round(imp, 4)) for feat, imp in zip(features, importances)}
        
        signal = "FAVORABLE" if prob > 0.55 else ("UNFAVORABLE" if prob < 0.45 else "BALANCED")

        return {
            "prediction_prob": round(prob, 4),
            "directional_signal": signal,
            "feature_importance": feature_imp_dict,
            "model_used": model_name
        }

    except Exception as e:
        logger.error(f"Error training ML classifier: {e}")
        return {
            "prediction_prob": 0.5,
            "directional_signal": "NEUTRAL",
            "feature_importance": {},
            "model_used": f"ERROR: {str(e)}"
        }
