import os
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlparse, urljoin
import xml.etree.ElementTree as ET

os.chdir(Path(__file__).resolve().parent / "dist")
base = os.environ["SITE_URL"].rstrip("/") + "/"
class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonicals = []
        self.noindex = False
        self.ids = set()
        self.references = []
        self.selected_languages = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            assert attrs["id"] not in self.ids, f"Duplicate ID: {attrs['id']}"
            self.ids.add(attrs["id"])
        if tag in ("a", "link") and attrs.get("href"):
            self.references.append(attrs["href"])
        if tag in ("img", "source", "script") and attrs.get("src"):
            self.references.append(attrs["src"])
        if tag == "img":
            assert "alt" in attrs, f"Missing image alt: {attrs}"
        if tag == "a" and attrs.get("aria-current") == "page" and "hreflang" in attrs:
            self.selected_languages.append(attrs["href"])
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonicals.append(attrs.get("href"))
        if tag == "meta" and attrs.get("name", "").lower() == "robots":
            self.noindex |= "noindex" in attrs.get("content", "").lower()

root = ET.parse("sitemap.xml").getroot()
assert root.tag == "{http://www.sitemaps.org/schemas/sitemap/0.9}urlset"
urls = [node.text for node in root.findall("{*}url/{*}loc")]
assert urls and base in urls and len(urls) == len(set(urls)), "Missing or duplicate URLs"
for url in urls:
    assert url.startswith(base) and urlparse(url).scheme == "https", url
    relative = unquote(url[len(base):])
    filename = Path(relative + "index.html" if not relative or relative.endswith("/") else relative)
    assert filename.is_file(), f"Sitemap target does not exist: {filename}"
    if filename.suffix == ".html":
        page = Page(); page.feed(filename.read_text())
        assert page.canonicals == [url] and not page.noindex, f"Invalid index signals: {filename}"
    elif filename.suffix == ".pdf":
        assert filename.read_bytes().startswith(b"%PDF-"), filename
    else:
        raise AssertionError(f"Unexpected sitemap asset: {filename}")
robots = Path("robots.txt").read_text()
assert [line.strip() for line in robots.splitlines() if line.startswith("Sitemap:")] == ["Sitemap: " + base + "sitemap.xml"]
assert "Disallow: /" not in robots
old_base = os.environ.get("OLD_SITE_URL")
if old_base:
    for filename in ["index.html", "robots.txt", "sitemap.xml", "llms.txt", "site.webmanifest"]:
        target = Path(filename)
        if target.exists():
            assert old_base not in target.read_text(), f"Stale deployment URL in {filename}"
print(f"Verified {len(urls)} canonical sitemap targets and the robots declaration.")

html_paths = list(Path(".").rglob("index.html"))
expected = [base + path.as_posix().removesuffix("index.html") for path in html_paths]
expected += [base + path.as_posix() for path in Path("paper").glob("*.pdf")]
assert sorted(urls) == sorted(expected), "Sitemap omits a published page or paper"
materials = "https://tianfuwang.tech/SocialCoach-SupplementaryMaterials/"
assert materials in Path("index.html").read_text()
assert materials in Path("en/index.html").read_text()
print("Verified complete bilingual page and paper coverage, plus both materials links.")

# Resolve the same relative URLs the browser uses, including the repository
# prefix and links between English/Chinese guides. Catch missing media and anchors.
parsed = {}
for filename in html_paths:
    page = Page(); page.feed(filename.read_text())
    parsed[filename] = page
checked = 0
for filename, page in parsed.items():
    page_url = base + filename.as_posix().removesuffix("index.html")
    for selected in page.selected_languages:
        assert urljoin(page_url, selected) == page_url, f"Active language leaves {filename}"
    for reference in page.references:
        resolved = urljoin(page_url, reference)
        if not resolved.startswith(base):
            continue
        url = urlparse(resolved)
        relative = unquote(url.path[len(urlparse(base).path):])
        target = Path(relative + "index.html" if not relative or relative.endswith("/") else relative)
        assert target.is_file(), f"Broken local reference in {filename}: {reference}"
        if url.fragment and target in parsed:
            assert unquote(url.fragment) in parsed[target].ids, f"Missing anchor in {filename}: {reference}"
        checked += 1
print(f"Verified {checked} internal references, image alternatives and active language links.")
