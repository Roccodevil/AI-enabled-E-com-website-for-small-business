import json
import urllib.error
import urllib.request
from typing import Any

from core.config import settings


def _extract_json(text: str) -> dict[str, Any] | None:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return None


def _synthesize_fallback(
    query: str,
    business_strategy: str,
    business_kpis: dict[str, float],
    transport_snapshot: list[dict[str, Any]],
    product_snapshot: list[dict[str, Any]],
    regional_snapshot: list[dict[str, Any]],
    channel_snapshot: list[dict[str, Any]],
) -> tuple[str, list[str]]:
    query_lower = query.lower().strip()

    def has_any(*terms: str) -> bool:
        return any(term in query_lower for term in terms)

    asks_product_profit = has_any("which product", "max profit", "highest profit", "best product", "profitable product")
    asks_forecast = has_any("4 month", "4-month", "four month", "forecast", "expect", "profit after", "next months")
    asks_region = has_any("where to sell", "which region", "which city", "which state", "best region")
    asks_transport = has_any("transport", "delivery", "sla", "courier")
    asks_segment = has_any("consumer", "wholesaler", "segment", "demand")
    asks_inventory = has_any("inventory", "stock", "reorder", "restock", "procurement")

    orders = int(business_kpis.get("orders", 0))
    revenue = float(business_kpis.get("revenue", 0))
    gross_profit = float(business_kpis.get("gross_profit", 0))
    margin_pct = float(business_kpis.get("profit_margin_pct", 0))
    avg_order = float(business_kpis.get("average_order_value", 0))
    units_sold = int(business_kpis.get("units_sold", 0))

    top_transport = transport_snapshot[0] if transport_snapshot else {}
    top_product = product_snapshot[0] if product_snapshot else {}
    top_region = regional_snapshot[0] if regional_snapshot else {}
    top_channel = channel_snapshot[0] if channel_snapshot else {}

    summary_parts: list[str] = []

    forecast_4m_profit = float(business_kpis.get("forecast_4m_profit", 0))
    monthly_profit_run_rate = float(business_kpis.get("monthly_profit_run_rate", 0))
    trend_adjustment_pct = float(business_kpis.get("trend_adjustment_pct", 0))
    observed_days = int(business_kpis.get("observed_days", 0))

    if asks_forecast:
        summary_parts.append(
            f"Expected profit for the next 4 months is ₹{forecast_4m_profit:,.0f}."
        )
        summary_parts.append(
            f"This is based on a monthly profit run-rate of ₹{monthly_profit_run_rate:,.0f} observed over {observed_days} days, with a trend adjustment of {trend_adjustment_pct:.1f}%."
        )
    elif asks_product_profit and top_product:
        summary_parts.append(
            f"The product with the strongest profit potential right now is {top_product.get('product', 'N/A')}, with about ₹{float(top_product.get('gross_profit', 0)):,.0f} gross profit opportunity from current catalog stock."
        )
    elif asks_region:
        if top_region:
            summary_parts.append(
                f"The best region to prioritize now is {top_region.get('segment', 'Unknown Region')} based on current demand signals ({int(top_region.get('units', 0))} units)."
            )
        else:
            summary_parts.append("Regional demand ranking needs more live orders; for now use catalog-led campaigns in your strongest historical markets.")
    elif asks_transport:
        if top_transport:
            summary_parts.append(
                f"Top transport performance currently comes from {top_transport.get('transport_service', 'unassigned')} with ₹{float(top_transport.get('gross_profit', 0)):,.0f} gross profit impact."
            )
        else:
            summary_parts.append("Transport optimization insights will get sharper after more live dispatched and delivered orders.")
    elif asks_segment:
        if top_channel:
            summary_parts.append(
                f"Current demand mix is strongest in {top_channel.get('segment', 'unknown')} buyers; tailor pricing and packs for this segment while building the secondary segment."
            )
        else:
            summary_parts.append("Segment demand is not mature yet; build separate consumer and wholesale offers to collect early response signals.")
    elif asks_inventory:
        summary_parts.append(
            f"Inventory planning baseline: invest around ₹{business_kpis.get('inventory_investment', 0):,.0f} with catalog margin potential near {business_kpis.get('inventory_margin_pct', 0):.1f}%."
        )
    else:
        summary_parts.append(
            f"{orders} orders generated ₹{revenue:,.0f} revenue and ₹{gross_profit:,.0f} gross profit at {margin_pct:.1f}% margin."
        )

    summary_parts.extend([
        f"Average order value is ₹{avg_order:,.0f} across {units_sold} units sold.",
    ])
    if top_transport:
        summary_parts.append(
            f"Best transport performer is {top_transport.get('transport_service', 'unassigned')} with ₹{float(top_transport.get('gross_profit', 0)):,.0f} gross profit."
        )
    if top_product:
        summary_parts.append(
            f"Highest opportunity product is {top_product.get('product', 'N/A')} with ₹{float(top_product.get('gross_profit', 0)):,.0f} gross profit."
        )
    if top_region:
        summary_parts.append(
            f"Top demand region is {top_region.get('segment', 'Unknown Region')} with {int(top_region.get('units', 0))} units."
        )
    if top_channel:
        summary_parts.append(
            f"Demand currently leans toward {top_channel.get('segment', 'unknown')} buyers."
        )
    summary_parts.append(f"Strategy note: {business_strategy}")
    summary_parts.append(f"Query focus: {query}")

    recommendations = [
        (
            f"Prioritize dispatch capacity and faster follow-up for {top_transport.get('transport_service', 'the leading transport partner')} to protect profit and reduce delays."
            if top_transport
            else "Assign transport service at order creation to protect profit and reduce delivery delays."
        ),
        (
            f"Push {top_product.get('product', 'the best product')} in campaigns and keep more inventory for it."
            if top_product
            else "Push your fastest-moving products more aggressively and keep more inventory for them."
        ),
        (
            f"Sell more aggressively in {top_region.get('segment', 'the top region')} using local offers and category targeting."
            if top_region
            else "Target the strongest buying region with localized offers and category targeting."
        ),
        (
            f"Tune pricing and pack sizes for {top_channel.get('segment', 'the leading segment')} buyers to grow conversion."
            if top_channel
            else "Tune pricing and order sizes for your strongest buyer segment to grow conversion."
        ),
        "Review slow-moving products weekly and shift budget toward the highest-margin, fastest-moving styles.",
    ]

    if asks_product_profit and top_product:
        recommendations.insert(0, f"If your immediate goal is max profit, push {top_product.get('product', 'the top product')} in paid campaigns and retail partner outreach first.")
    if asks_forecast:
        recommendations.insert(0, "Track weekly gross profit versus this forecast and rebalance budget toward top-margin products if actuals drop below plan.")
    if asks_region and top_region:
        recommendations.insert(0, f"Start with focused campaigns in {top_region.get('segment', 'the top region')} and monitor conversion before expanding nationwide.")
    if asks_inventory:
        recommendations.insert(0, "Set weekly reorder thresholds by margin contribution, not just units sold, to improve cash rotation.")

    # keep concise top 5, prefer query-specific actions first
    deduped: list[str] = []
    for recommendation in recommendations:
        if recommendation not in deduped:
            deduped.append(recommendation)
    recommendations = deduped[:5]

    return " ".join(summary_parts), recommendations


def generate_analyst_output(
    query: str,
    business_strategy: str,
    rag_context: list[str],
    business_kpis: dict[str, float],
    transport_snapshot: list[dict[str, Any]],
    product_snapshot: list[dict[str, Any]],
    regional_snapshot: list[dict[str, Any]],
    channel_snapshot: list[dict[str, Any]],
) -> tuple[str | None, list[str] | None]:
    fallback_summary, fallback_recommendations = _synthesize_fallback(
        query=query,
        business_strategy=business_strategy,
        business_kpis=business_kpis,
        transport_snapshot=transport_snapshot,
        product_snapshot=product_snapshot,
        regional_snapshot=regional_snapshot,
        channel_snapshot=channel_snapshot,
    )

    if not settings.groq_api_key:
        return fallback_summary, fallback_recommendations

    try:
        context_blob = {
            "query": query,
            "business_strategy": business_strategy,
            "business_kpis": business_kpis,
            "transport_snapshot": transport_snapshot,
            "product_snapshot": product_snapshot,
            "regional_snapshot": regional_snapshot,
            "channel_snapshot": channel_snapshot,
            "rag_context": rag_context,
        }

        system_prompt = (
            "You are the business analyst for a saree marketplace. "
            "Understand the store strategy from the provided context and give practical advice. "
            "The business sells premium sarees to both consumers and wholesalers, uses live product and order data, "
            "tracks transport performance, and wants higher profit, better stock rotation, and stronger regional demand. "
            "Use only provided data. Return JSON with keys: summary (string) and recommendations (array of 5 concise actionable strings)."
        )

        request_body = json.dumps(
            {
                "model": settings.groq_model,
                "temperature": 0.2,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": (
                            "Generate an executive summary and recommendations for admin to improve profit, "
                            "transport performance, inventory planning, consumer demand and wholesaler demand. "
                            f"Data:\n{json.dumps(context_blob, ensure_ascii=False)}"
                        ),
                    },
                ],
            }
        ).encode("utf-8")

        request = urllib.request.Request(
            url="https://api.groq.com/openai/v1/chat/completions",
            data=request_body,
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        with urllib.request.urlopen(request, timeout=60) as response:
            payload = json.loads(response.read().decode("utf-8"))

        choices = payload.get("choices", [])
        content = ""
        if choices:
            message = choices[0].get("message", {}) if isinstance(choices[0], dict) else {}
            content = message.get("content", "") if isinstance(message, dict) else ""
        if not content:
            return fallback_summary, fallback_recommendations

        parsed = _extract_json(content)
        if not parsed:
            cleaned = content.strip()
            lines = [line.strip("-• \t") for line in cleaned.splitlines() if line.strip()]
            summary = lines[0] if lines else cleaned[:500]
            recommendations = [line for line in lines[1:6] if len(line) > 3]
            return summary or fallback_summary, recommendations or fallback_recommendations

        summary = parsed.get("summary")
        recommendations = parsed.get("recommendations")

        if not isinstance(summary, str):
            summary = None
        if not isinstance(recommendations, list) or not all(isinstance(item, str) for item in recommendations):
            recommendations = None

        if summary is None:
            summary = content.strip()[:500] or fallback_summary

        if recommendations is None:
            lines = [line.strip("-• \t") for line in content.splitlines() if line.strip()]
            recommendations = [line for line in lines[1:6] if len(line) > 3] or fallback_recommendations

        return summary, recommendations
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, TimeoutError, Exception):
        return fallback_summary, fallback_recommendations
