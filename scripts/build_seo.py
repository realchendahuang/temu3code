#!/usr/bin/env python3
"""Generate static SEO-indexable EN/ZH-CN thread archive pages and site/sitemap.xml."""

from __future__ import annotations

import html
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SITE_DIR = ROOT / "site"
THREADS_EN_PATH = SITE_DIR / "mail" / "threads.json"
THREADS_ZH_PATH = SITE_DIR / "data" / "mail-threads" / "zh-CN.json"
MEMES_PATH = SITE_DIR / "data" / "memes.json"
OUT_T_DIR = SITE_DIR / "mail" / "t"
SITEMAP_PATH = SITE_DIR / "sitemap.xml"

BASE_URL = "https://temu3code.com"
REPO_URL = "https://github.com/realchendahuang/temu3code"

CASE_SLUGS = {
    "00": "origin-fork-dispute-and-double-standard",
    "01": "default-telemetry-and-cross-tool-tracking",
    "02": "fake-sqlite-delete-and-process-scanner",
    "03": "silent-force-push-vs-21h-filter-removal",
    "04": "antigravity-spoofing-and-3-minute-bans",
    "05": "t3-connect-zero-e2e-plaintext-relay",
    "06": "angel-investor-conflicts-vibe-kanban-daytona",
    "07": "managed-policy-blind-spots",
    "08": "800k-spend-and-31t-token-radar",
    "09": "yolo-merges-vs-community-hostility",
    "10": "fork-scraping-bot-and-critics-suppression",
    "11": "nov25-clarification-contradicted-in-2-hours",
    "12": "post-gdpr-overnight-blitz-2m-ip-logs",
    "13": "zero-security-advisories-and-silent-patches",
    "14": "1151-tweet-quantitative-double-standard",
    "15": "zero-uspto-trademarks-and-retroactive-policy",
    "16": "two-year-pattern-of-bullying-and-deletions",
    "17": "sponsor-stack-and-quota-exploit-hypocrisy",
    "18": "77k-star-funnel-and-arbitrary-repo-starring",
    "19": "ca81b7b9-lan-cookie-bearer-ws-and-repo-rce",
}

EXHIBIT_DOSSIERS = {
    "20": "docs/dossiers/05-governance-trademark-and-history.md",
    "21": "docs/dossiers/03-antigravity-tos-and-t3connect-relay.md",
    "22": "docs/dossiers/01-telemetry-and-gdpr-timeline.md",
    "23": "docs/dossiers/02-local-safety-and-security-audit.md",
    "24": "docs/dossiers/02-local-safety-and-security-audit.md",
    "25": "docs/dossiers/04-business-ledger-sponsors-and-77k-stars.md",
    "26": "docs/dossiers/01-telemetry-and-gdpr-timeline.md",
    "27": "docs/dossiers/05-governance-trademark-and-history.md",
    "28": "docs/dossiers/02-local-safety-and-security-audit.md",
}

THREAD_CSS = """/* Static SEO Archive Thread Stylesheet — matches Tmail Material 3 light theme */
:root {
  --shell-bg: #f6f8fc;
  --surface: #ffffff;
  --surface-tint: #f8fafd;
  --border: #e1e3e1;
  --border-subtle: #eceff1;
  --text-primary: #1f1f1f;
  --text-secondary: #444746;
  --text-muted: #5f6368;
  --accent-blue: #0b57d0;
  --accent-blue-bg: #d3e3fd;
  --accent-blue-ink: #001d35;
  --danger-bg: #fce8e6;
  --danger-ink: #b3261e;
  --warn-bg: #fef7e0;
  --warn-ink: #8a5300;
  --chip-bg: #eceff1;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  background: var(--shell-bg);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

a {
  color: var(--accent-blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

a:focus-visible,
button:focus-visible {
  outline: 2px solid var(--accent-blue);
  outline-offset: 2px;
  border-radius: 6px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(246, 248, 252, 0.94);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
}

.topbar-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 10px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.brand-link {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: #444746;
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.02em;
  text-decoration: none !important;
}

.brand-mark {
  width: 30px;
  height: 22px;
  flex-shrink: 0;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.lang-switch {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 6px 13px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none !important;
}

.lang-switch:hover {
  background: #edf2fa;
  color: var(--text-primary);
}

.cta-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 16px;
  border-radius: 18px;
  background: var(--accent-blue);
  color: #ffffff !important;
  font-size: 13.5px;
  font-weight: 600;
  text-decoration: none !important;
  box-shadow: 0 1px 2px rgba(11, 87, 208, 0.25);
}

.cta-primary:hover {
  background: #0842a0;
}

.page-wrap {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px 18px 48px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
  font-size: 13px;
  color: var(--text-muted);
}

.breadcrumb a {
  color: var(--text-secondary);
}

.breadcrumb-sep {
  color: #9aa0a6;
}

.thread-shell {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px 26px;
  box-shadow: 0 1px 3px rgba(60, 64, 67, 0.08);
}

.thread-header {
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 18px;
  margin-bottom: 20px;
}

.thread-title {
  margin: 0 0 12px;
  font-size: clamp(21px, 3vw, 27px);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.015em;
  color: var(--text-primary);
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: var(--chip-bg);
  color: var(--text-secondary);
}

.chip-deleted {
  background: var(--danger-bg);
  color: var(--danger-ink);
}

.chip-open {
  background: var(--warn-bg);
  color: var(--warn-ink);
}

.chip-exhibit {
  background: #edf2fa;
  color: var(--accent-blue);
}

.thread-summary {
  margin: 0 0 12px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--surface-tint);
  border: 1px solid var(--border-subtle);
  font-size: 14.5px;
  color: var(--text-secondary);
}

.thread-meta-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  font-size: 13px;
  color: var(--text-muted);
}

.msg-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.msg-card {
  display: flex;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #ffffff;
}

.msg-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  color: #ffffff;
  font-weight: 600;
  font-size: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.msg-main {
  flex: 1;
  min-width: 0;
}

.msg-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.msg-sender {
  font-weight: 600;
  font-size: 14.5px;
  color: var(--text-primary);
}

.msg-handle {
  font-size: 12.5px;
  color: var(--text-muted);
  margin-inline-start: 6px;
}

.msg-to {
  font-size: 12.5px;
  color: var(--text-muted);
  margin-top: 2px;
}

.msg-time {
  font-size: 12.5px;
  color: var(--text-muted);
  white-space: nowrap;
}

.msg-body {
  max-width: 740px;
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-primary);
  overflow-wrap: break-word;
  overflow-wrap: anywhere;
}

.msg-body > *:first-child {
  margin-top: 0;
}

.msg-body > *:last-child {
  margin-bottom: 0;
}

.msg-p {
  margin: 0 0 12px;
}

.msg-quote {
  margin: 12px 0;
  padding: 10px 14px;
  border-inline-start: 3px solid var(--accent-blue);
  background: var(--surface-tint);
  border-radius: 0 8px 8px 0;
  color: #2c2f33;
}

.msg-quote p {
  margin: 0;
}

.msg-quote p + p {
  margin-top: 8px;
}

.msg-list {
  margin: 10px 0 14px;
  padding-inline-start: 22px;
}

.msg-list li {
  margin-bottom: 6px;
}

.msg-list li:last-child {
  margin-bottom: 0;
}

.msg-body code {
  display: inline-block;
  max-width: 100%;
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.5;
  background: #f1f3f4;
  padding: 1px 5px;
  border-radius: 4px;
  overflow-wrap: break-word;
  vertical-align: baseline;
}

.msg-attachments {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.att-fig {
  margin: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface-tint);
}

.att-fig img {
  display: block;
  width: 100%;
  height: 150px;
  object-fit: cover;
  background: #eef1f6;
}

.att-fig figcaption {
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-secondary);
}

.msg-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.source-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  min-height: 36px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #f1f5fb;
  border: 1px solid #d2e3fc;
  color: var(--accent-blue);
  font-size: 12.5px;
  font-weight: 500;
  overflow-wrap: break-word;
}

.thread-footer-cta {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cta-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 15px;
  border-radius: 18px;
  border: 1px solid #c4c7c5;
  background: #ffffff;
  color: var(--text-secondary) !important;
  font-size: 13.5px;
  font-weight: 500;
  text-decoration: none !important;
}

.btn-outline:hover {
  background: #f1f3f4;
  color: var(--text-primary) !important;
}

.prev-next-nav {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.pn-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-primary) !important;
  text-decoration: none !important;
}

.pn-card:hover {
  background: #f2f6fc;
}

.pn-card.is-next {
  text-align: right;
}

.pn-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.pn-title {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--accent-blue);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archive-footer {
  margin-top: 22px;
  text-align: center;
  font-size: 12.5px;
  color: var(--text-muted);
}

@media (max-width: 680px) {
  .chip-exhibit,
  .pn-card {
    min-height: 36px;
  }

  .chip-exhibit {
    padding: 6px 12px;
  }

  .breadcrumb a {
    display: inline-flex;
    align-items: center;
    min-height: 36px;
  }

  .thread-shell {
    padding: 16px;
    border-radius: 12px;
  }

  .msg-card {
    flex-direction: column;
    gap: 10px;
    padding: 14px;
  }

  .msg-avatar {
    width: 32px;
    height: 32px;
    font-size: 13px;
  }

  .msg-time {
    white-space: normal;
  }

  .prev-next-nav {
    grid-template-columns: minmax(0, 1fr);
  }

  .pn-card.is-next {
    text-align: left;
  }

  .pn-title {
    white-space: normal;
    overflow-wrap: break-word;
  }
}
"""


def esc(text: str) -> str:
    return html.escape(str(text or ""), quote=True)


def format_inline(raw: str) -> str:
    parts = re.split(r"(`[^`\n]+`)", str(raw or ""))
    out: list[str] = []
    for part in parts:
        if len(part) >= 2 and part.startswith("`") and part.endswith("`"):
            out.append(f"<code>{esc(part[1:-1])}</code>")
        else:
            out.append(re.sub(r"\*\*([^\n]+?)\*\*", r"<strong>\1</strong>", esc(part)))
    return "".join(out)


def format_body_html(text: str) -> str:
    lines = str(text or "").replace("\r\n", "\n").replace("\r", "\n").split("\n")
    blocks: list[str] = []
    ul_re = re.compile(r"^\s*(?:-|•)\s+(.+)$")
    ol_re = re.compile(r"^\s*(\d+)\.\s+(.+)$")
    quote_re = re.compile(r"^\s*>\s?(.*)$")

    def is_ordered_start(idx: int) -> bool:
        m = ol_re.match(lines[idx])
        if not m:
            return False
        num = int(m.group(1))
        if num == 1:
            return True
        j = idx + 1
        while j < len(lines) and not lines[j].strip():
            j += 1
        if j < len(lines):
            m2 = ol_re.match(lines[j])
            if m2 and int(m2.group(1)) == num + 1:
                return True
        return False

    i = 0
    n = len(lines)
    while i < n:
        if not lines[i].strip():
            i += 1
            continue

        if quote_re.match(lines[i]):
            q_lines: list[str] = []
            while i < n and quote_re.match(lines[i]):
                q_lines.append(quote_re.sub(r"\1", lines[i], count=1))
                i += 1
            q_paras: list[str] = []
            cur: list[str] = []
            for ql in q_lines:
                if not ql.strip():
                    if cur:
                        q_paras.append(f"<p>{'<br>'.join(format_inline(x) for x in cur)}</p>")
                        cur = []
                else:
                    cur.append(ql)
            if cur:
                q_paras.append(f"<p>{'<br>'.join(format_inline(x) for x in cur)}</p>")
            if q_paras:
                blocks.append(f'<blockquote class="msg-quote">{"".join(q_paras)}</blockquote>')
            continue

        if ul_re.match(lines[i]):
            items: list[str] = []
            while i < n:
                m = ul_re.match(lines[i])
                if m:
                    items.append(f"<li>{format_inline(m.group(1))}</li>")
                    i += 1
                    continue
                if not lines[i].strip():
                    j = i + 1
                    while j < n and not lines[j].strip():
                        j += 1
                    if j < n and ul_re.match(lines[j]):
                        i = j
                        continue
                break
            blocks.append(f'<ul class="msg-list">{"".join(items)}</ul>')
            continue

        if is_ordered_start(i):
            items = []
            first_num = int(ol_re.match(lines[i]).group(1))
            while i < n:
                m = ol_re.match(lines[i])
                if m:
                    items.append(f"<li>{format_inline(m.group(2))}</li>")
                    i += 1
                    continue
                if not lines[i].strip():
                    j = i + 1
                    while j < n and not lines[j].strip():
                        j += 1
                    if j < n and ol_re.match(lines[j]):
                        i = j
                        continue
                break
            start_attr = f' start="{first_num}"' if first_num != 1 else ""
            blocks.append(f'<ol class="msg-list"{start_attr}>{"".join(items)}</ol>')
            continue

        p_lines: list[str] = []
        while (
            i < n
            and lines[i].strip()
            and not quote_re.match(lines[i])
            and not ul_re.match(lines[i])
            and not is_ordered_start(i)
        ):
            p_lines.append(lines[i])
            i += 1
        if p_lines:
            blocks.append(f'<p class="msg-p">{"<br>".join(format_inline(x) for x in p_lines)}</p>')

    return "\n".join(blocks)


_IMAGE_DIM_CACHE: dict[str, tuple[int, int]] = {}


def resolve_local_asset(src: str) -> Path:
    rel = src.lstrip("./")
    if rel.startswith("evidence/"):
        return ROOT / rel
    return SITE_DIR / rel


def get_image_dimensions(src: str) -> tuple[int, int]:
    rel = src.lstrip("./")
    if rel not in _IMAGE_DIM_CACHE:
        with Image.open(resolve_local_asset(rel)) as img:
            _IMAGE_DIM_CACHE[rel] = img.size
    return _IMAGE_DIM_CACHE[rel]


def strip_md_code(text: str) -> str:
    cleaned = re.sub(r"`([^`\n]*)`", r"\1", str(text or ""))
    return cleaned.replace("`", "")


def truncate_description(text: str, limit: int = 160) -> str:
    clean = re.sub(r"\s+", " ", strip_md_code(text).strip())
    if len(clean) <= limit:
        return clean
    cut = clean[: limit - 1]
    if " " in cut and cut.rfind(" ") > limit * 0.6:
        cut = cut[: cut.rfind(" ")]
    return cut.rstrip(" ,;:-—") + "…"


def make_page_title(subject: str, lang: str) -> str:
    clean = re.sub(r"\s+", " ", strip_md_code(subject).strip())
    full = f"{clean} · Tmail · Temu3 Code"
    if len(full) <= 68:
        return full
    short = f"{clean} · Tmail"
    if len(short) <= 70:
        return short
    max_subj = 68 - len("… · Tmail")
    cut = clean[:max_subj]
    if " " in cut and cut.rfind(" ") > max_subj * 0.6:
        cut = cut[: cut.rfind(" ")]
    return cut.rstrip(" ,;:-—") + "… · Tmail"


def status_label_and_class(th: dict, lang: str) -> tuple[str, str]:
    status = th.get("status", "record")
    deleted = bool(th.get("deleted"))
    if lang == "zh-CN":
        if status == "open":
            return "仍未修复", "chip-open"
        if status == "partial":
            return "部分修补", ""
        if deleted:
            return "已删帖 / 撤回", "chip-deleted"
        return "公开记录", ""
    if status == "open":
        return "Unfixed", "chip-open"
    if status == "partial":
        return "Partially Patched", ""
    if deleted:
        return "Deleted / Retracted", "chip-deleted"
    return "Public Record", ""


def render_thread_html(
    th: dict,
    idx: int,
    threads_en: list[dict],
    zh_bundle: dict,
    topics_en: dict[str, str],
    lang: str,
) -> str:
    tid = th["id"]
    is_zh = lang == "zh-CN"
    zh_th = zh_bundle["threads"].get(tid)
    zh_topics = zh_bundle.get("topics", {})

    subject = strip_md_code((zh_th["subject"] if is_zh and zh_th else None) or (th.get("subjectZh") if is_zh else th["subject"]))
    snippet = strip_md_code((zh_th["snippet"] if is_zh and zh_th else None) or (th.get("snippetZh") if is_zh else th["snippet"]))
    from_str = zh_th["from"] if (is_zh and zh_th) else th["from"]
    to_str = zh_th["to"] if (is_zh and zh_th) else th["to"]
    date_disp = zh_th["dateDisplay"] if (is_zh and zh_th) else th["dateDisplay"]

    root_rel = "../../../../" if is_zh else "../../../"
    mail_rel = "../../../" if is_zh else "../../"
    css_href = "../../thread.css?v=3" if is_zh else "../thread.css?v=3"
    en_canonical = f"{BASE_URL}/mail/t/{tid}/"
    zh_canonical = f"{BASE_URL}/mail/t/{tid}/zh/"
    canonical_url = zh_canonical if is_zh else en_canonical
    lang_switch_href = "../" if is_zh else "zh/"
    lang_switch_label = "English" if is_zh else "中文版"
    interactive_href = f"{mail_rel}?lang=zh-CN&thread={tid}" if is_zh else f"{mail_rel}?thread={tid}"
    home_href = f"{root_rel}?lang=zh-CN" if is_zh else root_rel
    mail_home_href = f"{mail_rel}?lang=zh-CN" if is_zh else mail_rel

    page_title = make_page_title(subject, lang)
    meta_desc = truncate_description(snippet, 160)

    att_srcs: list[str] = []
    att_urls: list[str] = []
    for m in th["messages"]:
        for a in m.get("attachments", []):
            src = a["src"].lstrip("./")
            full_u = f"{BASE_URL}/{src}"
            if full_u not in att_urls:
                att_srcs.append(src)
                att_urls.append(full_u)
    og_src = att_srcs[0] if att_srcs else "og-card.png"
    og_w, og_h = get_image_dimensions(og_src)
    og_image = f"{BASE_URL}/{og_src}"
    ld_images = att_urls if att_urls else [og_image]

    exhibit = th["exhibit"]
    slug = CASE_SLUGS.get(exhibit)
    case_lang = "zh-CN" if is_zh else "en"
    if slug:
        exhibit_url = f"{REPO_URL}/blob/main/cases/{case_lang}/{exhibit}-{slug}.md"
    elif exhibit in EXHIBIT_DOSSIERS:
        exhibit_url = f"{REPO_URL}/blob/main/{EXHIBIT_DOSSIERS[exhibit]}"
    else:
        exhibit_url = f"{REPO_URL}#all-20-verified-exhibits-0019"

    status_lbl, status_cls = status_label_and_class(th, lang)
    topic_chips = [
        zh_topics.get(tp_id, topics_en.get(tp_id, tp_id)) if is_zh else topics_en.get(tp_id, tp_id)
        for tp_id in th.get("topics", [])
    ]

    article_ld = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": subject,
        "description": meta_desc,
        "datePublished": th["date"],
        "dateModified": th["date"],
        "inLanguage": lang,
        "image": ld_images,
        "mainEntityOfPage": canonical_url,
        "license": "https://creativecommons.org/publicdomain/zero/1.0/",
        "author": {
            "@type": "Organization",
            "name": "Temu3 Code Public Archive",
            "url": f"{BASE_URL}/",
        },
        "publisher": {
            "@type": "Organization",
            "name": "Temu3 Code",
            "url": f"{BASE_URL}/",
            "logo": {
                "@type": "ImageObject",
                "url": f"{BASE_URL}/apple-touch-icon.png",
            },
        },
    }
    breadcrumb_ld = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "首页" if is_zh else "Home",
                "item": f"{BASE_URL}/",
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Tmail",
                "item": f"{BASE_URL}/mail/",
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": subject,
                "item": canonical_url,
            },
        ],
    }

    article_ld_json = json.dumps(article_ld, ensure_ascii=False).replace("</", "<\\/")
    breadcrumb_ld_json = json.dumps(breadcrumb_ld, ensure_ascii=False).replace("</", "<\\/")

    msgs_html: list[str] = []
    for mi, m in enumerate(th["messages"]):
        zm = zh_th["messages"][mi] if (zh_th and mi < len(zh_th.get("messages", []))) else {}
        sender = zm.get("sender") if (is_zh and zm) else m["sender"]
        handle = zm.get("handle") if (is_zh and zm) else m["handle"]
        m_to = zm.get("to") if (is_zh and zm) else m["to"]
        m_time = zm.get("time") if (is_zh and zm) else m["time"]
        body_raw = zm.get("body") if (is_zh and zm) else m["body"]
        body_html = format_body_html(body_raw)

        att_html = ""
        atts = m.get("attachments", [])
        if atts:
            figs: list[str] = []
            z_att_titles = zm.get("attachments", []) if zm else []
            for ai, a in enumerate(atts):
                a_title = strip_md_code(z_att_titles[ai] if (is_zh and ai < len(z_att_titles)) else a["title"])
                att_src = a["src"].lstrip("./")
                img_w, img_h = get_image_dimensions(att_src)
                rel_src = root_rel + att_src
                figs.append(
                    f'<figure class="att-fig">'
                    f'<a href="{esc(rel_src)}" target="_blank" rel="noopener noreferrer">'
                    f'<img src="{esc(rel_src)}" alt="{esc(a_title)}" width="{img_w}" height="{img_h}" loading="lazy" decoding="async" />'
                    f"</a>"
                    f"<figcaption>{esc(a_title)}</figcaption>"
                    f"</figure>"
                )
            att_html = f'<div class="msg-attachments">{"".join(figs)}</div>'

        links_html = ""
        lks = m.get("links", [])
        if lks:
            pills: list[str] = []
            z_link_labels = zm.get("links", []) if zm else []
            for li, lk in enumerate(lks):
                lk_label = z_link_labels[li] if (is_zh and li < len(z_link_labels)) else lk["label"]
                pills.append(
                    f'<a class="source-pill" href="{esc(lk["url"])}" target="_blank" rel="noopener noreferrer">↗ {esc(lk_label)}</a>'
                )
            links_html = f'<div class="msg-links">{"".join(pills)}</div>'

        to_prefix = "发送至：" if is_zh else "To: "
        msgs_html.append(
            f'<article class="msg-card">\n'
            f'  <div class="msg-avatar" style="background:{esc(m["color"])}" aria-hidden="true">{esc(m["avatar"])}</div>\n'
            f'  <div class="msg-main">\n'
            f'    <div class="msg-head">\n'
            f'      <div>\n'
            f'        <div><span class="msg-sender">{esc(sender)}</span><span class="msg-handle">&lt;{esc(handle)}&gt;</span></div>\n'
            f'        <div class="msg-to">{esc(to_prefix)}{esc(m_to)}</div>\n'
            f'      </div>\n'
            f'      <div class="msg-time">{esc(m_time)}</div>\n'
            f'    </div>\n'
            f'    <div class="msg-body">\n{body_html}\n    </div>\n'
            f'    {att_html}\n'
            f'    {links_html}\n'
            f'  </div>\n'
            f'</article>'
        )

    prev_th = threads_en[idx - 1] if idx > 0 else None
    next_th = threads_en[idx + 1] if idx + 1 < len(threads_en) else None
    prev_href = (
        f"../../{prev_th['id']}/zh/" if is_zh else f"../{prev_th['id']}/"
    ) if prev_th else ""
    next_href = (
        f"../../{next_th['id']}/zh/" if is_zh else f"../{next_th['id']}/"
    ) if next_th else ""
    prev_subj = strip_md_code(((zh_bundle["threads"].get(prev_th["id"]) or {}).get("subject") or prev_th.get("subjectZh") or prev_th["subject"]) if is_zh else prev_th["subject"]) if prev_th else ""
    next_subj = strip_md_code(((zh_bundle["threads"].get(next_th["id"]) or {}).get("subject") or next_th.get("subjectZh") or next_th["subject"]) if is_zh else next_th["subject"]) if next_th else ""

    prev_card = (
        f'<a class="pn-card" href="{esc(prev_href)}"><span class="pn-label">{"← 上一条" if is_zh else "← Previous"}</span><span class="pn-title">{esc(prev_subj)}</span></a>'
        if prev_th
        else '<div></div>'
    )
    next_card = (
        f'<a class="pn-card is-next" href="{esc(next_href)}"><span class="pn-label">{"下一条 →" if is_zh else "Next →"}</span><span class="pn-title">{esc(next_subj)}</span></a>'
        if next_th
        else '<div></div>'
    )

    exhibit_label = f"证据 #{exhibit}" if is_zh else f"Exhibit #{exhibit}"
    cta_label = "在交互式 Tmail 中打开 →" if is_zh else "Open in Interactive Tmail →"
    full_case_label = f"查看完整卷宗 #{exhibit} ↗" if is_zh else f"Full Exhibit Dossier #{exhibit} ↗"
    home_crumb = "首页" if is_zh else "Home"
    from_label = "发件方：" if is_zh else "From: "
    to_label = "对象：" if is_zh else "To: "
    date_label = "日期：" if is_zh else "Date: "
    footer_txt = (
        "CC0 1.0 公共领域 · 零遥测 · 静态归档镜像，同步自 Temu3 Code 公开记录"
        if is_zh
        else "CC0 1.0 Public Domain · Zero Telemetry · Static archive mirror of Temu3 Code public records"
    )

    topic_pills_html = "".join(f'<span class="chip">{esc(tc)}</span>' for tc in topic_chips)
    status_chip_cls = f"chip {status_cls}".strip()

    return f"""<!DOCTYPE html>
<html lang="{esc(lang)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>{esc(page_title)}</title>
  <meta name="description" content="{esc(meta_desc)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <meta name="theme-color" content="#f6f8fc" />

  <link rel="canonical" href="{esc(canonical_url)}" />
  <link rel="alternate" hreflang="en" href="{esc(en_canonical)}" />
  <link rel="alternate" hreflang="zh-CN" href="{esc(zh_canonical)}" />
  <link rel="alternate" hreflang="x-default" href="{esc(en_canonical)}" />

  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Temu3 Code" />
  <meta property="og:locale" content="{"zh_CN" if is_zh else "en_US"}" />
  <meta property="og:url" content="{esc(canonical_url)}" />
  <meta property="og:title" content="{esc(subject)}" />
  <meta property="og:description" content="{esc(meta_desc)}" />
  <meta property="og:image" content="{esc(og_image)}" />
  <meta property="og:image:width" content="{og_w}" />
  <meta property="og:image:height" content="{og_h}" />
  <meta property="article:published_time" content="{esc(th['date'])}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{esc(subject)}" />
  <meta name="twitter:description" content="{esc(meta_desc)}" />
  <meta name="twitter:image" content="{esc(og_image)}" />
  <meta name="twitter:image:alt" content="{esc(subject)}" />

  <link rel="icon" type="image/svg+xml" href="{esc(root_rel)}favicon.svg" />
  <link rel="apple-touch-icon" href="{esc(root_rel)}apple-touch-icon.png" />
  <link rel="stylesheet" href="{esc(css_href)}" />

  <script type="application/ld+json">{article_ld_json}</script>
  <script type="application/ld+json">{breadcrumb_ld_json}</script>
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand-link" href="{esc(mail_home_href)}">
        <svg class="brand-mark" viewBox="0 0 36 28" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="32" height="24" rx="4" fill="#FFFFFF" />
          <path d="M2 8.2V22.5C2 24.43 3.57 26 5.5 26H9V13.4L2 8.2Z" fill="#4285F4" />
          <path d="M34 8.2V22.5C34 24.43 32.43 26 30.5 26H27V13.4L34 8.2Z" fill="#34A853" />
          <path d="M27 13.4V26H27L34 8.2C34 5.9 31.3 4.6 29.5 6L27 7.9V13.4Z" fill="#FBBC04" />
          <path d="M9 13.4V7.9L18 14.6L27 7.9V13.4L18 20.1L9 13.4Z" fill="#EA4335" />
          <path d="M2 8.2C2 5.9 4.7 4.6 6.5 6L9 7.9V13.4L2 8.2Z" fill="#C5221F" />
        </svg>
        <span>Tmail</span>
      </a>
      <div class="topbar-actions">
        <a class="lang-switch" href="{esc(lang_switch_href)}" hreflang="{"en" if is_zh else "zh-CN"}">{esc(lang_switch_label)}</a>
        <a class="cta-primary" href="{esc(interactive_href)}">{esc(cta_label)}</a>
      </div>
    </div>
  </header>

  <main class="page-wrap">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="{esc(home_href)}">{esc(home_crumb)}</a>
      <span class="breadcrumb-sep" aria-hidden="true">/</span>
      <a href="{esc(mail_home_href)}">Tmail</a>
      <span class="breadcrumb-sep" aria-hidden="true">/</span>
      <span>{esc(subject)}</span>
    </nav>

    <article class="thread-shell">
      <header class="thread-header">
        <h1 class="thread-title">{esc(subject)}</h1>
        <div class="chip-row">
          <span class="chip">{esc(th["platform"])}</span>
          <span class="{esc(status_chip_cls)}">{esc(status_lbl)}</span>
          <a class="chip chip-exhibit" href="{esc(exhibit_url)}" target="_blank" rel="noopener noreferrer">{esc(exhibit_label)}</a>
          {topic_pills_html}
        </div>
        <p class="thread-summary">{esc(snippet)}</p>
        <div class="thread-meta-grid">
          <span><strong>{esc(from_label)}</strong>{esc(from_str)}</span>
          <span><strong>{esc(to_label)}</strong>{esc(to_str)}</span>
          <span><strong>{esc(date_label)}</strong><time datetime="{esc(th['date'])}">{esc(date_disp)}</time></span>
        </div>
      </header>

      <section class="msg-stack" aria-label="{"消息记录" if is_zh else "Thread messages"}">
        {"".join(msgs_html)}
      </section>

      <div class="thread-footer-cta">
        <div class="cta-group">
          <a class="cta-primary" href="{esc(interactive_href)}">{esc(cta_label)}</a>
          <a class="btn-outline" href="{esc(exhibit_url)}" target="_blank" rel="noopener noreferrer">{esc(full_case_label)}</a>
        </div>
        <a class="btn-outline" href="{esc(mail_home_href)}">{"← 返回 Tmail 收件箱" if is_zh else "← Back to Tmail Inbox"}</a>
      </div>
    </article>

    <nav class="prev-next-nav" aria-label="{"相邻记录" if is_zh else "Adjacent threads"}">
      {prev_card}
      {next_card}
    </nav>

    <footer class="archive-footer">{esc(footer_txt)}</footer>
  </main>
</body>
</html>
"""


def build_sitemap(threads_en: list[dict], zh_bundle: dict, memes_data: dict) -> str:
    today = "2026-11-28"
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml"',
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ]

    def add_url(
        loc: str,
        lastmod: str,
        changefreq: str,
        priority: str,
        alternates: list[tuple[str, str]] | None = None,
        images: list[tuple[str, str]] | None = None,
    ) -> None:
        lines.append("  <url>")
        lines.append(f"    <loc>{esc(loc)}</loc>")
        lines.append(f"    <lastmod>{esc(lastmod)}</lastmod>")
        lines.append(f"    <changefreq>{esc(changefreq)}</changefreq>")
        lines.append(f"    <priority>{esc(priority)}</priority>")
        if alternates:
            for hreflang, href in alternates:
                lines.append(f'    <xhtml:link rel="alternate" hreflang="{esc(hreflang)}" href="{esc(href)}" />')
        if images:
            seen_img: set[str] = set()
            for img_loc, img_title in images:
                if img_loc in seen_img:
                    continue
                seen_img.add(img_loc)
                lines.append("    <image:image>")
                lines.append(f"      <image:loc>{esc(img_loc)}</image:loc>")
                if img_title:
                    lines.append(f"      <image:title>{esc(img_title)}</image:title>")
                lines.append("    </image:image>")
        lines.append("  </url>")

    home_images = [
        (f"{BASE_URL}/og-card.png", "Temu3 Code — Independent CC0 Audit of pingdotgg/t3code"),
        (f"{BASE_URL}/receipts/x-2124825920808829077-temu3-code.webp", "@theo naming post: Temu3 Code"),
        (f"{BASE_URL}/evidence/00-cover-en.png", "Before You Install T3 Code Audit Banner"),
        (f"{BASE_URL}/evidence/charts/theo-chart-1-overview.png", "1,151-Tweet Forensic Dataset Overview"),
        (f"{BASE_URL}/evidence/charts/theo-chart-3-double-standard.png", "Selective Politeness Split: 0.0% VIP vs 8.0% Dev vs 14.4% Crisis"),
        (f"{BASE_URL}/evidence/charts/theo-chart-4-cn-crisis.png", "25-Hour Crisis Timeline Chart"),
    ]
    add_url(f"{BASE_URL}/", today, "weekly", "1.0", images=home_images)

    mail_images = [
        (f"{BASE_URL}/og-card.png", "Tmail — Interactive Public Record Inbox"),
        (f"{BASE_URL}/evidence/01-origin-theo-threat.png", "GitHub Account Takedown Threat"),
        (f"{BASE_URL}/evidence/charts/theo-chart-3-double-standard.png", "1,151-Tweet Double-Standard Analysis"),
    ]
    add_url(f"{BASE_URL}/mail/", today, "weekly", "0.9", images=mail_images)

    story_images: list[tuple[str, str]] = []
    for ep in memes_data.get("storyEpisodes", []):
        en_url = ep.get("en", {}).get("url")
        zh_url = ep.get("zh", {}).get("url")
        if en_url:
            story_images.append((en_url, f"Ep. {ep['num']}: {ep.get('titleEn', '')}"))
        if zh_url:
            story_images.append((zh_url, f"第 {ep['num']} 话：{ep.get('titleZh', '')}"))
    if memes_data.get("promoSheetUrl"):
        story_images.append((memes_data["promoSheetUrl"], "Transparent CC0 Sticker Pack Sheet"))
    add_url(f"{BASE_URL}/story/", today, "weekly", "0.8", images=story_images)

    meme_images: list[tuple[str, str]] = []
    for item in memes_data.get("items", []):
        if item.get("featured") and item.get("url"):
            meme_images.append((item["url"], item.get("titleEn", "")))
    add_url(f"{BASE_URL}/memes/", today, "weekly", "0.8", images=meme_images)

    game_images = [
        (f"{BASE_URL}/game/assets/map-meadow.webp", "Temu3 Kingdom — Silicon Meadow 2D Hand-Drawn Map"),
        (f"{BASE_URL}/game/assets/castle-t3.webp", "Temu3 Kingdom — No Telemetry Castle"),
    ]
    add_url(f"{BASE_URL}/game/", today, "weekly", "0.8", images=game_images)

    for th in threads_en:
        tid = th["id"]
        en_loc = f"{BASE_URL}/mail/t/{tid}/"
        zh_loc = f"{BASE_URL}/mail/t/{tid}/zh/"
        alts = [("en", en_loc), ("zh-CN", zh_loc), ("x-default", en_loc)]

        zh_th = zh_bundle["threads"].get(tid) or {}
        en_imgs: list[tuple[str, str]] = []
        zh_imgs: list[tuple[str, str]] = []
        for mi, m in enumerate(th["messages"]):
            zmsgs = zh_th.get("messages", [])
            zm = zmsgs[mi] if mi < len(zmsgs) else {}
            z_titles = zm.get("attachments", [])
            for ai, a in enumerate(m.get("attachments", [])):
                src = a["src"].lstrip("./")
                img_u = f"{BASE_URL}/{src}"
                en_imgs.append((img_u, a["title"]))
                zh_imgs.append((img_u, z_titles[ai] if ai < len(z_titles) else a["title"]))

        add_url(en_loc, th["date"], "monthly", "0.7", alternates=alts, images=en_imgs)
        add_url(zh_loc, th["date"], "monthly", "0.7", alternates=alts, images=zh_imgs)

    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def validate_outputs(threads_en: list[dict], memes_data: dict) -> None:
    xml_text = SITEMAP_PATH.read_text(encoding="utf-8")
    root = ET.fromstring(xml_text)
    ns = {
        "sm": "http://www.sitemaps.org/schemas/sitemap/0.9",
        "xhtml": "http://www.w3.org/1999/xhtml",
        "image": "http://www.google.com/schemas/sitemap-image/1.1",
    }
    urls = root.findall("sm:url", ns)
    assert len(urls) == 5 + len(threads_en) * 2, f"Expected {5 + len(threads_en) * 2} sitemap URLs, got {len(urls)}"

    cdn_urls = {memes_data.get("promoSheetUrl")}
    for ep in memes_data.get("storyEpisodes", []):
        for lang_data in ep.get("media", {}).values():
            cdn_urls.add(lang_data.get("url"))
    for it in memes_data.get("items", []):
        cdn_urls.add(it.get("url"))

    hreflang_map: dict[str, dict[str, str]] = {}
    for u_el in urls:
        loc = u_el.findtext("sm:loc", default="", namespaces=ns)
        links = {
            lk.attrib["hreflang"]: lk.attrib["href"]
            for lk in u_el.findall("xhtml:link", ns)
        }
        if links:
            hreflang_map[loc] = links
        for img_el in u_el.findall("image:image", ns):
            img_loc = img_el.findtext("image:loc", default="", namespaces=ns)
            if img_loc.startswith(f"{BASE_URL}/"):
                rel = img_loc[len(BASE_URL) + 1 :]
                disk = (ROOT / rel) if rel.startswith("evidence/") else (SITE_DIR / rel)
                assert disk.is_file(), f"Missing local sitemap image on disk: {img_loc} ({disk})"
            else:
                assert img_loc in cdn_urls, f"Non-verbatim CDN image in sitemap: {img_loc}"

    for loc, links in hreflang_map.items():
        for target in (links.get("en"), links.get("zh-CN")):
            assert target in hreflang_map, f"Missing alternate target {target} from {loc}"
            assert hreflang_map[target] == links, f"Asymmetric hreflang between {loc} and {target}"

    titles: set[str] = set()
    descs: set[str] = set()
    html_files = sorted(OUT_T_DIR.rglob("*.html"))
    expected_html = len(threads_en) * 2
    assert len(html_files) == expected_html, f"Expected {expected_html} static HTML files, got {len(html_files)}"

    for hp in html_files:
        raw = hp.read_text(encoding="utf-8")
        assert "t.co/" not in raw.lower(), f"t.co link found in {hp}"
        assert "fonts.googleapis.com" not in raw and "Noto+Sans+SC" not in raw, f"External font link found in {hp}"
        assert 'property="og:image:width"' in raw and 'property="og:image:height"' in raw, f"Missing og:image dimensions in {hp}"
        for img_tag in re.findall(r"<img\b[^>]*>", raw):
            assert 'width="' in img_tag and 'height="' in img_tag and 'decoding="async"' in img_tag, f"Missing img attrs in {hp}: {img_tag}"
        t_m = re.search(r"<title>([^<]+)</title>", raw)
        d_m = re.search(r'<meta name="description" content="([^"]*)"', raw)
        assert t_m and d_m, f"Missing title/description in {hp}"
        title_val = html.unescape(t_m.group(1))
        desc_val = html.unescape(d_m.group(1))
        assert "`" not in title_val and "`" not in desc_val, f"Raw backtick in title/desc of {hp}"
        assert len(title_val) <= 72, f"Title >72 chars ({len(title_val)}) in {hp}: {title_val!r}"
        assert title_val not in titles, f"Duplicate title {title_val!r} in {hp}"
        assert desc_val not in descs, f"Duplicate description {desc_val!r} in {hp}"
        assert len(desc_val) <= 160, f"Description >160 chars ({len(desc_val)}) in {hp}"
        titles.add(title_val)
        descs.add(desc_val)

        ld_blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', raw, re.S)
        assert len(ld_blocks) == 2, f"Expected 2 JSON-LD blocks in {hp}"
        for blk in ld_blocks:
            json.loads(blk)

        for attr in re.findall(r'(?:href|src)="([^"]+)"', raw):
            if attr.startswith(("http://", "https://", "mailto:", "#")):
                continue
            target_path = attr.split("?", 1)[0].split("#", 1)[0]
            resolved = (hp.parent / target_path).resolve()
            rel_site = resolved.relative_to(SITE_DIR.resolve()).as_posix()
            if rel_site.startswith("evidence/"):
                assert (ROOT / rel_site).is_file(), f"Missing evidence asset {attr} in {hp}"
            else:
                assert resolved.exists(), f"Broken local link/asset {attr} -> {resolved} in {hp}"

    print(f"Validated {len(html_files)} HTML files, {len(urls)} sitemap URLs, JSON-LD, hreflang, and local assets.")


def main() -> None:
    en_data = json.loads(THREADS_EN_PATH.read_text(encoding="utf-8"))
    zh_bundle = json.loads(THREADS_ZH_PATH.read_text(encoding="utf-8"))
    memes_data = json.loads(MEMES_PATH.read_text(encoding="utf-8"))

    threads_en = en_data["threads"]
    topics_en = {tp["id"]: tp["label"] for tp in en_data["topics"]}

    OUT_T_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_T_DIR / "thread.css").write_text(THREAD_CSS, encoding="utf-8")

    for idx, th in enumerate(threads_en):
        tid = th["id"]
        en_dir = OUT_T_DIR / tid
        zh_dir = en_dir / "zh"
        en_dir.mkdir(parents=True, exist_ok=True)
        zh_dir.mkdir(parents=True, exist_ok=True)

        (en_dir / "index.html").write_text(
            render_thread_html(th, idx, threads_en, zh_bundle, topics_en, "en"),
            encoding="utf-8",
        )
        (zh_dir / "index.html").write_text(
            render_thread_html(th, idx, threads_en, zh_bundle, topics_en, "zh-CN"),
            encoding="utf-8",
        )

    SITEMAP_PATH.write_text(build_sitemap(threads_en, zh_bundle, memes_data), encoding="utf-8")
    validate_outputs(threads_en, memes_data)


if __name__ == "__main__":
    main()
