"""Styled PDF report builder using ReportLab."""

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

BRAND = colors.HexColor("#2563eb")
BRAND_DARK = colors.HexColor("#1e40af")
SLATE_700 = colors.HexColor("#334155")
SLATE_500 = colors.HexColor("#64748b")
SLATE_100 = colors.HexColor("#f1f5f9")
SLATE_50 = colors.HexColor("#f8fafc")
WHITE = colors.white
ACCENT_TASK = colors.HexColor("#0ea5e9")
ACCENT_BUG = colors.HexColor("#f59e0b")
ACCENT_OK = colors.HexColor("#059669")


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "ReportTitle",
            parent=base["Heading1"],
            fontSize=22,
            textColor=WHITE,
            spaceAfter=4,
            leading=26,
        ),
        "subtitle": ParagraphStyle(
            "ReportSubtitle",
            parent=base["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#dbeafe"),
            leading=14,
        ),
        "section": ParagraphStyle(
            "SectionHead",
            parent=base["Heading2"],
            fontSize=13,
            textColor=BRAND_DARK,
            spaceBefore=14,
            spaceAfter=8,
            leading=16,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontSize=9,
            textColor=SLATE_700,
            leading=13,
        ),
        "muted": ParagraphStyle(
            "Muted",
            parent=base["Normal"],
            fontSize=8,
            textColor=SLATE_500,
            leading=11,
        ),
    }


def _header_table(title: str, subtitle: str, accent: colors.Color) -> Table:
    styles = _styles()
    inner = Table(
        [[Paragraph(title, styles["title"])], [Paragraph(subtitle, styles["subtitle"])]],
        colWidths=[6.8 * inch],
    )
    inner.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 16),
                ("RIGHTPADDING", (0, 0), (-1, -1), 16),
                ("TOPPADDING", (0, 0), (0, 0), 14),
                ("BOTTOMPADDING", (0, -1), (-1, -1), 14),
                ("BACKGROUND", (0, 0), (-1, -1), accent),
            ]
        )
    )
    return inner


def _stat_cards(cards: list[dict]) -> Table:
    """cards: [{label, value, tone?}] max 4 per row"""
    if not cards:
        return Spacer(1, 0.1 * inch)

    rows = []
    row = []
    for i, card in enumerate(cards):
        tone = card.get("tone", "default")
        bg = SLATE_50
        border = colors.HexColor("#e2e8f0")
        value_color = BRAND_DARK
        if tone == "task":
            bg = colors.HexColor("#f0f9ff")
            border = colors.HexColor("#bae6fd")
            value_color = ACCENT_TASK
        elif tone == "bug":
            bg = colors.HexColor("#fffbeb")
            border = colors.HexColor("#fde68a")
            value_color = ACCENT_BUG
        elif tone == "success":
            bg = colors.HexColor("#ecfdf5")
            border = colors.HexColor("#a7f3d0")
            value_color = ACCENT_OK
        elif tone == "danger":
            bg = colors.HexColor("#fff1f2")
            border = colors.HexColor("#fecdd3")
            value_color = colors.HexColor("#e11d48")

        cell = Table(
            [
                [Paragraph(str(card["value"]), ParagraphStyle(
                    "StatVal", fontSize=16, textColor=value_color, alignment=TA_CENTER, leading=18
                ))],
                [Paragraph(card["label"], ParagraphStyle(
                    "StatLbl", fontSize=7, textColor=SLATE_500, alignment=TA_CENTER, leading=9
                ))],
            ],
            colWidths=[1.55 * inch],
        )
        cell.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), bg),
                    ("BOX", (0, 0), (-1, -1), 0.5, border),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, -1), (-1, -1), 8),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        row.append(cell)
        if len(row) == 4 or i == len(cards) - 1:
            while len(row) < 4:
                row.append("")
            rows.append(row)
            row = []

    table = Table(rows, colWidths=[1.7 * inch] * 4)
    table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2)]))
    return table


def _kv_table(rows: list[tuple[str, str]]) -> Table:
    data = [[Paragraph(f"<b>{k}</b>", _styles()["body"]), Paragraph(v, _styles()["body"])] for k, v in rows]
    table = Table(data, colWidths=[1.6 * inch, 5.0 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SLATE_50),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def _list_table(headers: list[str], rows: list[list[str]]) -> Table:
    styles = _styles()
    data = [[Paragraph(f"<b>{h}</b>", styles["muted"]) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), styles["body"]) for c in row])

    col_count = len(headers)
    width = 6.6 / col_count
    table = Table(data, colWidths=[width * inch] * col_count, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("BACKGROUND", (0, 1), (-1, -1), WHITE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, SLATE_50]),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def render_report_pdf(
    *,
    title: str,
    subtitle: str,
    accent_hex: str,
    stat_cards: list[dict],
    profile_rows: list[tuple[str, str]] | None = None,
    sections: list[dict] | None = None,
) -> bytes:
    """Build a styled PDF report. sections: [{title, headers?, rows?, bullets?}]"""
    accent_color = colors.HexColor(accent_hex)
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=0.55 * inch,
        rightMargin=0.55 * inch,
        topMargin=0.45 * inch,
        bottomMargin=0.5 * inch,
    )
    styles = _styles()
    story = [
        _header_table(title, subtitle, accent_color),
        Spacer(1, 0.2 * inch),
        _stat_cards(stat_cards),
    ]

    if profile_rows:
        story.extend([
            Paragraph("Profile", styles["section"]),
            _kv_table(profile_rows),
        ])

    for section in sections or []:
        story.append(Paragraph(section["title"], styles["section"]))
        if section.get("headers") and section.get("rows"):
            story.append(_list_table(section["headers"], section["rows"]))
        elif section.get("bullets"):
            for bullet in section["bullets"]:
                story.append(Paragraph(f"• {bullet}", styles["body"]))
                story.append(Spacer(1, 0.04 * inch))
        story.append(Spacer(1, 0.08 * inch))

    story.append(Spacer(1, 0.15 * inch))
    story.append(
        Paragraph(
            "Generated by Task Manager · Confidential internal report",
            styles["muted"],
        )
    )

    doc.build(story)
    return buffer.getvalue()
