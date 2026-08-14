import { useState, useEffect, useCallback } from "react";
import {
  Search, MapPin, Calendar, Clock, ChevronLeft, ChevronDown,
  Plus, Minus, Download, Check, LayoutDashboard,
  Ticket, Wallet, LogOut, Eye, EyeOff, TrendingUp,
  Users, ShieldCheck, ArrowUpRight, ArrowDownLeft,
  ChevronRight, Sparkles, ImagePlus, Trash2,
  CircleDollarSign, CreditCard, AlertCircle,
  FlashlightOff, Flashlight, UserCheck, CircleX,
  Hash, UserPlus, BadgeCheck, QrCode, Store,
  PartyPopper, RotateCcw, Share2, ClipboardCheck,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Tanda { id: number; name: string; price: number; available: number }
interface BuyerEvent {
  id: number; title: string; venue: string; date: string; time: string;
  image: string; category: string; tandas: Tanda[]; description: string;
}
type BuyerScreen = "listing" | "detail" | "checkout" | "success";
type OrgScreen   = "login" | "register" | "dashboard" | "wizard" | "wallet" | "staff";
type StaffRole   = "qr" | "vendedor";
type StaffScreen = "scanner" | "valid" | "invalid";
type AppMode     = "buyer" | "org" | "staff" | "admin";
type AdminScreen = "login" | "dashboard" | "users" | "events" | "config";
type AdminUserStatus = "activo" | "suspendido";
type AdminUserRole   = "organizador" | "staff" | "admin";
interface AdminUser { id: number; name: string; email: string; role: AdminUserRole; status: AdminUserStatus }
interface AdminEvent { id: number; title: string; organizer: string; date: string; status: "activo" | "cancelado"; tickets: number }
interface CreditPackAdmin { id: number; label: string; credits: number; price: number; enabled: boolean }

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const EVENTS: BuyerEvent[] = [
  {
    id: 1, title: "Hernán Cattáneo B2B Nicolás Masseyeff",
    venue: "Mandarine Park, Buenos Aires", date: "Sáb 19 Jul, 2025", time: "23:00 hs",
    image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&h=400&fit=crop&auto=format",
    category: "Electrónica",
    tandas: [
      { id: 1, name: "Anticipada 1", price: 12000, available: 48 },
      { id: 2, name: "Anticipada 2", price: 16000, available: 120 },
      { id: 3, name: "General",      price: 22000, available: 350 },
    ],
    description: "Una noche histórica. Dos maestros del sonido electrónico se unen para una sesión B2B irrepetible.",
  },
  {
    id: 2, title: "Tini: La Gran Gira Argentina",
    venue: "Estadio Vélez Sársfield, Buenos Aires", date: "Vie 25 Jul, 2025", time: "20:00 hs",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop&auto=format",
    category: "Pop",
    tandas: [
      { id: 1, name: "Campo",       price: 28000, available: 200 },
      { id: 2, name: "Platea Baja", price: 45000, available: 80  },
      { id: 3, name: "Platea Alta", price: 32000, available: 150 },
    ],
    description: "Martina Stoessel vuelve a Argentina con su gira más ambiciosa. Producción internacional.",
  },
  {
    id: 3, title: "Cosquín Rock Festival",
    venue: "Aeródromo Santa María de Punilla, Córdoba", date: "Dom 10 Ago, 2025", time: "14:00 hs",
    image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop&auto=format",
    category: "Rock",
    tandas: [
      { id: 1, name: "Abono General", price: 38000, available: 500 },
      { id: 2, name: "Acceso VIP",    price: 75000, available: 60  },
    ],
    description: "El festival de rock más importante de América Latina. Más de 30 bandas en 3 escenarios.",
  },
  {
    id: 4, title: "Nathy Peluso – Sala del Tiempo",
    venue: "Movistar Arena, Buenos Aires", date: "Jue 31 Jul, 2025", time: "21:30 hs",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=400&fit=crop&auto=format",
    category: "Urban/Jazz",
    tandas: [
      { id: 1, name: "Sector A", price: 35000, available: 30 },
      { id: 2, name: "Sector B", price: 25000, available: 85 },
    ],
    description: "La artista argentina más internacional trae su show más íntimo y visceral.",
  },
  {
    id: 5, title: "Stand Up: Impro en Palermo",
    venue: "Teatro El Cubo, Buenos Aires", date: "Sáb 12 Jul, 2025", time: "21:00 hs",
    image: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop&auto=format",
    category: "Comedia",
    tandas: [
      { id: 1, name: "General",           price: 8500,  available: 90 },
      { id: 2, name: "Premium (1ra fila)", price: 14000, available: 12 },
    ],
    description: "Una noche de improvisación con los mejores comediantes de Buenos Aires.",
  },
  {
    id: 6, title: "La Renga – 30 Años en Obras",
    venue: "Estadio Obras Sanitarias, Buenos Aires", date: "Sáb 26 Jul, 2025", time: "20:00 hs",
    image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop&auto=format",
    category: "Rock",
    tandas: [
      { id: 1, name: "Campo General",    price: 18000, available: 400 },
      { id: 2, name: "Platea Numerada",  price: 32000, available: 100 },
    ],
    description: "Tres décadas de La Renga. El Chizzo celebra 30 años en el estadio donde escribieron la historia.",
  },
];

const SALES_CHART = [
  { tanda: "Ant. 1",  vendidas: 152, color: "#7c3aed" },
  { tanda: "Ant. 2",  vendidas: 89,  color: "#9d5cf6" },
  { tanda: "General", vendidas: 6,   color: "#c084fc" },
];

const TRANSACTIONS = [
  { id: 1, type: "debit",  desc: "Publicación: Cattáneo B2B",    date: "18 Jun", amount: -5  },
  { id: 2, type: "credit", desc: "Recarga Pack Starter",          date: "15 Jun", amount: +25 },
  { id: 3, type: "debit",  desc: "Publicación: Stand Up Palermo", date: "10 Jun", amount: -5  },
  { id: 4, type: "credit", desc: "Recarga Pack Pro",              date: "01 Jun", amount: +50 },
  { id: 5, type: "debit",  desc: "Publicación: La Renga",         date: "28 May", amount: -5  },
];

const CREDIT_PACKS = [
  { id: 1, credits: 10, price: 2500, label: "Starter", desc: "Para 2 eventos",  popular: false },
  { id: 2, credits: 25, price: 5500, label: "Pro",      desc: "Para 5 eventos",  popular: true  },
  { id: 3, credits: 50, price: 9800, label: "Studio",   desc: "Para 10 eventos", popular: false },
];

// Admin data
const ADMIN_USERS: AdminUser[] = [
  { id: 1, name: "Carlos Rodríguez",   email: "carlos@eventos.ar",  role: "organizador", status: "activo"    },
  { id: 2, name: "Ana Martínez",        email: "ana@producciones.com",role: "organizador", status: "activo"    },
  { id: 3, name: "Diego López",         email: "diego@mail.com",      role: "staff",       status: "activo"    },
  { id: 4, name: "Sofía Pérez",         email: "sofia@mail.com",      role: "staff",       status: "suspendido" },
  { id: 5, name: "Matías González",     email: "matias@events.io",    role: "organizador", status: "activo"    },
  { id: 6, name: "Lucía Fernández",     email: "lucia@admin.asisti",  role: "admin",       status: "activo"    },
];

const ADMIN_EVENTS: AdminEvent[] = [
  { id: 1, title: "Hernán Cattáneo B2B Nicolás Masseyeff", organizer: "Carlos Rodríguez",   date: "Sáb 19 Jul", status: "activo",    tickets: 247 },
  { id: 2, title: "Tini: La Gran Gira Argentina",           organizer: "Ana Martínez",        date: "Vie 25 Jul", status: "activo",    tickets: 510 },
  { id: 3, title: "Cosquín Rock Festival",                  organizer: "Matías González",     date: "Dom 10 Ago", status: "activo",    tickets: 830 },
  { id: 4, title: "Nathy Peluso – Sala del Tiempo",         organizer: "Carlos Rodríguez",   date: "Jue 31 Jul", status: "activo",    tickets: 115 },
  { id: 5, title: "Stand Up: Impro en Palermo",             organizer: "Ana Martínez",        date: "Sáb 12 Jul", status: "cancelado", tickets: 62  },
  { id: 6, title: "La Renga – 30 Años en Obras",            organizer: "Matías González",     date: "Sáb 26 Jul", status: "activo",    tickets: 400 },
];

const ADMIN_PACKS: CreditPackAdmin[] = [
  { id: 1, label: "Starter", credits: 10, price: 2500, enabled: true  },
  { id: 2, label: "Pro",     credits: 25, price: 5500, enabled: true  },
  { id: 3, label: "Studio",  credits: 50, price: 9800, enabled: true  },
  { id: 4, label: "Ultra",   credits: 100,price: 17000,enabled: false },
];

interface StaffMember { id: number; name: string; email: string; role: StaffRole }
const DEFAULT_STAFF: StaffMember[] = [
  { id: 1, name: "Diego López",  email: "diego@mail.com", role: "qr"       },
  { id: 2, name: "Sofía Pérez",  email: "sofia@mail.com", role: "vendedor" },
];

interface StaffAccount { email: string; pass: string; name: string; role: StaffRole; event: string }
const STAFF_ACCOUNTS: StaffAccount[] = [
  { email: "diego@mail.com", pass: "1234", name: "Diego López", role: "qr",       event: "Cattáneo B2B Masseyeff" },
  { email: "sofia@mail.com", pass: "1234", name: "Sofía Pérez", role: "vendedor", event: "Cattáneo B2B Masseyeff" },
];

const INVALID_REASONS = [
  { code: "DUPLICADA",   label: "Entrada ya utilizada",   detail: "Este QR fue escaneado hace 4 min." },
  { code: "EXPIRADA",    label: "Tanda vencida",           detail: "La tanda cerró el 30 Jun a las 23:59." },
  { code: "OTRO_EVENTO", label: "Evento incorrecto",       detail: "Esta entrada corresponde a otro evento." },
  { code: "CANCELADA",   label: "Entrada cancelada",       detail: "El organizador anuló esta entrada." },
];

const VALID_TICKETS = [
  { holder: "Valentina Rodríguez", tanda: "Anticipada 1", id: "AST-HX7K2M", qty: 2 },
  { holder: "Lucas Martínez",      tanda: "Anticipada 2", id: "AST-QP3N8R", qty: 1 },
  { holder: "Camila González",     tanda: "General",       id: "AST-YW5F1J", qty: 4 },
];

const fmt = (n: number) => `$${Math.abs(n).toLocaleString("es-AR")}`;

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: QR CODE
// ─────────────────────────────────────────────────────────────────────────────

function QRCodeSVG({ seed }: { seed: string }) {
  const COLS = 25, M = 7, size = COLS * M;
  let rng = seed.split("").reduce((a, c) => ((a * 31 + c.charCodeAt(0)) & 0xffff) >>> 0, 12345);
  const rand = () => { rng = ((rng * 1664525 + 1013904223) & 0xffffffff) >>> 0; return rng / 0xffffffff; };
  const modules = Array.from({ length: COLS }, () => Array.from({ length: COLS }, () => rand() > 0.45));
  const isFinderZone = (r: number, c: number) => (r < 8 && c < 8) || (r < 8 && c >= COLS - 8) || (r >= COLS - 8 && c < 8);
  const finderAt = (br: number, bc: number) => {
    const out: { r: number; c: number; dark: boolean }[] = [];
    for (let r = br; r < br + 7; r++) for (let c = bc; c < bc + 7; c++) {
      const dr = r - br, dc = c - bc;
      out.push({ r, c, dark: (dr === 0 || dr === 6 || dc === 0 || dc === 6) || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) });
    }
    return out;
  };
  const finders = [...finderAt(0, 0), ...finderAt(0, COLS - 7), ...finderAt(COLS - 7, 0)];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={size} height={size} fill="white" rx="6" />
      {modules.map((row, r) => row.map((dark, c) => !isFinderZone(r, c) && dark &&
        <rect key={`d-${r}-${c}`} x={c * M + 0.5} y={r * M + 0.5} width={M - 1} height={M - 1} rx="1" fill="#09090f" />
      ))}
      {finders.map(({ r, c, dark }) =>
        <rect key={`f-${r}-${c}`} x={c * M} y={r * M} width={M} height={M} fill={dark ? "#09090f" : "white"} />
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUYER – A: LISTING
// ─────────────────────────────────────────────────────────────────────────────

function ListingScreen({ onSelect }: { onSelect: (e: BuyerEvent) => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const FILTERS = ["Todos", "Rock", "Electrónica", "Pop", "Urban/Jazz", "Comedia"];
  const visible = EVENTS.filter(e => {
    const q = search.toLowerCase();
    return (e.title.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q)) &&
      (filter === "Todos" || e.category === filter);
  });
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex-none px-4 pt-14 pb-3 border-b border-border bg-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase">Buenos Aires · Arg</p>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">Asistí<span className="text-primary">APP</span></h1>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="text-primary text-sm font-bold">M</span>
          </div>
        </div>
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Eventos, artistas, lugares..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-none px-3 py-1 rounded-full text-xs font-semibold transition-all ${filter === f ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 hide-scrollbar">
        {visible.length > 0 ? <>
          <p className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase">Destacado</p>
          <button onClick={() => onSelect(visible[0])} className="w-full text-left relative overflow-hidden rounded-2xl group focus:outline-none">
            <img src={visible[0].image} alt={visible[0].title} className="w-full h-52 object-cover transition-transform duration-500 group-hover:scale-105 bg-muted" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <span className="inline-block text-[10px] font-bold tracking-widest bg-primary text-white px-2 py-0.5 rounded-full mb-2 uppercase">{visible[0].category}</span>
              <h2 className="text-white font-bold text-base leading-snug">{visible[0].title}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-white/70 text-xs flex items-center gap-1"><Calendar size={10} />{visible[0].date}</span>
                <span className="text-white/70 text-xs flex items-center gap-1"><MapPin size={10} />{visible[0].venue.split(",")[0]}</span>
              </div>
              <p className="text-accent font-bold text-sm mt-1.5">Desde {fmt(Math.min(...visible[0].tandas.map(t => t.price)))}</p>
            </div>
          </button>
          <p className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase pt-1">Próximos eventos</p>
          {visible.slice(1).map(ev => (
            <button key={ev.id} onClick={() => onSelect(ev)} className="w-full text-left flex gap-3 bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/40 transition-all focus:outline-none">
              <img src={ev.image} alt={ev.title} className="w-[88px] h-24 object-cover flex-none bg-muted" />
              <div className="flex-1 min-w-0 py-3 pr-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-primary font-bold tracking-wider uppercase">{ev.category}</span>
                  <h3 className="text-foreground font-semibold text-sm leading-snug line-clamp-2">{ev.title}</h3>
                  <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1"><MapPin size={9} />{ev.venue.split(",")[0]}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs flex items-center gap-1"><Calendar size={9} />{ev.date}</span>
                  <span className="text-accent font-bold text-xs">{fmt(Math.min(...ev.tandas.map(t => t.price)))}</span>
                </div>
              </div>
            </button>
          ))}
        </> : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-4xl mb-3">🎭</p>
            <p className="text-sm text-muted-foreground">No hay eventos para tu búsqueda.</p>
          </div>
        )}
        <div className="h-8" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUYER – B: DETAIL
// ─────────────────────────────────────────────────────────────────────────────

function DetailScreen({ event, onBack, onBuy }: { event: BuyerEvent; onBack: () => void; onBuy: (t: Tanda, q: number) => void }) {
  const [sel, setSel] = useState(event.tandas[0]);
  const [qty, setQty] = useState(1);
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="relative">
          <img src={event.image} alt={event.title} className="w-full h-56 object-cover bg-muted" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
          <button onClick={onBack} className="absolute top-14 left-4 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="absolute top-14 right-4 bg-primary text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full">{event.category}</span>
        </div>
        <div className="px-4 pt-5 pb-4">
          <h1 className="text-2xl font-extrabold text-foreground leading-tight">{event.title}</h1>
          <div className="mt-3 space-y-2">
            {[{ Icon: MapPin, text: event.venue }, { Icon: Calendar, text: event.date }, { Icon: Clock, text: event.time }].map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon size={14} className="text-primary flex-none" /><span>{text}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{event.description}</p>
          <div className="mt-6">
            <h3 className="text-base font-bold text-foreground mb-3">Elegí tu tanda</h3>
            <div className="space-y-2">
              {event.tandas.map(t => (
                <button key={t.id} onClick={() => setSel(t)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${sel.id === t.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-none transition-colors ${sel.id === t.id ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                      {sel.id === t.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.available} disponibles</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-accent">{fmt(t.price)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between bg-card rounded-xl px-4 py-3.5 border border-border">
            <span className="text-sm font-semibold text-foreground">Cantidad</span>
            <div className="flex items-center gap-4">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/70 transition-colors"><Minus size={13} /></button>
              <span className="text-lg font-bold text-foreground w-4 text-center">{qty}</span>
              <button onClick={() => setQty(q => Math.min(10, q + 1))} className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/80 transition-colors"><Plus size={13} /></button>
            </div>
          </div>
          <div className="h-32" />
        </div>
      </div>
      <div className="flex-none border-t border-border bg-background/90 backdrop-blur-md px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">{qty} × {sel.name}</span>
          <span className="text-base font-extrabold text-foreground">{fmt(sel.price * qty)}</span>
        </div>
        <button onClick={() => onBuy(sel, qty)} className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base hover:bg-primary/90 active:scale-[0.98] transition-all">Comprar entradas</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUYER – C: CHECKOUT
// ─────────────────────────────────────────────────────────────────────────────

const PAY_METHODS = [
  { id: "mp",       label: "Pago QR",       sub: "MercadoPago",    emoji: "🔵" },
  { id: "transfer", label: "Transferencia",  sub: "CBU / Alias",    emoji: "🏦" },
  { id: "card",     label: "Tarjeta",        sub: "Crédito/débito", emoji: "💳" },
  { id: "whatsapp", label: "WhatsApp",       sub: "Coordinar pago", emoji: "💬" },
];

function CheckoutScreen({ event, tanda, qty, onBack, onConfirm }: {
  event: BuyerEvent; tanda: Tanda; qty: number;
  onBack: () => void; onConfirm: (n: string) => void;
}) {
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [pay, setPay]     = useState("mp");   // always pre-selected
  const total = tanda.price * qty;

  // Button is enabled when: name filled + basic email format + payment selected (always true)
  const valid = name.trim().length > 1 && email.length > 4 && email.includes("@");

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-none px-4 pt-14 pb-3 border-b border-border bg-background">
        <button onClick={onBack} className="flex items-center gap-1 text-muted-foreground text-sm mb-3 hover:text-foreground transition-colors"><ChevronLeft size={15} />Volver</button>
        <h2 className="text-lg font-extrabold text-foreground">Finalizar compra</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Sin registro. Solo tu nombre y email.</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 hide-scrollbar">
        {/* Summary */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Resumen</p>
          <div className="flex gap-3">
            <img src={event.image} alt={event.title} className="w-16 h-16 rounded-xl object-cover flex-none bg-muted" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-foreground leading-tight line-clamp-2">{event.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{event.date} · {event.time}</p>
              <p className="text-xs text-muted-foreground">{tanda.name}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <span className="text-sm text-muted-foreground">{qty} entrada{qty > 1 ? "s" : ""} × {fmt(tanda.price)}</span>
            <span className="text-base font-extrabold text-foreground">{fmt(total)}</span>
          </div>
        </div>

        {/* Buyer data */}
        <div>
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Tus datos</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Nombre completo</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="María García"
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="maria@ejemplo.com"
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <span className="text-green-400 font-bold">✓</span> Recibís la entrada en este email.
              </p>
            </div>
          </div>
        </div>

        {/* Payment method */}
        <div>
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Método de pago</p>
          <div className="grid grid-cols-2 gap-2">
            {PAY_METHODS.map(m => (
              <button key={m.id} onClick={() => setPay(m.id)}
                className={`p-3.5 rounded-xl border text-left transition-all focus:outline-none ${pay === m.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
                <span className="text-xl block mb-1.5">{m.emoji}</span>
                <p className="text-xs font-bold text-foreground">{m.label}</p>
                <p className="text-[11px] text-muted-foreground">{m.sub}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="h-24" />
      </div>

      <div className="flex-none border-t border-border bg-background/90 backdrop-blur-md px-4 py-4">
        <button disabled={!valid} onClick={() => onConfirm(name)}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${valid ? "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
          Confirmar compra · {fmt(total)}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUYER – D: SUCCESS / TICKET
// ─────────────────────────────────────────────────────────────────────────────

function SuccessScreen({ event, tanda, qty, buyerName, onHome }: {
  event: BuyerEvent; tanda: Tanda; qty: number; buyerName: string; onHome: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-none px-4 pt-14 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center"><Check size={16} className="text-green-400" /></div>
          <div><h2 className="text-base font-extrabold text-foreground">¡Compra exitosa!</h2><p className="text-xs text-muted-foreground">Entrada enviada a tu email</p></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 hide-scrollbar">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="relative">
            <img src={event.image} alt={event.title} className="w-full h-32 object-cover bg-muted" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4"><h3 className="text-foreground font-extrabold text-sm leading-tight">{event.title}</h3></div>
          </div>
          <div className="px-4 py-4 border-b border-dashed border-border">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {[["Fecha", event.date], ["Hora", event.time], ["Tanda", tanda.name], ["Entradas", `${qty} entrada${qty > 1 ? "s" : ""}`], ["Lugar", event.venue.split(",")[0]], ["Titular", buyerName]].map(([label, value]) => (
                <div key={label}><p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p><p className="text-xs font-semibold text-foreground mt-0.5 truncate">{value}</p></div>
              ))}
            </div>
          </div>
          <div className="px-4 py-5 flex flex-col items-center bg-background/50">
            <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase mb-4">Código de acceso · Uso único</p>
            <div className="bg-white p-3 rounded-2xl shadow-xl shadow-black/40"><QRCodeSVG seed="AST-HX7K2M" /></div>
            <p className="text-xs text-muted-foreground mt-3 font-mono tracking-wider">AST-HX7K2M</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <button className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"><Download size={15} />Descargar entrada</button>
          <button onClick={onHome} className="w-full py-3.5 rounded-2xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors">Ver más eventos</button>
        </div>
        <div className="h-8" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORG – E: LOGIN
// ─────────────────────────────────────────────────────────────────────────────

function OrgLoginScreen({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  const [email, setEmail] = useState(""); const [pass, setPass] = useState(""); const [show, setShow] = useState(false); const [forgot, setForgot] = useState(false);
  return (
    <div className="flex flex-col h-full bg-background px-6 justify-center">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Asistí<span className="text-primary">APP</span></h1>
        <p className="text-muted-foreground text-sm mt-1">Panel del Organizador</p>
      </div>
      {!forgot ? (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hola@miempresa.com"
              className="w-full px-4 py-3.5 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Contraseña</label>
            <div className="relative">
              <input type={show ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"
                className="w-full px-4 py-3.5 pr-11 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              <button onClick={() => setShow(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button onClick={() => setForgot(true)} className="text-xs text-primary hover:underline text-right w-full block">¿Olvidaste tu contraseña?</button>
          <button onClick={onLogin} className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base hover:bg-primary/90 active:scale-[0.98] transition-all mt-2">Ingresar al panel</button>
          <p className="text-center text-xs text-muted-foreground pt-2">¿No tenés cuenta? <span onClick={onRegister} className="text-primary cursor-pointer hover:underline font-semibold">Registrate gratis</span></p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 flex gap-3">
            <AlertCircle size={18} className="text-primary flex-none mt-0.5" />
            <p className="text-sm text-foreground">Ingresá tu email y te enviamos un link para restablecer tu contraseña.</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hola@miempresa.com"
              className="w-full px-4 py-3.5 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
          </div>
          <button className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base hover:bg-primary/90 transition-all">Enviar link de recupero</button>
          <button onClick={() => setForgot(false)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">← Volver al login</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORG – E2: REGISTER
// ─────────────────────────────────────────────────────────────────────────────

function OrgRegisterScreen({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<"form" | "done">("form");
  const [name, setName] = useState("");
  const [org, setOrg]   = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [pass2, setPass2] = useState("");
  const [show, setShow]   = useState(false);
  const [show2, setShow2] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const passMatch = pass === pass2 && pass.length >= 8;
  const valid = name.trim().length > 1 && org.trim().length > 1 && email.includes("@") && passMatch && agreed;

  if (step === "done") return (
    <div className="flex flex-col h-full bg-background items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-6">
        <BadgeCheck size={38} className="text-primary" />
      </div>
      <p className="text-primary text-xs font-bold tracking-[0.25em] uppercase mb-2">¡Registro exitoso!</p>
      <h2 className="text-2xl font-extrabold text-foreground mb-2">Bienvenido/a, {name.split(" ")[0]}</h2>
      <p className="text-sm text-muted-foreground mb-1">{org}</p>
      <p className="text-sm text-muted-foreground mb-6">Te enviamos un email de confirmación a <span className="text-foreground font-medium">{email}</span></p>
      <div className="bg-card border border-border rounded-2xl p-4 w-full mb-6 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Créditos de bienvenida</span>
          <span className="text-sm font-bold text-emerald-400">+10 créditos 🎉</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Plan inicial</span>
          <span className="text-sm font-bold text-foreground">Gratuito</span>
        </div>
      </div>
      <button onClick={onSuccess} className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base hover:bg-primary/90 transition-all">Ir a mi panel</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-none px-6 pt-14 pb-4 border-b border-border bg-background">
        <button onClick={onBack} className="flex items-center gap-1 text-muted-foreground text-sm mb-3 hover:text-foreground transition-colors"><ChevronLeft size={15} />Volver</button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <UserPlus size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-foreground">Crear cuenta gratis</h2>
            <p className="text-xs text-muted-foreground">Empezá a vender entradas hoy</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 hide-scrollbar">
        {/* Beneficios */}
        <div className="bg-primary/8 border border-primary/20 rounded-2xl px-4 py-3 flex flex-wrap gap-3">
          {["10 créditos gratis", "Sin comisiones", "Soporte 24/7"].map(b => (
            <span key={b} className="flex items-center gap-1 text-xs font-semibold text-primary">
              <Check size={11} />  {b}
            </span>
          ))}
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Nombre completo *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="María García"
            className="w-full px-4 py-3.5 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Nombre de la organización *</label>
          <input value={org} onChange={e => setOrg(e.target.value)} placeholder="Producciones XYZ"
            className="w-full px-4 py-3.5 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Email *</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hola@miempresa.com"
            className="w-full px-4 py-3.5 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Contraseña * <span className="text-muted-foreground/60">(mín. 8 caracteres)</span></label>
          <div className="relative">
            <input type={show ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"
              className="w-full px-4 py-3.5 pr-11 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            <button onClick={() => setShow(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Confirmar contraseña *</label>
          <div className="relative">
            <input type={show2 ? "text" : "password"} value={pass2} onChange={e => setPass2(e.target.value)} placeholder="••••••••"
              className={`w-full px-4 py-3.5 pr-11 bg-card border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${pass2 && !passMatch ? "border-red-500/60" : "border-border"}`} />
            <button onClick={() => setShow2(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {show2 ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {pass2 && !passMatch && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} />Las contraseñas no coinciden o son muy cortas.</p>}
          {pass2 && passMatch && <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><Check size={11} />Contraseñas coinciden.</p>}
        </div>

        <button onClick={() => setAgreed(a => !a)}
          className="flex items-start gap-3 w-full text-left">
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-none mt-0.5 transition-all ${agreed ? "bg-primary border-primary" : "border-border"}`}>
            {agreed && <Check size={12} className="text-white" />}
          </div>
          <span className="text-xs text-muted-foreground leading-relaxed">
            Acepto los <span className="text-primary underline">Términos y Condiciones</span> y la <span className="text-primary underline">Política de Privacidad</span> de AsistíAPP.
          </span>
        </button>

        <div className="h-4" />
      </div>

      <div className="flex-none border-t border-border bg-background/90 backdrop-blur-md px-6 py-4">
        <button disabled={!valid} onClick={() => setStep("done")}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${valid ? "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
          Crear cuenta gratis
        </button>
        <p className="text-center text-xs text-muted-foreground mt-3">¿Ya tenés cuenta? <span onClick={onBack} className="text-primary cursor-pointer hover:underline">Iniciá sesión</span></p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORG – F: DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

const METRICS = [
  { label: "Entradas vendidas", value: "247",        sub: "+12 hoy",    icon: Ticket,      color: "text-violet-400", bg: "bg-violet-400/10" },
  { label: "Ingresos totales",  value: "$3.456.000", sub: "en pesos",   icon: TrendingUp,  color: "text-emerald-400",bg: "bg-emerald-400/10" },
  { label: "Aforo disponible",  value: "153",        sub: "de 400 cap.",icon: Users,        color: "text-sky-400",    bg: "bg-sky-400/10"    },
  { label: "Validados en puerta",value: "89",        sub: "36% del total",icon:ShieldCheck, color: "text-amber-400",  bg: "bg-amber-400/10"  },
];

const RECENT_SALES = [
  { name: "Valentina R.", tanda: "Ant. 1",  qty: 2, time: "hace 3 min"  },
  { name: "Lucas M.",     tanda: "Ant. 2",  qty: 1, time: "hace 11 min" },
  { name: "Camila G.",    tanda: "Ant. 1",  qty: 4, time: "hace 25 min" },
  { name: "Nicolás B.",   tanda: "General", qty: 1, time: "hace 1 h"    },
];

function DashboardScreen({ onNav }: { onNav: (s: OrgScreen) => void }) {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-none px-4 pt-14 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Panel del organizador</p>
            <h2 className="text-lg font-extrabold text-foreground">Buen día, Carlos 👋</h2>
          </div>
          <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><LogOut size={16} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 hide-scrollbar">
        <div className="bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-primary uppercase tracking-widest font-bold">Evento activo</p>
            <p className="text-sm font-semibold text-foreground">Cattáneo B2B Masseyeff</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Calendar size={10} />Sáb 19 Jul · 23:00 hs</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400 font-semibold">En venta</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {METRICS.map(m => (
            <div key={m.label} className="bg-card border border-border rounded-2xl p-3.5">
              <div className={`w-8 h-8 rounded-xl ${m.bg} flex items-center justify-center mb-2.5`}><m.icon size={16} className={m.color} /></div>
              <p className="text-lg font-extrabold text-foreground leading-none">{m.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{m.label}</p>
              <p className="text-[10px] text-primary mt-1 font-semibold flex items-center gap-0.5"><ArrowUpRight size={10} />{m.sub}</p>
            </div>
          ))}
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-bold text-foreground mb-1">Ventas por tanda</p>
          <p className="text-[10px] text-muted-foreground mb-4">Cattáneo B2B · últimas 48 h</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={SALES_CHART} barCategoryGap="30%">
              <XAxis dataKey="tanda" tick={{ fill: "#6e6b8f", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "#131222", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 11, color: "#f0eeff" }} cursor={{ fill: "rgba(124,58,237,0.08)" }} formatter={(v: number) => [`${v} entradas`, ""]} />
              <Bar dataKey="vendidas" radius={[6, 6, 0, 0]}>
                {SALES_CHART.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <p className="text-xs font-bold text-foreground">Últimas ventas</p>
            <span className="text-[10px] text-primary font-semibold">Ver todas</span>
          </div>
          {RECENT_SALES.map((s, i) => (
            <div key={i} className={`px-4 py-3 flex items-center justify-between ${i < RECENT_SALES.length - 1 ? "border-b border-border" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{s.name[0]}</div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground">{s.tanda} · {s.qty} entrada{s.qty > 1 ? "s" : ""}</p>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">{s.time}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 pb-2">
          <button onClick={() => onNav("wizard")} className="bg-primary rounded-2xl p-4 flex flex-col gap-2 hover:bg-primary/90 transition-colors">
            <Sparkles size={18} className="text-white" /><p className="text-sm font-bold text-white">Crear evento</p>
          </button>
          <button onClick={() => onNav("staff")} className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2 hover:border-primary/40 transition-colors">
            <Users size={18} className="text-primary" /><p className="text-sm font-bold text-foreground">Gestionar staff</p>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORG – G: WIZARD
// ─────────────────────────────────────────────────────────────────────────────

interface WizardTanda { id: number; name: string; price: string; capacity: string; from: string; to: string }

function WizardScreen({ onBack }: { onBack: () => void }) {
  const [step, setStep]       = useState(1);
  const [published, setPublished] = useState(false);
  const [title, setTitle]     = useState("");
  const [desc, setDesc]       = useState("");
  const [date, setDate]       = useState("");
  const [time, setTime]       = useState("");
  const [venue, setVenue]     = useState("");
  const [img, setImg]         = useState("");
  const [tandas, setTandas]   = useState<WizardTanda[]>([{ id: 1, name: "Anticipada", price: "", capacity: "", from: "", to: "" }]);

  const addTanda    = () => setTandas(t => [...t, { id: Date.now(), name: "", price: "", capacity: "", from: "", to: "" }]);
  const removeTanda = (id: number) => setTandas(t => t.filter(x => x.id !== id));
  const updateTanda = (id: number, field: keyof WizardTanda, val: string) =>
    setTandas(t => t.map(x => x.id === id ? { ...x, [field]: val } : x));

  const step1Valid = title.trim() && date && venue.trim();
  const step2Valid = tandas.every(t => t.name && t.price && t.capacity);

  // ── Success state ──
  if (published) return (
    <div className="flex flex-col h-full bg-background items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-6">
        <PartyPopper size={36} className="text-primary" />
      </div>
      <p className="text-primary text-xs font-bold tracking-[0.25em] uppercase mb-2">¡Evento publicado!</p>
      <h2 className="text-2xl font-extrabold text-foreground mb-2">{title || "Tu evento"}</h2>
      <p className="text-sm text-muted-foreground mb-1">{venue}</p>
      <p className="text-sm text-muted-foreground mb-6">{date} {time && `· ${time} hs`}</p>
      <div className="bg-card border border-border rounded-2xl p-4 w-full mb-6 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Créditos consumidos</span>
          <span className="text-sm font-bold text-red-400">–5 créditos</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Saldo restante</span>
          <span className="text-sm font-bold text-foreground">40 créditos</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Tandas creadas</span>
          <span className="text-sm font-bold text-foreground">{tandas.length}</span>
        </div>
      </div>
      <div className="flex gap-2 w-full mb-3">
        <button className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
          <Share2 size={15} />Compartir link
        </button>
        <button className="flex-1 py-3.5 rounded-2xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors">
          Ver evento
        </button>
      </div>
      <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Volver al dashboard</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-none px-4 pt-14 pb-4 border-b border-border bg-background">
        <button onClick={onBack} className="flex items-center gap-1 text-muted-foreground text-sm mb-3 hover:text-foreground transition-colors"><ChevronLeft size={15} />Volver</button>
        <h2 className="text-lg font-extrabold text-foreground">Crear evento</h2>
        <div className="flex items-center gap-2 mt-3">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{s}</div>
              {s === 1 && <div className={`h-0.5 w-20 rounded-full transition-all ${step >= 2 ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
          <div className="ml-2 flex gap-4">
            <span className={`text-xs font-semibold ${step === 1 ? "text-foreground" : "text-muted-foreground"}`}>Datos básicos</span>
            <span className={`text-xs font-semibold ${step === 2 ? "text-foreground" : "text-muted-foreground"}`}>Tandas</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 hide-scrollbar">
        {step === 1 && <>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Nombre del evento *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Festival de Jazz al Aire Libre"
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Descripción</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Describí el evento para los compradores..."
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Fecha *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-3 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Hora</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-3 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Lugar *</label>
            <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Parque Centenario, Buenos Aires"
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">URL imagen de portada</label>
            <div className="relative">
              <ImagePlus size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={img} onChange={e => setImg(e.target.value)} placeholder="https://..."
                className="w-full pl-9 pr-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            </div>
            {img && <img src={img} alt="preview" className="w-full h-32 object-cover rounded-xl mt-2 bg-muted" />}
          </div>
        </>}
        {step === 2 && <>
          <p className="text-xs text-muted-foreground">Configurá las tandas de precios y sus cupos.</p>
          {tandas.map((t, i) => (
            <div key={t.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground uppercase tracking-wider">Tanda {i + 1}</p>
                {tandas.length > 1 && <button onClick={() => removeTanda(t.id)} className="text-muted-foreground hover:text-red-400 transition-colors"><Trash2 size={14} /></button>}
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Nombre *</label>
                <input value={t.name} onChange={e => updateTanda(t.id, "name", e.target.value)} placeholder="Anticipada 1"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Precio *</label>
                  <input value={t.price} onChange={e => updateTanda(t.id, "price", e.target.value)} placeholder="12000"
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Cupo *</label>
                  <input value={t.capacity} onChange={e => updateTanda(t.id, "capacity", e.target.value)} placeholder="200"
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Desde</label>
                  <input type="date" value={t.from} onChange={e => updateTanda(t.id, "from", e.target.value)}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Hasta</label>
                  <input type="date" value={t.to} onChange={e => updateTanda(t.id, "to", e.target.value)}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                </div>
              </div>
            </div>
          ))}
          <button onClick={addTanda} className="w-full py-3 rounded-2xl border border-dashed border-border text-muted-foreground text-sm flex items-center justify-center gap-2 hover:border-primary/50 hover:text-foreground transition-all">
            <Plus size={15} />Agregar tanda
          </button>
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-2xl px-4 py-3 flex gap-3">
            <CircleDollarSign size={16} className="text-amber-400 flex-none mt-0.5" />
            <p className="text-xs text-foreground">Publicar consumirá <strong className="text-amber-400">5 créditos</strong>. Saldo: <strong className="text-foreground">45 créditos</strong>.</p>
          </div>
        </>}
        <div className="h-24" />
      </div>
      <div className="flex-none border-t border-border bg-background/90 backdrop-blur-md px-4 py-4">
        {step === 1 ? (
          <button disabled={!step1Valid} onClick={() => setStep(2)}
            className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all ${step1Valid ? "bg-primary text-white hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
            Siguiente: configurar tandas <ChevronRight size={18} />
          </button>
        ) : (
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-none py-4 px-5 rounded-2xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors"><ChevronLeft size={16} /></button>
            <button disabled={!step2Valid} onClick={() => setPublished(true)}
              className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all ${step2Valid ? "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
              Publicar evento (–5 créditos)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORG – H: WALLET
// ─────────────────────────────────────────────────────────────────────────────

function WalletScreen({ onBack }: { onBack: () => void }) {
  const [selectedPack, setSelectedPack] = useState<number | null>(null);
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-none px-4 pt-14 pb-4 border-b border-border bg-background">
        <button onClick={onBack} className="flex items-center gap-1 text-muted-foreground text-sm mb-3 hover:text-foreground transition-colors"><ChevronLeft size={15} />Volver</button>
        <h2 className="text-lg font-extrabold text-foreground">Billetera de créditos</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Recargá para publicar nuevos eventos</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 hide-scrollbar">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-5">
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white/5" />
          <p className="text-white/70 text-xs uppercase tracking-widest font-semibold relative">Saldo disponible</p>
          <p className="text-4xl font-extrabold text-white mt-1 relative">45 <span className="text-xl font-semibold text-white/70">créditos</span></p>
          <p className="text-white/60 text-xs mt-2 relative">Carlos Rodríguez · carlos@eventos.ar</p>
          <div className="mt-4 relative"><div className="bg-white/20 rounded-full px-3 py-1 text-xs font-semibold text-white inline-flex items-center gap-1.5"><CreditCard size={11} />Sin comisiones por venta</div></div>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Comprar créditos</p>
          <div className="space-y-3">
            {CREDIT_PACKS.map(pack => (
              <button key={pack.id} onClick={() => setSelectedPack(pack.id === selectedPack ? null : pack.id)}
                className={`w-full text-left rounded-2xl border p-4 transition-all relative ${selectedPack === pack.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
                {pack.popular && <span className="absolute top-3 right-3 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Popular</span>}
                <div className="flex items-start justify-between pr-16">
                  <div>
                    <p className="text-sm font-extrabold text-foreground">{pack.credits} créditos</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{pack.desc}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Pack {pack.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-extrabold text-foreground">{fmt(pack.price)}</p>
                    <p className="text-[10px] text-muted-foreground">{fmt(Math.round(pack.price / pack.credits))}/cr</p>
                  </div>
                </div>
                {selectedPack === pack.id && (
                  <button className="mt-3 w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                    Pagar con MercadoPago
                  </button>
                )}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Historial</p>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {TRANSACTIONS.map((tx, i) => (
              <div key={tx.id} className={`px-4 py-3 flex items-center justify-between ${i < TRANSACTIONS.length - 1 ? "border-b border-border" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-none ${tx.type === "credit" ? "bg-emerald-400/15" : "bg-red-400/10"}`}>
                    {tx.type === "credit" ? <ArrowDownLeft size={13} className="text-emerald-400" /> : <ArrowUpRight size={13} className="text-red-400" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground leading-tight">{tx.desc}</p>
                    <p className="text-[10px] text-muted-foreground">{tx.date}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${tx.type === "credit" ? "text-emerald-400" : "text-red-400"}`}>{tx.amount > 0 ? "+" : ""}{tx.amount} cr</span>
              </div>
            ))}
          </div>
        </div>
        <div className="h-8" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORG – STAFF MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

function StaffMgmtScreen({ onBack }: { onBack: () => void }) {
  const [staff, setStaff]       = useState<StaffMember[]>(DEFAULT_STAFF);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name: "", email: "", role: "qr" as StaffRole });

  const addStaff = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setStaff(s => [...s, { id: Date.now(), ...form }]);
    setForm({ name: "", email: "", role: "qr" });
    setShowForm(false);
  };
  const removeStaff = (id: number) => setStaff(s => s.filter(x => x.id !== id));

  const ROLE_META: Record<StaffRole, { label: string; desc: string; icon: typeof QrCode; color: string; bg: string }> = {
    qr:       { label: "Staff QR",       desc: "Escanea entradas en la puerta",          icon: QrCode, color: "text-violet-400",  bg: "bg-violet-400/10"  },
    vendedor: { label: "Staff Vendedor", desc: "Vende y genera entradas en el evento",   icon: Store,  color: "text-amber-400",   bg: "bg-amber-400/10"   },
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-none px-4 pt-14 pb-4 border-b border-border bg-background">
        <button onClick={onBack} className="flex items-center gap-1 text-muted-foreground text-sm mb-3 hover:text-foreground transition-colors"><ChevronLeft size={15} />Volver</button>
        <h2 className="text-lg font-extrabold text-foreground">Gestión de Staff</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Asignado a: Cattáneo B2B Masseyeff</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 hide-scrollbar">
        {/* Role legend */}
        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(ROLE_META) as [StaffRole, typeof ROLE_META[StaffRole]][]).map(([key, m]) => (
            <div key={key} className="bg-card border border-border rounded-2xl p-3.5">
              <div className={`w-8 h-8 rounded-xl ${m.bg} flex items-center justify-center mb-2`}><m.icon size={15} className={m.color} /></div>
              <p className="text-xs font-bold text-foreground">{m.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{m.desc}</p>
            </div>
          ))}
        </div>

        {/* Staff list */}
        <div>
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Staff asignado ({staff.length})</p>
          <div className="space-y-2">
            {staff.map(member => {
              const meta = ROLE_META[member.role];
              return (
                <div key={member.id} className="bg-card border border-border rounded-2xl px-4 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>{meta.label}</span>
                    <button onClick={() => removeStaff(member.id)} className="text-muted-foreground hover:text-red-400 transition-colors p-1"><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add staff form */}
        {showForm ? (
          <div className="bg-card border border-primary/30 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-foreground">Nuevo miembro de staff</p>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Nombre completo</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Martín Gómez"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="martin@mail.com"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Rol</label>
              <div className="grid grid-cols-2 gap-2">
                {(["qr", "vendedor"] as StaffRole[]).map(r => (
                  <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                    className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${form.role === r ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/40"}`}>
                    {ROLE_META[r].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-semibold hover:bg-muted/70 transition-colors">Cancelar</button>
              <button onClick={addStaff} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">Agregar</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full py-3.5 rounded-2xl border border-dashed border-border text-muted-foreground text-sm flex items-center justify-center gap-2 hover:border-primary/50 hover:text-foreground transition-all">
            <UserPlus size={15} />Agregar miembro de staff
          </button>
        )}

        {/* Info note */}
        <div className="bg-primary/5 border border-primary/15 rounded-2xl px-4 py-3 flex gap-3">
          <BadgeCheck size={16} className="text-primary flex-none mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">El staff recibe sus credenciales por email y accede desde la pantalla de <strong className="text-foreground">Staff</strong> en la app.</p>
        </div>
        <div className="h-8" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF – LOGIN
// ─────────────────────────────────────────────────────────────────────────────

function StaffLoginScreen({ onLogin }: { onLogin: (account: StaffAccount) => void }) {
  const [email, setEmail] = useState(""); const [pass, setPass] = useState(""); const [show, setShow] = useState(false); const [err, setErr] = useState(false);

  const handleLogin = () => {
    const found = STAFF_ACCOUNTS.find(a => a.email === email.trim() && a.pass === pass.trim());
    if (found) { setErr(false); onLogin(found); }
    else setErr(true);
  };

  return (
    <div className="flex flex-col h-full bg-background px-6 justify-center">
      <div className="mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-4">
          <ClipboardCheck size={22} className="text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Staff · Asistí<span className="text-primary">APP</span></h1>
        <p className="text-muted-foreground text-sm mt-1">Ingresá con tus credenciales de staff</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Email</label>
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErr(false); }} placeholder="tu@mail.com"
            className={`w-full px-4 py-3.5 bg-card border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${err ? "border-red-500/60" : "border-border"}`} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Contraseña</label>
          <div className="relative">
            <input type={show ? "text" : "password"} value={pass} onChange={e => { setPass(e.target.value); setErr(false); }} placeholder="••••••••"
              className={`w-full px-4 py-3.5 pr-11 bg-card border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${err ? "border-red-500/60" : "border-border"}`} />
            <button onClick={() => setShow(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {err && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle size={11} />Credenciales incorrectas.</p>}
        </div>
        <button onClick={handleLogin} className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base hover:bg-primary/90 active:scale-[0.98] transition-all">Ingresar</button>
      </div>

      {/* Demo credentials hint */}
      <div className="mt-8 bg-card border border-border rounded-2xl p-4 space-y-3">
        <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Cuentas demo</p>
        {STAFF_ACCOUNTS.map(a => (
          <button key={a.email} onClick={() => { setEmail(a.email); setPass(a.pass); setErr(false); }}
            className="w-full text-left flex items-center justify-between hover:bg-muted/50 rounded-xl px-2 py-1.5 transition-colors">
            <div>
              <p className="text-xs font-semibold text-foreground">{a.name}</p>
              <p className="text-[10px] text-muted-foreground">{a.email} · pass: {a.pass}</p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.role === "qr" ? "bg-violet-400/15 text-violet-400" : "bg-amber-400/15 text-amber-400"}`}>
              {a.role === "qr" ? "Staff QR" : "Vendedor"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF – VENDEDOR POS
// ─────────────────────────────────────────────────────────────────────────────

function StaffVendedorScreen({ account, onLogout }: { account: StaffAccount; onLogout: () => void }) {
  const event       = EVENTS[0];  // evento asignado
  const [selTanda, setSelTanda] = useState<Tanda>(event.tandas[0]);
  const [qty, setQty]           = useState(1);
  const [buyerName, setBuyerName] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [ticketId, setTicketId] = useState("");
  const [generated, setGenerated] = useState(false);
  const [count, setCount]        = useState(0);

  const PAY_POS = [
    { id: "cash",     label: "Efectivo",     emoji: "💵" },
    { id: "transfer", label: "Transferencia", emoji: "🏦" },
    { id: "card",     label: "POS / Tarjeta", emoji: "💳" },
  ];

  const handleGenerate = () => {
    const id = `AST-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    setTicketId(id);
    setGenerated(true);
    setCount(c => c + qty);
  };

  const handleReset = () => {
    setGenerated(false);
    setBuyerName("");
    setQty(1);
    setSelTanda(event.tandas[0]);
  };

  if (generated) return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-none px-4 pt-14 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center"><Check size={16} className="text-green-400" /></div>
          <div><h2 className="text-base font-extrabold text-foreground">¡Entrada generada!</h2><p className="text-xs text-muted-foreground">{qty} entrada{qty > 1 ? "s" : ""} · {selTanda.name}</p></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 hide-scrollbar">
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
          <div className="px-4 py-4 border-b border-border space-y-2.5">
            {[
              ["Evento",   event.title],
              ["Tanda",    selTanda.name],
              ["Cantidad", `${qty} entrada${qty > 1 ? "s" : ""}`],
              ["Titular",  buyerName || "Sin nombre"],
              ["Pago",     PAY_POS.find(p => p.id === payMethod)?.label ?? ""],
              ["Total",    fmt(selTanda.price * qty)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-xs font-semibold text-foreground text-right max-w-[55%] truncate">{value}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-5 flex flex-col items-center">
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-4">QR de acceso</p>
            <div className="bg-white p-3 rounded-2xl shadow-xl shadow-black/30"><QRCodeSVG seed={ticketId} /></div>
            <p className="text-xs text-muted-foreground mt-3 font-mono tracking-wider">{ticketId}</p>
          </div>
        </div>
        <div className="space-y-3">
          <button className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"><Download size={15} />Imprimir / Descargar</button>
          <button onClick={handleReset} className="w-full py-3.5 rounded-2xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors flex items-center justify-center gap-2"><RotateCcw size={15} />Nueva venta</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-none px-4 pt-14 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Punto de Venta</p>
            <h2 className="text-base font-extrabold text-foreground">{account.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Vendidas hoy</p>
              <p className="text-sm font-extrabold text-primary">{count}</p>
            </div>
            <button onClick={onLogout} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><LogOut size={14} /></button>
          </div>
        </div>
        <div className="bg-primary/10 border border-primary/15 rounded-xl px-3 py-2 mt-2">
          <p className="text-xs font-semibold text-foreground truncate">{event.title}</p>
          <p className="text-[10px] text-muted-foreground">{event.date} · {event.time}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 hide-scrollbar">
        {/* Tanda */}
        <div>
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2">Tanda</p>
          <div className="space-y-2">
            {event.tandas.map(t => (
              <button key={t.id} onClick={() => setSelTanda(t)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${selTanda.id === t.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex-none ${selTanda.id === t.id ? "border-primary bg-primary" : "border-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.available} disp.</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-accent">{fmt(t.price)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Qty */}
        <div className="flex items-center justify-between bg-card rounded-xl px-4 py-3.5 border border-border">
          <span className="text-sm font-semibold text-foreground">Cantidad</span>
          <div className="flex items-center gap-4">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"><Minus size={13} /></button>
            <span className="text-lg font-bold text-foreground w-4 text-center">{qty}</span>
            <button onClick={() => setQty(q => Math.min(20, q + 1))} className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/80 transition-colors"><Plus size={13} /></button>
          </div>
        </div>

        {/* Buyer name (optional) */}
        <div>
          <label className="text-[10px] text-muted-foreground tracking-widest uppercase block mb-2">Titular (opcional)</label>
          <input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Nombre del comprador..."
            className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
        </div>

        {/* Payment method */}
        <div>
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2">Método de pago</p>
          <div className="grid grid-cols-3 gap-2">
            {PAY_POS.map(m => (
              <button key={m.id} onClick={() => setPayMethod(m.id)}
                className={`py-3 rounded-xl border text-center transition-all ${payMethod === m.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
                <span className="text-lg block mb-1">{m.emoji}</span>
                <p className="text-[10px] font-semibold text-foreground">{m.label}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="h-24" />
      </div>

      <div className="flex-none border-t border-border bg-background/90 backdrop-blur-md px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">{qty} × {selTanda.name}</span>
          <span className="text-base font-extrabold text-foreground">{fmt(selTanda.price * qty)}</span>
        </div>
        <button onClick={handleGenerate} className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
          <QrCode size={18} />Generar entrada
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF – SCANNER (Screen I) + OVERLAYS (Screen J)
// ─────────────────────────────────────────────────────────────────────────────

function ScanFrame({ active }: { active: boolean }) {
  const c = "absolute w-8 h-8 border-[3px] border-white/90";
  return (
    <div className={`relative w-56 h-56 transition-all duration-300 ${active ? "scale-105" : "scale-100"}`}>
      <div className={`${c} top-0 left-0 border-r-0 border-b-0 rounded-tl-lg`} />
      <div className={`${c} top-0 right-0 border-l-0 border-b-0 rounded-tr-lg`} />
      <div className={`${c} bottom-0 left-0 border-r-0 border-t-0 rounded-bl-lg`} />
      <div className={`${c} bottom-0 right-0 border-l-0 border-t-0 rounded-br-lg`} />
      {active && <div className="absolute inset-x-1 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent scan-line-anim" />}
    </div>
  );
}

function ScannerScreen({ onResult, account, onLogout }: { onResult: (t: "valid" | "invalid") => void; account: StaffAccount; onLogout: () => void }) {
  const [torch, setTorch]       = useState(false);
  const [scanning, setScanning] = useState(true);
  const [count, setCount]       = useState({ valid: 89, invalid: 3, total: 400 });
  const [manualId, setManualId] = useState("");
  const [showManual, setShowManual] = useState(false);

  const handleScan = useCallback((type: "valid" | "invalid") => {
    setScanning(false);
    if (type === "valid") setCount(c => ({ ...c, valid: c.valid + 1 }));
    else setCount(c => ({ ...c, invalid: c.invalid + 1 }));
    onResult(type);
  }, [onResult]);

  const pct = Math.round((count.valid / count.total) * 100);

  return (
    <div className="relative flex flex-col h-full bg-black overflow-hidden select-none">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-900" />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.4) 1px,transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(0,0,0,0.82)_100%)]" />
      </div>
      <div className="relative flex-none flex items-center justify-between px-6 pt-14 pb-3 z-10">
        <div>
          <p className="text-white/50 text-[10px] tracking-widest uppercase">Staff QR · {account.name}</p>
          <p className="text-white text-sm font-bold leading-tight">{account.event}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTorch(t => !t)} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${torch ? "bg-amber-400 text-black" : "bg-white/10 text-white/70"}`}>
            {torch ? <Flashlight size={16} /> : <FlashlightOff size={16} />}
          </button>
          <button onClick={onLogout} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors">
            <LogOut size={15} />
          </button>
        </div>
      </div>
      <div className="relative flex-1 flex flex-col items-center justify-center z-10 gap-5">
        <p className="text-white/50 text-xs tracking-widest">Apuntá la cámara al QR</p>
        <ScanFrame active={scanning} />
        <p className="text-white/30 text-[11px]">El escaneo es automático</p>
        <div className="flex gap-3 mt-2">
          <button onClick={() => handleScan("valid")} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-colors">
            <Check size={13} />Simular válido
          </button>
          <button onClick={() => handleScan("invalid")} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-colors">
            <CircleX size={13} />Simular inválido
          </button>
        </div>
      </div>
      <div className="relative flex-none z-10 px-4 pb-8">
        <div className="mb-4">
          <div className="flex justify-between text-[10px] mb-1.5">
            <span className="text-white/50 uppercase tracking-wider">Ingresos validados</span>
            <span className="text-white/70 font-mono">{count.valid} / {count.total}</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Válidos",   value: count.valid,               color: "text-emerald-400" },
            { label: "Inválidos", value: count.invalid,              color: "text-red-400"     },
            { label: "Aforo",     value: count.total - count.valid,  color: "text-white/70"    },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-2xl py-2.5 text-center border border-white/[0.08]">
              <p className={`text-lg font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <button onClick={() => setShowManual(m => !m)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/5 border border-white/[0.08] text-white/60 text-xs font-semibold hover:bg-white/8 transition-colors">
          <span className="flex items-center gap-2"><Hash size={14} />Ingresar código manualmente</span>
          <ChevronDown size={14} className={`transition-transform ${showManual ? "rotate-180" : ""}`} />
        </button>
        {showManual && (
          <div className="flex gap-2 mt-2">
            <input value={manualId} onChange={e => setManualId(e.target.value.toUpperCase())} placeholder="AST-XXXXXX"
              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <button onClick={() => { if (manualId.trim()) handleScan(Math.random() > 0.3 ? "valid" : "invalid"); }}
              className="px-4 py-2.5 bg-primary rounded-xl text-white text-xs font-bold hover:bg-primary/90 transition-colors">Validar</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ValidOverlay({ onDismiss }: { onDismiss: () => void }) {
  const idx    = Math.floor(Math.random() * VALID_TICKETS.length);
  const ticket = VALID_TICKETS[idx];
  const now    = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  useEffect(() => { const t = setTimeout(onDismiss, 3500); return () => clearTimeout(t); }, [onDismiss]);
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-emerald-950 overflow-hidden" onClick={onDismiss}>
      <div className="h-1.5 bg-emerald-400 w-full" />
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-24 h-24 rounded-full bg-emerald-400/15 border-2 border-emerald-400/40 flex items-center justify-center mb-6">
          <UserCheck size={44} className="text-emerald-400" strokeWidth={1.8} />
        </div>
        <p className="text-emerald-400 text-xs font-bold tracking-[0.3em] uppercase mb-2">Ingreso válido</p>
        <h2 className="text-white text-3xl font-extrabold leading-tight mb-1">{ticket.holder}</h2>
        <p className="text-white/50 text-sm">{ticket.qty > 1 ? `${ticket.qty} personas` : "1 persona"}</p>
        <div className="mt-6 px-5 py-3 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 text-center">
          <p className="text-emerald-300 text-xs font-bold tracking-wider uppercase">{ticket.tanda}</p>
          <p className="text-white/40 text-[11px] mt-0.5 font-mono">{ticket.id}</p>
        </div>
        <p className="text-white/25 text-xs mt-6">{now} hs · Toca para continuar</p>
      </div>
      <div className="flex-none px-6 pb-10">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 rounded-full countdown-bar" /></div>
        <p className="text-white/30 text-[10px] text-center mt-2 tracking-wider">Escáner listo en 3 s</p>
      </div>
    </div>
  );
}

function InvalidOverlay({ onDismiss }: { onDismiss: () => void }) {
  const idx    = Math.floor(Math.random() * INVALID_REASONS.length);
  const reason = INVALID_REASONS[idx];
  useEffect(() => { const t = setTimeout(onDismiss, 4000); return () => clearTimeout(t); }, [onDismiss]);
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-red-950 overflow-hidden" onClick={onDismiss}>
      <div className="h-1.5 bg-red-500 w-full" />
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-24 h-24 rounded-full bg-red-500/15 border-2 border-red-500/40 flex items-center justify-center mb-6">
          <CircleX size={44} className="text-red-400" strokeWidth={1.8} />
        </div>
        <p className="text-red-400 text-xs font-bold tracking-[0.3em] uppercase mb-2">Entrada inválida</p>
        <h2 className="text-white text-2xl font-extrabold leading-tight mb-2">{reason.label}</h2>
        <p className="text-white/50 text-sm leading-relaxed max-w-xs">{reason.detail}</p>
        <div className="mt-6 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-xs font-bold tracking-[0.2em] uppercase font-mono">{reason.code}</p>
        </div>
        <div className="mt-6 flex items-center gap-2 text-white/30 text-xs"><AlertCircle size={13} /><span>No permitir el ingreso</span></div>
        <p className="text-white/20 text-xs mt-4">Toca para continuar</p>
      </div>
      <div className="flex-none px-6 pb-10">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full countdown-bar-red" /></div>
        <p className="text-white/25 text-[10px] text-center mt-2 tracking-wider">Escáner listo en 4 s</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN – LOGIN
// ─────────────────────────────────────────────────────────────────────────────

function AdminLoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col h-full bg-background items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <div className="mb-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Admin · Asistí<span className="text-primary">APP</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Ingresá con tu cuenta de administrador</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Email de administrador</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="lucia@admin.asisti"
              className="w-full px-4 py-3.5 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Contraseña</label>
            <div className="relative">
              <input type={show ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"
                className="w-full px-4 py-3.5 pr-11 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              <button onClick={() => setShow(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button onClick={onLogin} className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base hover:bg-primary/90 active:scale-[0.98] transition-all mt-2">
            Ingresar al sistema
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN – K: DASHBOARD GLOBAL
// ─────────────────────────────────────────────────────────────────────────────

function AdminDashboard({ onNav }: { onNav: (s: AdminScreen) => void }) {
  const metrics = [
    { label: "Total organizadores", value: "38",     sub: "+3 este mes",    icon: Users,             color: "text-violet-400", bg: "bg-violet-400/10" },
    { label: "Eventos activos",      value: "12",     sub: "5 cancelados",   icon: Calendar,           color: "text-emerald-400",bg: "bg-emerald-400/10" },
    { label: "Créditos vendidos",    value: "4.820",  sub: "Vol. total",      icon: CircleDollarSign,  color: "text-amber-400",  bg: "bg-amber-400/10"  },
    { label: "Entradas vendidas",    value: "18.647", sub: "Plataforma total",icon: Ticket,            color: "text-sky-400",    bg: "bg-sky-400/10"    },
  ];
  return (
    <div className="h-full overflow-y-auto hide-scrollbar bg-background">
      <div className="px-7 pt-8 pb-5 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase font-semibold">Sistema · Backoffice</p>
          <h1 className="text-xl font-extrabold text-foreground mt-0.5">Dashboard Global</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border text-muted-foreground text-xs font-semibold hover:bg-muted/70 transition-colors">
            <Download size={13} />Exportar resumen
          </button>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
        </div>
      </div>
      <div className="px-7 py-5 space-y-5">
        <div className="grid grid-cols-4 gap-4">
          {metrics.map(m => (
            <div key={m.label} className="bg-card border border-border rounded-2xl p-4 hover:border-primary/30 transition-colors">
              <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center mb-3`}><m.icon size={17} className={m.color} /></div>
              <p className="text-2xl font-extrabold text-foreground leading-none">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
              <p className="text-[10px] text-primary font-semibold mt-1.5 flex items-center gap-0.5"><ArrowUpRight size={10} />{m.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Gestión de Usuarios",     icon: Users,             desc: "Ver y administrar todos los usuarios",       screen: "users" as AdminScreen,  color: "text-violet-400", bg: "bg-violet-400/10" },
            { label: "Gestión de Eventos",       icon: Calendar,          desc: "Supervisar eventos de toda la plataforma",   screen: "events" as AdminScreen, color: "text-emerald-400", bg: "bg-emerald-400/10" },
            { label: "Configuración y Paquetes", icon: CircleDollarSign,  desc: "Paquetes de créditos y ajustes globales",    screen: "config" as AdminScreen, color: "text-amber-400",  bg: "bg-amber-400/10"  },
          ].map(item => (
            <button key={item.label} onClick={() => onNav(item.screen)}
              className="bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/40 transition-all group">
              <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <item.icon size={17} className={item.color} />
              </div>
              <p className="text-sm font-bold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">{item.desc}</p>
              <div className="flex items-center gap-1 mt-3 text-primary text-xs font-semibold">
                Ir <ChevronRight size={12} />
              </div>
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Actividad reciente</p>
            <span className="text-xs text-muted-foreground">Últimas 24 h</span>
          </div>
          {[
            { action: "Nuevo organizador registrado", detail: "ana@producciones.com",    time: "hace 12 min", dot: "bg-emerald-400" },
            { action: "Evento publicado",              detail: "La Renga – 30 Años",       time: "hace 1 h",    dot: "bg-violet-400" },
            { action: "Compra de créditos Pack Pro",   detail: "carlos@eventos.ar · $5.500",time: "hace 2 h",  dot: "bg-amber-400"  },
            { action: "Evento cancelado",              detail: "Stand Up Impro Palermo",   time: "hace 4 h",   dot: "bg-red-400"    },
          ].map((a, i) => (
            <div key={i} className={`px-5 py-3 flex items-center justify-between ${i < 3 ? "border-b border-border" : ""}`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${a.dot} flex-none`} />
                <div>
                  <p className="text-xs font-semibold text-foreground">{a.action}</p>
                  <p className="text-[11px] text-muted-foreground">{a.detail}</p>
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground flex-none">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN – L: GESTIÓN DE USUARIOS
// ─────────────────────────────────────────────────────────────────────────────

function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>(ADMIN_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"todos" | AdminUserRole>("todos");
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchesSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchesRole = roleFilter === "todos" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const toggleStatus = (id: number) => {
    setUsers(us => us.map(u => u.id === id ? { ...u, status: u.status === "activo" ? "suspendido" : "activo" } : u));
    setOpenMenu(null);
  };
  const deleteUser = (id: number) => { setUsers(us => us.filter(u => u.id !== id)); setOpenMenu(null); };
  const changeRole = (id: number) => {
    const roles: AdminUserRole[] = ["organizador", "staff", "admin"];
    setUsers(us => us.map(u => { if (u.id !== id) return u; const idx = roles.indexOf(u.role); return { ...u, role: roles[(idx + 1) % roles.length] }; }));
    setOpenMenu(null);
  };

  const ROLE_COLORS: Record<AdminUserRole, string> = {
    organizador: "bg-violet-400/15 text-violet-400",
    staff: "bg-amber-400/15 text-amber-400",
    admin: "bg-sky-400/15 text-sky-400",
  };

  return (
    <div className="h-full overflow-y-auto hide-scrollbar bg-background" onClick={() => setOpenMenu(null)}>
      <div className="px-7 pt-8 pb-5 border-b border-border">
        <h1 className="text-xl font-extrabold text-foreground">Gestión de Usuarios</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{users.length} usuarios en el sistema</p>
      </div>
      <div className="px-7 py-5 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o email..."
              className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as typeof roleFilter)}
            className="px-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all">
            <option value="todos">Todos los roles</option>
            <option value="organizador">Organizador</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Usuario", "Email", "Rol", "Estado", "Acciones"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} className={`${i < filtered.length - 1 ? "border-b border-border" : ""} hover:bg-muted/30 transition-colors`}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-none">{u.name.charAt(0)}</div>
                      <span className="text-sm font-semibold text-foreground">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${u.status === "activo" ? "bg-emerald-400" : "bg-red-400"}`} />
                      <span className={`text-xs font-semibold ${u.status === "activo" ? "text-emerald-400" : "text-red-400"}`}>{u.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                        className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        ···
                      </button>
                      {openMenu === u.id && (
                        <div className="absolute right-0 top-9 z-50 bg-card border border-border rounded-xl shadow-xl shadow-black/40 overflow-hidden min-w-[160px]">
                          <button onClick={() => toggleStatus(u.id)}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                            {u.status === "activo" ? <><CircleX size={13} className="text-red-400" />Suspender</> : <><Check size={13} className="text-emerald-400" />Activar</>}
                          </button>
                          <button onClick={() => changeRole(u.id)}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                            <UserCheck size={13} className="text-primary" />Cambiar Rol
                          </button>
                          <div className="border-t border-border" />
                          <button onClick={() => deleteUser(u.id)}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-2">
                            <Trash2 size={13} />Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">No se encontraron usuarios.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN – M: GESTIÓN GLOBAL DE EVENTOS
// ─────────────────────────────────────────────────────────────────────────────

function AdminEvents() {
  const [events, setEvents] = useState<AdminEvent[]>(ADMIN_EVENTS);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const filtered = events.filter(ev => {
    const q = search.toLowerCase();
    return ev.title.toLowerCase().includes(q) || ev.organizer.toLowerCase().includes(q);
  });

  const cancelEvent = (id: number) => { setEvents(ev => ev.map(e => e.id === id ? { ...e, status: "cancelado" } : e)); setOpenMenu(null); };
  const deleteEvent  = (id: number) => { setEvents(ev => ev.filter(e => e.id !== id)); setOpenMenu(null); };

  return (
    <div className="h-full overflow-y-auto hide-scrollbar bg-background" onClick={() => setOpenMenu(null)}>
      <div className="px-7 pt-8 pb-5 border-b border-border">
        <h1 className="text-xl font-extrabold text-foreground">Gestión Global de Eventos</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{events.length} eventos en la plataforma</p>
      </div>
      <div className="px-7 py-5 space-y-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por evento u organizador..."
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Evento", "Organizador", "Fecha", "Entradas", "Estado", "Acciones"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev, i) => (
                <tr key={ev.id} className={`${i < filtered.length - 1 ? "border-b border-border" : ""} hover:bg-muted/30 transition-colors`}>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-semibold text-foreground leading-snug max-w-[200px] truncate">{ev.title}</p>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{ev.organizer}</td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{ev.date}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-bold text-foreground">{ev.tickets.toLocaleString("es-AR")}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      ev.status === "activo" ? "bg-emerald-400/15 text-emerald-400" : "bg-red-400/15 text-red-400"
                    }`}>{ev.status}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setOpenMenu(openMenu === ev.id ? null : ev.id)}
                        className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        ···
                      </button>
                      {openMenu === ev.id && (
                        <div className="absolute right-0 top-9 z-50 bg-card border border-border rounded-xl shadow-xl shadow-black/40 overflow-hidden min-w-[160px]">
                          <button className="w-full text-left px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                            <Sparkles size={13} className="text-primary" />Editar
                          </button>
                          {ev.status !== "cancelado" && (
                            <button onClick={() => cancelEvent(ev.id)}
                              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-amber-400 hover:bg-amber-400/10 transition-colors flex items-center gap-2">
                              <CircleX size={13} />Cancelar Evento
                            </button>
                          )}
                          <div className="border-t border-border" />
                          <button onClick={() => deleteEvent(ev.id)}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-2">
                            <Trash2 size={13} />Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">No se encontraron eventos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN – N: CONFIGURACIÓN Y PAQUETES
// ─────────────────────────────────────────────────────────────────────────────

function AdminConfig() {
  const [packs, setPacks] = useState<CreditPackAdmin[]>(ADMIN_PACKS);
  const [editPack, setEditPack] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [welcomeCredits, setWelcomeCredits] = useState("10");
  const [maxEvents, setMaxEvents]   = useState("5");
  const [saved, setSaved] = useState(false);

  const togglePack = (id: number) => setPacks(ps => ps.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  const startEdit  = (p: CreditPackAdmin) => { setEditPack(p.id); setEditPrice(String(p.price)); };
  const savePrice  = (id: number) => {
    setPacks(ps => ps.map(p => p.id === id ? { ...p, price: parseInt(editPrice) || p.price } : p));
    setEditPack(null);
  };
  const handleSaveConfig = () => { setSaved(true); setTimeout(() => setSaved(false), 2200); };

  return (
    <div className="h-full overflow-y-auto hide-scrollbar bg-background">
      <div className="px-7 pt-8 pb-5 border-b border-border">
        <h1 className="text-xl font-extrabold text-foreground">Configuración y Paquetes</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Paquetes de créditos y ajustes globales del sistema</p>
      </div>
      <div className="px-7 py-5 grid grid-cols-2 gap-5 items-start">

        {/* Card 1: Paquetes de créditos */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Paquetes de Créditos</p>
              <p className="text-xs text-muted-foreground mt-0.5">Configurar precios y disponibilidad</p>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-bold hover:bg-primary/25 transition-colors">
              <Plus size={12} />Nuevo
            </button>
          </div>
          <div className="divide-y divide-border">
            {packs.map(pack => (
              <div key={pack.id} className={`px-5 py-3.5 transition-colors ${!pack.enabled ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                      pack.enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    }`}>{pack.credits}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Pack {pack.label}</p>
                      <p className="text-xs text-muted-foreground">{pack.credits} créditos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="flex flex-col items-end">
                      {editPack === pack.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">$</span>
                          <input value={editPrice} onChange={e => setEditPrice(e.target.value)}
                            className="w-20 px-2 py-1 bg-background border border-primary/50 rounded-lg text-xs text-foreground focus:outline-none" />
                          <button onClick={() => savePrice(pack.id)} className="px-2 py-1 bg-primary text-white text-xs rounded-lg font-bold">OK</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => startEdit(pack)}>
                          <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                            Editar precio
                          </span>
                          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            ${pack.price.toLocaleString("es-AR")}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 border-l border-border pl-5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${pack.enabled ? "text-emerald-400" : "text-muted-foreground"}`}>
                        {pack.enabled ? "Activo" : "Inactivo"}
                      </span>
                      <button onClick={() => togglePack(pack.id)}
                        className={`w-10 h-6 rounded-full transition-all flex items-center px-0.5 ${
                          pack.enabled ? "bg-primary justify-end" : "bg-muted justify-start"
                        }`}>
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Configuración global */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-bold text-foreground">Configuración Global</p>
            <p className="text-xs text-muted-foreground mt-0.5">Parámetros operativos del sistema</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Créditos de bienvenida (por registro)</label>
              <div className="flex items-center gap-3">
                <input type="number" value={welcomeCredits} onChange={e => setWelcomeCredits(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                <span className="text-xs text-muted-foreground flex-none">créditos</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Asignados automáticamente al crear una cuenta nueva.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Máximo de eventos activos por organizador</label>
              <div className="flex items-center gap-3">
                <input type="number" value={maxEvents} onChange={e => setMaxEvents(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                <span className="text-xs text-muted-foreground flex-none">eventos</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Costo de publicación por evento</label>
              <div className="flex items-center gap-3">
                <input type="number" defaultValue="5"
                  className="flex-1 px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                <span className="text-xs text-muted-foreground flex-none">créditos</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Email de soporte visible</label>
              <input type="email" defaultValue="soporte@asisti.app"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
            </div>

            <button onClick={handleSaveConfig}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                saved ? "bg-emerald-500 text-white" : "bg-primary text-white hover:bg-primary/90"
              }`}>
              {saved ? <span className="flex items-center justify-center gap-2"><Check size={15} />¡Cambios guardados!</span> : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN SHELL
// ─────────────────────────────────────────────────────────────────────────────

function AdminShell() {
  const [screen, setScreen] = useState<AdminScreen>("login");
  const NAV = [
    { id: "dashboard" as AdminScreen, icon: LayoutDashboard, label: "Dashboard" },
    { id: "users"     as AdminScreen, icon: Users,           label: "Usuarios"  },
    { id: "events"    as AdminScreen, icon: Calendar,        label: "Eventos"   },
    { id: "config"    as AdminScreen, icon: CircleDollarSign,label: "Config"    },
  ];

  if (screen === "login") return <AdminLoginScreen onLogin={() => setScreen("dashboard")} />;

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="flex-none w-52 border-r border-border flex flex-col bg-background">
        <div className="px-5 pt-7 pb-5 border-b border-border">
          <h2 className="text-base font-extrabold text-foreground">Asistí<span className="text-primary">APP</span></h2>
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase mt-0.5">Backoffice Admin</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setScreen(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                screen === n.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}>
              <n.icon size={16} strokeWidth={screen === n.id ? 2.5 : 1.8} />{n.label}
            </button>
          ))}
        </nav>
        <div className="px-3 pb-5">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">A</div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">Admin</p>
              <p className="text-[10px] text-muted-foreground truncate">lucia@admin.asisti</p>
            </div>
          </div>
        </div>
      </div>
      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {screen === "dashboard" && <AdminDashboard onNav={setScreen} />}
        {screen === "users"     && <AdminUsers />}
        {screen === "events"    && <AdminEvents />}
        {screen === "config"    && <AdminConfig />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF SHELL
// ─────────────────────────────────────────────────────────────────────────────

function StaffShell({ forcedScreen }: { forcedScreen?: StaffScreen }) {
  const [account, setAccount]   = useState<StaffAccount | null>(null);
  const [screen, setScreen]     = useState<StaffScreen>("scanner");

  useEffect(() => { if (forcedScreen && account) setScreen(forcedScreen); }, [forcedScreen, account]);

  if (!account) return <StaffLoginScreen onLogin={acc => { setAccount(acc); setScreen("scanner"); }} />;

  if (account.role === "vendedor") return <StaffVendedorScreen account={account} onLogout={() => setAccount(null)} />;

  // role === "qr"
  return (
    <div className="relative h-full overflow-hidden">
      <ScannerScreen
        account={account}
        onLogout={() => setAccount(null)}
        onResult={t => setScreen(t)}
      />
      {screen === "valid"   && <ValidOverlay   onDismiss={() => setScreen("scanner")} />}
      {screen === "invalid" && <InvalidOverlay onDismiss={() => setScreen("scanner")} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────────────────────

const BUYER_LABELS: Record<BuyerScreen, string> = {
  listing: "A. Listado", detail: "B. Detalle", checkout: "C. Checkout", success: "D. Entrada",
};
const ORG_LABELS: Record<OrgScreen, string> = {
  login: "E. Login", register: "E2. Registro", dashboard: "F. Dashboard", wizard: "G. Wizard", wallet: "H. Billetera", staff: "Staff",
};
const ADMIN_LABELS: Record<AdminScreen, string> = {
  login: "Admin Login", dashboard: "K. Dashboard", users: "L. Usuarios", events: "M. Eventos", config: "N. Config",
};

export default function App() {
  const [mode, setMode]               = useState<AppMode>("buyer");
  const [buyerScreen, setBuyerScreen] = useState<BuyerScreen>("listing");
  const [orgScreen, setOrgScreen]     = useState<OrgScreen>("login");
  const [orgLoggedIn, setOrgLoggedIn] = useState(false);
  const [selEvent, setSelEvent]       = useState<BuyerEvent>(EVENTS[0]);
  const [selTanda, setSelTanda]       = useState<Tanda>(EVENTS[0].tandas[0]);
  const [selQty, setSelQty]           = useState(1);
  const [buyerName, setBuyerName]     = useState("");
  const [staffForced, setStaffForced] = useState<StaffScreen | undefined>(undefined);

  const handleSelect  = (e: BuyerEvent) => { setSelEvent(e); setSelTanda(e.tandas[0]); setSelQty(1); setBuyerScreen("detail"); };
  const handleBuy     = (t: Tanda, q: number) => { setSelTanda(t); setSelQty(q); setBuyerScreen("checkout"); };
  const handleConfirm = (n: string) => { setBuyerName(n || "María García"); setBuyerScreen("success"); };
  const handleOrgNav  = (s: OrgScreen) => { setOrgScreen(s); if (s !== "login" && s !== "register") setOrgLoggedIn(true); };

  const buyerScreens: BuyerScreen[] = ["listing", "detail", "checkout", "success"];
  const orgScreens: OrgScreen[]     = ["login", "register", "dashboard", "wizard", "wallet", "staff"];
  const staffNavScreens: StaffScreen[] = ["scanner", "valid", "invalid"];
  const adminScreens: AdminScreen[] = ["dashboard", "users", "events", "config"];

  const isStaff = mode === "staff";
  const isAdmin = mode === "admin";

  // Org bottom nav (shown when logged in)
  const ORG_NAV = [
    { id: "dashboard" as OrgScreen, icon: LayoutDashboard, label: "Inicio"    },
    { id: "wizard"    as OrgScreen, icon: Sparkles,         label: "Crear"    },
    { id: "wallet"    as OrgScreen, icon: Wallet,           label: "Créditos" },
    { id: "staff"     as OrgScreen, icon: Users,            label: "Staff"    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050508] p-4 gap-5" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* Mode switcher */}
      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-full p-1">
        {[
          { id: "buyer" as AppMode, label: "🎟 Comprador"   },
          { id: "org"   as AppMode, label: "📊 Organizador" },
          { id: "staff" as AppMode, label: "📷 Staff"       },
          { id: "admin" as AppMode, label: "⚙️ Admin"       },
        ].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === m.id ? "bg-primary text-white" : "text-white/50 hover:text-white/80"}`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Screen nav */}
      {!isAdmin && (
      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-full p-1 flex-wrap justify-center">
        {mode === "buyer" && buyerScreens.map(s => (
          <button key={s} onClick={() => setBuyerScreen(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${buyerScreen === s ? "bg-primary text-white" : "text-white/50 hover:text-white/80"}`}>
            {BUYER_LABELS[s]}
          </button>
        ))}
        {mode === "org" && orgScreens.map(s => (
          <button key={s} onClick={() => handleOrgNav(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${orgScreen === s ? "bg-primary text-white" : "text-white/50 hover:text-white/80"}`}>
            {ORG_LABELS[s]}
          </button>
        ))}
        {mode === "staff" && staffNavScreens.map(s => (
          <button key={s} onClick={() => setStaffForced(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${staffForced === s ? "bg-primary text-white" : "text-white/50 hover:text-white/80"}`}>
            {s === "scanner" ? "I. Escáner" : s === "valid" ? "J. Válido ✓" : "J. Inválido ✗"}
          </button>
        ))}
      </div>
      )}

      {/* Admin desktop frame */}
      {isAdmin && (
        <div className="relative flex flex-col overflow-hidden"
          style={{
            width: 1100, height: 700, borderRadius: 16,
            background: "var(--background)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 40px 80px rgba(0,0,0,0.85), 0 0 120px rgba(124,58,237,0.15)",
          }}>
          <AdminShell />
        </div>
      )}

      {/* Phone frame */}
      {!isAdmin && (
      <div className="relative flex flex-col overflow-hidden"
        style={{
          width: 390, height: 844, borderRadius: 50,
          background: isStaff ? "#000" : "var(--background)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 40px 80px rgba(0,0,0,0.85), 0 0 120px rgba(124,58,237,0.15)",
        }}>

        {/* Status bar */}
        {!isStaff && (
          <div className="flex-none flex items-center justify-between px-8 pt-3 pb-1">
            <span className="text-xs font-semibold text-foreground">9:41</span>
            <div className="w-28 h-[18px] bg-black rounded-full" />
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5 items-end" style={{ height: 12 }}>
                {[3, 4, 5, 6].map(h => <div key={h} className="w-[3px] bg-foreground/80 rounded-sm" style={{ height: h * 2 }} />)}
              </div>
              <span className="text-[10px] text-foreground/80 ml-0.5">100%</span>
            </div>
          </div>
        )}

        {/* Screen content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {mode === "buyer" && (
            <div className="flex-1 overflow-hidden">
              {buyerScreen === "listing"  && <ListingScreen onSelect={handleSelect} />}
              {buyerScreen === "detail"   && <DetailScreen event={selEvent} onBack={() => setBuyerScreen("listing")} onBuy={handleBuy} />}
              {buyerScreen === "checkout" && <CheckoutScreen event={selEvent} tanda={selTanda} qty={selQty} onBack={() => setBuyerScreen("detail")} onConfirm={handleConfirm} />}
              {buyerScreen === "success"  && <SuccessScreen event={selEvent} tanda={selTanda} qty={selQty} buyerName={buyerName} onHome={() => setBuyerScreen("listing")} />}
            </div>
          )}

          {mode === "org" && (
            <>
              <div className="flex-1 overflow-hidden">
                {orgScreen === "login"     && <OrgLoginScreen onLogin={() => { setOrgLoggedIn(true); setOrgScreen("dashboard"); }} onRegister={() => setOrgScreen("register")} />}
                {orgScreen === "register"  && <OrgRegisterScreen onBack={() => setOrgScreen("login")} onSuccess={() => { setOrgLoggedIn(true); setOrgScreen("dashboard"); }} />}
                {orgScreen === "dashboard" && <DashboardScreen onNav={handleOrgNav} />}
                {orgScreen === "wizard"    && <WizardScreen onBack={() => setOrgScreen("dashboard")} />}
                {orgScreen === "wallet"    && <WalletScreen onBack={() => setOrgScreen("dashboard")} />}
                {orgScreen === "staff"     && <StaffMgmtScreen onBack={() => setOrgScreen("dashboard")} />}
              </div>
              {orgLoggedIn && orgScreen !== "login" && (
                <div className="flex-none border-t border-border bg-background/90 backdrop-blur-md px-6 py-2 flex items-center justify-around">
                  {ORG_NAV.map(n => (
                    <button key={n.id} onClick={() => handleOrgNav(n.id)}
                      className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-2xl transition-all ${orgScreen === n.id ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                      <n.icon size={20} strokeWidth={orgScreen === n.id ? 2.5 : 1.8} />
                      <span className="text-[10px] font-semibold">{n.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {mode === "staff" && (
            <div className="flex-1 overflow-hidden">
              <StaffShell forcedScreen={staffForced} />
            </div>
          )}
        </div>
      </div>
      )}

      <p className="text-white/20 text-xs">AsistíAPP · Mockups completos · Secciones 1, 2, 3 & 4</p>
    </div>
  );
}
