from kakaopay_kospi_regime_mcp.core import daily_workflow_model, forecast_close_model, forecast_open_model, score_model


def test_open_relief():
    out = forecast_open_model({
        "prev_close": 7648.09,
        "prev_prev_close": 8303.41,
        "ewy_pct": -2.8,
        "sox_pct": -5.45,
        "negative_news_count": 1,
        "fresh_negative_news": False,
    })
    assert out["regime"] == "post_crash_relief_possible"


def test_close_absorption():
    out = forecast_close_model({
        "current": 7953.86,
        "open": 7933.10,
        "high": 8136.28,
        "low": 7723.57,
        "prev_close": 7648.09,
        "foreign": -22123,
        "institution": 44451,
        "program": -12000,
        "rise_count": 589,
        "fall_count": 297,
        "trading_value_acceleration": True,
    })
    assert out["regime"] == "institution_absorption"


def test_score():
    out = score_model(8525, 8591.5)
    assert out["tier_score"] == 3


def test_daily_workflow():
    out = daily_workflow_model()
    assert out["schedule_kst"][0]["time"] == "07:30"
    assert out["schedule_kst"][-1]["step"] == "score_and_postmortem"


def test_close_fallback_never_missing():
    out = forecast_close_model({
        "current": 8088.34,
        "prev_close": 8088.34,
        "fallback_mode": True,
    })
    assert isinstance(out["forecast_close"], int)
    assert out["regime"] == "fallback_close_estimate"
    assert out["flags"]["fallback_mode"] is True


def test_close_panic_relief_offsets_overshoot():
    out = forecast_close_model({
        "current": 7969.6,
        "open": 8186.82,
        "high": 8327.26,
        "low": 7815.53,
        "prev_close": 8088.34,
        "foreign": -1136900,
        "institution": -924700,
        "program": -1309900,
        "rise_count": 365,
        "fall_count": 520,
        "trading_value_acceleration": True,
    })
    assert out["flags"]["avalanche_sell"] is True
    assert out["flags"]["panic_relief"] is True
    assert out["forecast_close"] >= 7900
