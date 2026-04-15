import json
import os
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

import certifi


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS = {"a": MAIN_NS}


def normalize_text(value):
    return " ".join(str(value or "").replace("\r", " ").split()).strip()


def column_letters(cell_ref):
    return "".join(ch for ch in cell_ref if ch.isalpha())


def load_xlsx_rows(xlsx_path):
    with zipfile.ZipFile(xlsx_path) as archive:
        shared_strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for si in shared_root.findall("a:si", NS):
                shared_strings.append(
                    "".join(text.text or "" for text in si.findall(".//a:t", NS))
                )

        sheet_root = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
        rows = []

        for row in sheet_root.findall(".//a:sheetData/a:row", NS):
            values = {}
            for cell in row.findall("a:c", NS):
                ref = cell.attrib.get("r", "")
                column = column_letters(ref)
                cell_type = cell.attrib.get("t")
                value_node = cell.find("a:v", NS)
                inline_node = cell.find("a:is", NS)

                value = ""
                if value_node is not None:
                    raw_value = value_node.text or ""
                    if cell_type == "s":
                        value = shared_strings[int(raw_value)]
                    else:
                        value = raw_value
                elif inline_node is not None:
                    value = "".join(text.text or "" for text in inline_node.findall(".//a:t", NS))

                values[column] = normalize_text(value)

            rows.append(values)

        return rows


def rest_request(method, url, headers, payload=None):
    body = None
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(url, data=body, method=method)
    for key, value in headers.items():
        request.add_header(key, value)

    ssl_context = ssl.create_default_context(cafile=certifi.where())

    try:
        with urllib.request.urlopen(request, context=ssl_context) as response:
            content = response.read().decode("utf-8")
            return json.loads(content) if content else None
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8")
        raise RuntimeError(f"{error.code} {details}") from error


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/import-schools-from-xlsx.py <xlsx-path>", file=sys.stderr)
        sys.exit(1)

    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_role_key:
        print("Missing Supabase environment variables.", file=sys.stderr)
        sys.exit(1)

    xlsx_path = os.path.abspath(sys.argv[1])
    rows = load_xlsx_rows(xlsx_path)
    if len(rows) <= 1:
        print("No rows found in workbook.", file=sys.stderr)
        sys.exit(1)

    source_rows = rows[1:]
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
    }

    existing_schools = rest_request(
        "GET",
        f"{supabase_url}/rest/v1/schools?select=id,short_name,full_name",
        headers,
    ) or []

    existing_by_short = {
        normalize_text(item["short_name"]).lower(): item for item in existing_schools
    }

    seen_full_names = set()
    duplicates_adjusted = 0
    inserts = []
    updates = []

    for row in source_rows:
        short_name = normalize_text(row.get("A"))
        full_name = normalize_text(row.get("B"))
        school_email = normalize_text(row.get("C"))

        if not short_name or not full_name or not school_email:
            continue

        resolved_full_name = full_name
        normalized_full = full_name.lower()
        if normalized_full in seen_full_names:
            resolved_full_name = f"{full_name} ({short_name})"
            duplicates_adjusted += 1

        seen_full_names.add(normalized_full)

        payload = {
            "short_name": short_name,
            "full_name": resolved_full_name,
            "school_email": school_email,
            "teacher_name": None,
            "teacher_email": None,
            "send_certificate_to_school_by_default": False,
            "send_certificate_to_teacher_by_default": False,
            "is_active": True,
            "notes": None,
        }

        existing = existing_by_short.get(short_name.lower())
        if existing:
            updates.append({"id": existing["id"], **payload})
        else:
            inserts.append(payload)

    if inserts:
        rest_request(
            "POST",
            f"{supabase_url}/rest/v1/schools",
            {**headers, "Prefer": "return=representation"},
            inserts,
        )

    for item in updates:
        school_id = item.pop("id")
        query = urllib.parse.urlencode({"id": f"eq.{school_id}"})
        rest_request(
            "PATCH",
            f"{supabase_url}/rest/v1/schools?{query}",
            {**headers, "Prefer": "return=representation"},
            item,
        )

    print(f"Imported schools: {len(inserts)}")
    print(f"Updated schools: {len(updates)}")
    print(f"Adjusted duplicate full names: {duplicates_adjusted}")


if __name__ == "__main__":
    main()
