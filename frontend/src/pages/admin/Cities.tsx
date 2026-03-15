import { useEffect, useState } from "react";
import api from "../../api";
import toast from "react-hot-toast";
import { MapPin, Plus, Trash2, ToggleLeft, ToggleRight, Search } from "lucide-react";

const INDIAN_CITIES = [
  { name: "Mumbai", state: "Maharashtra" }, { name: "Delhi", state: "Delhi" },
  { name: "Bangalore", state: "Karnataka" }, { name: "Hyderabad", state: "Telangana" },
  { name: "Ahmedabad", state: "Gujarat" }, { name: "Chennai", state: "Tamil Nadu" },
  { name: "Kolkata", state: "West Bengal" }, { name: "Pune", state: "Maharashtra" },
  { name: "Jaipur", state: "Rajasthan" }, { name: "Surat", state: "Gujarat" },
  { name: "Lucknow", state: "Uttar Pradesh" }, { name: "Kanpur", state: "Uttar Pradesh" },
  { name: "Nagpur", state: "Maharashtra" }, { name: "Indore", state: "Madhya Pradesh" },
  { name: "Thane", state: "Maharashtra" }, { name: "Bhopal", state: "Madhya Pradesh" },
  { name: "Visakhapatnam", state: "Andhra Pradesh" }, { name: "Patna", state: "Bihar" },
  { name: "Vadodara", state: "Gujarat" }, { name: "Ghaziabad", state: "Uttar Pradesh" },
  { name: "Ludhiana", state: "Punjab" }, { name: "Agra", state: "Uttar Pradesh" },
  { name: "Nashik", state: "Maharashtra" }, { name: "Ranchi", state: "Jharkhand" },
  { name: "Faridabad", state: "Haryana" }, { name: "Meerut", state: "Uttar Pradesh" },
  { name: "Rajkot", state: "Gujarat" }, { name: "Varanasi", state: "Uttar Pradesh" },
  { name: "Srinagar", state: "Jammu & Kashmir" }, { name: "Amritsar", state: "Punjab" },
  { name: "Allahabad", state: "Uttar Pradesh" }, { name: "Coimbatore", state: "Tamil Nadu" },
  { name: "Jabalpur", state: "Madhya Pradesh" }, { name: "Gwalior", state: "Madhya Pradesh" },
  { name: "Vijayawada", state: "Andhra Pradesh" }, { name: "Jodhpur", state: "Rajasthan" },
  { name: "Madurai", state: "Tamil Nadu" }, { name: "Raipur", state: "Chhattisgarh" },
  { name: "Kota", state: "Rajasthan" }, { name: "Chandigarh", state: "Chandigarh" },
  { name: "Guwahati", state: "Assam" }, { name: "Solapur", state: "Maharashtra" },
  { name: "Hubli", state: "Karnataka" }, { name: "Mysore", state: "Karnataka" },
  { name: "Tiruchirappalli", state: "Tamil Nadu" }, { name: "Bareilly", state: "Uttar Pradesh" },
  { name: "Aligarh", state: "Uttar Pradesh" }, { name: "Tiruppur", state: "Tamil Nadu" },
  { name: "Moradabad", state: "Uttar Pradesh" }, { name: "Jalandhar", state: "Punjab" },
  { name: "Bhubaneswar", state: "Odisha" }, { name: "Salem", state: "Tamil Nadu" },
  { name: "Warangal", state: "Telangana" }, { name: "Guntur", state: "Andhra Pradesh" },
  { name: "Bhiwandi", state: "Maharashtra" }, { name: "Saharanpur", state: "Uttar Pradesh" },
  { name: "Gorakhpur", state: "Uttar Pradesh" }, { name: "Bikaner", state: "Rajasthan" },
  { name: "Amravati", state: "Maharashtra" }, { name: "Noida", state: "Uttar Pradesh" },
  { name: "Jamshedpur", state: "Jharkhand" }, { name: "Bhilai", state: "Chhattisgarh" },
  { name: "Cuttack", state: "Odisha" }, { name: "Firozabad", state: "Uttar Pradesh" },
  { name: "Kochi", state: "Kerala" }, { name: "Nellore", state: "Andhra Pradesh" },
  { name: "Bhavnagar", state: "Gujarat" }, { name: "Dehradun", state: "Uttarakhand" },
  { name: "Durgapur", state: "West Bengal" }, { name: "Asansol", state: "West Bengal" },
  { name: "Rourkela", state: "Odisha" }, { name: "Nanded", state: "Maharashtra" },
  { name: "Kolhapur", state: "Maharashtra" }, { name: "Ajmer", state: "Rajasthan" },
  { name: "Gulbarga", state: "Karnataka" }, { name: "Jamnagar", state: "Gujarat" },
  { name: "Ujjain", state: "Madhya Pradesh" }, { name: "Loni", state: "Uttar Pradesh" },
  { name: "Siliguri", state: "West Bengal" }, { name: "Jhansi", state: "Uttar Pradesh" },
  { name: "Ulhasnagar", state: "Maharashtra" }, { name: "Jammu", state: "Jammu & Kashmir" },
  { name: "Mangalore", state: "Karnataka" }, { name: "Erode", state: "Tamil Nadu" },
  { name: "Belgaum", state: "Karnataka" }, { name: "Ambattur", state: "Tamil Nadu" },
  { name: "Tirunelveli", state: "Tamil Nadu" }, { name: "Malegaon", state: "Maharashtra" },
  { name: "Gaya", state: "Bihar" }, { name: "Udaipur", state: "Rajasthan" },
  { name: "Thiruvananthapuram", state: "Kerala" }, { name: "Kozhikode", state: "Kerala" },
  { name: "Shimla", state: "Himachal Pradesh" }, { name: "Gangtok", state: "Sikkim" },
  { name: "Imphal", state: "Manipur" }, { name: "Shillong", state: "Meghalaya" },
  { name: "Aizawl", state: "Mizoram" }, { name: "Kohima", state: "Nagaland" },
  { name: "Agartala", state: "Tripura" }, { name: "Itanagar", state: "Arunachal Pradesh" },
  { name: "Panaji", state: "Goa" }, { name: "Pondicherry", state: "Puducherry" },
  { name: "Gurugram", state: "Haryana" },
];

export default function AdminCities() {
  const [cities, setCities] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newState, setNewState] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get("/admin/cities").then((r) => { setCities(r.data.cities); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const existingNames = cities.map((c) => c.name.toLowerCase());
  const suggestions = INDIAN_CITIES.filter(
    (ic) => ic.name.toLowerCase().includes(search.toLowerCase()) && !existingNames.includes(ic.name.toLowerCase())
  ).slice(0, 8);

  const addCity = async (name: string, state?: string) => {
    if (!name.trim()) { toast.error("City name required"); return; }
    try {
      await api.post("/admin/cities", { name, state: state || newState || undefined });
      toast.success(`${name} added!`);
      setSearch(""); setNewState(""); setShowSuggestions(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed");
    }
  };

  const removeCity = async (id: number) => {
    try {
      await api.delete(`/admin/cities/${id}`);
      toast.success("City removed");
      load();
    } catch { toast.error("Failed to remove"); }
  };

  const toggleCity = async (id: number) => {
    try {
      await api.patch(`/admin/cities/${id}/toggle`);
      load();
    } catch { toast.error("Failed"); }
  };

  return (
    <div className="px-4 lg:px-6 py-4">
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Manage Cities</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input placeholder="Search Indian cities..." value={search}
                onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-amber-400 text-sm" />
            </div>
            {showSuggestions && search && suggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                {suggestions.map((s) => (
                  <button key={s.name} onClick={() => addCity(s.name, s.state)}
                    className="w-full text-left px-3 py-2 hover:bg-amber-50 flex justify-between items-center text-sm border-b border-gray-50 last:border-0">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-[11px] text-gray-400">{s.state}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => addCity(search)}
            className="bg-gray-900 text-white px-3.5 py-2 rounded-full hover:bg-gray-800 active:scale-[0.97] flex items-center gap-1 shrink-0 text-sm font-semibold transition-all shadow-sm">
            <Plus size={14} /> Add
          </button>
        </div>
        {showSuggestions && search && suggestions.length === 0 && (
          <p className="text-[11px] text-gray-400 mt-1.5">No matching city. Click Add for custom city.</p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" /></div>
      ) : cities.length === 0 ? (
        <p className="text-gray-400 text-center py-6 bg-white rounded-lg border text-sm">No cities added yet</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((c) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex justify-between items-center">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin size={14} className={c.isActive ? "text-green-500 shrink-0" : "text-gray-300 shrink-0"} />
                <div className="min-w-0">
                  <p className="font-medium text-sm capitalize truncate">{c.name}</p>
                  {c.state && <p className="text-[11px] text-gray-400">{c.state}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleCity(c.id)} className={`p-1 rounded ${c.isActive ? "text-green-600" : "text-gray-400"}`}>
                  {c.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>
                <button onClick={() => removeCity(c.id)} className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
