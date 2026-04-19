from collections import defaultdict
from dataclasses import dataclass
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sklearn.feature_extraction.text import HashingVectorizer
from sqlalchemy.orm import Session

from core.security import get_current_user
from db.models import AnalystMemory, Order, Product, User
from db.session import get_db
from llm.groq_analyst import generate_analyst_output
from vector_store.pinecone_client import get_pinecone_index

router = APIRouter(prefix="/analyst", tags=["analyst"])

EMBED_DIMENSION = 384
_vectorizer = HashingVectorizer(n_features=EMBED_DIMENSION, alternate_sign=False, norm="l2")


class AnalystRequest(BaseModel):
    query: str = "How can we improve profit, demand capture, and transport performance this week?"


class TransportInsight(BaseModel):
    transport_service: str
    order_count: int
    revenue: float
    gross_profit: float
    delivered_count: int
    pending_count: int


class ProductOpportunity(BaseModel):
    product: str
    units_sold: int
    revenue: float
    gross_profit: float


class DemandInsight(BaseModel):
    segment: str
    units: int
    revenue: float


class AnalystResponse(BaseModel):
    summary: str
    business_kpis: dict[str, float]
    transport_performance: list[TransportInsight]
    product_opportunities: list[ProductOpportunity]
    regional_demand: list[DemandInsight]
    channel_demand: list[DemandInsight]
    recommendations: list[str]
    rag_context: list[str]
    memory_backend: str


@dataclass
class TextDoc:
    id: str
    text: str


def _embed_texts(texts: list[str]) -> list[list[float]]:
    matrix = _vectorizer.transform(texts).toarray()
    return [[float(v) for v in row] for row in matrix]


def _local_retrieve(query: str, docs: list[TextDoc], top_k: int = 8) -> list[str]:
    if not docs:
        return []

    doc_embeddings = _embed_texts([doc.text for doc in docs])
    query_embedding = _embed_texts([query])[0]

    scored: list[tuple[float, str]] = []
    for idx, embedding in enumerate(doc_embeddings):
        score = sum(a * b for a, b in zip(query_embedding, embedding, strict=False))
        scored.append((score, docs[idx].text))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [text for _score, text in scored[:top_k]]


def _pinecone_retrieve(query: str, docs: list[TextDoc], namespace: str) -> tuple[list[str], str]:
    index = get_pinecone_index(dimension=EMBED_DIMENSION)
    if index is None:
        return _local_retrieve(query, docs), "local-fallback"

    try:
        embeddings = _embed_texts([doc.text for doc in docs])
        vectors = [
            {
                "id": doc.id,
                "values": embeddings[idx],
                "metadata": {"text": doc.text[:1400]},
            }
            for idx, doc in enumerate(docs)
        ]
        if vectors:
            index.upsert(vectors=vectors, namespace=namespace)

        query_vector = _embed_texts([query])[0]
        result = index.query(vector=query_vector, top_k=8, include_metadata=True, namespace=namespace)
        matches = getattr(result, "matches", []) or []
        context = [match.metadata.get("text", "") for match in matches if getattr(match, "metadata", None)]
        context = [text for text in context if text]
        if context:
            return context, "pinecone"
    except Exception:
        return _local_retrieve(query, docs), "local-fallback"

    return _local_retrieve(query, docs), "local-fallback"


def _memory_doc(memory: AnalystMemory) -> TextDoc:
    return TextDoc(
        id=f"memory-{memory.id}",
        text=(
            f"[LIVE DB MEMORY] Past analyst insight: {memory.summary} "
            f"Recommendations: {memory.recommendations_json}. "
            f"KPIs: {memory.business_kpis_json}."
        ),
    )


def _friendly_context(text: str) -> str:
    replacements = {
        "[SEED DB PRODUCT]": "Catalog",
        "[LIVE DB ORDER KPIS]": "Live business data",
        "[LIVE DB ORDER]": "Live business data",
        "[LIVE DB MEMORY]": "Past analyst insight",
    }
    cleaned = text
    for old, new in replacements.items():
        cleaned = cleaned.replace(old, new)
    return cleaned


def _recent_memory_docs(db: Session, limit: int = 12) -> list[TextDoc]:
    memories = db.query(AnalystMemory).order_by(AnalystMemory.created_at.desc()).limit(limit).all()
    return [_memory_doc(memory) for memory in memories]


def _seed_product_docs(db: Session, limit: int = 40) -> list[TextDoc]:
    products = db.query(Product).order_by(Product.id.desc()).limit(limit).all()
    docs: list[TextDoc] = []
    for product in products:
        docs.append(
            TextDoc(
                id=f"seed-product-{product.id}",
                text=(
                    f"[SEED DB PRODUCT] {product.title} | SKU {product.sku} | fabric {product.fabric or 'n/a'} | "
                    f"origin {product.origin or 'n/a'} | base price {float(product.base_price):.2f} | "
                    f"cost price {float(product.cost_price):.2f} | inventory {product.inventory_quantity} | "
                    f"procurement {product.procurement_days or 'n/a'} | short description {product.short_description or ''}"
                ),
            )
        )
    return docs


def _persist_memory(
    db: Session,
    *,
    query: str,
    summary: str,
    recommendations: list[str],
    business_kpis: dict[str, float],
    source_orders_count: int,
) -> None:
    memory_text = (
        f"Query: {query}\nSummary: {summary}\nRecommendations: {json.dumps(recommendations, ensure_ascii=False)}\n"
        f"KPIs: {json.dumps(business_kpis, ensure_ascii=False)}"
    )
    memory = AnalystMemory(
        query=query,
        summary=summary,
        recommendations_json=json.dumps(recommendations, ensure_ascii=False),
        business_kpis_json=json.dumps(business_kpis, ensure_ascii=False),
        memory_text=memory_text,
        source_orders_count=source_orders_count,
    )
    db.add(memory)
    db.commit()

    index = get_pinecone_index(dimension=EMBED_DIMENSION)
    if index is None:
        return

    try:
        vector = _embed_texts([memory_text])[0]
        index.upsert(
            vectors=[
                {
                    "id": f"memory-{memory.id}",
                    "values": vector,
                    "metadata": {
                        "text": memory_text[:1400],
                        "source": "db-memory",
                    },
                }
            ],
            namespace="admin-analytics",
        )
    except Exception:
        return


def _as_inr(value: float) -> str:
    return f"₹{value:,.0f}"


def _is_forecast_query(query: str) -> bool:
    lower = query.lower()
    markers = ["4 month", "4-month", "four month", "forecast", "expect", "profit after", "next months"]
    return any(marker in lower for marker in markers)


def _compute_profit_forecast(orders: list[Order]) -> dict[str, float]:
    if not orders:
        return {
            "observed_days": 0.0,
            "monthly_profit_run_rate": 0.0,
            "trend_adjustment_pct": 0.0,
            "forecast_4m_profit": 0.0,
        }

    sorted_orders = sorted(orders, key=lambda order: order.created_at)
    first_at = sorted_orders[0].created_at
    last_at = sorted_orders[-1].created_at
    raw_observed_days = max((last_at - first_at).days + 1, 1)
    observed_days = max(raw_observed_days, 60)

    def order_profit(order: Order) -> float:
        return float(order.total_amount) - sum(float(item.cost_price or 0) * int(item.quantity) for item in order.items)

    total_profit = sum(order_profit(order) for order in sorted_orders)
    monthly_profit_run_rate = total_profit / (observed_days / 30)

    midpoint = len(sorted_orders) // 2
    early_orders = sorted_orders[:midpoint] or sorted_orders
    recent_orders = sorted_orders[midpoint:] or sorted_orders

    early_days = max((early_orders[-1].created_at - early_orders[0].created_at).days + 1, 1)
    recent_days = max((recent_orders[-1].created_at - recent_orders[0].created_at).days + 1, 1)
    early_profit_per_day = sum(order_profit(order) for order in early_orders) / early_days
    recent_profit_per_day = sum(order_profit(order) for order in recent_orders) / recent_days

    if early_profit_per_day > 0:
        trend_adjustment_pct = (recent_profit_per_day - early_profit_per_day) / early_profit_per_day
    else:
        trend_adjustment_pct = 0.0

    trend_adjustment_pct = max(-0.2, min(0.25, trend_adjustment_pct))
    forecast_4m_profit = monthly_profit_run_rate * 4 * (1 + trend_adjustment_pct)

    return {
        "observed_days": float(observed_days),
        "monthly_profit_run_rate": float(monthly_profit_run_rate),
        "trend_adjustment_pct": float(trend_adjustment_pct * 100),
        "forecast_4m_profit": float(max(forecast_4m_profit, 0)),
    }


def _compute_response(query: str, orders: list[Order], seed_docs: list[TextDoc], memory_docs: list[TextDoc]) -> AnalystResponse:
    total_revenue = sum(float(order.total_amount) for order in orders)
    total_cost = 0.0
    total_units = 0

    product_stats: dict[int, dict[str, float | str]] = defaultdict(
        lambda: {"title": "Unknown", "units": 0.0, "revenue": 0.0, "cost": 0.0}
    )
    transport_stats: dict[str, dict[str, float]] = defaultdict(
        lambda: {"orders": 0.0, "revenue": 0.0, "cost": 0.0, "delivered": 0.0, "pending": 0.0}
    )
    regional_stats: dict[str, dict[str, float]] = defaultdict(lambda: {"units": 0.0, "revenue": 0.0})
    channel_stats: dict[str, dict[str, float]] = defaultdict(lambda: {"units": 0.0, "revenue": 0.0})

    for order in orders:
        order_transport = (order.transport_service or "unassigned").strip() or "unassigned"
        transport_stats[order_transport]["orders"] += 1
        transport_stats[order_transport]["revenue"] += float(order.total_amount)
        if order.status == "delivered":
            transport_stats[order_transport]["delivered"] += 1
        else:
            transport_stats[order_transport]["pending"] += 1

        region_key = ", ".join(
            [part for part in [order.delivery_city or "", order.delivery_state or ""] if part]
        ) or "Unknown Region"

        role = (order.user.role or "consumer").lower()
        channel_key = "consumer" if role in {"consumer", "user"} else "wholesaler"

        for item in order.items:
            line_units = int(item.quantity)
            line_revenue = float(item.unit_price) * line_units
            line_cost = float(item.cost_price or 0) * line_units
            total_units += line_units
            total_cost += line_cost

            product_stats[item.product_id]["title"] = item.product.title
            product_stats[item.product_id]["units"] += line_units
            product_stats[item.product_id]["revenue"] += line_revenue
            product_stats[item.product_id]["cost"] += line_cost

            transport_stats[order_transport]["cost"] += line_cost
            regional_stats[region_key]["units"] += line_units
            regional_stats[region_key]["revenue"] += line_revenue
            channel_stats[channel_key]["units"] += line_units
            channel_stats[channel_key]["revenue"] += line_revenue

    gross_profit = total_revenue - total_cost
    margin_pct = (gross_profit / total_revenue * 100) if total_revenue else 0.0
    average_order_value = (total_revenue / len(orders)) if orders else 0.0
    forecast_metrics = _compute_profit_forecast(orders)

    transport_performance = sorted(
        [
            TransportInsight(
                transport_service=name,
                order_count=int(values["orders"]),
                revenue=float(values["revenue"]),
                gross_profit=float(values["revenue"] - values["cost"]),
                delivered_count=int(values["delivered"]),
                pending_count=int(values["pending"]),
            )
            for name, values in transport_stats.items()
        ],
        key=lambda item: item.gross_profit,
        reverse=True,
    )

    product_opportunities = sorted(
        [
            ProductOpportunity(
                product=str(values["title"]),
                units_sold=int(values["units"]),
                revenue=float(values["revenue"]),
                gross_profit=float(values["revenue"] - values["cost"]),
            )
            for values in product_stats.values()
        ],
        key=lambda item: item.gross_profit,
        reverse=True,
    )

    regional_demand = sorted(
        [
            DemandInsight(segment=segment, units=int(values["units"]), revenue=float(values["revenue"]))
            for segment, values in regional_stats.items()
        ],
        key=lambda item: item.units,
        reverse=True,
    )[:8]

    channel_demand = sorted(
        [
            DemandInsight(segment=segment, units=int(values["units"]), revenue=float(values["revenue"]))
            for segment, values in channel_stats.items()
        ],
        key=lambda item: item.units,
        reverse=True,
    )

    top_transport = transport_performance[0].transport_service if transport_performance else "unassigned"
    low_transport = transport_performance[-1].transport_service if transport_performance else "unassigned"
    top_products = ", ".join(item.product for item in product_opportunities[:3]) or "N/A"
    top_region = regional_demand[0].segment if regional_demand else "Unknown Region"

    docs: list[TextDoc] = []
    docs.extend(seed_docs)
    docs.append(
        TextDoc(
            id="kpi-summary",
            text=(
                f"[LIVE DB ORDER KPIS] Business summary: orders={len(orders)}, revenue={_as_inr(total_revenue)}, "
                f"gross_profit={_as_inr(gross_profit)}, margin={margin_pct:.1f}%, AOV={_as_inr(average_order_value)}."
            ),
        )
    )

    for item in transport_performance:
        docs.append(
            TextDoc(
                id=f"transport-{item.transport_service}",
                text=(
                    f"[LIVE DB ORDER] Transport {item.transport_service}: orders={item.order_count}, revenue={_as_inr(item.revenue)}, "
                    f"gross_profit={_as_inr(item.gross_profit)}, delivered={item.delivered_count}, pending={item.pending_count}."
                ),
            )
        )

    for item in product_opportunities[:12]:
        docs.append(
            TextDoc(
                id=f"product-{item.product}",
                text=(
                    f"[LIVE DB ORDER] Product demand for {item.product}: units={item.units_sold}, revenue={_as_inr(item.revenue)}, "
                    f"gross_profit={_as_inr(item.gross_profit)}."
                ),
            )
        )

    for item in regional_demand:
        docs.append(
            TextDoc(
                id=f"region-{item.segment}",
                text=(f"[LIVE DB ORDER] Regional demand in {item.segment}: units={item.units}, revenue={_as_inr(item.revenue)}."),
            )
        )

    for item in channel_demand:
        docs.append(
            TextDoc(
                id=f"channel-{item.segment}",
                text=(f"[LIVE DB ORDER] Channel demand {item.segment}: units={item.units}, revenue={_as_inr(item.revenue)}."),
            )
        )

    docs.extend(memory_docs)

    rag_context, memory_backend = _pinecone_retrieve(query=query, docs=docs, namespace="admin-analytics")
    if memory_docs:
        memory_backend = f"{memory_backend}+db-memory"
    rag_context = [_friendly_context(text) for text in rag_context]

    low_margin_products = [item for item in product_opportunities if item.revenue > 0 and item.gross_profit / item.revenue < 0.2]
    recommendations = [
        (
            f"Scale dispatch allocation to {top_transport} and review SLA for {low_transport} to reduce pending deliveries."
            if transport_performance
            else "Assign transport service at order creation to avoid revenue leakage from unassigned deliveries."
        ),
        (
            f"Prioritize stocking and promotion for {top_products}; these drive the strongest profit contribution."
            if product_opportunities
            else "Capture at least 2 weeks of order history before making product-priority decisions."
        ),
        (
            f"Run targeted campaigns in {top_region} where unit demand is currently the highest."
            if regional_demand
            else "Capture delivery city/state consistently to unlock regional sell-through insights."
        ),
        (
            "Increase wholesaler-focused bundles and MOQ offers if wholesaler demand is lagging consumer demand."
            if len(channel_demand) >= 2 and channel_demand[0].segment == "consumer"
            else "Protect consumer funnel while adding repeat-buy incentives for high-value wholesale accounts."
        ),
        (
            f"Review pricing or sourcing for low-margin products: {', '.join(item.product for item in low_margin_products[:3])}."
            if low_margin_products
            else "Current product margin mix is healthy; focus on volume expansion in top-margin products."
        ),
    ]

    summary = (
        f"{len(orders)} orders generated {_as_inr(total_revenue)} revenue and {_as_inr(gross_profit)} gross profit "
        f"at {margin_pct:.1f}% margin. Top transport is {top_transport}; strongest demand region is {top_region}."
    )

    if _is_forecast_query(query):
        summary = (
            f"Expected profit for the next 4 months is {_as_inr(forecast_metrics['forecast_4m_profit'])}. "
            f"Why: current monthly profit run-rate is {_as_inr(forecast_metrics['monthly_profit_run_rate'])} "
            f"from the last {int(forecast_metrics['observed_days'])} days, with a trend adjustment of "
            f"{forecast_metrics['trend_adjustment_pct']:.1f}% based on recent vs earlier order performance."
        )

    llm_summary, llm_recommendations = generate_analyst_output(
        query=query,
        business_strategy=(
            "Operate as a premium saree marketplace. Prioritize profitability, stock rotation, "
            "regional demand creation, consumer conversions, wholesale deal sizes, and transport SLAs. "
            "Use catalog cost prices for investment analysis and live orders for demand signals."
        ),
        rag_context=rag_context[:8],
        business_kpis={
            "orders": float(len(orders)),
            "revenue": float(total_revenue),
            "gross_profit": float(gross_profit),
            "profit_margin_pct": float(margin_pct),
            "average_order_value": float(average_order_value),
            "units_sold": float(total_units),
            "observed_days": forecast_metrics["observed_days"],
            "monthly_profit_run_rate": forecast_metrics["monthly_profit_run_rate"],
            "trend_adjustment_pct": forecast_metrics["trend_adjustment_pct"],
            "forecast_4m_profit": forecast_metrics["forecast_4m_profit"],
        },
        transport_snapshot=[
            {
                "transport_service": item.transport_service,
                "order_count": item.order_count,
                "revenue": item.revenue,
                "gross_profit": item.gross_profit,
                "delivered_count": item.delivered_count,
                "pending_count": item.pending_count,
            }
            for item in transport_performance[:8]
        ],
        product_snapshot=[
            {
                "product": item.product,
                "units_sold": item.units_sold,
                "revenue": item.revenue,
                "gross_profit": item.gross_profit,
            }
            for item in product_opportunities[:10]
        ],
        regional_snapshot=[
            {
                "segment": item.segment,
                "units": item.units,
                "revenue": item.revenue,
            }
            for item in regional_demand[:8]
        ],
        channel_snapshot=[
            {
                "segment": item.segment,
                "units": item.units,
                "revenue": item.revenue,
            }
            for item in channel_demand
        ],
    )

    if llm_summary:
        summary = llm_summary
    if llm_recommendations:
        recommendations = llm_recommendations[:5]

    return AnalystResponse(
        summary=summary,
        business_kpis={
            "orders": float(len(orders)),
            "revenue": float(total_revenue),
            "gross_profit": float(gross_profit),
            "profit_margin_pct": float(margin_pct),
            "average_order_value": float(average_order_value),
            "units_sold": float(total_units),
            "observed_days": forecast_metrics["observed_days"],
            "monthly_profit_run_rate": forecast_metrics["monthly_profit_run_rate"],
            "trend_adjustment_pct": forecast_metrics["trend_adjustment_pct"],
            "forecast_4m_profit": forecast_metrics["forecast_4m_profit"],
        },
        transport_performance=transport_performance,
        product_opportunities=product_opportunities[:10],
        regional_demand=regional_demand,
        channel_demand=channel_demand,
        recommendations=recommendations,
        rag_context=rag_context[:8],
        memory_backend=memory_backend,
    )


@router.post("/recommendations", response_model=AnalystResponse)
def get_business_recommendations(
    payload: AnalystRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnalystResponse:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    orders = db.query(Order).order_by(Order.created_at.desc()).all()
    seed_docs = _seed_product_docs(db)
    if not orders:
        products = db.query(Product).order_by(Product.inventory_quantity.desc(), Product.base_price.desc()).all()
        inventory_investment = sum(float(p.cost_price) * int(p.inventory_quantity) for p in products)
        inventory_retail = sum(float(p.base_price) * int(p.inventory_quantity) for p in products)
        inventory_margin = (inventory_retail - inventory_investment) / inventory_retail * 100 if inventory_retail else 0.0

        catalog_products = sorted(
            [
                ProductOpportunity(
                    product=p.title,
                    units_sold=int(p.inventory_quantity),
                    revenue=float(p.base_price) * int(p.inventory_quantity),
                    gross_profit=(float(p.base_price) - float(p.cost_price)) * int(p.inventory_quantity),
                )
                for p in products
            ],
            key=lambda item: item.gross_profit,
            reverse=True,
        )

        strategy = (
            "Operate as a premium saree marketplace. Prioritize profitability, stock rotation, "
            "regional demand creation, consumer conversions, wholesale deal sizes, and transport SLAs. "
            "Use catalog cost prices for investment analysis and live orders for demand signals."
        )

        summary, recommendations = generate_analyst_output(
            query=payload.query.strip() or "business growth",
            business_strategy=strategy,
            rag_context=[_friendly_context(doc.text) for doc in seed_docs[:8]],
            business_kpis={
                "orders": 0.0,
                "revenue": 0.0,
                "gross_profit": 0.0,
                "profit_margin_pct": 0.0,
                "average_order_value": 0.0,
                "units_sold": 0.0,
                "inventory_investment": float(inventory_investment),
                "inventory_retail_value": float(inventory_retail),
                "inventory_margin_pct": float(inventory_margin),
            },
            transport_snapshot=[],
            product_snapshot=[
                {
                    "product": item.product,
                    "units_sold": item.units_sold,
                    "revenue": item.revenue,
                    "gross_profit": item.gross_profit,
                }
                for item in catalog_products[:10]
            ],
            regional_snapshot=[],
            channel_snapshot=[],
        )

        return AnalystResponse(
            summary=summary,
            business_kpis={
                "orders": 0,
                "revenue": 0,
                "gross_profit": 0,
                "profit_margin_pct": 0,
                "average_order_value": 0,
                "units_sold": 0,
                "inventory_investment": float(inventory_investment),
                "inventory_retail_value": float(inventory_retail),
                "inventory_margin_pct": float(inventory_margin),
            },
            transport_performance=[],
            product_opportunities=catalog_products[:10],
            regional_demand=[],
            channel_demand=[],
            recommendations=recommendations,
            rag_context=[_friendly_context(doc.text) for doc in seed_docs[:8]],
            memory_backend="catalog",
        )

    query = payload.query.strip() or "business growth"
    memory_docs = _recent_memory_docs(db)
    response = _compute_response(query, orders=orders, seed_docs=seed_docs, memory_docs=memory_docs)

    try:
        _persist_memory(
            db,
            query=query,
            summary=response.summary,
            recommendations=response.recommendations,
            business_kpis=response.business_kpis,
            source_orders_count=len(orders),
        )
    except Exception:
        db.rollback()

    return response
