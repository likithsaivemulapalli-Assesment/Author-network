import csv, json, itertools, re, pathlib

IN = "data/data_scopus.csv"
OUT = "data/author_network.json"

def split_ids(s): return [x.strip() for x in s.split(";") if x.strip()]
def parse_countries(auth_aff_str):
    blocks = [b.strip() for b in auth_aff_str.split(";") if b.strip()]
    out = []
    for b in blocks:
        parts = [p.strip() for p in b.split(",") if p.strip()]
        out.append(parts[-1] if parts else "Unknown")
    return out

rows=[]
with open(IN, newline="", encoding="utf-8") as f:
    r=csv.DictReader(f)
    for row in r:
        if not (row.get("Year") and row.get("Authors") and row.get("Author(s) ID") and row.get("Authors with affiliations")):
            continue
        rows.append(row)

nodes={}      # id -> {id,name,country,degree}
edges={}      # (s,t) -> weight

for row in rows:
    ids = split_ids(row["Author(s) ID"])
    # split author names robustly
    names = [n.strip() for n in re.split(r"\s*,\s*(?=[A-ZÀ-ÖØ-öø-ÿ].)", row["Authors"]) if n.strip()]
    countries = parse_countries(row["Authors with affiliations"])

    k=len(ids)
    if len(names)!=k:     names = (names + ["Unknown"]*k)[:k]
    if len(countries)!=k: countries = (countries + ["Unknown"]*k)[:k]

    for aid, nm, co in zip(ids, names, countries):
        if aid not in nodes:
            nodes[aid] = {"id": aid, "name": nm, "country": co, "degree": 0}

    for a,b in itertools.combinations(ids,2):
        s,t = sorted((a,b))
        edges[(s,t)] = edges.get((s,t),0) + 1

# degree = unique neighbors
deg={nid:0 for nid in nodes}
for (s,t),w in edges.items():
    deg[s]+=1; deg[t]+=1
for nid,d in deg.items(): nodes[nid]["degree"]=d

data={"nodes": list(nodes.values()),
      "links":[{"source":s,"target":t,"weight":w} for (s,t),w in edges.items()]}

pathlib.Path(OUT).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Wrote {OUT} with {len(data['nodes'])} nodes and {len(data['links'])} links.")
