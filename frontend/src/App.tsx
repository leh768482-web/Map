
import {
  useEffect,
  useRef,
  useState
} from "react";

import maplibregl, {
  Map,
  Marker
} from "maplibre-gl";

type Place = {
  id: string;

  name: string;

  type: string;

  icon: string;

  color: string;

  description: string;

  note: string;

  imageUrl?: string | null;

  latitude: number;

  longitude: number;

  favorite: boolean;
};

const API = "/api";

const DEFAULT_PLACE = {
  name: "Địa điểm mới",

  type: "other",

  icon: "📍",

  color: "#2563eb",

  description: "",

  note: "",

  latitude: 10.4114,

  longitude: 107.1362,

  favorite: false
};

function getMapStyle() {
  const key =
    import.meta.env.VITE_MAPTILER_API_KEY;

  if (key) {
    return `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`;
  }

  return "https://demotiles.maplibre.org/style.json";
}

export default function App() {
  const mapElement =
    useRef<HTMLDivElement>(null);

  const mapRef =
    useRef<Map | null>(null);

  const markers =
    useRef<Record<string, Marker>>({});

  const [places, setPlaces] =
    useState<Place[]>([]);

  const [selected, setSelected] =
    useState<Place | null>(null);

  const [form, setForm] =
    useState<any>(DEFAULT_PLACE);

  const [adding, setAdding] =
    useState(false);

  const [vipOpen, setVipOpen] =
    useState(false);

  const [vipCode, setVipCode] =
    useState("");

  const [vip, setVip] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [mode, setMode] =
    useState<"2D" | "3D">("3D");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* =========================
     MAP
  ========================= */

  useEffect(() => {
    if (!mapElement.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapElement.current,

      style: getMapStyle(),

      center: [
        107.1362,
        10.4114
      ],

      zoom: 3,

      pitch: 45,

      attributionControl: true
    });

    map.addControl(
      new maplibregl.NavigationControl(),
      "bottom-right"
    );

    map.on("load", () => {
      setLoading(false);
    });

    map.on("click", event => {
      if (!adding) {
        return;
      }

      setForm({
        ...DEFAULT_PLACE,

        latitude: event.lngLat.lat,

        longitude: event.lngLat.lng
      });

      setSelected(null);
    });

    mapRef.current = map;

    return () => {
      map.remove();

      mapRef.current = null;
    };
  }, [adding]);

  /* =========================
     LOAD PLACES
  ========================= */

  useEffect(() => {
    fetch(`${API}/places`)
      .then(response => {
        if (!response.ok) {
          throw new Error();
        }

        return response.json();
      })
      .then(data => {
        setPlaces(data);
      })
      .catch(() => {
        setError(
          "Không tải được dữ liệu địa điểm."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  /* =========================
     MARKERS
  ========================= */

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    Object.values(markers.current)
      .forEach(marker => marker.remove());

    markers.current = {};

    places.forEach(place => {
      const element =
        document.createElement("button");

      element.className = "marker";

      element.style.background =
        place.color;

      element.textContent =
        place.icon;

      element.title =
        place.name;

      element.onclick = event => {
        event.stopPropagation();

        setSelected(place);

        setForm(place);

        mapRef.current?.flyTo({
          center: [
            place.longitude,
            place.latitude
          ],

          zoom: 15
        });
      };

      const marker =
        new maplibregl.Marker({
          element
        })
          .setLngLat([
            place.longitude,
            place.latitude
          ])
          .addTo(mapRef.current!);

      markers.current[place.id] =
        marker;
    });
  }, [places]);

  /* =========================
     SAVE
  ========================= */

  async function savePlace() {
    setError("");

    try {
      const editing =
        Boolean(form.id);

      const response =
        await fetch(
          editing
            ? `${API}/places/${form.id}`
            : `${API}/places`,
          {
            method:
              editing
                ? "PATCH"
                : "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(form)
          }
        );

      if (!response.ok) {
        throw new Error();
      }

      const saved =
        await response.json();

      if (editing) {
        setPlaces(old =>
          old.map(place =>
            place.id === saved.id
              ? saved
              : place
          )
        );
      } else {
        setPlaces(old => [
          saved,
          ...old
        ]);
      }

      setSelected(saved);

      setForm(saved);

      setAdding(false);
    } catch {
      setError(
        "Không thể lưu địa điểm."
      );
    }
  }

  /* =========================
     DELETE
  ========================= */

  async function deletePlace() {
    if (!form.id) {
      return;
    }

    try {
      const response =
        await fetch(
          `${API}/places/${form.id}`,
          {
            method: "DELETE"
          }
        );

      if (!response.ok) {
        throw new Error();
      }

      setPlaces(old =>
        old.filter(
          place =>
            place.id !== form.id
        )
      );

      setSelected(null);

      setForm(DEFAULT_PLACE);
    } catch {
      setError(
        "Không thể xóa địa điểm."
      );
    }
  }

  /* =========================
     VIP
  ========================= */

  async function verifyVip() {
    try {
      const response =
        await fetch(
          `${API}/vip/verify`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              code: vipCode
            })
          }
        );

      const data =
        await response.json();

      if (!data.valid) {
        setVip(false);

        setError(
          "Mã VIP không hợp lệ."
        );

        return;
      }

      setVip(true);

      setVipOpen(false);

      setError("");
    } catch {
      setError(
        "Không thể kiểm tra VIP."
      );
    }
  }

  /* =========================
     SEARCH
  ========================= */

  function findPlace() {
    const query =
      search
        .trim()
        .toLowerCase();

    if (!query) {
      return;
    }

    const place =
      places.find(item =>
        item.name
          .toLowerCase()
          .includes(query)
      );

    if (!place) {
      setError(
        "Chưa tìm thấy địa điểm tùy chỉnh. Hãy cấu hình geocoder/provider được cấp phép để tìm kiếm toàn cầu."
      );

      return;
    }

    mapRef.current?.flyTo({
      center: [
        place.longitude,
        place.latitude
      ],

      zoom: 15
    });

    setSelected(place);

    setForm(place);
  }

  /* =========================
     2D / 3D
  ========================= */

  function toggle3D() {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    if (mode === "3D") {
      map.easeTo({
        pitch: 0,
        duration: 800
      });

      setMode("2D");
    } else {
      map.easeTo({
        pitch: 45,
        duration: 800
      });

      setMode("3D");
    }
  }

  /* =========================
     WORLD VIEW
  ========================= */

  function worldView() {
    mapRef.current?.flyTo({
      center: [0, 20],

      zoom: 1.5,

      pitch: mode === "3D"
        ? 45
        : 0
    });
  }

  return (
    <div className="app">

      <div
        ref={mapElement}
        className="map"
      />

      {/* TOP BAR */}

      <header className="topbar">

        <div className="brand">
          🌍
          <b>
            REAL WORLD MAP
          </b>

          <span>
            3D
          </span>
        </div>

        <div className="search">

          <input
            value={search}
            onChange={event =>
              setSearch(
                event.target.value
              )
            }
            onKeyDown={event => {
              if (
                event.key ===
                "Enter"
              ) {
                findPlace();
              }
            }}
            placeholder="Tìm địa điểm..."
          />

          <button
            onClick={findPlace}
          >
            🔍
          </button>

        </div>

      </header>

      {/* LEFT PANEL */}

      <aside className="panel left">

        <button
          className="primary"
          onClick={() => {
            setAdding(true);

            setForm(
              DEFAULT_PLACE
            );

            setSelected(null);
          }}
        >
          ＋ Thêm địa điểm
        </button>

        <button
          onClick={() =>
            setAdding(
              value => !value
            )
          }
        >
          📍{" "}
          {adding
            ? "Đang chọn vị trí..."
            : "Chọn trên bản đồ"}
        </button>

        <button
          onClick={toggle3D}
        >
          🧭 {mode}
        </button>

        <button
          onClick={worldView}
        >
          🌐 Toàn thế giới
        </button>

        <button
          onClick={() =>
            setVipOpen(true)
          }
        >
          👑 VIP
        </button>

        {vip && (
          <div className="vipBadge">
            VIP đã mở
          </div>
        )}

      </aside>

      {/* RIGHT PANEL */}

      <aside className="panel right">

        <h3>
          📌 Địa điểm
        </h3>

        <div className="placeList">

          {places.map(place => (
            <button
              key={place.id}
              className="placeRow"
              onClick={() => {
                setSelected(
                  place
                );

                setForm(place);

                mapRef.current?.flyTo({
                  center: [
                    place.longitude,
                    place.latitude
                  ],

                  zoom: 15
                });
              }}
            >

              <span>
                {place.icon}
              </span>

              <span>
                {place.name}
              </span>

              {place.favorite && (
                <span>
                  ⭐
                </span>
              )}

            </button>
          ))}

          {!places.length && (
            <div className="muted">
              Chưa có địa điểm nào.
            </div>
          )}

        </div>

      </aside>

      {/* EDITOR */}

      {selected && (
        <div className="editor">

          <div className="editorHead">

            <b>
              Chỉnh sửa địa điểm
            </b>

            <button
              onClick={() =>
                setSelected(null)
              }
            >
              ✕
            </button>

          </div>

          <label>
            Tên

            <input
              value={
                form.name || ""
              }
              onChange={event =>
                setForm({
                  ...form,
                  name:
                    event.target.value
                })
              }
            />
          </label>

          <label>
            Loại

            <input
              value={
                form.type || ""
              }
              onChange={event =>
                setForm({
                  ...form,
                  type:
                    event.target.value
                })
              }
            />
          </label>

          <div className="two">

            <label>
              Icon

              <input
                value={
                  form.icon ||
                  "📍"
                }
                onChange={event =>
                  setForm({
                    ...form,
                    icon:
                      event.target.value
                  })
                }
              />
            </label>

            <label>
              Màu

              <input
                type="color"
                value={
                  form.color ||
                  "#2563eb"
                }
                onChange={event =>
                  setForm({
                    ...form,
                    color:
                      event.target.value
                  })
                }
              />
            </label>

          </div>

          <label>
            Mô tả

            <textarea
              value={
                form.description ||
                ""
              }
              onChange={event =>
                setForm({
                  ...form,
                  description:
                    event.target.value
                })
              }
            />
          </label>

          <label>
            Ghi chú

            <textarea
              value={
                form.note || ""
              }
              onChange={event =>
                setForm({
                  ...form,
                  note:
                    event.target.value
                })
              }
            />
          </label>

          <label className="check">

            <input
              type="checkbox"
              checked={
                Boolean(
                  form.favorite
                )
              }
              onChange={event =>
                setForm({
                  ...form,
                  favorite:
                    event.target.checked
                })
              }
            />

            ⭐ Yêu thích

          </label>

          <div className="actions">

            <button
              className="primary"
              onClick={savePlace}
            >
              💾 Lưu
            </button>

            {form.id && (
              <button
                className="danger"
                onClick={deletePlace}
              >
                🗑 Xóa
              </button>
            )}

          </div>

        </div>
      )}

      {/* ADD HINT */}

      {adding && !selected && (
        <div className="hint">
          Chạm vào bản đồ để đặt địa điểm mới.
        </div>
      )}

      {/* VIP */}

      {vipOpen && (
        <div className="modal">

          <div className="dialog">

            <h2>
              👑 VIP
            </h2>

            <p>
              Nhập mã VIP để kiểm tra ở máy chủ.
            </p>

            <input
              value={vipCode}
              onChange={event =>
                setVipCode(
                  event.target.value
                )
              }
              placeholder="Nhập mã VIP"
            />

            <div className="actions">

              <button
                onClick={() =>
                  setVipOpen(false)
                }
              >
                Hủy
              </button>

              <button
                className="primary"
                onClick={verifyVip}
              >
                Xác nhận
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="toast">

          ⚠️ {error}

          <button
            onClick={() =>
              setError("")
            }
          >
            ✕
          </button>

        </div>
      )}

      {/* LOADING */}

      {loading && (
        <div className="loading">
          Đang tải bản đồ…
        </div>
      )}

    </div>
  );
  }
