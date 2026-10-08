import json
import math
import re
import sys
import urllib.request

import UnityPy
from UnityPy.helpers.MeshHelper import MeshHandler

BASE = "https://livetiming.formula1.com/static/webgl/StreamingAssets/aa"
OUT = "src/server/circuits.json"
SCALE = 10
STEP = 100


def fetch(url):
    with urllib.request.urlopen(url) as res:
        return res.read()


def rotate(q, v):
    x, y, z, w = q.x, q.y, q.z, q.w
    tx, ty, tz = 2 * (y * v[2] - z * v[1]), 2 * (z * v[0] - x * v[2]), 2 * (x * v[1] - y * v[0])
    return (
        v[0] + w * tx + y * tz - z * ty,
        v[1] + w * ty + z * tx - x * tz,
        v[2] + w * tz + x * ty - y * tx,
    )


def world(transform, v):
    while transform:
        s, p = transform.m_LocalScale, transform.m_LocalPosition
        v = rotate(transform.m_LocalRotation, (v[0] * s.x, v[1] * s.y, v[2] * s.z))
        v = (v[0] + p.x, v[1] + p.y, v[2] + p.z)
        transform = transform.m_Father.read() if transform.m_Father.path_id else None
    return v


def resample(points):
    out, carry = [points[0]], 0.0
    for a, b in zip(points, points[1:] + points[:1]):
        d = math.dist(a, b)
        t = STEP - carry
        while t <= d:
            out.append((a[0] + (b[0] - a[0]) * t / d, a[1] + (b[1] - a[1]) * t / d))
            t += STEP
        carry = d - (t - STEP)
    return out[:-1] if math.dist(out[-1], out[0]) < STEP / 2 else out


def nearest(points, p):
    return min(range(len(points)), key=lambda i: math.dist(points[i], p))


def circuit(bundle):
    env = UnityPy.load(bundle)
    objects = {o.path_id: o for o in env.objects}
    transforms = {}
    for o in env.objects:
        if o.type.name == "Transform":
            t = o.read()
            transforms[t.m_GameObject.path_id] = t
    names = {o.path_id: o.read().m_Name for o in env.objects if o.type.name == "GameObject"}
    asset = next(
        o.read_typetree() for o in env.objects
        if o.type.name == "MonoBehaviour" and "CircuitKey" in o.read_typetree()
    )
    filters = [o.read() for o in env.objects if o.type.name == "MeshFilter"]

    def mesh(name):
        f = next(f for f in filters if names[f.m_GameObject.path_id] == name)
        handler = MeshHandler(objects[f.m_Mesh.path_id].read())
        handler.process()
        return [world(transforms[f.m_GameObject.path_id], v) for v in handler.m_Vertices or []]

    def centre(vertices, size):
        if len(vertices) % size:
            raise ValueError(f"{len(vertices)} vertices")
        return [
            tuple(sum(p[k] for p in vertices[i:i + size]) / size * SCALE for k in (0, 2))
            for i in range(0, len(vertices), size)
        ]

    line = centre(mesh("Track"), 4)
    pit = centre(mesh("Pit"), 2) if "Pit" in names.values() else []

    def spot(*labels):
        for gid, name in names.items():
            if name in labels:
                p = world(transforms[gid], (0, 0, 0))
                return (p[0] * SCALE, p[2] * SCALE)

    corners = {}
    for gid, name in names.items():
        m = re.fullmatch(r"corner_(\d+)", name)
        if m:
            p = world(transforms[gid], (0, 0, 0))
            corners[int(m[1])] = (p[0] * SCALE, p[2] * SCALE)
    finish = spot("finishPoint") or line[0]
    detection = spot("overtake_detect_point", "Overtake_dete_point")
    i = nearest(line, finish)
    line = line[i:] + line[:i]
    order = [nearest(line, corners[n]) for n in sorted(corners)]
    if sum(b < a for a, b in zip(order, order[1:])) > len(order) / 2:
        line = line[:1] + line[1:][::-1]
    line = resample(line)
    n = len(line)

    def span(name):
        index = sorted({nearest(line, (p[0] * SCALE, p[2] * SCALE)) for p in mesh(name)})
        end, start = max(zip(index, index[1:] + [index[0] + n]), key=lambda g: g[1] - g[0])
        return start % n, end

    spans = [span(f"S{k}") for k in (1, 2, 3)]
    sectors = [
        line[round(end + ((start - end + n // 2) % n - n // 2) / 2) % n]
        for (_, end), (start, _) in zip(spans[-1:] + spans[:-1], spans)
    ]
    date = lambda d: f"{d['Year']:04}-{d['Month']:02}-{d['Day']:02}"
    return {
        "key": asset["CircuitKey"],
        "from": date(asset["_validFrom"]),
        "to": date(asset["_validUpto"]),
        "x": [round(p[0]) for p in line],
        "y": [round(p[1]) for p in line],
        "corners": [
            {"number": n, "x": round(p[0]), "y": round(p[1])}
            for n, p in sorted(corners.items())
        ],
        "sectors": [{"x": round(p[0]), "y": round(p[1])} for p in sectors],
        "detection": detection and {"x": round(detection[0]), "y": round(detection[1])},
        "pit": {"x": [round(p[0]) for p in pit], "y": [round(p[1]) for p in pit]} if pit else None,
    }


def main():
    catalog = json.loads(fetch(f"{BASE}/catalog.json"))
    ids = [i for i in catalog["m_InternalIds"] if "_circuits_prefabs_circuits." in i]
    circuits = []
    for i in ids:
        name = i.split("/")[-1]
        try:
            circuits.append({"name": re.search(r"circuits\.(.+)\.prefab", name)[1], **circuit(fetch(f"{BASE}/WebGL/{name}"))})
        except Exception as e:
            print(f"skip {name}: {e}", file=sys.stderr)
    circuits.sort(key=lambda c: (c["key"], c["from"], c["name"]))
    with open(OUT, "w") as f:
        json.dump(circuits, f, separators=(",", ":"))
        f.write("\n")
    print(f"{len(circuits)} circuits")


if __name__ == "__main__":
    main()
