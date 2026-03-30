import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import toast from "react-hot-toast";
import { Plus, Minus, MapPin, ArrowRight, Clock, RefreshCw, Home, Briefcase, MoreHorizontal } from "lucide-react";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  ON_THEWAY: "bg-purple-100 text-purple-800",
  IN_PROGRESS: "bg-orange-100 text-orange-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const labelIcons: Record<string, typeof Home> = { Home, Work: Briefcase, Other: MoreHorizontal };

const checkCityAvailable = async (city?: string | null) => {
  const cityValue = city?.trim();
  if (!cityValue) return false;
  try {
    const r = await api.get(`/users/cities/check?city=${encodeURIComponent(cityValue)}`);
    return Boolean(r.data?.available);
  } catch {
    return false;
  }
};

export default function UserHome() {
  const [step, setStep] = useState<"home" | "services" | "address" | "confirm">("home");
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [selectedCatName, setSelectedCatName] = useState("");
  const [subservices, setSubservices] = useState<any[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [servicetime, setServicetime] = useState("");
  const [description, setDescription] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [cityOk, setCityOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = () => {
    setCooldownLeft(30);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldownLeft((p) => { if (p <= 1) { clearInterval(cooldownRef.current!); cooldownRef.current = null; return 0; } return p - 1; });
    }, 1000);
  };
  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  const loadOrders = () => {
    api.get("/users/orders").then((r) => setOrders(r.data.orders)).catch(() => {});
  };

  const handleRefresh = () => {
    setRefreshing(true);
    api.get("/users/orders").then((r) => setOrders(r.data.orders)).catch(() => {}).finally(() => { setRefreshing(false); startCooldown(); });
  };

  useEffect(() => {
    Promise.all([
      api.get("/users/orders"),
      api.get("/users/addresses"),
      api.get("/auth/categories/active"),
    ]).then(async ([ordRes, addrRes, catRes]) => {
      setOrders(ordRes.data.orders);
      const addrs = addrRes.data.addresses || [];
      setAddresses(addrs);
      setCategories(catRes.data.categories || []);
      if (addrs.length > 0) {
        setSelectedAddressId(addrs[0].id);
        const uniqueCities = [
          ...new Set(
            addrs
              .map((a: any) => (typeof a.city === "string" ? a.city.trim() : ""))
              .filter(Boolean),
          ),
        ] as string[];

        if (uniqueCities.length === 0) {
          setCityOk(null);
          return;
        }

        const checks = await Promise.all(uniqueCities.map((city) => checkCityAvailable(city)));
        setCityOk(checks.some(Boolean));
      }
    });
  }, []);

  useEffect(() => {
    if (step !== "home") return;
    const interval = setInterval(loadOrders, 60000);
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (selectedCatId) {
      api.get(`/users/subservices?categoryId=${selectedCatId}`).then((r) => setSubservices(r.data.subservices));
    }
  }, [selectedCatId]);

  const updateCart = (id: number, delta: number) => {
    setCart((prev) => {
      const qty = (prev[id] || 0) + delta;
      if (qty <= 0) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: qty };
    });
  };

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const sub = subservices.find((s) => s.id === Number(id));
    return { subserviceId: Number(id), name: sub?.name, price: sub?.price || 0, quantity: qty };
  });
  const totalPrice = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleOrder = async () => {
    if (!selectedAddressId) { toast.error("Select an address"); return; }
    if (!servicetime) { toast.error("Select a service time"); return; }
    setLoading(true);
    try {
      const services = cartItems.map((i) => ({
        subserviceId: i.subserviceId,
        serviceCharge: i.price * i.quantity,
      }));
      await api.post("/users/orders", {
        name: `${selectedCatName} service`,
        description,
        servicetime,
        services,
        addressId: selectedAddressId,
      });
      toast.success("Order placed successfully!");
      setStep("home"); setCart({}); setSelectedCatId(null); setSelectedCatName("");
      const r = await api.get("/users/orders");
      setOrders(r.data.orders);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Order failed");
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = orders.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.status));
  const pastOrders = orders.filter((o) => ["COMPLETED", "CANCELLED"].includes(o.status));

  if (cityOk === false) {
    return (
      <div className="px-4 lg:px-6 py-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <MapPin className="mx-auto text-red-400 mb-3" size={28} />
          <h2 className="text-base font-bold text-red-800 mb-1">Service Not Available</h2>
          <p className="text-sm text-red-600">We don't serve your city yet. We're expanding soon!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6 py-4 pb-20 md:pb-6">
      {/* HOME: Category selection */}
      {step === "home" && (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">What do you need?</h1>
                <p className="text-xs text-gray-500">Choose a service category</p>
              </div>
              <button onClick={handleRefresh} disabled={refreshing || cooldownLeft > 0}
                className={`p-1.5 rounded-md transition flex items-center gap-1 ${refreshing ? "text-gray-500" : cooldownLeft > 0 ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"}`} title={refreshing ? "Refreshing…" : cooldownLeft > 0 ? `Wait ${cooldownLeft}s` : "Refresh"}>
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                {cooldownLeft > 0 && !refreshing && <span className="text-[10px] font-medium text-gray-400">{cooldownLeft}s</span>}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => { setSelectedCatId(cat.id); setSelectedCatName(cat.name); setCart({}); setStep("services"); }}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-400 transition text-left">
                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center mb-2 text-lg">
                  {cat.name.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm font-semibold text-gray-900 capitalize">{cat.name}</p>
                {cat.description && <p className="text-[11px] text-gray-400 truncate">{cat.description}</p>}
              </button>
            ))}
          </div>

          {activeOrders.length > 0 && (
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                <Clock size={14} className="text-amber-500" /> Active Orders
              </h2>
              <div className="space-y-1.5">
                {activeOrders.map((order) => (
                  <Link key={order.id} to={`/user/orders/${order.id}`}
                    className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{order.name || "Service Order"}</p>
                      <p className="text-[11px] text-gray-400">{order.addressUser?.city}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${statusColors[order.status]}`}>
                        {order.status.replace("_", " ")}
                      </span>
                      <span className="text-xs font-semibold">₹{order.totalPrice ?? 0}</span>
                      <ArrowRight size={12} className="text-gray-300" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {pastOrders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Past Orders</h2>
              <div className="space-y-1.5">
                {pastOrders.slice(0, 5).map((order) => (
                  <Link key={order.id} to={`/user/orders/${order.id}`}
                    className="flex items-center justify-between bg-white rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{order.name || "Service Order"}</p>
                      <p className="text-[11px] text-gray-400">{order.agent?.name ? `by ${order.agent.name}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${statusColors[order.status]}`}>{order.status}</span>
                      <span className="text-xs font-semibold">₹{order.totalPrice ?? 0}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* SERVICES: Pick subservices */}
      {step === "services" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 capitalize">{selectedCatName} Services</h1>
              <p className="text-xs text-gray-500">Pick what you need</p>
            </div>
            <button onClick={() => { setStep("home"); setCart({}); setSelectedCatId(null); setSelectedCatName(""); }}
              className="text-xs text-gray-500 hover:text-gray-900">← Back</button>
          </div>

          {subservices.length === 0 ? (
            <p className="text-gray-400 text-center py-8 bg-white rounded-lg border text-sm">No services available yet.</p>
          ) : (
            <div className="space-y-2">
              {subservices.map((s) => (
                <div key={s.id} className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    {s.description && <p className="text-[11px] text-gray-400 truncate">{s.description}</p>}
                    <p className="text-xs font-bold text-amber-600 mt-0.5">₹{s.price}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {cart[s.id] ? (
                      <>
                        <button onClick={() => updateCart(s.id, -1)} className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{cart[s.id]}</span>
                        <button onClick={() => updateCart(s.id, 1)} className="w-7 h-7 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center hover:bg-amber-200">
                          <Plus size={14} />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => updateCart(s.id, 1)} className="px-3 py-1 bg-amber-50 text-amber-600 rounded-md text-xs font-medium hover:bg-amber-100">
                        Add
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {Object.keys(cart).length > 0 && (
            <div className="bg-amber-50 rounded-lg p-3 flex justify-between items-center mt-3 sticky bottom-4 border border-amber-200">
              <div>
                <p className="text-sm font-medium text-gray-900">{cartItems.length} service(s)</p>
                <p className="text-base font-bold text-amber-600">₹{totalPrice}</p>
              </div>
              <button onClick={() => setStep("address")} className="bg-gray-900 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-gray-800 active:scale-[0.97] transition-all shadow-sm">
                Continue
              </button>
            </div>
          )}
        </div>
      )}

      {/* ADDRESS + TIME */}
      {step === "address" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-gray-900">Address & Time</h1>
            <button onClick={() => setStep("services")} className="text-xs text-gray-500 hover:text-gray-900">← Back</button>
          </div>
          <div className="space-y-2 mb-3">
            {addresses.map((a) => {
              const Icon = labelIcons[a.label] || Home;
              return (
                <label key={a.id} className={`block bg-white border-2 rounded-lg p-3 cursor-pointer transition ${
                  selectedAddressId === a.id ? "border-gray-900 bg-gray-50" : "border-gray-200"
                }`}>
                  <input type="radio" name="address" className="sr-only"
                    checked={selectedAddressId === a.id} onChange={() => setSelectedAddressId(a.id)} />
                  <div className="flex items-start gap-2">
                    <Icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-semibold text-gray-500 uppercase">{a.label || "Home"}</span>
                      <p className="text-sm font-medium text-gray-900">{a.address}</p>
                      <p className="text-xs text-gray-500">{a.city} - {a.pin}</p>
                    </div>
                  </div>
                </label>
              );
            })}
            {addresses.length === 0 && (
              <div className="text-center py-4 bg-white rounded-lg border border-gray-200">
                <p className="text-sm text-gray-400 mb-2">No addresses found</p>
                <Link to="/user/profile" className="text-xs text-gray-900 font-semibold hover:underline">Add an address →</Link>
              </div>
            )}
          </div>
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Service Date & Time</label>
            <div className="flex gap-2">
              <input type="datetime-local" value={servicetime} onChange={(e) => setServicetime(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-gray-400 outline-none text-sm" />
              <button type="button" onClick={() => {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                setServicetime(now.toISOString().slice(0, 16));
              }}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-200 border border-gray-200 whitespace-nowrap">
                Now
              </button>
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-gray-400 outline-none text-sm"
              placeholder="Describe the issue..." />
          </div>
          <button onClick={() => setStep("confirm")} disabled={!selectedAddressId || !servicetime}
            className="w-full bg-gray-900 text-white py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 active:scale-[0.98] disabled:opacity-40 transition-all shadow-sm">
            Review Order
          </button>
        </div>
      )}

      {/* CONFIRM */}
      {step === "confirm" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-gray-900">Confirm Order</h1>
            <button onClick={() => setStep("address")} className="text-xs text-gray-500 hover:text-gray-900">← Back</button>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2 mb-3 text-sm">
            <p className="text-[11px] font-medium text-gray-400 uppercase">Services</p>
            {cartItems.map((i) => (
              <div key={i.subserviceId} className="flex justify-between">
                <span>{i.name} × {i.quantity}</span>
                <span className="font-medium">₹{i.price * i.quantity}</span>
              </div>
            ))}
            <hr />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span><span className="text-amber-600">₹{totalPrice}</span>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3 text-sm">
            <p className="text-[11px] font-medium text-gray-400 uppercase mb-1">Address</p>
            <p className="font-medium">{addresses.find((a) => a.id === selectedAddressId)?.address}</p>
            <p className="text-xs text-gray-500">{addresses.find((a) => a.id === selectedAddressId)?.city}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3 text-sm">
            <p className="text-[11px] font-medium text-gray-400 uppercase mb-1">Service Time</p>
            <p className="font-medium">{new Date(servicetime).toLocaleString()}</p>
          </div>
          <button onClick={handleOrder} disabled={loading}
            className="w-full bg-green-600 text-white py-2.5 rounded-full font-semibold text-sm hover:bg-green-700 active:scale-[0.98] disabled:opacity-40 transition-all shadow-sm">
            {loading ? "Placing Order..." : "Place Order"}
          </button>
        </div>
      )}
    </div>
  );
}
