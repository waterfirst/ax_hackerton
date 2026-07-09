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


def test_open_post_crash_gap_reclaim_lifts_gap_more_aggressively():
    out = forecast_open_model({
        "prev_close": 7246.79,
        "prev_prev_close": 7656.31,
        "ewy_pct": 0.76,
        "sox_pct": 2.23,
        "mu_pct": 2.83,
        "nvda_pct": 0.27,
        "meta_pct": 1.3,
        "usdkrw": 1512.85,
        "negative_news_count": 1,
        "fresh_negative_news": False,
    })
    assert out["regime"] == "post_crash_gap_reclaim"
    assert out["forecast_open"] >= 7400


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
    assert out["schedule_kst"][-1]["time"] == "16:30"
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


def test_open_follow_through_gap_support():
    out = forecast_open_model({
        "prev_close": 8088.34,
        "prev_prev_close": 7648.09,
        "ewy_pct": -2.0,
        "sox_pct": -3.0,
        "mu_pct": -2.5,
        "nvda_pct": -1.2,
        "meta_pct": 0.4,
        "usdkrw": 1362,
        "negative_news_count": 0,
        "fresh_negative_news": False,
    })
    assert out["regime"] == "follow_through_gap_support"
    assert out["forecast_open"] > 8088


def test_open_sell_the_news_risk_haircuts_global_relief():
    out = forecast_open_model({
        "prev_close": 8051.33,
        "prev_prev_close": 8088.34,
        "ewy_pct": 5.39,
        "sox_pct": 2.17,
        "mu_pct": 0.66,
        "nvda_pct": 0.33,
        "meta_pct": 2.99,
        "usdkrw": 1528.93,
        "negative_news_count": 0,
        "fresh_negative_news": False,
    })
    assert out["regime"] == "sell_the_news_risk"
    assert out["forecast_open"] <= 8000
    assert "local sell-the-news risk" in out["reason"]


def test_close_gap_failed_but_supported_lifts_close():
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
    assert out["flags"]["gap_failed_but_supported"] is True
    assert out["forecast_close"] >= 8000


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


def test_close_capitulation_bounce_floor_avoids_midday_overshoot():
    out = forecast_close_model({
        "current": 7474.73,
        "open": 7919.2,
        "high": 7954.55,
        "low": 7466.11,
        "prev_close": 8051.33,
        "foreign": -2517500,
        "institution": -184200,
        "program": -2258000,
        "rise_count": 236,
        "fall_count": 655,
        "trading_value_acceleration": False,
    })
    assert out["flags"]["capitulation_bounce_floor"] is True
    assert out["forecast_close"] >= 7550


def test_close_weak_rebound_trap_haircuts_noon_bounce():
    out = forecast_close_model({
        "current": 7589.87,
        "open": 7452.48,
        "high": 7791.66,
        "low": 7352.89,
        "prev_close": 7656.31,
        "foreign": -572300,
        "institution": 1246600,
        "program": 30200,
        "rise_count": 206,
        "fall_count": 667,
        "trading_value_acceleration": True,
    })
    assert out["flags"]["weak_rebound_trap"] is True
    assert out["regime"] == "rebound_failure_risk"
    assert out["forecast_close"] <= 7500


def test_close_flow_supported_rebound_handles_narrow_breadth_when_index_is_held():
    out = forecast_close_model({
        "current": 7254.32,
        "open": 7486.64,
        "high": 7543.86,
        "low": 7063.76,
        "prev_close": 7246.79,
        "foreign": 1567,
        "institution": 13617,
        "program": 6348,
        "rise_count": 196,
        "fall_count": 692,
        "trading_value_acceleration": True,
    })
    assert out["flags"]["broad_weak_but_flow_supported"] is True
    assert out["regime"] == "flow_supported_rebound"
    assert out["forecast_close"] >= 7280
    assert "index held by concentrated flow" in out["reason"]
