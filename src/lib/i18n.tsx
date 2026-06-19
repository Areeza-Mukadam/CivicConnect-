import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "hi" | "es";

type Dict = Record<string, string>;

const en: Dict = {
  app_name: "CivicLink",
  tagline: "Your community utilities, simplified.",
  sign_in: "Sign in",
  sign_up: "Sign up",
  sign_out: "Sign out",
  email: "Email",
  password: "Password",
  full_name: "Full name",
  continue_google: "Continue with Google",
  dashboard: "Dashboard",
  alerts: "Alerts",
  bills: "Bills",
  feedback: "Feedback",
  chat: "Assistant",
  profile: "Profile",
  admin: "Admin",
  welcome_back: "Welcome back",
  active_alerts: "Active alerts",
  unpaid_bills: "Unpaid bills",
  open_complaints: "Open complaints",
  recent_alerts: "Recent alerts",
  no_alerts: "No alerts right now. All systems normal.",
  no_bills: "No bills yet.",
  pay_now: "Pay now",
  paid: "Paid",
  due: "Due",
  amount: "Amount",
  period: "Period",
  status: "Status",
  type: "Type",
  ward: "Ward",
  consumer_id_water: "Water consumer ID",
  consumer_id_electricity: "Electricity consumer ID",
  language: "Language",
  save: "Save",
  saved: "Saved",
  submit_complaint: "Submit a complaint",
  category: "Category",
  subject: "Subject",
  message: "Message",
  submit: "Submit",
  ask_anything: "Ask anything about your bills, outages, or services...",
  send: "Send",
  voice_input: "Voice input",
  listening: "Listening...",
  recent_complaints: "My complaints",
  new_alert: "New alert",
  title: "Title",
  body: "Body",
  severity: "Severity",
  create: "Create",
  admin_overview: "Operations overview",
  all_complaints: "Incoming complaints",
  resolve: "Mark resolved",
  in_progress: "In progress",
  resolved: "Resolved",
  open: "Open",
  ai_summary: "AI summary",
  generate_summary: "Generate summary",
  view_all: "View all",
  utility_water: "Water",
  utility_electricity: "Electricity",
  utility_general: "Notice",
  hello: "Hello",
};

const hi: Dict = {
  app_name: "CivicLink",
  tagline: "आपकी सामुदायिक उपयोगिताएँ, सरल।",
  sign_in: "साइन इन",
  sign_up: "साइन अप",
  sign_out: "साइन आउट",
  email: "ईमेल",
  password: "पासवर्ड",
  full_name: "पूरा नाम",
  continue_google: "Google से जारी रखें",
  dashboard: "डैशबोर्ड",
  alerts: "अलर्ट",
  bills: "बिल",
  feedback: "शिकायत",
  chat: "सहायक",
  profile: "प्रोफ़ाइल",
  admin: "एडमिन",
  welcome_back: "वापस स्वागत है",
  active_alerts: "सक्रिय अलर्ट",
  unpaid_bills: "बकाया बिल",
  open_complaints: "खुली शिकायतें",
  recent_alerts: "नवीनतम अलर्ट",
  no_alerts: "अभी कोई अलर्ट नहीं। सब कुछ सामान्य है।",
  no_bills: "अभी कोई बिल नहीं।",
  pay_now: "अभी भुगतान करें",
  paid: "भुगतान हो गया",
  due: "देय तिथि",
  amount: "राशि",
  period: "अवधि",
  status: "स्थिति",
  type: "प्रकार",
  ward: "वार्ड",
  consumer_id_water: "जल उपभोक्ता ID",
  consumer_id_electricity: "बिजली उपभोक्ता ID",
  language: "भाषा",
  save: "सहेजें",
  saved: "सहेजा गया",
  submit_complaint: "शिकायत दर्ज करें",
  category: "श्रेणी",
  subject: "विषय",
  message: "संदेश",
  submit: "भेजें",
  ask_anything: "अपने बिल, आउटेज, सेवाओं के बारे में पूछें...",
  send: "भेजें",
  voice_input: "वॉइस इनपुट",
  listening: "सुन रहा है...",
  recent_complaints: "मेरी शिकायतें",
  new_alert: "नया अलर्ट",
  title: "शीर्षक",
  body: "विवरण",
  severity: "गंभीरता",
  create: "बनाएँ",
  admin_overview: "संचालन अवलोकन",
  all_complaints: "आने वाली शिकायतें",
  resolve: "हल किया",
  in_progress: "प्रगति में",
  resolved: "हल",
  open: "खुला",
  ai_summary: "AI सारांश",
  generate_summary: "सारांश बनाएँ",
  view_all: "सब देखें",
  utility_water: "पानी",
  utility_electricity: "बिजली",
  utility_general: "सूचना",
  hello: "नमस्ते",
};

const es: Dict = {
  app_name: "CivicLink",
  tagline: "Tus servicios públicos, simplificados.",
  sign_in: "Iniciar sesión",
  sign_up: "Registrarse",
  sign_out: "Cerrar sesión",
  email: "Correo",
  password: "Contraseña",
  full_name: "Nombre completo",
  continue_google: "Continuar con Google",
  dashboard: "Panel",
  alerts: "Alertas",
  bills: "Facturas",
  feedback: "Quejas",
  chat: "Asistente",
  profile: "Perfil",
  admin: "Admin",
  welcome_back: "Bienvenido",
  active_alerts: "Alertas activas",
  unpaid_bills: "Facturas pendientes",
  open_complaints: "Quejas abiertas",
  recent_alerts: "Alertas recientes",
  no_alerts: "Sin alertas. Todo en orden.",
  no_bills: "Sin facturas.",
  pay_now: "Pagar ahora",
  paid: "Pagado",
  due: "Vence",
  amount: "Monto",
  period: "Periodo",
  status: "Estado",
  type: "Tipo",
  ward: "Distrito",
  consumer_id_water: "ID de consumidor de agua",
  consumer_id_electricity: "ID de consumidor de electricidad",
  language: "Idioma",
  save: "Guardar",
  saved: "Guardado",
  submit_complaint: "Enviar una queja",
  category: "Categoría",
  subject: "Asunto",
  message: "Mensaje",
  submit: "Enviar",
  ask_anything: "Pregunta sobre tus facturas, cortes o servicios...",
  send: "Enviar",
  voice_input: "Entrada de voz",
  listening: "Escuchando...",
  recent_complaints: "Mis quejas",
  new_alert: "Nueva alerta",
  title: "Título",
  body: "Descripción",
  severity: "Severidad",
  create: "Crear",
  admin_overview: "Panel de operaciones",
  all_complaints: "Quejas entrantes",
  resolve: "Resuelto",
  in_progress: "En curso",
  resolved: "Resuelto",
  open: "Abierto",
  ai_summary: "Resumen IA",
  generate_summary: "Generar resumen",
  view_all: "Ver todo",
  utility_water: "Agua",
  utility_electricity: "Electricidad",
  utility_general: "Aviso",
  hello: "Hola",
};

const dicts: Record<Lang, Dict> = { en, hi, es };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: keyof typeof en | string) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("civiclink_lang") as Lang | null;
    if (stored && ["en", "hi", "es"].includes(stored)) setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem("civiclink_lang", l);
  };

  const t = (k: string) => dicts[lang][k] ?? dicts.en[k] ?? k;
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export const LANG_LABELS: Record<Lang, string> = { en: "English", hi: "हिन्दी", es: "Español" };
